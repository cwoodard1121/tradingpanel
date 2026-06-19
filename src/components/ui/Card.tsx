import type { ReactNode } from "react";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  padded?: boolean;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}

/**
 * Card — the primary surface primitive. Rounded, subtle-bordered panel with an
 * optional header (title / subtitle on the left, `right` slot on the right).
 */
export function Card({
  title,
  subtitle,
  right,
  padded = true,
  className,
  bodyClassName,
  children,
}: CardProps) {
  const hasHeader = title != null || subtitle != null || right != null;

  const bodyPad = !padded
    ? ""
    : hasHeader
      ? "px-5 pb-5 pt-4"
      : "p-5";

  return (
    <section
      className={cn(
        "rounded-2xl border border-border-subtle bg-bg-surface shadow-card",
        className,
      )}
    >
      {hasHeader && (
        <header
          className={cn(
            "flex items-start justify-between gap-3",
            padded ? "px-5 pt-5" : "px-4 pt-4",
          )}
        >
          <div className="min-w-0">
            {title != null && (
              <h3 className="truncate text-sm font-semibold tracking-tight text-content-primary">
                {title}
              </h3>
            )}
            {subtitle != null && (
              <p className="mt-0.5 text-xs text-content-secondary">{subtitle}</p>
            )}
          </div>
          {right != null && <div className="shrink-0">{right}</div>}
        </header>
      )}

      <div className={cn(bodyPad, bodyClassName)}>{children}</div>
    </section>
  );
}
