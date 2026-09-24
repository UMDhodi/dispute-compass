import { NextRequest } from "next/server";
import { callNvidia } from "@/lib/nvidia";
import { QA_SYSTEM_PROMPT } from "@/lib/prompts";
import { sanitizeText, sanitizeQuestion, safeParseJSON } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";
import { qaLimiter, getClientIp } from "@/lib/rate-limit";
import { secureJson, safeErrorMessage, checkBodySize } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return secureJson({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = qaLimiter.check(ip);
  if (!rl.allowed) {
    return secureJson(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 60_000) / 1000)) } }
    );
  }

  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return secureJson({ error: "Content-Type must be application/json" }, { status: 415 });
    }

    const body = await request.json() as {
      question?: unknown; documentText?: unknown; sessionId?: unknown;
    };

    let question: string;
    try {
      question = sanitizeQuestion(body.question);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid question";
      return secureJson({ error: msg }, { status: 400 });
    }

    let documentText: string;
    try {
      documentText = sanitizeText(body.documentText, 40_000);
    } catch {
      return secureJson({ error: "Document text must be a string" }, { status: 400 });
    }

    if (documentText.length < 50) {
      return secureJson({ error: "Please provide a document to ask questions about" }, { status: 400 });
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
      return secureJson({
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

    return secureJson({ result });
  } catch (err) {
    console.error("[/api/qa] Error:", err);
    return secureJson({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
