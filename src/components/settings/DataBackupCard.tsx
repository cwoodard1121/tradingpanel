"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Backend } from "@/lib/types";

export interface DataBackupCardProps {
  backend: Backend;
}

function DownloadIcon() {
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
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 19h14" />
    </svg>
  );
}

/**
 * DataBackupCard — at-a-glance backend status and a nudge to keep CSV backups.
 * Local-only users have no account backup, so the reminder leans warn-toned.
 */
export function DataBackupCard({ backend }: DataBackupCardProps) {
  const synced = backend === "supabase";

  return (
    <Card title="Data & backup" subtitle="Where your trades live and how to keep them safe.">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-elevated px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-content-primary">
              {synced ? "Cloud sync" : "Local storage"}
            </p>
            <p className="mt-0.5 text-xs text-content-secondary">
              {synced
                ? "Trades sync to Supabase across your devices."
                : "Trades live only in this browser on this device."}
            </p>
          </div>
          <Badge tone={synced ? "profit" : "warn"}>
            <span
              className={[
                "mr-0.5 inline-block h-1.5 w-1.5 rounded-full",
                synced ? "bg-profit" : "bg-warn",
              ].join(" ")}
            />
            {synced ? "Synced" : "Local"}
          </Badge>
        </div>

        <div
          className={[
            "rounded-xl border px-4 py-3.5",
            synced
              ? "border-border-subtle bg-bg-base/40"
              : "border-warn/25 bg-warn-soft",
          ].join(" ")}
        >
          <p
            className={[
              "text-sm font-medium",
              synced ? "text-content-primary" : "text-warn",
            ].join(" ")}
          >
            Keep a CSV backup
          </p>
          <p className="mt-1 text-xs text-content-secondary">
            {synced
              ? "Even with cloud sync, exporting an occasional CSV gives you a portable, offline copy of every trade."
              : "There's no account backup in local mode — export a CSV regularly so a cleared browser can't wipe your journal."}
          </p>
          <a
            href="/journal"
            className="mt-3 inline-flex h-9 select-none items-center justify-center gap-2 rounded-xl border border-border bg-bg-elevated px-4 text-sm font-medium text-content-primary transition-colors duration-150 hover:border-border-strong hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
          >
            <DownloadIcon />
            Export from Journal
          </a>
        </div>
      </div>
    </Card>
  );
}
