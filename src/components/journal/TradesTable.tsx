"use client";

import { useState } from "react";
import type { Trade } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { EditIcon, ExternalIcon, TrashIcon } from "@/components/journal/icons";
import { effectiveR } from "@/lib/stats";
import { fmtDate, fmtPnl, fmtR } from "@/lib/format";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

// =====================================================================
//  Sort model — exported so the list toolbar (mobile dropdown) and the
//  desktop column headers can drive the same single source of truth.
// =====================================================================
export type SortKey = "date" | "time" | "direction" | "session" | "pnl" | "r";
export type SortDir = "asc" | "desc";

const NUMERIC: Record<SortKey, boolean> = {
  date: false,
  time: false,
  direction: false,
  session: false,
  pnl: true,
  r: true,
};

/** Numbers + dates read best high→low first; text reads low→high first. */
export function defaultDirFor(key: SortKey): SortDir {
  return NUMERIC[key] || key === "date" || key === "time" ? "desc" : "asc";
}

function sortValue(t: Trade, key: SortKey): number | string | null {
  switch (key) {
    case "date":
      return t.date;
    case "time":
      return t.time;
    case "direction":
      return t.direction;
    case "session":
      return t.session?.trim() || null;
    case "pnl":
      return t.pnl;
    case "r":
      return effectiveR(t);
    default:
      return null;
  }
}

/** Compare with nulls always sorted last, regardless of direction. */
function compare(
  a: number | string | null,
  b: number | string | null,
  dir: SortDir,
): number {
  const an = a === null || a === undefined;
  const bn = b === null || b === undefined;
  if (an && bn) return 0;
  if (an) return 1;
  if (bn) return -1;
  let r: number;
  if (typeof a === "number" && typeof b === "number") r = a - b;
  else r = String(a).localeCompare(String(b));
  return dir === "asc" ? r : -r;
}

/** Stable sort — incoming order (date+created desc) breaks ties. */
export function sortTrades(trades: Trade[], key: SortKey, dir: SortDir): Trade[] {
  return [...trades].sort((a, b) =>
    compare(sortValue(a, key), sortValue(b, key), dir),
  );
}

/** Compact presets for the mobile sort dropdown. */
export const SORT_OPTIONS: { label: string; value: string }[] = [
  { label: "Newest first", value: "date-desc" },
  { label: "Oldest first", value: "date-asc" },
  { label: "Highest P&L", value: "pnl-desc" },
  { label: "Lowest P&L", value: "pnl-asc" },
  { label: "Highest R", value: "r-desc" },
  { label: "Lowest R", value: "r-asc" },
];

// ---------------------------------------------------------------------
//  Local formatting / tone helpers (kept self-contained).
// ---------------------------------------------------------------------
function fmtClock(time: string | null): string | null {
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

function pnlTone(pnl: number | null): string {
  if (pnl == null || pnl === 0) return "text-content-primary";
  return pnl > 0 ? "text-profit" : "text-loss";
}

function rTone(r: number | null): string {
  if (r == null || r === 0) return "text-content-secondary";
  return r > 0 ? "text-profit" : "text-loss";
}

// ---------------------------------------------------------------------
//  Small presentational cells.
// ---------------------------------------------------------------------
function DirectionBadge({ d }: { d: Trade["direction"] }) {
  if (d === "long") return <Badge tone="long">Long</Badge>;
  if (d === "short") return <Badge tone="short">Short</Badge>;
  return <span className="text-content-muted">—</span>;
}

const MODEL_TILES: { key: string; on: (t: Trade) => boolean; title: string }[] = [
  { key: "S", on: (t) => t.sfp_15m, title: "15m SFP" },
  { key: "B", on: (t) => t.bos_3m, title: "3m BOS confirmed" },
  { key: "6", on: (t) => t.entry_618, title: "Entered at 0.618" },
  { key: "O", on: (t) => t.of_confirmed, title: "Order-flow confirmed" },
];

function ModelCell({ t }: { t: Trade }) {
  return (
    <div className="flex items-center gap-1">
      {MODEL_TILES.map((m) => {
        const on = m.on(t);
        return (
          <span
            key={m.key}
            title={`${m.title}: ${on ? "yes" : "no"}`}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[10px] font-semibold tabular-nums",
              on
                ? "border-profit/40 bg-profit-soft text-profit"
                : "border-border-subtle bg-bg-elevated text-content-muted/50",
            )}
          >
            {m.key}
          </span>
        );
      })}
    </div>
  );
}

const LINK_DEFS = [
  { key: "tv_url", label: "TV", title: "TradingView screenshot" },
  { key: "atas_url", label: "ATAS", title: "ATAS screenshot" },
  { key: "after_url", label: "After", title: "After screenshot" },
] as const;

function LinksCell({ t }: { t: Trade }) {
  const items = LINK_DEFS.filter((l) => t[l.key]);
  if (items.length === 0) return <span className="text-content-muted">—</span>;
  return (
    <div className="flex items-center gap-1">
      {items.map((l) => (
        <a
          key={l.key}
          href={t[l.key] as string}
          target="_blank"
          rel="noopener noreferrer"
          title={l.title}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border-subtle bg-bg-elevated px-1.5 text-[10px] font-medium text-content-secondary transition-colors hover:border-border-strong hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        >
          {l.label}
          <ExternalIcon className="h-3 w-3" />
        </a>
      ))}
    </div>
  );
}

