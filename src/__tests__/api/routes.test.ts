/**
 * Integration-style tests for the API routes.
 *
 * We mock external dependencies (NVIDIA client, Prisma) so these run
 * entirely offline — no real API keys or database needed.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock the NVIDIA client
jest.mock("@/lib/nvidia", () => ({
  callNvidia: jest.fn(),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    analysisResult: {
      create: jest.fn().mockResolvedValue({}),
    },
    chatMessage: {
      createMany: jest.fn().mockResolvedValue({}),
    },
  },
}));

import { callNvidia } from "@/lib/nvidia";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, contentType = "application/json"): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": contentType },
    body: JSON.stringify(body),
  });
}

const VALID_ANALYZE_BODY = {
  text: "This agreement is entered into by Party A and Party B. ".repeat(5),
};

const VALID_AI_JSON = JSON.stringify({
  summary: "Test summary",
  documentType: "Contract",
  parties: ["Party A", "Party B"],
  overallRiskLevel: "safe",
  keyDates: [],
  clauses: [],
  obligations: [],
  redFlags: [],
  missingClauses: [],
  disclaimer: "Not legal advice.",
});

// ── /api/analyze route ────────────────────────────────────────────────────────

describe("/api/analyze route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (callNvidia as jest.Mock).mockResolvedValue(VALID_AI_JSON);
  });

  it("returns 415 for wrong content-type", async () => {
    const { POST } = await import("@/app/api/analyze/route");
    const req = makeRequest(VALID_ANALYZE_BODY, "text/plain");
    const res = await POST(req as never);
    expect(res.status).toBe(415);
  });

  it("returns 400 for too-short text", async () => {
    const { POST } = await import("@/app/api/analyze/route");
    const req = makeRequest({ text: "short" });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/too short/i);
  });

  it("returns 400 for non-string text", async () => {
    const { POST } = await import("@/app/api/analyze/route");
    const req = makeRequest({ text: 12345 });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 200 with result for valid input", async () => {
    const { POST } = await import("@/app/api/analyze/route");
    const req = makeRequest(VALID_ANALYZE_BODY);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const data = await res.json() as { result: unknown };
    expect(data.result).toBeDefined();
  });

  it("returns 502 when AI returns invalid JSON", async () => {
    (callNvidia as jest.Mock).mockResolvedValue("NOT JSON AT ALL");
    const { POST } = await import("@/app/api/analyze/route");
    const req = makeRequest(VALID_ANALYZE_BODY);
    const res = await POST(req as never);
    expect(res.status).toBe(502);
  });

  it("returns 405 for GET requests", async () => {
    const { GET } = await import("@/app/api/analyze/route");
    const res = await GET();
    expect(res.status).toBe(405);
  });
});

// ── /api/compare route ────────────────────────────────────────────────────────

describe("/api/compare route", () => {
  const VALID_COMPARE_BODY = {
    docA: "Contract version one with terms and conditions for parties involved.".repeat(2),
    docB: "Contract version two with updated terms and conditions for parties.".repeat(2),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (callNvidia as jest.Mock).mockResolvedValue(
      JSON.stringify({ differences: [], summary: "No major differences." })
    );
  });

  it("returns 400 when documents are too short", async () => {
    const { POST } = await import("@/app/api/compare/route");
    const req = makeRequest({ docA: "short", docB: "also short" });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 200 for valid comparison", async () => {
    const { POST } = await import("@/app/api/compare/route");
    const req = makeRequest(VALID_COMPARE_BODY);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
  });

  it("returns 405 for GET", async () => {
    const { GET } = await import("@/app/api/compare/route");
    const res = await GET();
    expect(res.status).toBe(405);
  });
});

// ── /api/qa route ─────────────────────────────────────────────────────────────

describe("/api/qa route", () => {
  const VALID_QA_BODY = {
    question: "What are the obligations of Party A?",
    documentText: "Party A must pay $500 monthly. Party B must provide maintenance.".repeat(5),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (callNvidia as jest.Mock).mockResolvedValue(
      JSON.stringify({
        answer: "Party A must pay $500 monthly.",
        relevantClauses: ["Clause 1"],
        confidence: "high",
        confidenceReason: "Direct mention",
        followUpSuggestions: [],
        disclaimer: "Not legal advice.",
      })
    );
  });

  it("returns 400 when document is too short", async () => {
    const { POST } = await import("@/app/api/qa/route");
    const req = makeRequest({ question: "What is this?", documentText: "short" });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when question is too short", async () => {
    const { POST } = await import("@/app/api/qa/route");
    const req = makeRequest({ question: "Hi", documentText: VALID_QA_BODY.documentText });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 200 for valid Q&A", async () => {
    const { POST } = await import("@/app/api/qa/route");
    const req = makeRequest(VALID_QA_BODY);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const data = await res.json() as { result: { answer: string } };
    expect(data.result.answer).toBeDefined();
  });

  it("returns 405 for GET", async () => {
    const { GET } = await import("@/app/api/qa/route");
    const res = await GET();
    expect(res.status).toBe(405);
  });
});

// ── /api/brief route ──────────────────────────────────────────────────────────

describe("/api/brief route", () => {
  const VALID_BRIEF_BODY = {
    situation:
      "My landlord has refused to return my security deposit of $1500 after 60 days without valid reason.",
    briefType: "Demand Letter",
    yourName: "John Doe",
    recipientName: "Jane Smith",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (callNvidia as jest.Mock).mockResolvedValue(
      JSON.stringify({
        subject: "Demand for Return of Security Deposit",
        body: "Dear Jane Smith, ...",
        disclaimer: "Not legal advice.",
      })
    );
  });

  it("returns 400 when situation is too short", async () => {
    const { POST } = await import("@/app/api/brief/route");
    const req = makeRequest({ ...VALID_BRIEF_BODY, situation: "short" });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("defaults to Demand Letter for unknown brief type", async () => {
    const { POST } = await import("@/app/api/brief/route");
    const req = makeRequest({ ...VALID_BRIEF_BODY, briefType: "INJECTED_TYPE" });
    const res = await POST(req as never);
    // Should still succeed (falls back to Demand Letter)
    expect(res.status).toBe(200);
    // Ensure callNvidia was called with "Demand Letter" not the injected type
    const callArgs = (callNvidia as jest.Mock).mock.calls[0][1] as string;
    expect(callArgs).toContain("Demand Letter");
    expect(callArgs).not.toContain("INJECTED_TYPE");
  });

  it("returns 200 for valid brief generation", async () => {
    const { POST } = await import("@/app/api/brief/route");
    const req = makeRequest(VALID_BRIEF_BODY);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
  });

  it("returns 405 for GET", async () => {
    const { GET } = await import("@/app/api/brief/route");
    const res = await GET();
    expect(res.status).toBe(405);
  });
});

// ── /api/roadmap route ────────────────────────────────────────────────────────

describe("/api/roadmap route", () => {
  const VALID_ROADMAP_BODY = {
    situation:
      "I received an unfair eviction notice from my landlord claiming I violated terms I never agreed to.",
    disputeType: "tenant",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (callNvidia as jest.Mock).mockResolvedValue(
      JSON.stringify({
        title: "Tenant Eviction Dispute Plan",
        steps: [],
        disclaimer: "Not legal advice.",
      })
    );
  });

  it("returns 400 when situation is too short", async () => {
    const { POST } = await import("@/app/api/roadmap/route");
    const req = makeRequest({ situation: "short" });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("defaults to 'general' for unknown dispute type", async () => {
    const { POST } = await import("@/app/api/roadmap/route");
    const req = makeRequest({ ...VALID_ROADMAP_BODY, disputeType: "HACKED_TYPE" });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const callArgs = (callNvidia as jest.Mock).mock.calls[0][1] as string;
    expect(callArgs).toContain("general");
    expect(callArgs).not.toContain("HACKED_TYPE");
  });

  it("returns 200 for valid roadmap request", async () => {
    const { POST } = await import("@/app/api/roadmap/route");
    const req = makeRequest(VALID_ROADMAP_BODY);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
  });

  it("returns 405 for GET", async () => {
    const { GET } = await import("@/app/api/roadmap/route");
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
