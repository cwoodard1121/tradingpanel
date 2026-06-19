"use client";

import type { Trade } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { ChecklistTicks } from "@/components/journal/ChecklistTicks";
import {
  DateTimeStack,
  PnlValue,
  ROW_GRID,
  RPill,
  RowActions,
  TradeLinks,
} from "@/components/journal/tradeParts";
import { fmtPct, fmtUsd } from "@/lib/format";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export interface TradeRowProps {
  trade: Trade;
  active?: boolean;
  onEdit: (trade: Trade) => void;
  onDelete: (trade: Trade) => void;
}

/**
 * TradeRow — the dense desktop row. A single aligned grid line (date+time,
 * setup, risk, R, P&L, actions) with an optional muted detail line beneath for
 * price levels, notes and screenshot links. Hover-elevates; actions fade in.
 */
export function TradeRow({ trade, active, onEdit, onDelete }: TradeRowProps) {
  const hasLevels =
    trade.entry != null ||
    trade.stop != null ||
    trade.target != null ||
    trade.size_btc != null;
  const showLinks = !!(trade.tv_url || trade.atas_url || trade.after_url);
  const hasDetail = hasLevels || !!trade.notes || showLinks;

  return (
    <div
      className={cn(
        "group relative px-5 py-3.5 transition-colors duration-150 hover:bg-bg-hover",
        active && "bg-brand-soft",
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-0.5 bg-brand"
        />
      )}

      {/* Primary line */}
      <div className={ROW_GRID}>
        <DateTimeStack date={trade.date} time={trade.time} />

        {/* Setup: direction + session + model ticks */}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {trade.direction && (
            <Badge tone={trade.direction === "long" ? "long" : "short"}>
              {trade.direction === "long" ? "Long" : "Short"}
            </Badge>
          )}
          {trade.session && <Badge tone="default">{trade.session}</Badge>}
          <ChecklistTicks trade={trade} />
        </div>

        {/* Risk */}
        <div className="text-right leading-tight">
          <div className="font-mono text-xs tabular-nums text-content-secondary">
            {fmtUsd(trade.risk_dollar)}
          </div>
          {trade.risk_pct != null && (
            <div className="font-mono text-[11px] tabular-nums text-content-muted">
              {fmtPct(trade.risk_pct)}
            </div>
          )}
        </div>

        {/* R */}
        <div className="flex justify-end">
          <RPill r={trade.r_multiple} />
        </div>

        {/* P&L */}
        <div className="text-right">
          <PnlValue pnl={trade.pnl} />
        </div>

        {/* Actions (fade in on hover/focus) */}
        <div className="flex justify-end opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
          <RowActions trade={trade} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>

      {/* Detail line */}
      {hasDetail && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-[11.75rem] text-xs text-content-muted">
          {hasLevels && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono tabular-nums">
              {trade.entry != null && (
                <span>
                  <span className="text-content-muted/70">E</span>{" "}
                  <span className="text-content-secondary">{fmtUsd(trade.entry)}</span>
                </span>
              )}
              {trade.stop != null && (
                <span>
                  <span className="text-content-muted/70">S</span>{" "}
                  <span className="text-content-secondary">{fmtUsd(trade.stop)}</span>
                </span>
              )}
              {trade.target != null && (
                <span>
                  <span className="text-content-muted/70">T</span>{" "}
                  <span className="text-content-secondary">{fmtUsd(trade.target)}</span>
                </span>
              )}
              {trade.size_btc != null && (
                <span className="text-content-secondary">
                  {trade.size_btc.toLocaleString("en-US", {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}{" "}
                  ₿
                </span>
              )}
            </span>
          )}

          {trade.notes && (
            <span className="min-w-0 flex-1 truncate text-content-secondary">
              {trade.notes}
            </span>
          )}

          {showLinks && <TradeLinks trade={trade} className="ml-auto" />}
        </div>
      )}
    </div>
  );
}
