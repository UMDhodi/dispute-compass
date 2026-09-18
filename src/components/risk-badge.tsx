"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

type RiskLevel = "critical" | "warning" | "safe" | "neutral";

interface RiskBadgeProps {
  level: RiskLevel;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

const riskConfig: Record<RiskLevel, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; className: string }> = {
  critical: {
    label: "Critical",
    icon: XCircle,
    className: "badge-critical",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    className: "badge-warning",
  },
  safe: {
    label: "Safe",
    icon: CheckCircle,
    className: "badge-safe",
  },
  neutral: {
    label: "Informational",
    icon: Info,
    className: "badge-neutral",
  },
};

export function RiskBadge({ level, label, className, size = "md" }: RiskBadgeProps) {
  const config = riskConfig[level];
  const Icon = config.icon;
  const displayLabel = label ?? config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full",
        config.className,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className
      )}
    >
      <Icon size={size === "sm" ? 12 : 14} />
      {displayLabel}
    </span>
  );
}
