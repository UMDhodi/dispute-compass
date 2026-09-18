import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      // Use require() to avoid ESM/CJS interop issues with pdf-parse
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (fileName.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      // Plain text fallback
      text = buffer.toString("utf-8");
    }

    // Sanitize: strip null bytes, limit length
    text = text.replace(/\0/g, "").trim().slice(0, 50_000);

    return NextResponse.json({ text, fileName: file.name, charCount: text.length });
  } catch (err) {
    console.error("[/api/extract] Error:", err);
    return NextResponse.json({ error: "Failed to extract text from file" }, { status: 500 });
  }
}
