import { NextRequest, NextResponse } from "next/server";
import { callNvidia } from "@/lib/nvidia";
import { QA_SYSTEM_PROMPT } from "@/lib/prompts";
import { sanitizeText, sanitizeQuestion, safeParseJSON } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      question?: unknown;
      documentText?: unknown;
      sessionId?: unknown;
    };

    const question = sanitizeQuestion(body.question);
    const documentText = sanitizeText(body.documentText, 40_000);

    if (documentText.length < 50) {
      return NextResponse.json({ error: "Please provide a document to ask questions about" }, { status: 400 });
    }

    const systemWithDoc = `${QA_SYSTEM_PROMPT}

DOCUMENT CONTENT:
---
${documentText}
---

Answer ONLY based on the above document.`;

    const userPrompt = `Question: ${question}`;

    const rawResponse = await callNvidia(systemWithDoc, userPrompt, 1500);

    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      rawResponse.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse;

    const result = safeParseJSON(jsonStr.trim());
    if (!result) {
      // Return as plain text if JSON parse fails
      return NextResponse.json({
        result: {
          answer: rawResponse,
          relevantClauses: [],
          confidence: "low",
          confidenceReason: "Response could not be structured",
          followUpSuggestions: [],
          disclaimer: "This response is informational only, not legal advice.",
        },
      });
    }

    // Save chat messages if sessionId provided
    if (typeof body.sessionId === "string" && body.sessionId) {
      await prisma.chatMessage.createMany({
        data: [
          { sessionId: body.sessionId, role: "user", content: question },
          {
            sessionId: body.sessionId,
            role: "assistant",
            content: typeof result === "object" && result !== null && "answer" in result
              ? String((result as Record<string, unknown>).answer)
              : rawResponse,
          },
        ],
      });
    }

    return NextResponse.json({ result });
  } catch (err) {
    console.error("[/api/qa] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
