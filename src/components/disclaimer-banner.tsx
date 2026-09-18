"use client";

import { Scale, AlertTriangle } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <aside
      className="flex items-start gap-3 rounded-[var(--radius-md)] px-4 py-3 text-sm"
      style={{
        background: "var(--risk-warning-bg)",
        border: "1px solid var(--risk-warning-border)",
        color: "var(--risk-warning)",
      }}
      role="note"
      aria-label="Legal disclaimer"
    >
      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
      <p>
        <strong>Information only, not legal advice.</strong> DisputeCompass helps you understand legal
        documents and your options. It does not provide legal representation or advice.
        For your specific situation, consult a qualified attorney.
      </p>
    </aside>
  );
}

export function InlineDisclaimer({ text }: { text?: string }) {
  return (
    <p className="mt-4 text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
      <Scale size={12} />
      {text ?? "This analysis is for informational purposes only and does not constitute legal advice."}
    </p>
  );
}
