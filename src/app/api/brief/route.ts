import { NextRequest } from "next/server";
import { callNvidia } from "@/lib/nvidia";
import { BRIEF_SYSTEM_PROMPT } from "@/lib/prompts";
import { sanitizeText, safeParseJSON } from "@/lib/sanitize";
import { aiLimiter, getClientIp } from "@/lib/rate-limit";
import { secureJson, safeErrorMessage, checkBodySize } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return secureJson({ error: "Method not allowed" }, { status: 405 });
}

// Allowlist for brief types to prevent prompt injection via that field
const ALLOWED_BRIEF_TYPES = new Set([
  "Demand Letter",
  "Legal Notice",
  "Complaint Letter",
  "Dispute Summary",
  "Cease and Desist",
  "Settlement Proposal",
]);

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

  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return secureJson({ error: "Content-Type must be application/json" }, { status: 415 });
    }

    const body = await request.json() as {
      situation?: unknown;
      documentText?: unknown;
      briefType?: unknown;
      yourName?: unknown;
      recipientName?: unknown;
    };

    const situation = sanitizeText(body.situation, 3000);
    const documentText = sanitizeText(body.documentText ?? "", 25_000);

    // Validate briefType against allowlist
    const rawBriefType = typeof body.briefType === "string" ? body.briefType : "";
    const briefType = ALLOWED_BRIEF_TYPES.has(rawBriefType) ? rawBriefType : "Demand Letter";

    const yourName = sanitizeText(body.yourName ?? "The Complainant", 200);
    const recipientName = sanitizeText(body.recipientName ?? "The Respondent", 200);

    if (situation.length < 30) {
      return secureJson({ error: "Please describe your situation in detail" }, { status: 400 });
    }

    const userPrompt = `Generate a ${briefType}.\n\nYour name / role: ${yourName}\nRecipient: ${recipientName}\n\nSituation:\n${situation}\n\n${documentText ? `Supporting document:\n${documentText}` : "No supporting document provided."}\n\nGenerate a professional, complete ${briefType} based on this information.`;

    const rawResponse = await callNvidia(BRIEF_SYSTEM_PROMPT, userPrompt, 4000);

    const jsonMatch =
      rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      rawResponse.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse;

    const result = safeParseJSON(jsonStr.trim());
    if (!result) {
      return secureJson({ error: "Failed to generate brief. Please try again." }, { status: 502 });
    }

    return secureJson({ result });
  } catch (err) {
    console.error("[/api/brief] Error:", err);
    return secureJson({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
