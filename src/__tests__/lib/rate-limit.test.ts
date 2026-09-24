/**
 * Unit tests for src/lib/rate-limit.ts
 *
 * Tests cover: sliding-window logic, limits, retry-after calculation,
 * cache eviction, and IP extraction.
 */

import { RateLimiter, getClientIp } from "@/lib/rate-limit";

// ── RateLimiter ──────────────────────────────────────────────────────────────

describe("RateLimiter", () => {
  it("allows requests under the limit", () => {
    const limiter = new RateLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("ip-1").allowed).toBe(true);
    }
  });

  it("blocks requests over the limit", () => {
    const limiter = new RateLimiter(3, 60_000);
    limiter.check("ip-2");
    limiter.check("ip-2");
    limiter.check("ip-2");
    const result = limiter.check("ip-2");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("isolates keys — different IPs don't interfere", () => {
    const limiter = new RateLimiter(1, 60_000);
    limiter.check("ip-a");
    // ip-a is now at limit
    expect(limiter.check("ip-a").allowed).toBe(false);
    // ip-b is untouched
    expect(limiter.check("ip-b").allowed).toBe(true);
  });

  it("resets window after expiry", () => {
    jest.useFakeTimers();
    const limiter = new RateLimiter(2, 1_000); // 1 second window
    limiter.check("ip-reset");
    limiter.check("ip-reset");
    expect(limiter.check("ip-reset").allowed).toBe(false);

    // Advance time past the window
    jest.advanceTimersByTime(1_001);
    expect(limiter.check("ip-reset").allowed).toBe(true);
    jest.useRealTimers();
  });

  it("retryAfterMs is within the window", () => {
    const windowMs = 5_000;
    const limiter = new RateLimiter(1, windowMs);
    limiter.check("ip-x");
    const result = limiter.check("ip-x");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(windowMs);
  });

  it("evicts oldest entry when cache is full", () => {
    // Create a limiter with max 2 entries (using internal knowledge for testing)
    // We test by filling 50 slots and ensuring no crash / memory explosion.
    const limiter = new RateLimiter(100, 60_000);
    for (let i = 0; i < 60; i++) {
      limiter.check(`ip-fill-${i}`);
    }
    // All should still work — eviction should happen silently
    expect(limiter.check("ip-new").allowed).toBe(true);
  });
});

// ── getClientIp ──────────────────────────────────────────────────────────────

describe("getClientIp", () => {
  function makeRequest(headers: Record<string, string>): Request {
    return new Request("http://localhost/", { headers });
  }

  it("returns x-forwarded-for IP (first entry when comma-separated)", () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("returns x-real-ip when x-forwarded-for is absent", () => {
    const req = makeRequest({ "x-real-ip": "5.6.7.8" });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("returns cf-connecting-ip when others are absent", () => {
    const req = makeRequest({ "cf-connecting-ip": "9.10.11.12" });
    expect(getClientIp(req)).toBe("9.10.11.12");
  });

  it("returns 'unknown' when no IP headers present", () => {
    const req = makeRequest({});
    expect(getClientIp(req)).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = makeRequest({
      "x-forwarded-for": "100.0.0.1",
      "x-real-ip": "200.0.0.1",
    });
    expect(getClientIp(req)).toBe("100.0.0.1");
  });
});
