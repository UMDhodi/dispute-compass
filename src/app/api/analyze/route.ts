import { NextRequest, NextResponse } from "next/server";
import { callNvidia } from "@/lib/nvidia";
import { ANALYZE_SYSTEM_PROMPT } from "@/lib/prompts";
import { sanitizeText, safeParseJSON } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { text?: unknown; sessionId?: unknown };

    const text = sanitizeText(body.text, 50_000);
    if (text.length < 50) {
      return NextResponse.json({ error: "Document text too short to analyze" }, { status: 400 });
    }

    const userPrompt = `Analyze the following legal document:\n\n---\n${text}\n---`;

    const rawResponse = await callNvidia(ANALYZE_SYSTEM_PROMPT, userPrompt, 3000);

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      rawResponse.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse;

    const result = safeParseJSON(jsonStr.trim());
    if (!result) {
      return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 502 });
    }

    // Persist result if sessionId provided
    if (typeof body.sessionId === "string" && body.sessionId) {
      await prisma.analysisResult.create({
        data: {
          sessionId: body.sessionId,
          module: "analyze",
          inputText: text.slice(0, 500),
          outputJson: JSON.stringify(result),
        },
      });
    }

    return NextResponse.json({ result });
  } catch (err) {
    console.error("[/api/analyze] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
