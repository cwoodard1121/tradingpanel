"use client";

import type { Trade } from "@/lib/types";
import { EditIcon, ExternalIcon, ClockIcon, TrashIcon } from "@/components/journal/icons";
import { fmtDate, fmtPnl, fmtR } from "@/lib/format";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

// Shared CSS grid used by both the desktop header strip and every TradeRow so
// columns stay perfectly aligned across the whole table.
export const ROW_GRID =
  "grid items-center gap-4 grid-cols-[10.5rem_minmax(0,1fr)_5.5rem_4.25rem_7.5rem_5rem]";

// ---------------------------------------------------------------------
//  Tone helpers — P&L / R color by sign.
// ---------------------------------------------------------------------
export function pnlToneClass(pnl: number | null): string {
  if (pnl == null || pnl === 0) return "text-content-primary";
  return pnl > 0 ? "text-profit" : "text-loss";
}

export function rToneClass(r: number | null): string {
  if (r == null || r === 0) return "text-content-secondary";
  return r > 0 ? "text-profit" : "text-loss";
}

// ---------------------------------------------------------------------
//  fmtClock — 'HH:MM' (24h) → '2:30 PM'. Pure string math, deterministic
//  (no Date, no locale) so it is identical on the server and the client.
// ---------------------------------------------------------------------
export function fmtClock(time: string | null): string | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!m) return time;
  let h = Number(m[1]);
  const min = m[2];
  if (!Number.isFinite(h) || h < 0 || h > 23) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${suffix}`;
}

// ---------------------------------------------------------------------
//  Date + time stack.
// ---------------------------------------------------------------------
export function DateTimeStack({
  date,
  time,
  className,
}: {
  date: string;
  time: string | null;
  className?: string;
}) {
  const clock = fmtClock(time);
  return (
    <div className={cn("flex flex-col leading-tight", className)}>
      <span className="font-mono text-sm font-medium tabular-nums text-content-primary">
        {fmtDate(date)}
      </span>
      <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-content-muted">
        <ClockIcon className="h-3 w-3" />
        {clock ?? "—"}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------
//  P&L value — colored, mono, prominent.
// ---------------------------------------------------------------------
export function PnlValue({
  pnl,
  size = "md",
  className,
}: {
  pnl: number | null;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono font-semibold tracking-tight tabular-nums",
        size === "lg" ? "text-3xl" : "text-base",
        pnlToneClass(pnl),
        className,
      )}
    >
      {fmtPnl(pnl)}
    </span>
  );
}

// ---------------------------------------------------------------------
//  R pill — soft tinted by sign.
// ---------------------------------------------------------------------
export function RPill({ r, className }: { r: number | null; className?: string }) {
  const tone =
    r == null
      ? "border border-border-subtle bg-bg-elevated/60 text-content-muted"
      : r > 0
        ? "bg-profit-soft text-profit"
        : r < 0
          ? "bg-loss-soft text-loss"
          : "border border-border-subtle bg-bg-elevated text-content-secondary";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums",
        tone,
        className,
      )}
    >
      {fmtR(r)}
    </span>
  );
}

// ---------------------------------------------------------------------
//  Screenshot links — compact chips that open in a new tab.
// ---------------------------------------------------------------------
const LINK_DEFS = [
  { key: "tv_url", label: "TV", title: "TradingView screenshot" },
  { key: "atas_url", label: "ATAS", title: "ATAS screenshot" },
  { key: "after_url", label: "After", title: "After screenshot" },
] as const;

export function hasLinks(trade: Trade): boolean {
  return !!(trade.tv_url || trade.atas_url || trade.after_url);
}

export function TradeLinks({
  trade,
  className,
}: {
  trade: Trade;
  className?: string;
}) {
  const items = LINK_DEFS.filter((l) => trade[l.key]);
  if (items.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((l) => (
        <a
          key={l.key}
          href={trade[l.key] as string}
          target="_blank"
          rel="noopener noreferrer"
          title={l.title}
          className="inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-bg-elevated px-2 py-1 text-[11px] font-medium text-content-secondary transition-colors hover:border-border-strong hover:bg-bg-hover hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        >
          <ExternalIcon className="h-3 w-3" />
          {l.label}
        </a>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
//  Edit / delete actions.
// ---------------------------------------------------------------------
export function RowActions({
  trade,
  onEdit,
  onDelete,
  className,
}: {
  trade: Trade;
  onEdit: (trade: Trade) => void;
  onDelete: (trade: Trade) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => onEdit(trade)}
        aria-label="Edit trade"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-bg-elevated hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      >
        <EditIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(trade)}
        aria-label="Delete trade"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-loss-soft hover:text-loss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loss/60"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
