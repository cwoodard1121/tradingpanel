import type { ReactNode } from "react";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export type BadgeTone =
  | "default"
  | "profit"
  | "loss"
  | "warn"
  | "brand"
  | "long"
  | "short";

const tones: Record<BadgeTone, string> = {
  default: "border border-border-subtle bg-bg-elevated text-content-secondary",
  profit: "bg-profit-soft text-profit",
  loss: "bg-loss-soft text-loss",
  warn: "bg-warn-soft text-warn",
  brand: "bg-brand-soft text-brand",
  long: "bg-profit-soft text-long",
  short: "bg-loss-soft text-short",
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

/**
 * Badge — soft tinted pill for statuses, tags and signed values.
 */
export function Badge({ tone = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
