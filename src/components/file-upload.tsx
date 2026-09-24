"use client";

import { useCallback, useId, useState } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onTextExtracted: (text: string, fileName: string) => void;
  label?: string;
  accept?: string;
  maxSizeMb?: number;
  className?: string;
}

const MAX_CHARS = 50_000;

export function FileUpload({
  onTextExtracted,
  label = "Upload Document",
  accept = ".txt,.md,.pdf,.docx",
  maxSizeMb = 5,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Unique IDs for accessible label/description wiring
  const inputId = useId();
  const errorId = useId();
  const statusId = useId();

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(`File too large. Max size is ${maxSizeMb}MB.`);
        return;
      }

      setLoading(true);
      setFileName(file.name);

      try {
        let text = "";

        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          // Use API to extract PDF text
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/extract", { method: "POST", body: formData });
          if (!res.ok) {
            const errData = await res.json().catch(() => null) as { error?: string } | null;
            throw new Error(errData?.error || "Failed to extract PDF text");
          }
          const data = await res.json() as { text: string };
          text = data.text;
        } else if (
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.name.endsWith(".docx")
        ) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/extract", { method: "POST", body: formData });
          if (!res.ok) {
            const errData = await res.json().catch(() => null) as { error?: string } | null;
            throw new Error(errData?.error || "Failed to extract DOCX text");
          }
          const data = await res.json() as { text: string };
          text = data.text;
        } else {
          text = await file.text();
        }

        const truncated = text.slice(0, MAX_CHARS);
        onTextExtracted(truncated, file.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to read file");
        setFileName(null);
      } finally {
        setLoading(false);
      }
    },
    [onTextExtracted, maxSizeMb]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  const clearFile = () => {
    setFileName(null);
    setError(null);
  };

  return (
    <div className={className}>
      {/* Visually-hidden label keeps the region labelled for AT */}
      <label
        htmlFor={inputId}
        className={cn(
          "relative flex flex-col items-center justify-center w-full rounded-[var(--radius-lg)] border-2 border-dashed cursor-pointer transition-all duration-200",
          isDragging
            ? "border-[var(--brand-500)] bg-[var(--brand-50)]"
            : fileName
            ? "border-[var(--risk-safe-border)] bg-[var(--risk-safe-bg)]"
            : "border-[var(--border)] bg-[var(--surface-subtle)] hover:border-[var(--brand-500)] hover:bg-[var(--brand-50)]",
          loading && "opacity-70 cursor-wait"
        )}
        style={{ minHeight: "140px", padding: "1.5rem" }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        // Accessibility: announce drag-and-drop affordance to screen readers
        aria-describedby={error ? errorId : statusId}
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="sr-only"
          disabled={loading}
          aria-label={label}
          aria-busy={loading}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : statusId}
        />

        {/* Live region announces file-load status to screen readers */}
        <span id={statusId} className="sr-only" aria-live="polite" aria-atomic="true">
          {loading ? "Reading file, please wait…" : fileName ? `File loaded: ${fileName}` : ""}
        </span>

        {loading ? (
          <div className="flex flex-col items-center gap-2" role="status" aria-label="Loading file">
            <div
              className="w-8 h-8 border-2 border-[var(--brand-500)] border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Reading file…</span>
          </div>
        ) : fileName ? (
          <div className="flex flex-col items-center gap-2">
            <FileText size={28} style={{ color: "var(--risk-safe)" }} aria-hidden="true" />
            <span className="text-sm font-medium text-center" style={{ color: "var(--text-primary)" }}>
              {fileName}
            </span>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); clearFile(); }}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]"
              style={{ color: "var(--text-muted)", background: "var(--border)" }}
              aria-label={`Remove ${fileName}`}
            >
              <X size={12} aria-hidden="true" /> Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <Upload size={28} style={{ color: "var(--brand-500)" }} aria-hidden="true" />
            <div>
              <span className="text-sm font-medium" style={{ color: "var(--brand-500)" }}>{label}</span>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}> or drag &amp; drop</span>
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              TXT, MD, PDF, DOCX · Max {maxSizeMb}MB
            </span>
          </div>
        )}
      </label>

      {error && (
        <div
          id={errorId}
          role="alert"
          className="mt-2 flex items-center gap-1.5 text-sm"
          style={{ color: "var(--risk-critical)" }}
        >
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}
