"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/analyze", label: "Analyze" },
  { href: "/compare", label: "Compare" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/qa", label: "Ask a Doc" },
  { href: "/brief", label: "Draft Brief" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: "rgba(250, 250, 249, 0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] rounded-lg p-1" aria-label="DisputeCompass home">
          <Logo size={32} />
          <span
            className="font-semibold hidden sm:block"
            style={{
              fontFamily: "var(--font-geist-sans), Inter, system-ui",
              fontSize: "1.0625rem",
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            DisputeCompass
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[var(--brand-50)] text-[var(--brand-600)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium text-white transition-all duration-150"
            style={{
              background: "var(--brand-500)",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "var(--brand-600)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "var(--brand-500)")}
          >
            Analyze a Document
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden border-t"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--brand-50)] text-[var(--brand-600)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/analyze"
              onClick={() => setMobileOpen(false)}
              className="mt-2 px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-white text-center"
              style={{ background: "var(--brand-500)" }}
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
