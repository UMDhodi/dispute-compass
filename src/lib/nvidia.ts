/**
 * NVIDIA NIM client using native fetch (OpenAI-compatible REST API).
 *
 * Uses a model fallback chain: tries each model in order until one works,
 * then caches it for the lifetime of the process. This gracefully handles
 * EOL models and account-tier restrictions.
 *
 * Performance features:
 * - 60 s AbortSignal timeout on every fetch call
 * - Short-lived response cache (5 min TTL, max 50 entries) for identical prompts
 */

if (!process.env.NVIDIA_API_KEY) {
  console.warn(
    "NVIDIA_API_KEY is not set. LLM features will not work. Please add it to .env.local"
  );
}

/** Simple bounded in-memory cache for (system+user) prompt pairs. */
interface CacheEntry {
  value: string;
  expiresAt: number;
}
const RESPONSE_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 50;

function cacheGet(key: string): string | null {
  const entry = RESPONSE_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    RESPONSE_CACHE.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key: string, value: string): void {
  if (RESPONSE_CACHE.size >= CACHE_MAX_SIZE) {
    // Evict oldest entry
    const firstKey = RESPONSE_CACHE.keys().next().value;
    if (firstKey !== undefined) RESPONSE_CACHE.delete(firstKey);
  }
  RESPONSE_CACHE.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Build a compact cache key from the prompt pair. */
function makeCacheKey(systemPrompt: string, userPrompt: string, maxTokens: number): string {
  // Use first 200 chars of each to keep key manageable
  return `${maxTokens}|${systemPrompt.slice(0, 200)}|${userPrompt.slice(0, 200)}`;
}

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

/**
 * Ordered list of models to try, best-first.
 * Add or remove entries as NVIDIA updates their catalog.
 */
const MODEL_FALLBACK_CHAIN = [
  "meta/llama-3.2-11b-vision-instruct",   // Llama 3.2 11B — small, widely available
  "meta/llama-3.2-90b-vision-instruct",   // Llama 3.2 90B — larger
  "deepseek-ai/deepseek-v4.1-flash",      // DeepSeek Flash — fast & capable
  "mistralai/mistral-7b-instruct-v0.3",   // Mistral 7B — reliable free-tier
  "google/gemma-3-4b-it",                 // Gemma 3 4B — lightweight fallback
  "nv-mistralai/mistral-nemo-12b-instruct", // Mistral Nemo 12B
  "mistralai/mistral-large-2-instruct",   // Mistral Large 2
];

/** Cached model ID — set after first successful probe. */
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
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY ?? ""}`,
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
 * Result is cached in `resolvedModel` for subsequent calls.
 */
async function getWorkingModel(): Promise<string> {
  if (resolvedModel) return resolvedModel;

  console.log("[nvidia] Probing model fallback chain...");
  for (const model of MODEL_FALLBACK_CHAIN) {
    console.log(`[nvidia] Trying model: ${model}`);
    if (await probeModel(model)) {
      console.log(`[nvidia] Using model: ${model}`);
      resolvedModel = model;
      return model;
    }
  }

  throw new Error(
    "No working NVIDIA NIM model found for this API key. " +
    "Your free-tier key may need renewal or a different model set. " +
    "Visit https://build.nvidia.com to check available models for your account."
  );
}

/**
 * Send a single prompt to NVIDIA NIM and return the full text response.
 * Automatically selects the best available model for this API key.
 */
export async function callNvidia(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048
): Promise<string> {
  const model = await getWorkingModel();

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // Check cache before making a network call
  const cacheKey = makeCacheKey(systemPrompt, userPrompt, maxTokens);
  const cached = cacheGet(cacheKey);
  if (cached) {
    console.log("[nvidia] Cache hit — returning memoised response");
    return cached;
  }

  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
      top_p: 0.9,
      stream: false,
    }),
    // 60-second hard timeout — prevents hanging requests
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    // If the cached model stops working, reset so next call re-probes.
    if (response.status === 404 || response.status === 410) {
      resolvedModel = null;
    }
    const errorText = await response.text();
    throw new Error(`NVIDIA NIM API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices[0]?.message?.content ?? "";

  // Cache successful responses
  if (content) cacheSet(cacheKey, content);

  return content;
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
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
      top_p: 0.9,
      stream: true,
    }),
    signal: AbortSignal.timeout(120_000), // 2-min timeout for streams
  });

  if (!response.ok) {
    if (response.status === 404 || response.status === 410) {
      resolvedModel = null;
    }
    const errorText = await response.text();
    throw new Error(`NVIDIA NIM stream error ${response.status}: ${errorText}`);
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
          // Parse SSE lines
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
