"use client";

import type { ReactNode } from "react";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export interface ToggleProps {
  checked: boolean;
  onChange: (b: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
}

/**
 * Toggle — accessible switch (role="switch"). The whole row is the control, so
 * the label and hint are clickable too. Brand fill when on.
 */
export function Toggle({ checked, onChange, label, hint }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex items-start gap-3 text-left focus:outline-none"
    >
      <span
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 group-focus-visible:ring-2 group-focus-visible:ring-brand/70 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-bg-base",
          checked ? "bg-brand" : "border border-border bg-bg-elevated",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>

      {(label != null || hint != null) && (
        <span className="flex flex-col">
          {label != null && (
            <span className="text-sm text-content-primary">{label}</span>
          )}
          {hint != null && (
            <span className="mt-0.5 text-xs text-content-muted">{hint}</span>
          )}
        </span>
      )}
    </button>
  );
}
