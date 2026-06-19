// =====================================================================
//  Section A — headline KPI tiles. Total P&L, win rate, profit factor,
//  expectancy ($ + R), this-week and this-month P&L.
// =====================================================================

import { StatCard } from "@/components/ui/StatCard";
import type { Stats } from "@/lib/stats";
import { fmtNumber, fmtPct, fmtPnl, fmtR } from "@/lib/format";

/** Profit factor can be Infinity (no losing trades) — render it cleanly. */
function fmtProfitFactor(pf: number): string {
  if (!Number.isFinite(pf)) return pf > 0 ? "∞" : "—";
  return fmtNumber(pf, 2);
}

function signTone(n: number): "profit" | "loss" | "default" {
  if (n > 0) return "profit";
  if (n < 0) return "loss";
  return "default";
}

export function HeadlineStats({ stats }: { stats: Stats }) {
  const pfTone =
    !Number.isFinite(stats.profitFactor)
      ? stats.profitFactor > 0
        ? "profit"
        : "default"
      : stats.profitFactor >= 1
        ? "profit"
        : stats.profitFactor > 0
          ? "loss"
          : "default";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
      <StatCard
        label="Total P&L"
        value={fmtPnl(stats.totalPnl)}
        tone={signTone(stats.totalPnl)}
        sub={`${fmtNumber(stats.closedTrades)} closed`}
      />
      <StatCard
        label="Win rate"
        value={fmtPct(stats.winRate)}
        tone={stats.winRate >= 50 ? "profit" : "default"}
        sub={`${fmtNumber(stats.wins)}W · ${fmtNumber(stats.losses)}L`}
        hint="Wins ÷ decided trades (wins + losses). Breakevens excluded."
      />
      <StatCard
        label="Profit factor"
        value={fmtProfitFactor(stats.profitFactor)}
        tone={pfTone}
        sub={`${fmtPnl(stats.grossProfit)} / -${fmtNumber(stats.grossLoss, 2)}`}
        hint="Gross profit ÷ gross loss. Above 1.0 means your winners outweigh your losers."
      />
      <StatCard
        label="Expectancy"
        value={fmtPnl(stats.expectancyDollar)}
        tone={signTone(stats.expectancyDollar)}
        sub={`${fmtR(stats.expectancyR)} per trade`}
        hint="Average realized P&L per trade, in dollars and R-multiples."
      />
      <StatCard
        label="This week"
        value={fmtPnl(stats.thisWeekPnl)}
        tone={signTone(stats.thisWeekPnl)}
        sub={`${fmtNumber(stats.thisWeekTrades)} trades · ${fmtPct(stats.thisWeekWinRate)}`}
      />
      <StatCard
        label="This month"
        value={fmtPnl(stats.thisMonthPnl)}
        tone={signTone(stats.thisMonthPnl)}
        sub={`${fmtNumber(stats.thisMonthTrades)} trades`}
      />
    </div>
  );
}
