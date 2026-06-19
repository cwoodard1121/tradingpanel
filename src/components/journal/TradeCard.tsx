"use client";

import type { ReactNode } from "react";
import type { Trade } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { ChecklistTicks } from "@/components/journal/ChecklistTicks";
import { EditIcon, ExternalIcon, TrashIcon } from "@/components/journal/icons";
import { fmtBtc, fmtDate, fmtPct, fmtPnl, fmtPrice, fmtR, fmtUsd } from "@/lib/format";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

function Level({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-wide text-content-muted">
        {label}
      </div>
      <div className="truncate font-mono text-sm tabular-nums text-content-primary">
        {children}
      </div>
    </div>
  );
}

function LinkChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-elevated px-2.5 py-1 text-xs font-medium text-content-secondary transition-colors hover:border-border-strong hover:bg-bg-hover hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
    >
      <ExternalIcon className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

export interface TradeCardProps {
  trade: Trade;
  active?: boolean;
  onEdit: (trade: Trade) => void;
  onDelete: (trade: Trade) => void;
}

/**
 * TradeCard — one journal entry. Date + direction/session/result badges,
 * a hero P&L with R and risk, optional price levels, the model checklist,
 * notes, and screenshot links that open in a new tab. Edit / delete live in
 * the top-right.
 */
export function TradeCard({ trade, active, onEdit, onDelete }: TradeCardProps) {
  const pnlTone =
    trade.pnl == null
      ? "text-content-primary"
      : trade.pnl > 0
        ? "text-profit"
        : trade.pnl < 0
          ? "text-loss"
          : "text-content-primary";

  const rTone =
    trade.r_multiple == null
      ? "text-content-secondary"
      : trade.r_multiple > 0
        ? "text-profit"
        : trade.r_multiple < 0
          ? "text-loss"
          : "text-content-secondary";

  const hasLevels =
    trade.entry != null ||
    trade.stop != null ||
    trade.target != null ||
    trade.size_btc != null;

  const hasLinks = !!(trade.tv_url || trade.atas_url || trade.after_url);

  return (
    <article
      className={cn(
        "group rounded-2xl border bg-bg-surface p-4 shadow-card transition-colors duration-150 hover:bg-bg-hover sm:p-5",
        active ? "border-brand/60 ring-1 ring-brand/30" : "border-border-subtle",
      )}
    >
      {/* Header: meta badges + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm tabular-nums text-content-secondary">
            {fmtDate(trade.date)}
          </span>
          {trade.direction && (
            <Badge tone={trade.direction === "long" ? "long" : "short"}>
              {trade.direction === "long" ? "Long" : "Short"}
            </Badge>
          )}
          {trade.result && (
            <Badge
              tone={
                trade.result === "win"
                  ? "profit"
                  : trade.result === "loss"
                    ? "loss"
                    : "warn"
              }
            >
              {trade.result === "win" ? "Win" : trade.result === "loss" ? "Loss" : "BE"}
            </Badge>
          )}
          {trade.session && <Badge tone="default">{trade.session}</Badge>}
        </div>

        <div className="flex shrink-0 items-center gap-1">
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
      </div>

      {/* Hero metrics */}
      <div className="mt-3 flex flex-wrap items-end gap-x-7 gap-y-3">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-content-muted">
            P&L
          </div>
          <div
            className={cn(
              "font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl",
              pnlTone,
            )}
          >
            {fmtPnl(trade.pnl)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-content-muted">
            R
          </div>
          <div className={cn("font-mono text-lg font-semibold tabular-nums", rTone)}>
            {fmtR(trade.r_multiple)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-content-muted">
            Risk
          </div>
          <div className="font-mono text-sm tabular-nums text-content-secondary">
            {fmtUsd(trade.risk_dollar)}
            {trade.risk_pct != null && (
              <span className="text-content-muted"> · {fmtPct(trade.risk_pct)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Price levels */}
      {hasLevels && (
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border-subtle pt-3 sm:grid-cols-4">
          <Level label="Entry">{fmtPrice(trade.entry)}</Level>
          <Level label="Stop">{fmtPrice(trade.stop)}</Level>
          <Level label="Target">{fmtPrice(trade.target)}</Level>
          <Level label="Size">{trade.size_btc == null ? "—" : `${fmtBtc(trade.size_btc)} ₿`}</Level>
        </div>
      )}

      {/* Model checklist */}
      <ChecklistTicks trade={trade} className="mt-4" />

      {/* Notes */}
      {trade.notes && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-content-secondary">
          {trade.notes}
        </p>
      )}

      {/* Screenshot links */}
      {hasLinks && (
        <div className="mt-4 flex flex-wrap gap-2">
          {trade.tv_url && <LinkChip href={trade.tv_url} label="TradingView" />}
          {trade.atas_url && <LinkChip href={trade.atas_url} label="ATAS" />}
          {trade.after_url && <LinkChip href={trade.after_url} label="After" />}
        </div>
      )}
    </article>
  );
}
