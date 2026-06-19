"use client";

import { Button } from "@/components/ui/Button";

export interface SaveBarProps {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onReset: () => void;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

/**
 * SaveBar — the footer for each settings group. Shows a transient "Saved"
 * confirmation, a discard action while dirty, and a primary Save button that is
 * disabled until there are unsaved changes.
 */
export function SaveBar({ dirty, saving, saved, onSave, onReset }: SaveBarProps) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
      <div className="min-h-[1.25rem] text-xs">
        {saved && !dirty ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-profit">
            <CheckIcon />
            Saved
          </span>
        ) : dirty ? (
          <span className="text-content-muted">Unsaved changes</span>
        ) : (
          <span className="text-content-muted">Up to date</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {dirty && (
          <Button variant="ghost" size="sm" onClick={onReset} disabled={saving}>
            Discard
          </Button>
        )}
        <Button
          size="sm"
          onClick={onSave}
          loading={saving}
          disabled={!dirty || saving}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
}
