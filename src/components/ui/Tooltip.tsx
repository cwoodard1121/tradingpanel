import type { ReactNode } from "react";

/**
 * Tooltip — pure-CSS hover/focus tooltip (no JS, no portals). Works on tap via
 * the focusable trigger wrapper. Dark, elevated surface with a small arrow.
 */
export function Tooltip({
  content,
  children,
}: {
  content: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      <span tabIndex={0} className="inline-flex cursor-help outline-none">
        {children}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[16rem] -translate-x-1/2 translate-y-1 scale-95 rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5 text-center text-xs leading-snug text-content-primary opacity-0 shadow-card transition-all duration-150 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100"
      >
        {content}
        <span className="absolute left-1/2 top-full -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-border bg-bg-elevated" />
      </span>
    </span>
  );
}
