import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { pathToFileURL } from "url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function extractPdfText(buffer: Buffer): Promise<string> {
  // Use pdfjs-dist legacy build — runs in Node.js without browser globals like DOMMatrix.
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Build the worker path from process.cwd() (project root).
  // We CANNOT use require.resolve() here — Next.js/webpack replaces it with a
  // numeric module ID at compile time, causing "number.replace is not a function".
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
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Security: check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".pdf")) {
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
    } else if (fileName.endsWith(".docx")) {
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
      // Plain text fallback
      text = buffer.toString("utf-8");
    }

    // Sanitize: strip null bytes, limit length
    text = text.replace(/\0/g, "").trim().slice(0, 50_000);

    return NextResponse.json({ text, fileName: file.name, charCount: text.length });
  } catch (err) {
    console.error("[/api/extract] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to extract text from file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
