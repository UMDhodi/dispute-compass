import { NextRequest, NextResponse } from "next/server";
import { callNvidia } from "@/lib/nvidia";
import { ROADMAP_SYSTEM_PROMPT } from "@/lib/prompts";
import { sanitizeText, safeParseJSON } from "@/lib/sanitize";
import { aiLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// Allowlist for dispute types to prevent prompt injection
const ALLOWED_DISPUTE_TYPES = new Set([
  "tenant",
  "landlord",
  "consumer",
  "employment",
  "contract",
  "insurance",
  "debt",
  "family",
  "neighbour",
  "general",
]);

export async function POST(request: NextRequest) {
  // ── Rate limit ──────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = aiLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 60_000) / 1000)) },
      }
    );
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
    }

    const body = await request.json() as {
      situation?: unknown;
      documentText?: unknown;
      disputeType?: unknown;
    };

    const situation = sanitizeText(body.situation, 2000);
    const documentText = sanitizeText(body.documentText ?? "", 30_000);

    // Validate disputeType against allowlist
    const rawDisputeType = typeof body.disputeType === "string" ? body.disputeType.toLowerCase() : "";
    const disputeType = ALLOWED_DISPUTE_TYPES.has(rawDisputeType) ? rawDisputeType : "general";

    if (situation.length < 20) {
      return NextResponse.json(
        { error: "Please describe your situation in more detail" },
        { status: 400 }
      );
    }

    const userPrompt = `Dispute type: ${disputeType}\n\nUser situation:\n${situation}\n\n${documentText ? `Relevant document context:\n${documentText}` : "No document provided — generate general guidance."}\n\nGenerate a practical action roadmap for this situation.`;

    const rawResponse = await callNvidia(ROADMAP_SYSTEM_PROMPT, userPrompt, 3000);

    const jsonMatch =
      rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      rawResponse.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse;

    const result = safeParseJSON(jsonStr.trim());
    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate roadmap. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ result });
  } catch (err) {
    console.error("[/api/roadmap] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
