"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}

/**
 * DisputeCompass Logo — compass rose with document-fold north petal.
 * Pure SVG, scales from 16px to 512px.
 */
export function Logo({ size = 32, className, showWordmark = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="DisputeCompass logo"
        role="img"
      >
        {/* Background circle */}
        <circle cx="24" cy="24" r="24" fill="var(--brand-500)" />

        {/* North petal — styled as document corner fold */}
        {/* Main north petal body */}
        <path
          d="M24 4 L21 18 L24 22 L27 18 Z"
          fill="white"
          opacity="0.95"
        />
        {/* Corner fold on north petal (top-right of document shape) */}
        <path
          d="M27 10 L27 18 L24 22 L27 18"
          fill="white"
          opacity="0.7"
        />
        <path
          d="M26 8 L29 11 L27 11 L27 8 Z"
          fill="white"
          opacity="0.55"
        />
        {/* Fold crease line */}
        <path
          d="M26.5 8.5 L29 11"
          stroke="var(--brand-600)"
          strokeWidth="0.5"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* South petal — clean arrow */}
        <path
          d="M24 44 L21 30 L24 26 L27 30 Z"
          fill="white"
          opacity="0.85"
        />

        {/* West petal — clean arrow */}
        <path
          d="M4 24 L18 21 L22 24 L18 27 Z"
          fill="white"
          opacity="0.7"
        />

        {/* East petal — clean arrow */}
        <path
          d="M44 24 L30 21 L26 24 L30 27 Z"
          fill="white"
          opacity="0.7"
        />

        {/* Center circle */}
        <circle cx="24" cy="24" r="3.5" fill="var(--brand-600)" />
        <circle cx="24" cy="24" r="1.8" fill="white" opacity="0.9" />
      </svg>

      {showWordmark && (
        <span
          className="font-semibold text-[var(--text-primary)] tracking-tight"
          style={{
            fontFamily: "var(--font-geist-sans), Inter, system-ui, sans-serif",
            fontSize: size * 0.55,
            lineHeight: 1,
          }}
        >
          DisputeCompass
        </span>
      )}
    </div>
  );
}
