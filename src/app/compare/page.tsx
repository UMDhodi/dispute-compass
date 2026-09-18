"use client";

import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { DisclaimerBanner, InlineDisclaimer } from "@/components/disclaimer-banner";
import { GitCompare, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Difference {
  id: string;
  section: string;
  docAText: string;
  docBText: string;
  changeType: "favorable" | "adverse" | "neutral";
  plainEnglishExplanation: string;
  significance: "high" | "medium" | "low";
}

interface CompareResult {
  summary: string;
  changeCount: { favorable: number; adverse: number; neutral: number };
  overallVerdict: "more_favorable" | "more_adverse" | "similar";
  differences: Difference[];
  newClauses: string[];
  removedClauses: string[];
  recommendation: string;
  disclaimer: string;
}

const changeIcon = {
  favorable: <TrendingUp size={14} style={{ color: "var(--risk-safe)" }} />,
  adverse: <TrendingDown size={14} style={{ color: "var(--risk-critical)" }} />,
  neutral: <Minus size={14} style={{ color: "var(--text-muted)" }} />,
};

const changeStyle = {
  favorable: { bg: "var(--risk-safe-bg)", border: "var(--risk-safe-border)", label: "Favorable", color: "var(--risk-safe)" },
  adverse: { bg: "var(--risk-critical-bg)", border: "var(--risk-critical-border)", label: "Adverse", color: "var(--risk-critical)" },
  neutral: { bg: "var(--surface-subtle)", border: "var(--border)", label: "Neutral", color: "var(--text-muted)" },
};

export default function ComparePage() {
  const [docA, setDocA] = useState({ text: "", label: "Document A" });
  const [docB, setDocB] = useState({ text: "", label: "Document B" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!docA.text.trim() || !docB.text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docA: docA.text, docB: docB.text, labelA: docA.label, labelB: docB.label }),
      });
      const data = await res.json() as { result?: CompareResult; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Comparison failed");
      setResult(data.result ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center" style={{ background: "var(--risk-neutral-bg)" }}>
            <GitCompare size={20} style={{ color: "var(--risk-neutral)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-geist-sans), Inter", color: "var(--text-primary)" }}>
              Document Comparator
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Side-by-side analysis of favorable and adverse changes</p>
          </div>
        </div>
        <DisclaimerBanner />
      </div>

      {/* Document inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {[
          { key: "A" as const, state: docA, setState: setDocA },
          { key: "B" as const, state: docB, setState: setDocB },
        ].map(({ key, state, setState }) => (
          <div key={key} className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold"
                style={{ background: key === "A" ? "var(--brand-100)" : "var(--risk-neutral-bg)", color: key === "A" ? "var(--brand-600)" : "var(--risk-neutral)" }}
              >
                {key}
              </span>
              <input
                className="flex-1 text-sm font-medium bg-transparent focus:outline-none focus:ring-1 focus:ring-[var(--brand-500)] rounded px-2 py-0.5"
                style={{ color: "var(--text-primary)", border: "1px solid transparent" }}
                value={state.label}
                onChange={(e) => setState((prev) => ({ ...prev, label: e.target.value }))}
                placeholder={`Document ${key} label…`}
                aria-label={`Document ${key} label`}
              />
            </div>
            <FileUpload
              onTextExtracted={(text, name) => setState({ text, label: name })}
              label={`Upload Document ${key}`}
              className="mb-3"
            />
            <textarea
              className="w-full rounded-[var(--radius-md)] px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              style={{ border: "1px solid var(--border)", color: "var(--text-primary)", minHeight: "150px", background: "var(--surface)" }}
              placeholder={`Paste Document ${key} text…`}
              value={state.text}
              onChange={(e) => setState((prev) => ({ ...prev, text: e.target.value }))}
              aria-label={`Document ${key} text`}
            />
            <p className="text-xs mt-1 text-right" style={{ color: "var(--text-muted)" }}>{state.text.length.toLocaleString()} chars</p>
          </div>
        ))}
      </div>

      <div className="flex justify-center mb-8">
        <button
          onClick={handleCompare}
          disabled={loading || docA.text.trim().length < 50 || docB.text.trim().length < 50}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-md)] text-sm font-medium text-white disabled:opacity-50 transition-colors"
          style={{ background: "var(--risk-neutral)" }}
        >
          {loading ? <><Loader2 size={15} className="animate-spin" /> Comparing…</> : <><GitCompare size={15} /> Compare Documents</>}
        </button>
      </div>

      {error && (
        <div className="card p-4 mb-5 flex items-start gap-3" style={{ background: "var(--risk-critical-bg)", borderColor: "var(--risk-critical-border)" }}>
          <AlertCircle size={18} style={{ color: "var(--risk-critical)" }} className="mt-0.5" />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{error}</p>
        </div>
      )}

      {loading && (
        <div className="card p-10 flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--risk-neutral)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Comparing documents clause by clause…</p>
        </div>
      )}

      {result && !loading && (
        <div className="flex flex-col gap-5 animate-fade-in">
          {/* Summary */}
          <div className="card p-5">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${result.overallVerdict === "more_favorable" ? "badge-safe" : result.overallVerdict === "more_adverse" ? "badge-critical" : "badge-neutral"}`}>
                {result.overallVerdict === "more_favorable" ? "More Favorable" : result.overallVerdict === "more_adverse" ? "More Adverse" : "Similar Overall"}
              </span>
              <div className="flex gap-4 text-sm">
                <span style={{ color: "var(--risk-safe)" }}>✓ {result.changeCount.favorable} favorable</span>
                <span style={{ color: "var(--risk-critical)" }}>✕ {result.changeCount.adverse} adverse</span>
                <span style={{ color: "var(--text-muted)" }}>— {result.changeCount.neutral} neutral</span>
              </div>
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{result.summary}</p>
            {result.recommendation && (
              <div className="mt-3 p-3 rounded-[var(--radius-sm)]" style={{ background: "var(--brand-50)", border: "1px solid var(--brand-200)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--brand-600)" }}>Recommendation</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{result.recommendation}</p>
              </div>
            )}
          </div>

          {/* Differences */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              Changes ({result.differences.length})
            </h3>
            <div className="flex flex-col gap-3">
              {result.differences.map((diff) => {
                const style = changeStyle[diff.changeType];
                return (
                  <div key={diff.id} className="card p-5" style={{ borderLeft: `3px solid ${style.color}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      {changeIcon[diff.changeType]}
                      <span className="text-xs font-medium" style={{ color: style.color }}>{style.label}</span>
                      <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{diff.section}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--surface-subtle)", color: "var(--text-muted)" }}>{diff.significance}</span>
                    </div>
                    <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{diff.plainEnglishExplanation}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: "var(--brand-600)" }}>{docA.label}</p>
                        <p className="text-xs italic rounded p-2" style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)" }}>{diff.docAText}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: "var(--risk-neutral)" }}>{docB.label}</p>
                        <p className="text-xs italic rounded p-2" style={{ background: style.bg, color: "var(--text-secondary)", border: `1px solid ${style.border}` }}>{diff.docBText}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <InlineDisclaimer text={result.disclaimer} />
        </div>
      )}
    </div>
  );
}
