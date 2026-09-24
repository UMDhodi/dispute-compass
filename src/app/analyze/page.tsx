"use client";

import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { RiskBadge } from "@/components/risk-badge";
import { DisclaimerBanner, InlineDisclaimer } from "@/components/disclaimer-banner";
import { FileSearch, ChevronDown, ChevronUp, Loader2, AlertCircle, Download } from "lucide-react";

interface Clause {
  id: string;
  title: string;
  originalText: string;
  plainEnglish: string;
  riskLevel: "critical" | "warning" | "safe" | "neutral";
  riskReason: string;
  category: string;
}

interface AnalysisResult {
  summary: string;
  documentType: string;
  parties: string[];
  overallRiskLevel: "critical" | "warning" | "safe";
  keyDates: { label: string; date: string }[];
  clauses: Clause[];
  obligations: string[];
  redFlags: string[];
  missingClauses: string[];
  disclaimer: string;
}

function ClauseCard({ clause }: { clause: Clause }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="card overflow-hidden"
      style={{
        borderLeft: `3px solid var(--risk-${clause.riskLevel === "neutral" ? "neutral" : clause.riskLevel})`,
      }}
    >
      <button
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-inset"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={`clause-body-${clause.id}`}
        aria-label={`${expanded ? "Collapse" : "Expand"} clause: ${clause.title}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <RiskBadge level={clause.riskLevel} size="sm" />
          <span className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
            {clause.title}
          </span>
          <span
            className="hidden sm:inline text-xs px-2 py-0.5 rounded-full"
            style={{ background: "var(--surface-subtle)", color: "var(--text-muted)" }}
          >
            {clause.category}
          </span>
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} className="flex-shrink-0" /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} className="flex-shrink-0" />}
      </button>

      {expanded && (
        <div id={`clause-body-${clause.id}`} className="px-5 pb-5 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="pt-4 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>
                Plain English
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {clause.plainEnglish}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>
                Original Text
              </p>
              <blockquote
                className="text-xs italic rounded-[var(--radius-sm)] px-3 py-2"
                style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)", borderLeft: "2px solid var(--border)" }}
              >
                {clause.originalText}
              </blockquote>
            </div>
            {clause.riskReason && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Risk Assessment
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{clause.riskReason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyzePage() {
  const [documentText, setDocumentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleAnalyze = async () => {
    if (!documentText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: documentText }),
      });
      const data = await res.json() as { result?: AnalysisResult; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Analysis failed");
      setResult(data.result ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-${fileName || "document"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center" style={{ background: "var(--brand-50)" }}>
            <FileSearch size={20} style={{ color: "var(--brand-500)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-geist-sans), Inter", color: "var(--text-primary)" }}>
              Clause & Risk Analyzer
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Plain-English breakdown with risk scoring for every clause
            </p>
          </div>
        </div>
        <DisclaimerBanner />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* INPUT PANEL */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Upload or Paste Document
            </h2>
            <FileUpload
              onTextExtracted={(text, name) => { setDocumentText(text); setFileName(name); setResult(null); }}
              label="Upload Document"
              className="mb-4"
            />
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t" style={{ borderColor: "var(--border)" }} />
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 text-xs" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>or paste text</span>
              </div>
            </div>
            <textarea
              className="mt-4 w-full rounded-[var(--radius-md)] px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              style={{ border: "1px solid var(--border)", color: "var(--text-primary)", minHeight: "200px", background: "var(--surface)" }}
              placeholder="Paste your legal document text here…"
              value={documentText}
              onChange={(e) => { setDocumentText(e.target.value); setResult(null); }}
              aria-label="Document text input"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {documentText.length.toLocaleString()} / 50,000 chars
              </span>
              <button
                onClick={handleAnalyze}
                disabled={loading || documentText.trim().length < 50}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]"
                style={{ background: "var(--brand-500)" }}
                aria-label="Analyze document for clauses and risks"
                aria-busy={loading}
              >
                {loading ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Analyzing…</> : "Analyze Document"}
              </button>
            </div>
          </div>
        </div>

        {/* OUTPUT PANEL */}
        <div className="lg:col-span-3">
          {error && (
            <div className="card p-4 flex items-start gap-3" style={{ background: "var(--risk-critical-bg)", borderColor: "var(--risk-critical-border)" }}>
              <AlertCircle size={18} style={{ color: "var(--risk-critical)" }} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm" style={{ color: "var(--risk-critical)" }}>Analysis failed</p>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{error}</p>
              </div>
            </div>
          )}

          {loading && (
            <div
              className="card p-8 flex flex-col items-center justify-center gap-4"
              style={{ minHeight: "300px" }}
              role="status"
              aria-label="Analyzing document, please wait"
              aria-live="polite"
            >
              <Loader2 size={32} className="animate-spin" style={{ color: "var(--brand-500)" }} aria-hidden="true" />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Reading and analyzing every clause…</p>
              <div className="w-full max-w-sm space-y-2">
                {[40, 70, 55, 80].map((w, i) => (
                  <div key={i} className="skeleton h-3 rounded" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="flex flex-col gap-5 animate-fade-in">
              {/* Summary card */}
              <div className="card p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <RiskBadge level={result.overallRiskLevel} />
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>{result.documentType}</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{result.summary}</p>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="flex-shrink-0 p-2 rounded-[var(--radius-sm)] transition-colors"
                    style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
                    title="Download JSON report"
                    aria-label="Download analysis report"
                  >
                    <Download size={16} />
                  </button>
                </div>

                {result.parties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {result.parties.map((p, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                {result.redFlags.length > 0 && (
                  <div className="rounded-[var(--radius-sm)] p-3" style={{ background: "var(--risk-critical-bg)", border: "1px solid var(--risk-critical-border)" }}>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--risk-critical)" }}>🚩 Red Flags</p>
                    <ul className="space-y-1">
                      {result.redFlags.map((flag, i) => (
                        <li key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>• {flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Clause cards */}
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                  Clauses ({result.clauses.length})
                </h3>
                <div className="flex flex-col gap-2">
                  {result.clauses.map((clause) => (
                    <ClauseCard key={clause.id} clause={clause} />
                  ))}
                </div>
              </div>

              {/* Obligations */}
              {result.obligations.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Your Obligations</h3>
                  <ul className="space-y-1.5">
                    {result.obligations.map((o, i) => (
                      <li key={i} className="text-sm flex gap-2" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: "var(--brand-500)" }}>→</span> {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <InlineDisclaimer text={result.disclaimer} />
            </div>
          )}

          {!result && !loading && !error && (
            <div className="card p-10 flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight: "300px" }}>
              <FileSearch size={40} style={{ color: "var(--border)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Upload or paste a legal document to see the analysis here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
