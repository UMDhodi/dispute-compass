"use client";

import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { DisclaimerBanner, InlineDisclaimer } from "@/components/disclaimer-banner";
import { FileSignature, Loader2, AlertCircle, Copy, Check, Download, Paperclip } from "lucide-react";

interface BriefResult {
  documentType: string;
  subject: string;
  formattedDocument: string;
  keyFacts: string[];
  legalBasis: string[];
  reliefSought: string[];
  attachmentChecklist: { document: string; purpose: string }[];
  nextSteps: string[];
  disclaimer: string;
}

const briefTypes = [
  "Demand Letter",
  "Legal Notice",
  "Dispute Summary",
  "Lawyer Briefing Dossier",
];

export default function BriefPage() {
  const [situation, setSituation] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [briefType, setBriefType] = useState(briefTypes[0]);
  const [yourName, setYourName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BriefResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!situation.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation, documentText, briefType, yourName, recipientName }),
      });
      const data = await res.json() as { result?: BriefResult; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed");
      setResult(data.result ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.formattedDocument);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const content = `${result.subject}\n\n${result.formattedDocument}\n\n---\n${result.disclaimer}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${briefType.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center" style={{ background: "var(--risk-critical-bg)" }}>
            <FileSignature size={20} style={{ color: "var(--risk-critical)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-geist-sans), Inter", color: "var(--text-primary)" }}>
              Legal Brief Generator
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Generate professional demand letters, notices, and lawyer briefings</p>
          </div>
        </div>
        <DisclaimerBanner />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* INPUT */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Configure Your Brief</h2>

            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Document Type</label>
            <select
              className="w-full rounded-[var(--radius-md)] px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "var(--surface)" }}
              value={briefType}
              onChange={(e) => setBriefType(e.target.value)}
              aria-label="Brief type"
            >
              {briefTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Your Name / Role</label>
                <input
                  className="w-full rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                  style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "var(--surface)" }}
                  placeholder="Jane Doe"
                  value={yourName}
                  onChange={(e) => setYourName(e.target.value)}
                  aria-label="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Recipient</label>
                <input
                  className="w-full rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                  style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "var(--surface)" }}
                  placeholder="ABC Property Mgmt"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  aria-label="Recipient name"
                />
              </div>
            </div>

            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Describe Your Situation *</label>
            <textarea
              className="w-full rounded-[var(--radius-md)] px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] mb-4"
              style={{ border: "1px solid var(--border)", color: "var(--text-primary)", minHeight: "160px", background: "var(--surface)" }}
              placeholder="Describe the facts: what happened, when, what you want…"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              aria-label="Situation description"
            />

            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Supporting Document (optional)</label>
            <FileUpload
              onTextExtracted={(text) => setDocumentText(text)}
              label="Upload Supporting Document"
              className="mb-4"
            />

            <button
              onClick={handleGenerate}
              disabled={loading || situation.trim().length < 30}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--risk-critical)" }}
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Generating {briefType}…</>
                : <><FileSignature size={15} /> Generate {briefType}</>
              }
            </button>
          </div>
        </div>

        {/* OUTPUT */}
        <div className="lg:col-span-3">
          {error && (
            <div className="card p-4 mb-4 flex items-start gap-3" style={{ background: "var(--risk-critical-bg)", borderColor: "var(--risk-critical-border)" }}>
              <AlertCircle size={18} style={{ color: "var(--risk-critical)" }} className="mt-0.5" />
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{error}</p>
            </div>
          )}

          {loading && (
            <div className="card p-10 flex flex-col items-center gap-4">
              <Loader2 size={32} className="animate-spin" style={{ color: "var(--risk-critical)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Drafting your {briefType}…</p>
            </div>
          )}

          {result && !loading && (
            <div className="flex flex-col gap-5 animate-fade-in">
              {/* Document */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{result.documentType}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{result.subject}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors"
                      style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      aria-label="Copy document"
                    >
                      {copied ? <><Check size={13} style={{ color: "var(--risk-safe)" }} /> Copied!</> : <><Copy size={13} /> Copy</>}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors"
                      style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      aria-label="Download document"
                    >
                      <Download size={13} /> Download
                    </button>
                  </div>
                </div>

                <pre
                  className="whitespace-pre-wrap text-sm leading-relaxed rounded-[var(--radius-md)] p-5 overflow-x-auto"
                  style={{ background: "var(--surface-subtle)", color: "var(--text-primary)", fontFamily: "'Inter', system-ui", border: "1px solid var(--border)" }}
                >
                  {result.formattedDocument}
                </pre>
              </div>

              {/* Key Facts */}
              {result.keyFacts.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Key Facts</h3>
                  <ul className="space-y-1.5">
                    {result.keyFacts.map((f, i) => (
                      <li key={i} className="text-sm flex gap-2" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: "var(--brand-500)" }}>•</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Attachment checklist */}
              {result.attachmentChecklist.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <Paperclip size={14} /> Recommended Attachments
                  </h3>
                  <div className="flex flex-col gap-2">
                    {result.attachmentChecklist.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-[var(--radius-sm)]" style={{ background: "var(--surface-subtle)" }}>
                        <span style={{ color: "var(--brand-500)", marginTop: "2px" }}>📎</span>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.document}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.purpose}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next steps */}
              {result.nextSteps.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Next Steps</h3>
                  <ol className="space-y-2">
                    {result.nextSteps.map((s, i) => (
                      <li key={i} className="flex gap-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                        <span className="flex-shrink-0 font-semibold" style={{ color: "var(--brand-500)" }}>{i + 1}.</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <InlineDisclaimer text={result.disclaimer} />
            </div>
          )}

          {!result && !loading && !error && (
            <div className="card p-10 flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight: "300px" }}>
              <FileSignature size={40} style={{ color: "var(--border)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Fill in the form to generate your professional legal brief
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
