import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { pathToFileURL } from "url";
import { extractLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// Strict allowlist of MIME types we actually process
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
]);

// Allowed file extensions (belt-and-suspenders — never trust MIME alone)
const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md"]);

async function extractPdfText(buffer: Buffer): Promise<string> {
  // Use pdfjs-dist legacy build — runs in Node.js without browser globals like DOMMatrix.
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Build the worker path from process.cwd() (project root).
  const workerPath = path.join(
    process.cwd(),
    "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(pageText);
  }

  return pageTexts.join("\n");
}

export async function POST(request: NextRequest) {
  // ── Rate limit ────────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = extractLimiter.check(ip);
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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // ── Security: file size ────────────────────────────────────────────────
    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 413 });
    }

    // ── Security: extension allowlist ──────────────────────────────────────
    const fileName = file.name.toLowerCase();
    const ext = path.extname(fileName);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF, DOCX, TXT, or MD." },
        { status: 415 }
      );
    }

    // ── Security: MIME-type allowlist ──────────────────────────────────────
    // file.type can be empty for some browsers — skip check if so,
    // but reject if it's present and not in the allowlist.
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type." },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (ext === ".pdf") {
      try {
        text = await extractPdfText(buffer);
      } catch (pdfErr) {
        console.error("[/api/extract] PDF parsing error:", pdfErr);
        const msg = pdfErr instanceof Error ? pdfErr.message : "Failed to parse PDF";
        return NextResponse.json({ error: `Could not extract PDF text: ${msg}` }, { status: 422 });
      }

      if (!text.trim()) {
        return NextResponse.json(
          { error: "This PDF contains no readable text. It may be scanned or image-only." },
          { status: 422 }
        );
      }
    } else if (ext === ".docx") {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || "";
      } catch (docxErr) {
        console.error("[/api/extract] DOCX parsing error:", docxErr);
        const msg = docxErr instanceof Error ? docxErr.message : "Failed to parse DOCX";
        return NextResponse.json({ error: `Could not extract DOCX text: ${msg}` }, { status: 422 });
      }

      if (!text.trim()) {
        return NextResponse.json(
          { error: "The DOCX document is empty." },
          { status: 422 }
        );
      }
    } else {
      // Plain text / markdown
      text = buffer.toString("utf-8");
    }

    // Sanitize: strip null bytes and control characters, limit length
    text = text
      .replace(/\0/g, "")
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim()
      .slice(0, 50_000);

    return NextResponse.json({ text, fileName: file.name, charCount: text.length });
  } catch (err) {
    console.error("[/api/extract] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to extract text from file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
