// =====================================================================
//  Shared Recharts theming for the analytics dashboard.
//  Recharts needs concrete color values (not Tailwind classes), so the
//  palette below mirrors the tokens in tailwind.config.ts exactly.
//  Also exports a couple of presentational tooltip primitives so every
//  chart renders the same dark, elevated tooltip surface.
// =====================================================================

import type { ReactNode } from "react";

/** Concrete hex values mirroring the Tailwind palette (dark theme only). */
export const CHART = {
  brand: "#f7931a",
  brandHover: "#ffa733",
  profit: "#22c55e",
  loss: "#f43f5e",
  warn: "#f59e0b",
  /** border-subtle — grid lines. */
  grid: "#202a38",
  /** content-muted — axis ticks. */
  axis: "#647082",
  /** content-secondary — stronger axis text. */
  axisStrong: "#9aa7b8",
  muted: "#647082",
  surface: "#11161f",
  elevated: "#161d28",
} as const;

/**
 * TooltipBox — the dark, elevated frame every chart tooltip sits inside.
 * Matches `bg-bg-elevated rounded-lg border shadow`.
 */
export function TooltipBox({
  title,
  children,
}: {
  title?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="min-w-[9rem] rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs shadow-card">
      {title != null && (
        <div className="mb-1.5 font-medium text-content-secondary">{title}</div>
      )}
      {children}
    </div>
  );
}

/** A single label/value line inside a chart tooltip. */
export function TooltipRow({
  color,
  label,
  value,
}: {
  color?: string;
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="flex items-center gap-1.5 text-content-secondary">
        {color != null && (
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        )}
        {label}
      </span>
      <span className="font-mono font-semibold tabular-nums text-content-primary">
        {value}
      </span>
    </div>
  );
}
