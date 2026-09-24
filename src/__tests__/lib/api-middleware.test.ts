/**
 * Unit tests for src/lib/api-middleware.ts
 *
 * Tests: secureJson headers, X-Request-ID, safeErrorMessage, checkBodySize.
 */

import { secureJson, safeErrorMessage, checkBodySize } from "@/lib/api-middleware";

// ── secureJson ─────────────────────────────────────────────────────────────────

describe("secureJson", () => {
  it("returns JSON response with correct status", async () => {
    const res = secureJson({ ok: true });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("returns correct non-200 status", () => {
    const res = secureJson({ error: "not found" }, { status: 404 });
    expect(res.status).toBe(404);
  });

  it("sets Cache-Control: no-store header", () => {
    const res = secureJson({ ok: true });
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("sets X-Content-Type-Options: nosniff", () => {
    const res = secureJson({ ok: true });
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets a unique X-Request-ID on every call", () => {
    const id1 = secureJson({}).headers.get("X-Request-ID");
    const id2 = secureJson({}).headers.get("X-Request-ID");
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it("includes caller-provided extra headers", () => {
    const res = secureJson({}, { headers: { "Retry-After": "60" } });
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("defaults to status 200 when not specified", () => {
    expect(secureJson({}).status).toBe(200);
  });
});

// ── safeErrorMessage ──────────────────────────────────────────────────────────

describe("safeErrorMessage", () => {
  it("passes through user-facing messages", () => {
    expect(safeErrorMessage(new Error("Document text too short to analyze"))).toMatch(/too short/i);
    expect(safeErrorMessage(new Error("Please provide a document"))).toMatch(/please provide/i);
    expect(safeErrorMessage(new Error("Must be a string"))).toMatch(/must be/i);
  });

  it("masks NVIDIA errors", () => {
    const err = new Error("NVIDIA NIM API error: HTTP 503");
    expect(safeErrorMessage(err)).toBe("AI service error. Please try again in a moment.");
  });

  it("masks Prisma/database errors", () => {
    const err = new Error("prisma: Unique constraint violation P2002");
    const result = safeErrorMessage(err);
    expect(result).toMatch(/database error/i);
    expect(result).not.toContain("P2002");
  });

  it("masks AbortError / timeout", () => {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    expect(safeErrorMessage(err)).toMatch(/timed out/i);
  });

  it("returns generic message for unknown errors", () => {
    expect(safeErrorMessage(new Error("some unexpected internal thing"))).toBe(
      "Internal server error"
    );
  });

  it("handles non-Error objects", () => {
    expect(safeErrorMessage("string error")).toBe("Internal server error");
    expect(safeErrorMessage(null)).toBe("Internal server error");
    expect(safeErrorMessage(42)).toBe("Internal server error");
  });
});

// ── checkBodySize ─────────────────────────────────────────────────────────────

describe("checkBodySize", () => {
  function makeReqWithContentLength(bytes: number | null): Request {
    const headers: Record<string, string> = {};
    if (bytes !== null) headers["content-length"] = String(bytes);
    return new Request("http://localhost/", { headers });
  }

  it("returns null when body is within limit", () => {
    const req = makeReqWithContentLength(1024);
    expect(checkBodySize(req)).toBeNull();
  });

  it("returns 413 when body exceeds 256 KB", async () => {
    const req = makeReqWithContentLength(300 * 1024);
    const res = checkBodySize(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(413);
    const body = await res!.json() as { error: string };
    expect(body.error).toMatch(/too large/i);
  });

  it("returns null when content-length header is missing", () => {
    const req = makeReqWithContentLength(null);
    expect(checkBodySize(req)).toBeNull();
  });

  it("returns null when content-length is zero", () => {
    const req = makeReqWithContentLength(0);
    expect(checkBodySize(req)).toBeNull();
  });

  it("413 response also has no-store cache control", () => {
    const req = makeReqWithContentLength(999_999);
    const res = checkBodySize(req);
    expect(res!.headers.get("Cache-Control")).toContain("no-store");
  });
});
