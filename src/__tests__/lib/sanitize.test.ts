/**
 * Unit tests for src/lib/sanitize.ts
 *
 * Tests cover: happy paths, edge cases, and security-relevant inputs
 * (null bytes, control chars, oversized strings, type errors).
 */

import {
  sanitizeText,
  sanitizeComparePair,
  sanitizeQuestion,
  safeParseJSON,
} from "@/lib/sanitize";

// ── sanitizeText ─────────────────────────────────────────────────────────────

describe("sanitizeText", () => {
  it("passes through normal text unchanged", () => {
    expect(sanitizeText("Hello, world!")).toBe("Hello, world!");
  });

  it("strips null bytes", () => {
    expect(sanitizeText("foo\x00bar")).toBe("foobar");
  });

  it("strips dangerous control characters but keeps tab, newline, carriage return", () => {
    const input = "a\x01b\x02c\td\ne\rf";
    const result = sanitizeText(input);
    expect(result).toContain("abc"); // control chars stripped
    expect(result).toContain("\t");  // tab preserved
    expect(result).toContain("\n");  // newline preserved
    expect(result).toContain("\r");  // CR preserved
  });

  it("truncates to maxLength", () => {
    const longStr = "a".repeat(100);
    expect(sanitizeText(longStr, 10)).toHaveLength(10);
  });

  it("trims leading/trailing whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("throws TypeError for non-string input", () => {
    expect(() => sanitizeText(42)).toThrow(TypeError);
    expect(() => sanitizeText(null)).toThrow(TypeError);
    expect(() => sanitizeText(undefined)).toThrow(TypeError);
    expect(() => sanitizeText({})).toThrow(TypeError);
  });

  it("handles empty string", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("handles string of exactly maxLength", () => {
    const str = "a".repeat(50);
    expect(sanitizeText(str, 50)).toHaveLength(50);
  });

  it("handles unicode text correctly", () => {
    const input = "Ünïcödé chàracters ñoño";
    expect(sanitizeText(input)).toBe(input);
  });
});

// ── sanitizeComparePair ──────────────────────────────────────────────────────

describe("sanitizeComparePair", () => {
  it("sanitizes both documents", () => {
    const result = sanitizeComparePair("doc A\x00", "doc B\x01");
    expect(result.docA).toBe("doc A");
    expect(result.docB).toBe("doc B");
  });

  it("truncates each doc to 25 000 chars", () => {
    const longDoc = "x".repeat(30_000);
    const result = sanitizeComparePair(longDoc, longDoc);
    expect(result.docA).toHaveLength(25_000);
    expect(result.docB).toHaveLength(25_000);
  });

  it("throws TypeError if either input is not a string", () => {
    expect(() => sanitizeComparePair(42, "doc")).toThrow(TypeError);
    expect(() => sanitizeComparePair("doc", null)).toThrow(TypeError);
  });
});

// ── sanitizeQuestion ─────────────────────────────────────────────────────────

describe("sanitizeQuestion", () => {
  it("returns a valid question unchanged", () => {
    expect(sanitizeQuestion("What does clause 3 mean?")).toBe(
      "What does clause 3 mean?"
    );
  });

  it("throws RangeError for question shorter than 3 chars", () => {
    expect(() => sanitizeQuestion("Hi")).toThrow(RangeError);
    expect(() => sanitizeQuestion("")).toThrow(RangeError);
  });

  it("strips null bytes from questions", () => {
    expect(sanitizeQuestion("What\x00 is this?")).toBe("What is this?");
  });

  it("truncates to 2000 chars", () => {
    const longQuestion = "What? ".repeat(400); // 2400 chars
    expect(sanitizeQuestion(longQuestion).length).toBeLessThanOrEqual(2000);
  });

  it("throws TypeError for non-string input", () => {
    expect(() => sanitizeQuestion(42)).toThrow(TypeError);
  });
});

// ── safeParseJSON ────────────────────────────────────────────────────────────

describe("safeParseJSON", () => {
  it("parses valid JSON object", () => {
    expect(safeParseJSON('{"key": "value"}')).toEqual({ key: "value" });
  });

  it("parses valid JSON array", () => {
    expect(safeParseJSON("[1, 2, 3]")).toEqual([1, 2, 3]);
  });

  it("returns null for invalid JSON", () => {
    expect(safeParseJSON("{invalid json}")).toBeNull();
    expect(safeParseJSON("")).toBeNull();
    expect(safeParseJSON("undefined")).toBeNull();
  });

  it("returns null for JSON with trailing garbage", () => {
    expect(safeParseJSON('{"a":1}garbage')).toBeNull();
  });

  it("handles nested objects", () => {
    const input = '{"a": {"b": [1,2,3]}}';
    expect(safeParseJSON(input)).toEqual({ a: { b: [1, 2, 3] } });
  });
});
