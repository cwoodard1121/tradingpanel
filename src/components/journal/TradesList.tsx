"use client";

import { useMemo, useState } from "react";
import type { Trade, TradeResult } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { TradeCard } from "@/components/journal/TradeCard";
import {
  TradesTable,
  defaultDirFor,
  sortTrades,
  SORT_OPTIONS,
  type SortDir,
  type SortKey,
} from "@/components/journal/TradesTable";
import { JournalGlyph, PlusIcon, SearchIcon } from "@/components/journal/icons";
import { fmtNumber } from "@/lib/format";

type ResultFilter = "all" | TradeResult;

// How many cards to render on phones before the "show more" control. The
// desktop table keeps every row (it scrolls inside its own pinned-header card).
const MOBILE_PAGE = 30;

function derivedResult(t: Trade): TradeResult | null {
  if (t.result) return t.result;
  if (t.pnl == null) return null;
  if (t.pnl > 0) return "win";
  if (t.pnl < 0) return "loss";
  return "breakeven";
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-card"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="mt-4 h-8 w-32" />
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export interface TradesListProps {
  trades: Trade[];
  initializing: boolean;
  editingId: string | null;
  onEdit: (trade: Trade) => void;
  onDelete: (trade: Trade) => void;
  onStart: () => void;
}

/**
 * TradesList — the journal feed. A shared toolbar (search + result filter +
 * sort) drives two synced views: a comfortable card stack on phones and a
 * wide, dense, sortable blotter on desktop. Handles the loading, empty and
 * no-matches states.
 */
export function TradesList({
  trades,
  initializing,
  editingId,
  onEdit,
  onDelete,
  onStart,
}: TradesListProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ResultFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [mobileLimit, setMobileLimit] = useState(MOBILE_PAGE);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = trades.filter((t) => {
      if (result !== "all" && derivedResult(t) !== result) return false;
      if (q) {
        const hay = `${t.notes ?? ""} ${t.session ?? ""} ${t.direction ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return sortTrades(matched, sortKey, sortDir);
  }, [trades, query, result, sortKey, sortDir]);

  // Toggle direction when re-clicking the active column, else sensible default.
  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(defaultDirFor(key));
    }
  }

  function handleSortSelect(value: string) {
    const [key, dir] = value.split("-") as [SortKey, SortDir];
    setSortKey(key);
    setSortDir(dir);
  }

  if (initializing) {
    return <ListSkeleton />;
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-bg-surface shadow-card">
        <EmptyState
          icon={<JournalGlyph className="h-6 w-6" />}
          title="No trades logged yet"
          description="Your journal is empty. Log your first BTC trade with the form to start tracking your edge."
          action={
            <Button onClick={onStart}>
              <PlusIcon className="h-4 w-4" />
              Log your first trade
            </Button>
          }
        />
      </div>
    );
  }

  const resultOptions: { label: string; value: ResultFilter }[] = [
    { label: "All", value: "all" },
    { label: "Wins", value: "win" },
    { label: "Losses", value: "loss" },
    { label: "BE", value: "breakeven" },
  ];

  const mobileVisible = sorted.slice(0, mobileLimit);
  const mobileHidden = sorted.length - mobileVisible.length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-content-secondary">
            Recent trades
          </h2>
          <Badge tone="default">
            {sorted.length === trades.length
              ? `${fmtNumber(trades.length)} total`
              : `${fmtNumber(sorted.length)} of ${fmtNumber(trades.length)}`}
          </Badge>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
            <input
              type="text"
              inputMode="search"
              placeholder="Search notes, session…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg-elevated py-2.5 pl-9 pr-3 text-sm text-content-primary placeholder:text-content-muted outline-none transition-colors duration-150 focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              options={resultOptions}
              value={result}
              onChange={setResult}
              size="sm"
              className="flex-1 sm:w-auto"
            />
            {/* Sort lives on the column headers on desktop; phones get a select. */}
            <Select
              value={`${sortKey}-${sortDir}`}
              onChange={handleSortSelect}
              options={SORT_OPTIONS}
              className="w-36 shrink-0 md:hidden"
            />
          </div>
        </div>
      </div>

      {/* Feed */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-bg-surface shadow-card">
          <EmptyState
            title="No matching trades"
            description="No trades match your search and filter. Try clearing them to see everything."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setResult("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Phones: comfortable cards */}
          <div className="space-y-3 md:hidden">
            {mobileVisible.map((t) => (
              <TradeCard
                key={t.id}
                trade={t}
                active={t.id === editingId}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
            {mobileHidden > 0 && (
              <div className="flex justify-center pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMobileLimit((n) => n + MOBILE_PAGE)}
                >
                  Show more · {fmtNumber(mobileHidden)} hidden
                </Button>
              </div>
            )}
          </div>

          {/* Desktop: wide, dense blotter */}
          <TradesTable
            className="hidden md:block"
            trades={sorted}
            editingId={editingId}
            onEdit={onEdit}
            onDelete={onDelete}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </>
      )}
    </div>
  );
}