function NotesCell({
  t,
  expanded,
  onToggle,
}: {
  t: Trade;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!t.notes) return <span className="text-content-muted">—</span>;
  return (
    <button
      type="button"
      onClick={onToggle}
      title={expanded ? "Collapse note" : t.notes}
      className={cn(
        "block text-left text-xs leading-relaxed text-content-secondary transition-colors hover:text-content-primary focus-visible:text-content-primary focus-visible:outline-none",
        expanded ? "max-w-[24rem] whitespace-pre-wrap" : "max-w-[16rem] truncate",
      )}
    >
      {t.notes}
    </button>
  );
}

// ---------------------------------------------------------------------
//  Sort header indicator (mirrors the analytics all-trades table).
// ---------------------------------------------------------------------
function SortArrow({ state }: { state: SortDir | "off" }) {
  return (
    <span className="inline-flex flex-col leading-[0]" aria-hidden="true">
      <svg
        viewBox="0 0 12 12"
        className={cn("h-2 w-2", state === "asc" ? "text-brand" : "text-content-muted/50")}
        fill="currentColor"
      >
        <path d="M6 2 10 7H2z" />
      </svg>
      <svg
        viewBox="0 0 12 12"
        className={cn(
          "-mt-0.5 h-2 w-2",
          state === "desc" ? "text-brand" : "text-content-muted/50",
        )}
        fill="currentColor"
      >
        <path d="M6 10 2 5h8z" />
      </svg>
    </span>
  );
}

interface ColumnDef {
  key?: SortKey;
  label: string;
  numeric?: boolean;
  /** Screen-reader-only header (used for the actions column). */
  srOnly?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "date", label: "Date" },
  { key: "time", label: "Time" },
  { key: "direction", label: "Dir" },
  { key: "session", label: "Session" },
  { key: "pnl", label: "P&L", numeric: true },
  { key: "r", label: "R", numeric: true },
  { label: "Model" },
  { label: "Charts" },
  { label: "Notes" },
  { label: "Actions", srOnly: true },
];

export interface TradesTableProps {
  trades: Trade[];
  editingId: string | null;
  onEdit: (trade: Trade) => void;
  onDelete: (trade: Trade) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}

/**
 * TradesTable — the dense, wide desktop blotter. A real semantic table with a
 * sticky header, sortable columns, compact model tiles, chart links and an
 * expand-on-click notes cell. Horizontal-scrolls on narrow desktops; the body
 * scrolls vertically inside the card so the header stays pinned for long lists.
 * Hidden on phones — the comfortable card layout takes over there.
 */
export function TradesTable({
  trades,
  editingId,
  onEdit,
  onDelete,
  sortKey,
  sortDir,
  onSort,
  className,
}: TradesTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface shadow-card",
        className,
      )}
    >
      <div className="max-h-[42rem] overflow-auto">
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              {COLUMNS.map((c, i) => {
                const active = c.key != null && c.key === sortKey;
                return (
                  <th
                    key={i}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap border-b border-border bg-bg-elevated px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-content-secondary",
                      c.numeric ? "text-right" : "text-left",
                    )}
                  >
                    {c.key != null ? (
                      <button
                        type="button"
                        onClick={() => onSort(c.key as SortKey)}
                        className={cn(
                          "inline-flex items-center gap-1 transition-colors hover:text-content-primary",
                          c.numeric && "flex-row-reverse",
                          active && "text-content-primary",
                        )}
                      >
                        {c.label}
                        <SortArrow state={active ? sortDir : "off"} />
                      </button>
                    ) : c.srOnly ? (
                      <span className="sr-only">{c.label}</span>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => {
              const r = effectiveR(t);
              const active = t.id === editingId;
              return (
                <tr
                  key={t.id}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "group border-b border-border-subtle/70 transition-colors last:border-0",
                    active ? "bg-brand-soft" : "hover:bg-bg-hover",
                  )}
                >
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2 font-mono text-xs tabular-nums text-content-primary",
                      // Layout-safe (inset) left accent on the row being edited.
                      active && "shadow-[inset_3px_0_0_0_#f7931a]",
                    )}
                  >
                    {fmtDate(t.date)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs tabular-nums text-content-muted">
                    {fmtClock(t.time) ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <DirectionBadge d={t.direction} />
                  </td>
                  <td className="px-3 py-2">
                    {t.session?.trim() ? (
                      <span className="block max-w-[9rem] truncate text-content-secondary">
                        {t.session.trim()}
                      </span>
                    ) : (
                      <span className="text-content-muted">—</span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-right font-mono font-semibold tabular-nums",
                      pnlTone(t.pnl),
                    )}
                  >
                    {fmtPnl(t.pnl)}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums",
                      rTone(r),
                    )}
                  >
                    {fmtR(r)}
                  </td>
                  <td className="px-3 py-2">
                    <ModelCell t={t} />
                  </td>
                  <td className="px-3 py-2">
                    <LinksCell t={t} />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <NotesCell
                      t={t}
                      expanded={Boolean(expanded[t.id])}
                      onToggle={() =>
                        setExpanded((prev) => ({ ...prev, [t.id]: !prev[t.id] }))
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        onClick={() => onEdit(t)}
                        aria-label="Edit trade"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-bg-elevated hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(t)}
                        aria-label="Delete trade"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-loss-soft hover:text-loss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loss/60"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
