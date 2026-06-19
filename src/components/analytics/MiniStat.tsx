// =====================================================================
//  MiniStat — a lightweight KPI tile for use *inside* cards (drawdown,
//  discipline, prop-firm rules). Lighter chrome than the kit StatCard so
//  it can be nested without double-bordering.
// =====================================================================

import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui/Tooltip";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export type MiniStatTone = "default" | "profit" | "loss" | "warn" | "brand";

const toneText: Record<MiniStatTone, string> = {
  default: "text-content-primary",
  profit: "text-profit",
  loss: "text-loss",
  warn: "text-warn",
  brand: "text-brand",
};

function InfoGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3 text-content-muted transition-colors hover:text-content-secondary"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export interface MiniStatProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: MiniStatTone;
  hint?: ReactNode;
  className?: string;
}

export function MiniStat({
  label,
  value,
  sub,
  tone = "default",
  hint,
  className,
}: MiniStatProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border-subtle bg-bg-elevated/60 p-3.5",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-content-secondary">
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
          "mt-1.5 font-mono text-lg font-semibold tracking-tight tabular-nums",
          toneText[tone],
        )}
      >
        {value}
      </div>
      {sub != null && (
        <div className="mt-0.5 truncate text-[11px] text-content-muted">{sub}</div>
      )}
    </div>
  );
}
