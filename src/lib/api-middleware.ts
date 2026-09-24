/**
 * Shared API middleware utilities.
 *
 * Provides:
 * - Standard secure response headers (Cache-Control, X-Content-Type-Options, X-Request-ID)
 * - Safe error formatting (strips internal stack traces from client responses)
 * - Request body size guard
 */

import { NextResponse } from "next/server";

// ── Secure Response Headers ────────────────────────────────────────────────────

const SECURE_HEADERS: Record<string, string> = {
  // Never cache API responses in browser or proxy — they contain personal legal data
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Pragma": "no-cache",
  // Belt-and-suspenders (also set globally in next.config.ts)
  "X-Content-Type-Options": "nosniff",
};

/**
 * Wrap a NextResponse with standard secure API headers
 * and a unique X-Request-ID for tracing.
 */
export function secureJson(
  body: unknown,
  options?: { status?: number; headers?: Record<string, string> }
): NextResponse {
  const status = options?.status ?? 200;
  const res = NextResponse.json(body, { status });

  // Apply secure headers
  for (const [k, v] of Object.entries(SECURE_HEADERS)) {
    res.headers.set(k, v);
  }

  // Unique request ID for log correlation (never leaked from user input)
  res.headers.set("X-Request-ID", generateRequestId());

  // Caller-provided headers (e.g. Retry-After)
  if (options?.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      res.headers.set(k, v);
    }
  }

  return res;
}

/** Cryptographically weak but fast ID — only used for log correlation, not security. */
function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Safe Error Formatting ─────────────────────────────────────────────────────

/**
 * Convert an unknown error into a safe client-facing message.
 * Strips stack traces, file paths, and internal NVIDIA/Prisma details.
 */
export function safeErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Internal server error";

  const msg = err.message;

  // These are expected user-facing errors — pass them through
  const userFacingPatterns = [
    /too short/i,
    /too large/i,
    /must be/i,
    /please provide/i,
    /please describe/i,
    /unsupported file/i,
    /no readable text/i,
    /empty/i,
    /too many requests/i,
    /failed to extract/i,
    /could not extract/i,
  ];
  if (userFacingPatterns.some((p) => p.test(msg))) return msg;

  // NVIDIA errors — show status code but not the raw body which may leak tokens
  if (msg.startsWith("NVIDIA NIM")) return "AI service error. Please try again in a moment.";

  // Prisma/DB errors — never expose schema details
  if (msg.includes("prisma") || msg.includes("database") || msg.toLowerCase().includes("p2")) {
    return "A database error occurred. Please try again.";
  }

  // AbortError / timeout
  if (err.name === "AbortError" || msg.includes("timed out") || msg.includes("abort")) {
    return "The request timed out. Please try again.";
  }

  return "Internal server error";
}

// ── Body Size Guard ───────────────────────────────────────────────────────────

const MAX_JSON_BODY_BYTES = 256 * 1024; // 256 KB

/**
 * Guard against oversized JSON bodies.
 * Call before `request.json()` in routes that accept large payloads.
 */
export function checkBodySize(request: Request): NextResponse | null {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    if (!isNaN(bytes) && bytes > MAX_JSON_BODY_BYTES) {
      return secureJson(
        { error: "Request body too large. Maximum 256 KB." },
        { status: 413 }
      );
    }
  }
  return null;
}
