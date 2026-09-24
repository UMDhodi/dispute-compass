import { NextRequest, NextResponse } from "next/server";
import { callNvidia } from "@/lib/nvidia";
import { QA_SYSTEM_PROMPT } from "@/lib/prompts";
import { sanitizeText, sanitizeQuestion, safeParseJSON } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";
import { qaLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: NextRequest) {
  // ── Rate limit ──────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = qaLimiter.check(ip);
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
      question?: unknown;
      documentText?: unknown;
      sessionId?: unknown;
    };

    let question: string;
    try {
      question = sanitizeQuestion(body.question);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid question";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    let documentText: string;
    try {
      documentText = sanitizeText(body.documentText, 40_000);
    } catch {
      return NextResponse.json({ error: "Document text must be a string" }, { status: 400 });
    }

    if (documentText.length < 50) {
      return NextResponse.json(
        { error: "Please provide a document to ask questions about" },
        { status: 400 }
      );
    }

    const sessionId =
      typeof body.sessionId === "string" && /^[\w-]{1,64}$/.test(body.sessionId)
        ? body.sessionId
        : null;

    const systemWithDoc = `${QA_SYSTEM_PROMPT}\n\nDOCUMENT CONTENT:\n---\n${documentText}\n---\n\nAnswer ONLY based on the above document.`;
    const userPrompt = `Question: ${question}`;

    const rawResponse = await callNvidia(systemWithDoc, userPrompt, 1500);

    const jsonMatch =
      rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ??
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

    if (sessionId) {
      await prisma.chatMessage.createMany({
        data: [
          { sessionId, role: "user", content: question },
          {
            sessionId,
            role: "assistant",
            content:
              typeof result === "object" && result !== null && "answer" in result
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
