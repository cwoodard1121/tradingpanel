import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui/Tooltip";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export type StatTone = "default" | "profit" | "loss" | "warn" | "brand";

const toneText: Record<StatTone, string> = {
  default: "text-content-primary",
  profit: "text-profit",
  loss: "text-loss",
  warn: "text-warn",
  brand: "text-brand",
};

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: StatTone;
  hint?: ReactNode;
}

function InfoGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 text-content-muted transition-colors hover:text-content-secondary"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/**
 * StatCard — a compact KPI tile. Big tabular-mono value with a tinted tone,
 * an uppercase label, optional sub-line and an optional info tooltip.
 */
export function StatCard({
  label,
  value,
  sub,
  tone = "default",
  hint,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-4 shadow-card transition-colors duration-150 hover:border-border sm:p-5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-content-secondary">
          {label}
        </span>
        {hint != null && (
          <Tooltip content={hint}>
            <InfoGlyph />
          </Tooltip>
        )}
      </div>

      <div
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl",
          toneText[tone],
        )}
      >
        {value}
      </div>

      {sub != null && (
        <div className="mt-1 text-xs text-content-muted">{sub}</div>
      )}
    </div>
  );
}
