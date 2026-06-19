"use client";

// =====================================================================
//  Section I — the all-trades table. Sort by any column, filter by date
//  range / session / direction / result, expand notes, open chart links
//  and export the currently-filtered rows to CSV.
// =====================================================================

import { useMemo, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Field, Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Trade } from "@/lib/types";
import { effectiveR, outcome } from "@/lib/stats";
import { downloadCsv, tradesToCsv } from "@/lib/csv";
import {
  fmtBtc,
  fmtDate,
  fmtNumber,
  fmtPnl,
  fmtPrice,
  fmtR,
  fmtUsd,
} from "@/lib/format";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------
//  Columns
// ---------------------------------------------------------------------
type SortKey =
  | "date"
  | "direction"
  | "result"
  | "session"
  | "entry"
  | "stop"
  | "target"
  | "size_btc"
  | "risk_dollar"
  | "r"
  | "pnl";

type SortDir = "asc" | "desc";

interface ColumnDef {
  key: SortKey;
  label: string;
  numeric: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "date", label: "Date", numeric: false },
  { key: "direction", label: "Dir", numeric: false },
  { key: "result", label: "Result", numeric: false },
  { key: "session", label: "Session", numeric: false },
  { key: "entry", label: "Entry", numeric: true },
  { key: "stop", label: "Stop", numeric: true },
  { key: "target", label: "Target", numeric: true },
  { key: "size_btc", label: "Size", numeric: true },
  { key: "risk_dollar", label: "Risk", numeric: true },
  { key: "r", label: "R", numeric: true },
  { key: "pnl", label: "P&L", numeric: true },
];

const UNSPECIFIED = "__unspecified__";

function resultOf(t: Trade): "win" | "loss" | "breakeven" | null {
  return t.result ?? outcome(t);
}

function sortValue(t: Trade, key: SortKey): number | string | null {
  switch (key) {
    case "date":
      return t.date;
    case "direction":
      return t.direction;
    case "result":
      return resultOf(t);
    case "session":
      return t.session;
    case "entry":
      return t.entry;
    case "stop":
      return t.stop;
    case "target":
      return t.target;
    case "size_btc":
      return t.size_btc;
    case "risk_dollar":
      return t.risk_dollar;
    case "r":
      return effectiveR(t);
    case "pnl":
      return t.pnl;
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

// ---------------------------------------------------------------------
//  Small presentational helpers
// ---------------------------------------------------------------------
function DirectionBadge({ d }: { d: Trade["direction"] }) {
  if (d === "long") return <Badge tone="long">Long</Badge>;
  if (d === "short") return <Badge tone="short">Short</Badge>;
  return <span className="text-content-muted">—</span>;
}

function ResultBadge({ t }: { t: Trade }) {
  const r = resultOf(t);
  if (r === "win") return <Badge tone="profit">Win</Badge>;
  if (r === "loss") return <Badge tone="loss">Loss</Badge>;
  if (r === "breakeven") return <Badge tone="default">BE</Badge>;
  return <span className="text-content-muted">—</span>;
}

function ChecklistCell({ t }: { t: Trade }) {
  const items: Array<{ key: string; on: boolean; title: string }> = [
    { key: "S", on: t.sfp_15m, title: "SFP 15m" },
    { key: "B", on: t.bos_3m, title: "BOS 3m" },
    { key: "6", on: t.entry_618, title: "0.618 entry" },
    { key: "O", on: t.of_confirmed, title: "Order-flow confirmed" },
  ];
  return (
    <div className="flex items-center gap-1">
      {items.map((it) => (
        <span
          key={it.key}
          title={`${it.title}: ${it.on ? "yes" : "no"}`}
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[10px] font-semibold",
            it.on
              ? "border-brand/40 bg-brand-soft text-brand"
              : "border-border-subtle bg-bg-elevated text-content-muted/60",
          )}
        >
          {it.key}
        </span>
      ))}
    </div>
  );
}

