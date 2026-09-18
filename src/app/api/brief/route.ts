import { NextRequest, NextResponse } from "next/server";
import { callNvidia } from "@/lib/nvidia";
import { BRIEF_SYSTEM_PROMPT } from "@/lib/prompts";
import { sanitizeText, safeParseJSON } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      situation?: unknown;
      documentText?: unknown;
      briefType?: unknown;
      yourName?: unknown;
      recipientName?: unknown;
    };

    const situation = sanitizeText(body.situation, 3000);
    const documentText = sanitizeText(body.documentText ?? "", 25_000);
    const briefType = typeof body.briefType === "string" ? body.briefType.slice(0, 100) : "Demand Letter";
    const yourName = sanitizeText(body.yourName ?? "The Complainant", 200);
    const recipientName = sanitizeText(body.recipientName ?? "The Respondent", 200);

    if (situation.length < 30) {
      return NextResponse.json({ error: "Please describe your situation in detail" }, { status: 400 });
    }

    const userPrompt = `Generate a ${briefType}.

Your name / role: ${yourName}
Recipient: ${recipientName}

Situation:
${situation}

${documentText ? `Supporting document:\n${documentText}` : "No supporting document provided."}

Generate a professional, complete ${briefType} based on this information.`;

    const rawResponse = await callNvidia(BRIEF_SYSTEM_PROMPT, userPrompt, 4000);

    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      rawResponse.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse;

    const result = safeParseJSON(jsonStr.trim());
    if (!result) {
      return NextResponse.json({ error: "Failed to generate brief. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ result });
  } catch (err) {
    console.error("[/api/brief] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
