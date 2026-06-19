"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export type ModalSize = "sm" | "md" | "lg" | "xl";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  children?: ReactNode;
}

const sizes: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

/**
 * Modal — fixed overlay dialog. Closes on backdrop click + Escape, locks body
 * scroll while open and focuses the panel. No portals, no window.confirm/alert.
 * Use this for confirmations. On mobile it docks to the bottom as a sheet.
 */
export function Modal({
  open,
  onClose,
  title,
  footer,
  size = "md",
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);

    const prevOverflow =
      typeof document !== "undefined" ? document.body.style.overflow : "";
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }

    panelRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      if (typeof document !== "undefined") {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Dialog"}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col rounded-t-2xl border border-border-subtle bg-bg-surface shadow-card outline-none sm:rounded-2xl",
          sizes[size],
        )}
      >
        {title != null && (
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight text-content-primary">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-bg-hover hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="overflow-y-auto px-5 py-4">{children}</div>

        {footer != null && (
          <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
