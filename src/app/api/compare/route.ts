import { NextRequest, NextResponse } from "next/server";
import { callNvidia } from "@/lib/nvidia";
import { COMPARE_SYSTEM_PROMPT } from "@/lib/prompts";
import { sanitizeComparePair, safeParseJSON } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      docA?: unknown;
      docB?: unknown;
      labelA?: unknown;
      labelB?: unknown;
      sessionId?: unknown;
    };

    const { docA, docB } = sanitizeComparePair(body.docA, body.docB);

    if (docA.length < 50 || docB.length < 50) {
      return NextResponse.json({ error: "Both documents must have meaningful content" }, { status: 400 });
    }

    const labelA = typeof body.labelA === "string" ? body.labelA.slice(0, 100) : "Document A";
    const labelB = typeof body.labelB === "string" ? body.labelB.slice(0, 100) : "Document B";

    const userPrompt = `Compare these two legal documents.

=== ${labelA} ===
${docA}

=== ${labelB} ===
${docB}

Identify all significant differences between them.`;

    const rawResponse = await callNvidia(COMPARE_SYSTEM_PROMPT, userPrompt, 3000);

    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      rawResponse.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse;

    const result = safeParseJSON(jsonStr.trim());
    if (!result) {
      return NextResponse.json({ error: "Failed to parse AI comparison. Please try again." }, { status: 502 });
    }

    if (typeof body.sessionId === "string" && body.sessionId) {
      await prisma.analysisResult.create({
        data: {
          sessionId: body.sessionId,
          module: "compare",
          inputText: `${labelA} vs ${labelB}`,
          outputJson: JSON.stringify(result),
        },
      });
    }

    return NextResponse.json({ result });
  } catch (err) {
    console.error("[/api/compare] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
