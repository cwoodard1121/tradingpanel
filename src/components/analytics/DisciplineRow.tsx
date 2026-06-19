// =====================================================================
//  Section G — discipline metrics: streaks, best / worst day, profitable
//  days, trading days and average trades per week.
// =====================================================================

import { Card } from "@/components/ui/Card";
import { MiniStat } from "@/components/analytics/MiniStat";
import type { Stats } from "@/lib/stats";
import { fmtDate, fmtNumber, fmtPnl } from "@/lib/format";

function streakLabel(n: number): string {
  if (n > 0) return `${fmtNumber(n)}W`;
  if (n < 0) return `${fmtNumber(-n)}L`;
  return "—";
}

export function DisciplineRow({ stats }: { stats: Stats }) {
  const cur = stats.currentStreak;
  const curTone = cur > 0 ? "profit" : cur < 0 ? "loss" : "default";

  return (
    <Card title="Discipline" subtitle="Streaks, day quality & cadence">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label="Current streak"
          value={streakLabel(cur)}
          sub={cur > 0 ? "wins in a row" : cur < 0 ? "losses in a row" : "no active streak"}
          tone={curTone}
        />
        <MiniStat
          label="Max win streak"
          value={streakLabel(stats.maxWinStreak)}
          sub="best run"
          tone={stats.maxWinStreak > 0 ? "profit" : "default"}
        />
        <MiniStat
          label="Max loss streak"
          value={streakLabel(-stats.maxLossStreak)}
          sub="worst run"
          tone={stats.maxLossStreak > 0 ? "loss" : "default"}
        />
        <MiniStat
          label="Avg / week"
          value={fmtNumber(stats.avgTradesPerWeek, 1)}
          sub="trades per week"
          hint="Average closed trades per week across your trading span."
        />
        <MiniStat
          label="Best day"
          value={stats.bestDay ? fmtPnl(stats.bestDay.pnl) : "—"}
          sub={stats.bestDay ? fmtDate(stats.bestDay.date) : "no winning day yet"}
          tone={stats.bestDay && stats.bestDay.pnl > 0 ? "profit" : "default"}
        />
        <MiniStat
          label="Worst day"
          value={stats.worstDay ? fmtPnl(stats.worstDay.pnl) : "—"}
          sub={stats.worstDay ? fmtDate(stats.worstDay.date) : "no losing day yet"}
          tone={stats.worstDay && stats.worstDay.pnl < 0 ? "loss" : "default"}
        />
        <MiniStat
          label="Profitable days"
          value={`${fmtNumber(stats.profitableDays)}/${fmtNumber(stats.tradingDays)}`}
          sub={`${fmtNumber(stats.losingDays)} red days`}
          tone={stats.profitableDays >= stats.losingDays ? "profit" : "warn"}
        />
        <MiniStat
          label="Trading days"
          value={fmtNumber(stats.tradingDays)}
          sub="days with activity"
        />
      </div>
    </Card>
  );
}
