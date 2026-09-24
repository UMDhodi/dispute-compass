import Link from "next/link";
import { Logo } from "@/components/logo";
import {
  FileSearch,
  GitCompare,
  Map,
  MessageSquare,
  FileSignature,
  ArrowRight,
  Shield,
  Zap,
  Lock,
  ChevronRight,
} from "lucide-react";

const modules = [
  {
    icon: FileSearch,
    title: "Clause & Risk Analyzer",
    description:
      "Upload any legal document and get a plain-English breakdown of every clause, with color-coded risk levels and hidden red flags.",
    href: "/analyze",
    badge: "Most Popular",
    color: "var(--brand-500)",
    bg: "var(--brand-50)",
  },
  {
    icon: GitCompare,
    title: "Document Comparator",
    description:
      "Compare two versions of a contract side-by-side. See exactly what changed, what's favorable, and what's adverse — at a glance.",
    href: "/compare",
    badge: null,
    color: "var(--risk-neutral)",
    bg: "var(--risk-neutral-bg)",
  },
  {
    icon: Map,
    title: "Action Roadmap",
    description:
      "Describe your dispute situation and get a step-by-step action plan: evidence to gather, deadlines, communications to send.",
    href: "/roadmap",
    badge: null,
    color: "var(--risk-warning)",
    bg: "var(--risk-warning-bg)",
  },
  {
    icon: MessageSquare,
    title: "Document Q&A Copilot",
    description:
      "Ask questions about your document in plain English. Get answers grounded strictly in the document's clauses, with citations.",
    href: "/qa",
    badge: null,
    color: "var(--brand-600)",
    bg: "var(--brand-100)",
  },
  {
    icon: FileSignature,
    title: "Lawyer-Ready Brief Generator",
    description:
      "Generate formatted demand letters, legal notices, or a structured briefing dossier to take directly to an attorney.",
    href: "/brief",
    badge: "Advanced",
    color: "var(--risk-critical)",
    bg: "var(--risk-critical-bg)",
  },
];

const steps = [
  {
    number: "01",
    title: "Upload or Paste",
    description: "Upload your legal document (PDF, DOCX, TXT) or paste the text directly.",
  },
  {
    number: "02",
    title: "AI Analyzes",
    description: "Our NVIDIA-powered AI reads every clause, identifies risks, and extracts key information.",
  },
  {
    number: "03",
    title: "Act with Confidence",
    description: "Review plain-English summaries, download reports, and prepare your next steps.",
  },
];

