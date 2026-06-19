import { fmtPct } from "@/lib/format";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export type ProgressTone = "brand" | "profit" | "loss" | "warn";

const fills: Record<ProgressTone, string> = {
  brand: "from-brand to-brand-hover",
  profit: "from-profit/80 to-profit",
  loss: "from-loss/80 to-loss",
  warn: "from-warn/80 to-warn",
};

export interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: ProgressTone;
  showLabel?: boolean;
  className?: string;
}

/**
 * ProgressBar — rounded track with a gradient fill. Clamps the fill to 0..max.
 */
export function ProgressBar({
  value,
  max = 100,
  tone = "brand",
  showLabel = false,
  className,
}: ProgressBarProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const safeValue = Number.isFinite(value) ? value : 0;
  const pct = Math.max(0, Math.min(100, (safeValue / safeMax) * 100));

  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-[width] duration-300 ease-out",
            fills[tone],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-right font-mono text-xs tabular-nums text-content-secondary">
          {fmtPct(pct)}
        </div>
      )}
    </div>
  );
}
