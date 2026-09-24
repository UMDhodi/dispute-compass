import { NextRequest } from "next/server";
import { callNvidia } from "@/lib/nvidia";
import { COMPARE_SYSTEM_PROMPT } from "@/lib/prompts";
import { sanitizeComparePair, safeParseJSON } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";
import { aiLimiter, getClientIp } from "@/lib/rate-limit";
import { secureJson, safeErrorMessage, checkBodySize } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return secureJson({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = aiLimiter.check(ip);
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
      docA?: unknown; docB?: unknown;
      labelA?: unknown; labelB?: unknown;
      sessionId?: unknown;
    };

    const { docA, docB } = sanitizeComparePair(body.docA, body.docB);

    if (docA.length < 50 || docB.length < 50) {
      return secureJson({ error: "Both documents must have meaningful content" }, { status: 400 });
    }

    const labelA =
      typeof body.labelA === "string" ? body.labelA.replace(/[<>"']/g, "").slice(0, 100) : "Document A";
    const labelB =
      typeof body.labelB === "string" ? body.labelB.replace(/[<>"']/g, "").slice(0, 100) : "Document B";

    const sessionId =
      typeof body.sessionId === "string" && /^[\w-]{1,64}$/.test(body.sessionId)
        ? body.sessionId
        : null;

    const userPrompt = `Compare these two legal documents.\n\n=== ${labelA} ===\n${docA}\n\n=== ${labelB} ===\n${docB}\n\nIdentify all significant differences between them.`;

    const rawResponse = await callNvidia(COMPARE_SYSTEM_PROMPT, userPrompt, 3000);

    const jsonMatch =
      rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      rawResponse.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse;

    const result = safeParseJSON(jsonStr.trim());
    if (!result) {
      return secureJson({ error: "Failed to parse AI comparison. Please try again." }, { status: 502 });
    }

    if (sessionId) {
      await prisma.analysisResult.create({
        data: { sessionId, module: "compare", inputText: `${labelA} vs ${labelB}`, outputJson: JSON.stringify(result) },
      });
    }

    return secureJson({ result });
  } catch (err) {
    console.error("[/api/compare] Error:", err);
    return secureJson({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
