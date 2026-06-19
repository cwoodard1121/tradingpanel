"use client";

import { useCallback, useState } from "react";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export interface CopyButtonProps {
  /** Exact string written to the clipboard (kept raw for pasting into an exchange). */
  value: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

function CopyGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m5 12 5 5 9-11" />
    </svg>
  );
}

/**
 * CopyButton — copies a value to the clipboard with a brief "Copied" confirmation.
 * All browser-API access is inside the click handler and guarded for SSR safety.
 */
export function CopyButton({
  value,
  label = "Copy",
  className,
  disabled,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    if (disabled || typeof window === "undefined") return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else if (typeof document !== "undefined") {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — fail quietly */
    }
  }, [value, disabled]);

  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={disabled}
      aria-label={`${label} ${value}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:pointer-events-none disabled:opacity-40",
        copied
          ? "border-profit/40 bg-profit-soft text-profit"
          : "border-border bg-bg-elevated text-content-secondary hover:border-border-strong hover:bg-bg-hover hover:text-content-primary",
        className,
      )}
    >
      {copied ? <CheckGlyph /> : <CopyGlyph />}
      {copied ? "Copied" : label}
    </button>
  );
}
