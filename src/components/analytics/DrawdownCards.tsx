// =====================================================================
//  Section C — drawdown summary. Max & current drawdown in $ and %.
// =====================================================================

import { Card } from "@/components/ui/Card";
import { MiniStat } from "@/components/analytics/MiniStat";
import type { Stats } from "@/lib/stats";
import { fmtPct, fmtUsd } from "@/lib/format";

export function DrawdownCards({ stats }: { stats: Stats }) {
  const inDrawdown = stats.currentDrawdownDollar > 0;

  return (
    <Card
      title="Drawdown"
      subtitle="Peak-to-trough equity decline"
    >
      <div className="grid grid-cols-2 gap-3">
        <MiniStat
          label="Max DD"
          value={stats.maxDrawdownDollar > 0 ? `-${fmtUsd(stats.maxDrawdownDollar)}` : fmtUsd(0)}
          sub="largest dollar dip"
          tone={stats.maxDrawdownDollar > 0 ? "loss" : "default"}
          hint="The deepest your equity has fallen from a prior peak."
        />
        <MiniStat
          label="Max DD %"
          value={fmtPct(stats.maxDrawdownPct)}
          sub="of peak equity"
          tone={stats.maxDrawdownPct > 0 ? "loss" : "default"}
        />
        <MiniStat
          label="Current DD"
          value={inDrawdown ? `-${fmtUsd(stats.currentDrawdownDollar)}` : fmtUsd(0)}
          sub={inDrawdown ? "below peak" : "at new highs"}
          tone={inDrawdown ? "warn" : "profit"}
        />
        <MiniStat
          label="Current DD %"
          value={fmtPct(stats.currentDrawdownPct)}
          sub="from peak"
          tone={inDrawdown ? "warn" : "profit"}
        />
      </div>
    </Card>
  );
}
