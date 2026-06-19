// =====================================================================
//  Section F — performance breakdowns by session, day-of-week and
//  direction. Each row shows a win-rate bar, win %, P&L and trade count.
// =====================================================================

import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { GroupStat, Stats } from "@/lib/stats";
import { fmtNumber, fmtPct, fmtPnl } from "@/lib/format";

function BreakdownRow({ g }: { g: GroupStat }) {
  const winTone = g.winRate >= 50 ? "profit" : "loss";
  const pnlTone =
    g.pnl > 0 ? "text-profit" : g.pnl < 0 ? "text-loss" : "text-content-secondary";

  return (
    <div className="rounded-xl px-2 py-2 transition-colors hover:bg-bg-hover">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-medium text-content-primary">
          {g.key}
        </span>
        <span className={`font-mono text-sm font-semibold tabular-nums ${pnlTone}`}>
          {fmtPnl(g.pnl)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <ProgressBar
          value={g.winRate}
          max={100}
          tone={winTone}
          className="flex-1"
        />
        <span className="w-11 shrink-0 text-right font-mono text-xs tabular-nums text-content-secondary">
          {fmtPct(g.winRate, { decimals: 0 })}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-content-muted">
        {fmtNumber(g.wins)}W · {fmtNumber(g.losses)}L
        {g.breakeven > 0 ? ` · ${fmtNumber(g.breakeven)}BE` : ""} ·{" "}
        {fmtNumber(g.trades)} {g.trades === 1 ? "trade" : "trades"}
      </div>
    </div>
  );
}

function BreakdownGroup({ title, rows }: { title: string; rows: GroupStat[] }) {
  return (
    <div className="min-w-0">
      <h4 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-content-secondary">
        {title}
      </h4>
      {rows.length === 0 ? (
        <p className="px-2 text-xs text-content-muted">No data yet.</p>
      ) : (
        <div className="space-y-0.5">
          {rows.map((g) => (
            <BreakdownRow key={g.key} g={g} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Breakdowns({ stats }: { stats: Stats }) {
  const empty =
    stats.bySession.length === 0 &&
    stats.byDayOfWeek.length === 0 &&
    stats.byDirection.length === 0;

  return (
    <Card title="Breakdowns" subtitle="Win rate & P&L by context">
      {empty ? (
        <EmptyState
          title="Nothing to break down yet"
          description="Once you've closed a few trades, edges by session, day and direction surface here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          <BreakdownGroup title="By session" rows={stats.bySession} />
          <BreakdownGroup title="By day of week" rows={stats.byDayOfWeek} />
          <BreakdownGroup title="By direction" rows={stats.byDirection} />
        </div>
      )}
    </Card>
  );
}
