/**
 * Sanitize user-supplied text input.
 * Strips null bytes, controls, and caps length to prevent prompt injection and abuse.
 */
export function sanitizeText(input: unknown, maxLength = 50_000): string {
  if (typeof input !== "string") {
    throw new TypeError("Input must be a string");
  }
  return input
    .replace(/\0/g, "") // strip null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control chars (keep \t \n \r)
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate and sanitize a document text pair for comparison.
 */
export function sanitizeComparePair(
  docA: unknown,
  docB: unknown
): { docA: string; docB: string } {
  return {
    docA: sanitizeText(docA, 25_000),
    docB: sanitizeText(docB, 25_000),
  };
}

/**
 * Validate a question string (for Q&A module).
 */
export function sanitizeQuestion(question: unknown): string {
  const clean = sanitizeText(question, 2000);
  if (clean.length < 3) {
    throw new RangeError("Question too short");
  }
  return clean;
}

/**
 * Safely parse JSON, returning null on failure.
 */
export function safeParseJSON<T = unknown>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
