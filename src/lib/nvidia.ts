/**
 * NVIDIA NIM client using native fetch (OpenAI-compatible REST API).
 *
 * Performance features:
 * - Model fallback chain with process-lifetime caching
 * - Concurrent-request deduplication (in-flight map) — identical parallel
 *   requests share one network call instead of each spawning their own
 * - Response cache (5 min TTL, 100-entry LRU) — repeated identical prompts
 *   return instantly without hitting the API
 * - Hard AbortSignal timeouts on every fetch
 *
 * Security: API key is never logged or exposed in error messages.
 */

if (!process.env.NVIDIA_API_KEY) {
  console.warn(
    "[nvidia] NVIDIA_API_KEY is not set. LLM features will not work. Please add it to .env.local"
  );
}

// ── Response Cache ────────────────────────────────────────────────────────────

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const RESPONSE_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1_000; // 5 minutes
const CACHE_MAX_SIZE = 100;           // increased from 50

function cacheGet(key: string): string | null {
  const entry = RESPONSE_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    RESPONSE_CACHE.delete(key);
    return null;
  }
  // LRU: re-insert so it moves to the end
  RESPONSE_CACHE.delete(key);
  RESPONSE_CACHE.set(key, entry);
  return entry.value;
}

function cacheSet(key: string, value: string): void {
  if (RESPONSE_CACHE.size >= CACHE_MAX_SIZE) {
    // Evict the least-recently-used (first) entry
    const firstKey = RESPONSE_CACHE.keys().next().value;
    if (firstKey !== undefined) RESPONSE_CACHE.delete(firstKey);
  }
  RESPONSE_CACHE.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Build a stable cache key.
 * Uses full content hashed via a simple djb2 to keep key short but accurate.
 */
function makeCacheKey(systemPrompt: string, userPrompt: string, maxTokens: number): string {
  const raw = `${maxTokens}||${systemPrompt}||${userPrompt}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) ^ raw.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return `nv-${hash.toString(36)}`;
}

// ── In-flight Deduplication ───────────────────────────────────────────────────
// If N concurrent requests arrive with the same prompt, only ONE network call
// is made. All others await the same Promise.

const IN_FLIGHT = new Map<string, Promise<string>>();

// ── NVIDIA Constants ──────────────────────────────────────────────────────────

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

/**
 * Ordered list of models to try, best-first.
 */
const MODEL_FALLBACK_CHAIN = [
  "meta/llama-3.2-11b-vision-instruct",
  "meta/llama-3.2-90b-vision-instruct",
  "deepseek-ai/deepseek-v4.1-flash",
  "mistralai/mistral-7b-instruct-v0.3",
  "google/gemma-3-4b-it",
  "nv-mistralai/mistral-nemo-12b-instruct",
  "mistralai/mistral-large-2-instruct",
];

/** Cached working model — set after first successful probe. */
let resolvedModel: string | null = null;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: { content: string };
    delta?: { content: string };
  }>;
}

/** Returns the Authorization header value without logging the key. */
function authHeader(): string {
  return `Bearer ${process.env.NVIDIA_API_KEY ?? ""}`;
}

/**
 * Probe a model with a minimal request.
 * Returns true if the model responds with HTTP 200.
 */
async function probeModel(model: string): Promise<boolean> {
  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
        stream: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Find the first working model from the fallback chain.
 * Probes models in parallel with Promise.any for speed, then caches result.
 */
async function getWorkingModel(): Promise<string> {
  if (resolvedModel) return resolvedModel;

  console.log("[nvidia] Probing model fallback chain (parallel)…");

  // Probe all models concurrently — take whichever succeeds first
  const results = await Promise.allSettled(
    MODEL_FALLBACK_CHAIN.map(async (model) => {
      if (await probeModel(model)) return model;
      throw new Error(`${model} unavailable`);
    })
  );

  // Return first fulfilled in chain order (respect preference)
  for (let i = 0; i < MODEL_FALLBACK_CHAIN.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      resolvedModel = r.value;
      console.log(`[nvidia] Using model: ${resolvedModel}`);
      return resolvedModel;
    }
  }

  throw new Error(
    "No working NVIDIA NIM model found for this API key. " +
    "Visit https://build.nvidia.com to check available models for your account."
  );
}

/** Reset resolved model (exported for testing). */
export function resetResolvedModel(): void {
  resolvedModel = null;
}

/** Clear response cache (exported for testing). */
export function clearResponseCache(): void {
  RESPONSE_CACHE.clear();
}

/** Get cache size (exported for testing). */
export function getCacheSize(): number {
  return RESPONSE_CACHE.size;
}

/**
 * Send a single prompt to NVIDIA NIM and return the full text response.
 * Automatically selects the best available model for this API key.
 * Uses in-flight deduplication + response caching for efficiency.
 */
export async function callNvidia(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048
): Promise<string> {
  // 1. Check response cache
  const cacheKey = makeCacheKey(systemPrompt, userPrompt, maxTokens);
  const cached = cacheGet(cacheKey);
  if (cached) {
    console.log("[nvidia] Cache hit — returning memoised response");
    return cached;
  }

  // 2. Deduplicate in-flight identical requests
  const existing = IN_FLIGHT.get(cacheKey);
  if (existing) {
    console.log("[nvidia] In-flight dedup — awaiting shared request");
    return existing;
  }

  // 3. Fire the actual network request
  const promise = (async () => {
    const model = await getWorkingModel();

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.2,
        top_p: 0.9,
        stream: false,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 410) {
        resolvedModel = null;
      }
      // Don't expose raw error body — may contain sensitive info
      throw new Error(`NVIDIA NIM API error: HTTP ${response.status}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices[0]?.message?.content ?? "";

    if (content) cacheSet(cacheKey, content);
    return content;
  })();

  IN_FLIGHT.set(cacheKey, promise);

  try {
    return await promise;
  } finally {
    IN_FLIGHT.delete(cacheKey);
  }
}

/**
 * Stream a response from NVIDIA NIM.
 * Returns a ReadableStream of text chunks.
 */
export async function streamNvidiaResponse(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048
): Promise<ReadableStream<Uint8Array>> {
  const model = await getWorkingModel();

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
      top_p: 0.9,
      stream: true,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    if (response.status === 404 || response.status === 410) {
      resolvedModel = null;
    }
    throw new Error(`NVIDIA NIM stream error: HTTP ${response.status}`);
  }

  const encoder = new TextEncoder();
  const bodyStream = response.body;

  return new ReadableStream({
    async start(controller) {
      if (!bodyStream) {
        controller.close();
        return;
      }
      const reader = bodyStream.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr) as ChatCompletionResponse;
              const text = parsed.choices[0]?.delta?.content ?? "";
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}
