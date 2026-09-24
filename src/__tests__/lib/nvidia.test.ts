/**
 * Unit tests for src/lib/nvidia.ts
 *
 * Tests: LRU cache, in-flight deduplication, error safety, test helpers.
 *
 * Because probeModel runs in parallel (Promise.allSettled), we mock fetch
 * so the FIRST model always succeeds the probe, giving deterministic behaviour.
 */

// ── Mock global fetch ─────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeOkResponse(content: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
    text: async () => content,
  } as unknown as Response;
}

function makeErrorResponse(status: number): Response {
  return { ok: false, status, text: async () => "error" } as unknown as Response;
}

/**
 * Set up mockFetch so that:
 *  - Any call that looks like a probe (max_tokens: 5) with model index 0 succeeds
 *  - Any call that looks like a probe for other models fails
 *  - The first non-probe call returns `apiResult`
 *
 * We achieve this by checking if the body contains `"max_tokens":5` (probe).
 */
function setupMockFetch(apiResult: string) {
  let apiCalled = false;
  mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as {
      model: string;
      max_tokens: number;
    };
    const isProbe = body.max_tokens === 5;
    const isFirstModel = body.model === "meta/llama-3.2-11b-vision-instruct";

    if (isProbe) {
      // First model probe succeeds; others fail → resolvedModel = first model
      return isFirstModel ? makeOkResponse("probe-ok") : makeErrorResponse(404);
    }

    // Actual API call
    if (!apiCalled) {
      apiCalled = true;
      return makeOkResponse(apiResult);
    }
    return makeOkResponse(apiResult);
  });
}

function setupAllProbesFail() {
  mockFetch.mockImplementation(async () => makeErrorResponse(404));
}

// ── Import after mocking globals ──────────────────────────────────────────────

import {
  callNvidia,
  resetResolvedModel,
  clearResponseCache,
  getCacheSize,
} from "@/lib/nvidia";

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  resetResolvedModel();
  clearResponseCache();
});

// ── Model selection ───────────────────────────────────────────────────────────

describe("callNvidia — model probing", () => {
  it("succeeds with a valid API call when a model is available", async () => {
    setupMockFetch("hello response");
    const result = await callNvidia("system", "user");
    expect(result).toBe("hello response");
  });

  it("throws when all models fail", async () => {
    setupAllProbesFail();
    await expect(callNvidia("system", "user")).rejects.toThrow(/No working NVIDIA NIM model/);
  });

  it("resets resolvedModel on 404 from actual API call", async () => {
    let apiCallCount = 0;
    mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { max_tokens: number; model: string };
      const isProbe = body.max_tokens === 5;
      const isFirst = body.model === "meta/llama-3.2-11b-vision-instruct";

      if (isProbe) return isFirst ? makeOkResponse("probe") : makeErrorResponse(404);
      apiCallCount++;
      if (apiCallCount === 1) return makeErrorResponse(404); // first real call → 404
      return makeOkResponse("second call result");
    });

    // First call fails → should throw (resolvedModel reset)
    await expect(callNvidia("sys", "a")).rejects.toThrow(/HTTP 404/);
    // Second call with different prompt (avoids cache) should re-probe + succeed
    const r = await callNvidia("sys", "b");
    expect(r).toBe("second call result");
  });
});

// ── Response cache (LRU) ──────────────────────────────────────────────────────

