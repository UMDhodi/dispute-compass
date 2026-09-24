import { NextRequest, NextResponse } from "next/server";
import { callNvidia } from "@/lib/nvidia";
import { ANALYZE_SYSTEM_PROMPT } from "@/lib/prompts";
import { sanitizeText, safeParseJSON } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";
import { aiLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only allow POST
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

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
    // Enforce content-type
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
    }

    const body = await request.json() as { text?: unknown; sessionId?: unknown };

    let text: string;
    try {
      text = sanitizeText(body.text, 50_000);
    } catch {
      return NextResponse.json({ error: "Document text must be a non-empty string" }, { status: 400 });
    }
    if (text.length < 50) {
      return NextResponse.json({ error: "Document text too short to analyze" }, { status: 400 });
    }

    // Validate sessionId is a safe UUID/alphanumeric string if provided
    const sessionId =
      typeof body.sessionId === "string" && /^[\w-]{1,64}$/.test(body.sessionId)
        ? body.sessionId
        : null;

    const userPrompt = `Analyze the following legal document:\n\n---\n${text}\n---`;

    const rawResponse = await callNvidia(ANALYZE_SYSTEM_PROMPT, userPrompt, 3000);

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch =
      rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      rawResponse.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse;

    const result = safeParseJSON(jsonStr.trim());
    if (!result) {
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 502 }
      );
    }

    // Persist result if sessionId provided
    if (sessionId) {
      await prisma.analysisResult.create({
        data: {
          sessionId,
          module: "analyze",
          // Store only a short snippet — avoid persisting full PII-laden text
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
