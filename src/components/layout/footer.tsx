import Link from "next/link";
import { Logo } from "@/components/logo";
import { Scale } from "lucide-react";

const footerLinks = [
  {
    heading: "Tools",
    links: [
      { label: "Clause Analyzer", href: "/analyze" },
      { label: "Document Comparator", href: "/compare" },
      { label: "Action Roadmap", href: "/roadmap" },
      { label: "Document Q&A", href: "/qa" },
      { label: "Draft Brief", href: "/brief" },
    ],
  },
  {
    heading: "About",
    links: [
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
];

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      {/* Legal disclaimer strip */}
      <div
        className="py-3 px-4 text-center text-xs"
        style={{
          background: "var(--risk-warning-bg)",
          borderBottom: "1px solid var(--risk-warning-border)",
          color: "var(--risk-warning)",
        }}
      >
        <Scale className="inline-block mr-1.5 mb-0.5" size={12} />
        <strong>Legal Disclaimer:</strong> DisputeCompass provides legal information and educational assistance only.
        It does not provide legal advice and is not a substitute for a qualified attorney. Always consult a licensed
        lawyer for your specific legal situation.
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <Logo size={28} showWordmark />
            </Link>
            <p className="text-sm max-w-xs" style={{ color: "var(--text-muted)" }}>
              AI-powered legal document analysis and dispute navigation. Understand your rights.
              Navigate your options. Act with confidence.
            </p>
          </div>

          {/* Link groups */}
          {footerLinks.map((group) => (
            <div key={group.heading}>
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--text-muted)" }}
              >
                {group.heading}
              </h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:text-teal-600"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs"
          style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span>© {new Date().getFullYear()} DisputeCompass. All rights reserved.</span>
          <span>Built with Next.js · NVIDIA NIM AI · Prisma SQLite</span>
        </div>
      </div>
    </footer>
  );
}