describe("callNvidia — response cache", () => {
  it("returns cached result on second identical call (no extra fetch)", async () => {
    let apiCallCount = 0;
    mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { max_tokens: number; model: string };
      const isProbe = body.max_tokens === 5;
      const isFirst = body.model === "meta/llama-3.2-11b-vision-instruct";
      if (isProbe) return isFirst ? makeOkResponse("probe") : makeErrorResponse(404);
      apiCallCount++;
      return makeOkResponse("cached result");
    });

    const r1 = await callNvidia("system", "user", 100);
    const r2 = await callNvidia("system", "user", 100);

    expect(r1).toBe("cached result");
    expect(r2).toBe("cached result");
    // Second call should be a cache hit — only one real API call
    expect(apiCallCount).toBe(1);
  });

  it("does NOT use cache for different prompts", async () => {
    setupMockFetch(""); // will be overridden below
    let callIdx = 0;
    const responses = ["result A", "result B"];
    mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { max_tokens: number; model: string };
      const isProbe = body.max_tokens === 5;
      const isFirst = body.model === "meta/llama-3.2-11b-vision-instruct";
      if (isProbe) return isFirst ? makeOkResponse("probe") : makeErrorResponse(404);
      return makeOkResponse(responses[callIdx++] ?? "extra");
    });

    const r1 = await callNvidia("system", "user A", 100);
    const r2 = await callNvidia("system", "user B", 100);

    expect(r1).toBe("result A");
    expect(r2).toBe("result B");
    expect(getCacheSize()).toBe(2);
  });

  it("does NOT use cache for different maxTokens", async () => {
    let callIdx = 0;
    const responses = ["result 100", "result 200"];
    mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { max_tokens: number; model: string };
      const isProbe = body.max_tokens === 5;
      const isFirst = body.model === "meta/llama-3.2-11b-vision-instruct";
      if (isProbe) return isFirst ? makeOkResponse("probe") : makeErrorResponse(404);
      return makeOkResponse(responses[callIdx++] ?? "extra");
    });

    const r1 = await callNvidia("sys", "usr", 100);
    const r2 = await callNvidia("sys", "usr", 200);

    expect(r1).toBe("result 100");
    expect(r2).toBe("result 200");
  });

  it("clears cache with clearResponseCache()", async () => {
    let apiCallCount = 0;
    mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { max_tokens: number; model: string };
      const isProbe = body.max_tokens === 5;
      const isFirst = body.model === "meta/llama-3.2-11b-vision-instruct";
      if (isProbe) return isFirst ? makeOkResponse("probe") : makeErrorResponse(404);
      apiCallCount++;
      return makeOkResponse(`result-${apiCallCount}`);
    });

    await callNvidia("sys", "usr", 100);
    expect(getCacheSize()).toBe(1);

    clearResponseCache();
    expect(getCacheSize()).toBe(0);

    // Next call with same prompt hits API again
    await callNvidia("sys", "usr", 100);
    expect(getCacheSize()).toBe(1);
    expect(apiCallCount).toBe(2); // called twice
  });
});

// ── In-flight deduplication ───────────────────────────────────────────────────

describe("callNvidia — in-flight deduplication", () => {
  it("concurrent identical requests share a single API call", async () => {
    let apiCallCount = 0;
    let resolvePendingFetch!: (v: Response) => void;
    const pendingFetch = new Promise<Response>((resolve) => {
      resolvePendingFetch = resolve;
    });

    mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { max_tokens: number; model: string };
      const isProbe = body.max_tokens === 5;
      const isFirst = body.model === "meta/llama-3.2-11b-vision-instruct";
      if (isProbe) return isFirst ? makeOkResponse("probe") : makeErrorResponse(404);
      apiCallCount++;
      if (apiCallCount === 1) return pendingFetch; // first API call is slow
      return makeOkResponse("extra");              // should never happen
    });

    // Fire 3 concurrent requests with same prompt
    const p1 = callNvidia("same-sys", "same-usr", 100);
    const p2 = callNvidia("same-sys", "same-usr", 100);
    const p3 = callNvidia("same-sys", "same-usr", 100);

    // Let the probe + model selection happen first
    await Promise.resolve();
    await Promise.resolve();

    // Now resolve the pending fetch
    resolvePendingFetch(makeOkResponse("deduped result"));

    const results = await Promise.all([p1, p2, p3]);
    expect(results).toEqual(["deduped result", "deduped result", "deduped result"]);
    expect(apiCallCount).toBe(1); // only ONE real API call
  });
});

// ── Error safety ──────────────────────────────────────────────────────────────

describe("callNvidia — error safety", () => {
  it("does not expose API key in error message", async () => {
    process.env.NVIDIA_API_KEY = "sk-super-secret-key";
    mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { max_tokens: number; model: string };
      const isProbe = body.max_tokens === 5;
      const isFirst = body.model === "meta/llama-3.2-11b-vision-instruct";
      if (isProbe) return isFirst ? makeOkResponse("probe") : makeErrorResponse(404);
      return makeErrorResponse(500);
    });

    try {
      await callNvidia("sys", "usr");
    } catch (err) {
      expect(String(err)).not.toContain("sk-super-secret-key");
    }
  });

  it("throws on non-ok response with status in message", async () => {
    mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { max_tokens: number; model: string };
      const isProbe = body.max_tokens === 5;
      const isFirst = body.model === "meta/llama-3.2-11b-vision-instruct";
      if (isProbe) return isFirst ? makeOkResponse("probe") : makeErrorResponse(404);
      return makeErrorResponse(503);
    });

    await expect(callNvidia("sys", "unique-503-test")).rejects.toThrow(/HTTP 503/);
  });
});

// ── Test helpers ──────────────────────────────────────────────────────────────

describe("test helpers", () => {
  it("getCacheSize returns 0 after clearResponseCache", () => {
    expect(getCacheSize()).toBe(0);
  });

  it("getCacheSize increments after a successful call", async () => {
    setupMockFetch("test");
    await callNvidia("sys", "usr-unique-helper");
    expect(getCacheSize()).toBe(1);
  });
});
