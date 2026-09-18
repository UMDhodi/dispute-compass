/**
 * NVIDIA NIM client using native fetch (OpenAI-compatible REST API).
 * Avoids openai SDK module resolution issues.
 */

if (!process.env.NVIDIA_API_KEY) {
  console.warn(
    "NVIDIA_API_KEY is not set. LLM features will not work. Please add it to .env.local"
  );
}

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";

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
 * Send a single prompt to NVIDIA NIM and return the full text response.
 */
export async function callNvidia(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048
): Promise<string> {
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
      model: NVIDIA_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
      top_p: 0.9,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA NIM API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return data.choices[0]?.message?.content ?? "";
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
      model: NVIDIA_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
      top_p: 0.9,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`NVIDIA NIM stream error ${response.status}`);
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
