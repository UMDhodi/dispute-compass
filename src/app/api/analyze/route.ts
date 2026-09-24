import { NextRequest } from "next/server";
import { callNvidia } from "@/lib/nvidia";
import { ANALYZE_SYSTEM_PROMPT } from "@/lib/prompts";
import { sanitizeText, safeParseJSON } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";
import { aiLimiter, getClientIp } from "@/lib/rate-limit";
import { secureJson, safeErrorMessage, checkBodySize } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return secureJson({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: NextRequest) {
  // ── Rate limit ──────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = aiLimiter.check(ip);
  if (!rl.allowed) {
    return secureJson(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 60_000) / 1000)) } }
    );
  }

  // ── Body size guard ─────────────────────────────────────────────────────
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return secureJson({ error: "Content-Type must be application/json" }, { status: 415 });
    }

    const body = await request.json() as { text?: unknown; sessionId?: unknown };

    let text: string;
    try {
      text = sanitizeText(body.text, 50_000);
    } catch {
      return secureJson({ error: "Document text must be a non-empty string" }, { status: 400 });
    }
    if (text.length < 50) {
      return secureJson({ error: "Document text too short to analyze" }, { status: 400 });
    }

    const sessionId =
      typeof body.sessionId === "string" && /^[\w-]{1,64}$/.test(body.sessionId)
        ? body.sessionId
        : null;

    const userPrompt = `Analyze the following legal document:\n\n---\n${text}\n---`;
    const rawResponse = await callNvidia(ANALYZE_SYSTEM_PROMPT, userPrompt, 3000);

    const jsonMatch =
      rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      rawResponse.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse;

    const result = safeParseJSON(jsonStr.trim());
    if (!result) {
      return secureJson({ error: "Failed to parse AI response. Please try again." }, { status: 502 });
    }

    if (sessionId) {
      await prisma.analysisResult.create({
        data: { sessionId, module: "analyze", inputText: text.slice(0, 500), outputJson: JSON.stringify(result) },
      });
    }

    return secureJson({ result });
  } catch (err) {
    console.error("[/api/analyze] Error:", err);
    return secureJson({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