const trustFeatures = [
  {
    icon: Shield,
    label: "Privacy First",
    desc: "Documents stored locally in SQLite — never sent to third-party databases.",
  },
  {
    icon: Zap,
    label: "NVIDIA NIM AI",
    desc: "Powered by Llama 3.3 70B via NVIDIA's enterprise-grade inference platform.",
  },
  {
    icon: Lock,
    label: "Information Only",
    desc: "Clear disclaimers throughout — we inform, never replace professional legal counsel.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* ================================================
          HERO SECTION
      ================================================ */}
      <section className="relative overflow-hidden" style={{ background: "var(--background)" }}>
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
            backgroundSize: "40px 40px",
            opacity: 0.6,
          }}
        />
        {/* Teal gradient orb */}
        <div
          className="absolute top-0 right-0 pointer-events-none"
          aria-hidden="true"
          style={{
            width: "600px",
            height: "600px",
            background:
              "radial-gradient(circle at 70% 30%, rgba(14, 147, 132, 0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          {/* Badge chip */}
          <div className="flex justify-center mb-8">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
              style={{
                background: "var(--brand-50)",
                border: "1px solid var(--brand-200)",
                color: "var(--brand-600)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-500)] animate-pulse" />
              Powered by NVIDIA NIM · Llama 3.3 70B
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-center font-semibold text-5xl sm:text-6xl lg:text-7xl tracking-tight mb-6"
            style={{
              fontFamily: "var(--font-geist-sans), Inter, system-ui",
              color: "var(--text-primary)",
              lineHeight: "1.05",
            }}
          >
            Legal clarity,
            <br />
            <span style={{ color: "var(--brand-500)" }}>without the confusion.</span>
          </h1>

          {/* Subheading */}
          <p
            className="text-center text-lg sm:text-xl max-w-2xl mx-auto mb-10"
            style={{ color: "var(--text-secondary)" }}
          >
            Understand your contracts, compare agreements, navigate disputes, and prepare
            for professional legal help — all in one AI-powered workspace.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-md)] text-base font-medium text-white shadow-md transition-all duration-150 hover:-translate-y-px"
              style={{
                background: "var(--brand-500)",
                boxShadow: "0 4px 14px rgba(14, 147, 132, 0.3)",
              }}
              aria-label="Analyze a legal document"
            >
              Analyze a Document
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-md)] text-base font-medium transition-all duration-150"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                background: "var(--surface)",
              }}
              aria-label="Compare two contracts"
            >
              Compare Contracts
            </Link>
          </div>

          {/* Small trust line */}
          <p className="text-center text-xs mt-8" style={{ color: "var(--text-muted)" }}>
            Free to use · No account required · Information only, not legal advice
          </p>
        </div>
      </section>

      {/* ================================================
          MODULES GRID
      ================================================ */}
      <section className="py-20" style={{ background: "var(--surface)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4"
              style={{ fontFamily: "var(--font-geist-sans), Inter, system-ui", color: "var(--text-primary)" }}
            >
              Five powerful tools, one workspace
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              Every module is designed for everyday people dealing with real legal situations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="group relative card p-6 flex flex-col gap-4 no-underline hover:no-underline"
                  aria-label={`${mod.title} — ${mod.description}`}
                >
                  {mod.badge && (
                    <span
                      className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: mod.bg, color: mod.color, border: `1px solid ${mod.color}22` }}
                    >
                      {mod.badge}
                    </span>
                  )}
                  <div
                    className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center"
                    style={{ background: mod.bg }}
                    aria-hidden="true"
                  >
                    <Icon size={22} style={{ color: mod.color }} aria-hidden="true" />
                  </div>
                  <div>
                    <h3
                      className="font-semibold text-base mb-1.5"
                      style={{ fontFamily: "var(--font-geist-sans), Inter", color: "var(--text-primary)" }}
                    >
                      {mod.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {mod.description}
                    </p>
                  </div>
                  <div
                    className="inline-flex items-center gap-1 text-sm font-medium mt-auto transition-gap duration-150"
                    style={{ color: mod.color }}
                    aria-hidden="true"
                  >
                    Get started
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================
          HOW IT WORKS
      ================================================ */}
      <section id="how-it-works" className="py-20" style={{ background: "var(--background)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4"
              style={{ fontFamily: "var(--font-geist-sans), Inter, system-ui", color: "var(--text-primary)" }}
            >
              How it works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex flex-col items-start gap-4">
                <div className="flex items-center gap-4 w-full">
                  <span
                    className="text-4xl font-bold tabular-nums"
                    style={{ color: "var(--brand-200)", fontFamily: "var(--font-geist-mono), monospace" }}
                  >
                    {step.number}
                  </span>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-px hidden md:block" style={{ background: "var(--border)" }} />
                  )}
                </div>
                <div>
                  <h3
                    className="font-semibold text-lg mb-2"
                    style={{ fontFamily: "var(--font-geist-sans), Inter", color: "var(--text-primary)" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
          TRUST STRIP
      ================================================ */}
      <section
        className="py-14"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trustFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--brand-50)" }}
                    aria-hidden="true"
                  >
                    <Icon size={18} style={{ color: "var(--brand-500)" }} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-0.5" style={{ color: "var(--text-primary)" }}>
                      {f.label}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
