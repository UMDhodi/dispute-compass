"use client";

import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { DisclaimerBanner, InlineDisclaimer } from "@/components/disclaimer-banner";
import { Map, Loader2, AlertCircle, CheckSquare, Square, Clock, AlertTriangle, FileText } from "lucide-react";

interface Step {
  stepNumber: number;
  action: string;
  why: string;
  evidence: string;
  completed: boolean;
}

interface Phase {
  phaseNumber: number;
  phaseName: string;
  timeframe: string;
  steps: Step[];
}

interface EvidenceItem {
  item: string;
  importance: "critical" | "important" | "helpful";
  collected: boolean;
}

interface Deadline {
  label: string;
  timeframe: string;
  consequence: string;
}

interface RoadmapResult {
  situationSummary: string;
  urgencyLevel: "immediate" | "soon" | "routine";
  phases: Phase[];
  evidenceChecklist: EvidenceItem[];
  deadlines: Deadline[];
  whenToSeekLegalHelp: string;
  disclaimer: string;
}

const urgencyConfig = {
  immediate: { label: "Immediate Action Required", color: "var(--risk-critical)", bg: "var(--risk-critical-bg)" },
  soon: { label: "Act Soon", color: "var(--risk-warning)", bg: "var(--risk-warning-bg)" },
  routine: { label: "Routine Timeline", color: "var(--risk-safe)", bg: "var(--risk-safe-bg)" },
};

const disputeTypes = [
  "Tenant / Landlord Dispute",
  "Consumer Rights Issue",
  "Employment Dispute",
  "Small Claims Matter",
  "Contract Breach",
  "Insurance Dispute",
  "Refund / Chargeback",
  "Other",
];

export default function RoadmapPage() {
  const [situation, setSituation] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [disputeType, setDisputeType] = useState(disputeTypes[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoadmapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<boolean[]>([]);

  const handleGenerate = async () => {
    if (!situation.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation, documentText, disputeType }),
      });
      const data = await res.json() as { result?: RoadmapResult; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed");
      const r = data.result ?? null;
      setResult(r);
      if (r) setChecklist(new Array(r.evidenceChecklist.length).fill(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const toggleChecklist = (i: number) => setChecklist((prev) => prev.map((v, idx) => idx === i ? !v : v));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center" style={{ background: "var(--risk-warning-bg)" }}>
            <Map size={20} style={{ color: "var(--risk-warning)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-geist-sans), Inter", color: "var(--text-primary)" }}>
              Action & Evidence Roadmap
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Step-by-step dispute navigation plan</p>
          </div>
        </div>
        <DisclaimerBanner />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* INPUT */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Describe Your Situation</h2>

            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Dispute Type
            </label>
            <select
              className="w-full rounded-[var(--radius-md)] px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "var(--surface)" }}
              value={disputeType}
              onChange={(e) => setDisputeType(e.target.value)}
              aria-label="Dispute type"
            >
              {disputeTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Describe what happened *
            </label>
            <textarea
              className="w-full rounded-[var(--radius-md)] px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] mb-4"
              style={{ border: "1px solid var(--border)", color: "var(--text-primary)", minHeight: "160px", background: "var(--surface)" }}
              placeholder="Example: My landlord has not returned my security deposit 45 days after I moved out, despite the state law requiring return within 21 days…"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              aria-label="Situation description"
            />

            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Supporting Document (optional)
            </label>
            <FileUpload
              onTextExtracted={(text) => setDocumentText(text)}
              label="Upload Related Document"
              className="mb-4"
            />

            <button
              onClick={handleGenerate}
              disabled={loading || situation.trim().length < 20}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--risk-warning)" }}
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Map size={15} /> Generate Roadmap</>}
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
              <Loader2 size={32} className="animate-spin" style={{ color: "var(--risk-warning)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Building your personalized action plan…</p>
            </div>
          )}

          {result && !loading && (
            <div className="flex flex-col gap-5 animate-fade-in">
              {/* Urgency */}
              <div className="rounded-[var(--radius-md)] p-4" style={{ background: urgencyConfig[result.urgencyLevel].bg, border: `1px solid ${urgencyConfig[result.urgencyLevel].color}22` }}>
                <p className="text-sm font-semibold" style={{ color: urgencyConfig[result.urgencyLevel].color }}>
                  {urgencyConfig[result.urgencyLevel].label}
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{result.situationSummary}</p>
              </div>

              {/* Phases */}
              {result.phases.map((phase) => (
                <div key={phase.phaseNumber} className="card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0" style={{ background: "var(--brand-100)", color: "var(--brand-600)" }}>
                      {phase.phaseNumber}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{phase.phaseName}</h3>
                      <p className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                        <Clock size={11} /> {phase.timeframe}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {phase.steps.map((step) => (
                      <div key={step.stepNumber} className="flex gap-3">
                        <span className="text-xs font-mono mt-0.5 w-5 flex-shrink-0" style={{ color: "var(--brand-500)" }}>
                          {step.stepNumber}.
                        </span>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{step.action}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{step.why}</p>
                          {step.evidence && (
                            <p className="text-xs mt-1 italic" style={{ color: "var(--text-muted)" }}>
                              Evidence needed: {step.evidence}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Evidence Checklist */}
              {result.evidenceChecklist.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                    Evidence Checklist
                  </h3>
                  <div className="flex flex-col gap-2">
                    {result.evidenceChecklist.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => toggleChecklist(i)}
                        className="flex items-start gap-2.5 text-left p-2.5 rounded-[var(--radius-sm)] transition-colors"
                        style={{ background: checklist[i] ? "var(--risk-safe-bg)" : "var(--surface-subtle)" }}
                        aria-pressed={checklist[i]}
                      >
                        {checklist[i]
                          ? <CheckSquare size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--risk-safe)" }} />
                          : <Square size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
                        }
                        <div className="min-w-0">
                          <span className="text-sm" style={{ color: checklist[i] ? "var(--text-muted)" : "var(--text-primary)", textDecoration: checklist[i] ? "line-through" : "none" }}>
                            {item.item}
                          </span>
                          <span className={`ml-2 text-xs ${item.importance === "critical" ? "badge-critical" : item.importance === "important" ? "badge-warning" : "badge-neutral"} inline-flex px-1.5 py-0.5 rounded-full font-medium`}>
                            {item.importance}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Deadlines */}
              {result.deadlines.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Key Deadlines</h3>
                  <div className="flex flex-col gap-2">
                    {result.deadlines.map((d, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-[var(--radius-sm)]" style={{ background: "var(--risk-warning-bg)", border: "1px solid var(--risk-warning-border)" }}>
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--risk-warning)" }} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{d.label}</p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{d.timeframe} — {d.consequence}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* When to seek help */}
              <div className="card p-4" style={{ background: "var(--brand-50)", borderColor: "var(--brand-200)" }}>
                <div className="flex items-start gap-2">
                  <FileText size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--brand-600)" }} />
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--brand-600)" }}>When to seek legal help</p>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{result.whenToSeekLegalHelp}</p>
                  </div>
                </div>
              </div>

              <InlineDisclaimer text={result.disclaimer} />
            </div>
          )}

          {!result && !loading && !error && (
            <div className="card p-10 flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight: "300px" }}>
              <Map size={40} style={{ color: "var(--border)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Describe your situation to generate your personalized action plan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