function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </svg>
  );
}

function LinkChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${label} link`}
      className="inline-flex h-6 items-center gap-1 rounded-md border border-border-subtle bg-bg-elevated px-1.5 text-[10px] font-medium text-content-secondary transition-colors hover:border-border hover:text-content-primary"
    >
      {label}
      <ExternalIcon />
    </a>
  );
}

function LinksCell({ t }: { t: Trade }) {
  const links: Array<{ href: string; label: string }> = [];
  if (t.tv_url) links.push({ href: t.tv_url, label: "TV" });
  if (t.atas_url) links.push({ href: t.atas_url, label: "ATAS" });
  if (t.after_url) links.push({ href: t.after_url, label: "After" });
  if (links.length === 0) return <span className="text-content-muted">—</span>;
  return (
    <div className="flex items-center gap-1">
      {links.map((l) => (
        <LinkChip key={l.label} href={l.href} label={l.label} />
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
      title={expanded ? "Collapse" : "Expand"}
      className={cn(
        "max-w-[16rem] text-left text-xs text-content-secondary transition-colors hover:text-content-primary",
        expanded ? "whitespace-pre-wrap" : "truncate",
      )}
    >
      {t.notes}
    </button>
  );
}

// ---------------------------------------------------------------------
//  Sort header button
// ---------------------------------------------------------------------
function SortArrow({ state }: { state: "asc" | "desc" | "off" }) {
  return (
    <span className="ml-1 inline-flex flex-col leading-[0]" aria-hidden="true">
      <svg
        viewBox="0 0 12 12"
        className={cn(
          "h-2 w-2",
          state === "asc" ? "text-brand" : "text-content-muted/50",
        )}
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

// ---------------------------------------------------------------------
//  Table
// ---------------------------------------------------------------------
export function AllTradesTable({ trades }: { trades: Trade[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [session, setSession] = useState("");
  const [direction, setDirection] = useState("");
  const [result, setResult] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Distinct sessions present, for the filter dropdown.
  const sessionOptions = useMemo(() => {
    const set = new Set<string>();
    let hasUnspecified = false;
    for (const t of trades) {
      const s = t.session?.trim();
      if (s) set.add(s);
      else hasUnspecified = true;
    }
    const opts = [{ label: "All sessions", value: "" }];
    [...set]
      .sort((a, b) => a.localeCompare(b))
      .forEach((s) => opts.push({ label: s, value: s }));
    if (hasUnspecified) opts.push({ label: "Unspecified", value: UNSPECIFIED });
    return opts;
  }, [trades]);

  const filtered = useMemo(() => {
    const rows = trades.filter((t) => {
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (session) {
        const s = t.session?.trim();
        if (session === UNSPECIFIED) {
          if (s) return false;
        } else if (s !== session) {
          return false;
        }
      }
      if (direction && t.direction !== direction) return false;
      if (result && resultOf(t) !== result) return false;
      return true;
    });
    rows.sort((a, b) => compare(sortValue(a, sortKey), sortValue(b, sortKey), sortDir));
    return rows;
  }, [trades, from, to, session, direction, result, sortKey, sortDir]);

  function onSort(key: SortKey, numeric: boolean) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Numbers & dates read best high-to-low first; text low-to-high.
      setSortDir(numeric || key === "date" ? "desc" : "asc");
    }
  }

  function resetFilters() {
    setFrom("");
    setTo("");
    setSession("");
    setDirection("");
    setResult("");
  }

  function onExport() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`trades-${stamp}.csv`, tradesToCsv(filtered));
  }

  const hasFilters = Boolean(from || to || session || direction || result);

  return (
    <Card
      title="All trades"
      subtitle={`${fmtNumber(filtered.length)} of ${fmtNumber(trades.length)} ${
        trades.length === 1 ? "trade" : "trades"
      }`}
      right={
        <Button
          variant="secondary"
          size="sm"
          onClick={onExport}
          disabled={filtered.length === 0}
        >
          Export CSV
        </Button>
      }
      padded={false}
    >
      {/* Filter toolbar */}
      <div className="border-b border-border-subtle px-4 py-4 sm:px-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Field label="From">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="[color-scheme:dark]"
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="[color-scheme:dark]"
            />
          </Field>
          <Field label="Session">
            <Select value={session} onChange={setSession} options={sessionOptions} />
          </Field>
          <Field label="Direction">
            <Select
              value={direction}
              onChange={setDirection}
              options={[
                { label: "Both", value: "" },
                { label: "Long", value: "long" },
                { label: "Short", value: "short" },
              ]}
            />
          </Field>
          <Field label="Result">
            <Select
              value={result}
              onChange={setResult}
              options={[
                { label: "Any", value: "" },
                { label: "Win", value: "win" },
                { label: "Loss", value: "loss" },
                { label: "Breakeven", value: "breakeven" },
              ]}
            />
          </Field>
        </div>
        {hasFilters && (
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No trades match these filters" : "No trades yet"}
          description={
            hasFilters
              ? "Loosen the date range or filters to see more rows."
              : "Log a trade in the journal and it'll appear here."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="max-h-[34rem] overflow-auto">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-bg-elevated">
              <tr className="border-b border-border">
                {COLUMNS.map((c) => {
                  const active = c.key === sortKey;
                  const state = active ? sortDir : "off";
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      className={cn(
                        "whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-content-secondary",
                        c.numeric ? "text-right" : "text-left",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSort(c.key, c.numeric)}
                        className={cn(
                          "inline-flex items-center transition-colors hover:text-content-primary",
                          c.numeric ? "flex-row-reverse" : "",
                          active && "text-content-primary",
                        )}
                      >
                        {c.label}
                        <SortArrow state={state} />
                      </button>
                    </th>
                  );
                })}
                <th
                  scope="col"
                  className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-content-secondary"
                >
                  Setup
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-content-secondary"
                >
                  Links
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-content-secondary"
                >
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const r = effectiveR(t);
                const pnlTone =
                  t.pnl != null && t.pnl > 0
                    ? "text-profit"
                    : t.pnl != null && t.pnl < 0
                      ? "text-loss"
                      : "text-content-primary";
                const rTone =
                  r != null && r > 0
                    ? "text-profit"
                    : r != null && r < 0
                      ? "text-loss"
                      : "text-content-secondary";
                return (
                  <tr
                    key={t.id}
                    className="border-b border-border-subtle transition-colors last:border-0 hover:bg-bg-hover"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs tabular-nums text-content-primary">
                      {fmtDate(t.date)}
                    </td>
                    <td className="px-3 py-2.5">
                      <DirectionBadge d={t.direction} />
                    </td>
                    <td className="px-3 py-2.5">
                      <ResultBadge t={t} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-content-secondary">
                      {t.session?.trim() || (
                        <span className="text-content-muted">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-content-primary">
                      {fmtPrice(t.entry)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-content-secondary">
                      {fmtPrice(t.stop)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-content-secondary">
                      {fmtPrice(t.target)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-content-secondary">
                      {fmtBtc(t.size_btc)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-content-secondary">
                      {fmtUsd(t.risk_dollar)}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-3 py-2.5 text-right font-mono font-medium tabular-nums",
                        rTone,
                      )}
                    >
                      {fmtR(r)}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-3 py-2.5 text-right font-mono font-semibold tabular-nums",
                        pnlTone,
                      )}
                    >
                      {fmtPnl(t.pnl)}
                    </td>
                    <td className="px-3 py-2.5">
                      <ChecklistCell t={t} />
                    </td>
                    <td className="px-3 py-2.5">
                      <LinksCell t={t} />
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <NotesCell
                        t={t}
                        expanded={Boolean(expanded[t.id])}
                        onToggle={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [t.id]: !prev[t.id],
                          }))
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
