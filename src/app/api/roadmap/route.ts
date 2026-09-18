import { NextRequest, NextResponse } from "next/server";
import { callNvidia } from "@/lib/nvidia";
import { ROADMAP_SYSTEM_PROMPT } from "@/lib/prompts";
import { sanitizeText, safeParseJSON } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      situation?: unknown;
      documentText?: unknown;
      disputeType?: unknown;
    };

    const situation = sanitizeText(body.situation, 2000);
    const documentText = sanitizeText(body.documentText ?? "", 30_000);
    const disputeType = typeof body.disputeType === "string" ? body.disputeType.slice(0, 100) : "general";

    if (situation.length < 20) {
      return NextResponse.json({ error: "Please describe your situation in more detail" }, { status: 400 });
    }

    const userPrompt = `Dispute type: ${disputeType}

User situation:
${situation}

${documentText ? `Relevant document context:\n${documentText}` : "No document provided — generate general guidance."}

Generate a practical action roadmap for this situation.`;

    const rawResponse = await callNvidia(ROADMAP_SYSTEM_PROMPT, userPrompt, 3000);

    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      rawResponse.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse;

    const result = safeParseJSON(jsonStr.trim());
    if (!result) {
      return NextResponse.json({ error: "Failed to generate roadmap. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ result });
  } catch (err) {
    console.error("[/api/roadmap] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
