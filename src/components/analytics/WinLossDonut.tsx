"use client";

// =====================================================================
//  Section D — win / loss / breakeven donut with a center win-rate label.
// =====================================================================

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

import { Card } from "@/components/ui/Card";
import type { Stats } from "@/lib/stats";
import { fmtNumber, fmtPct } from "@/lib/format";
import { CHART, TooltipBox, TooltipRow } from "@/components/analytics/chartTheme";

interface Slice {
  name: string;
  value: number;
  color: string;
}

interface DonutTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: Slice }>;
  total: number;
}

function DonutTooltip({ active, payload, total }: DonutTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const s = payload[0].payload;
  const share = total > 0 ? (s.value / total) * 100 : 0;
  return (
    <TooltipBox>
      <div className="space-y-1">
        <TooltipRow color={s.color} label={s.name} value={fmtNumber(s.value)} />
        <TooltipRow label="Share" value={fmtPct(share)} />
      </div>
    </TooltipBox>
  );
}

export function WinLossDonut({ stats }: { stats: Stats }) {
  const slices: Slice[] = [
    { name: "Wins", value: stats.wins, color: CHART.profit },
    { name: "Losses", value: stats.losses, color: CHART.loss },
    { name: "Breakeven", value: stats.breakeven, color: CHART.muted },
  ].filter((s) => s.value > 0);

  const total = stats.wins + stats.losses + stats.breakeven;
  const winTone = stats.winRate >= 50 ? "text-profit" : "text-content-primary";

  return (
    <Card title="Win / loss" subtitle={`${fmtNumber(total)} closed trades`}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <div className="relative h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <RechartsTooltip
                content={<DonutTooltip total={total} />}
                cursor={false}
              />
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="68%"
                outerRadius="100%"
                paddingAngle={slices.length > 1 ? 2 : 0}
                startAngle={90}
                endAngle={-270}
                stroke={CHART.surface}
                strokeWidth={2}
              >
                {slices.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center label overlay */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`font-mono text-2xl font-semibold tracking-tight tabular-nums ${winTone}`}
            >
              {fmtPct(stats.winRate)}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-content-muted">
              Win rate
            </span>
          </div>
        </div>

        {/* Legend */}
        <ul className="w-full flex-1 space-y-2">
          <LegendRow color={CHART.profit} label="Wins" count={stats.wins} total={total} />
          <LegendRow color={CHART.loss} label="Losses" count={stats.losses} total={total} />
          <LegendRow
            color={CHART.muted}
            label="Breakeven"
            count={stats.breakeven}
            total={total}
          />
        </ul>
      </div>
    </Card>
  );
}

function LegendRow({
  color,
  label,
  count,
  total,
}: {
  color: string;
  label: string;
  count: number;
  total: number;
}) {
  const share = total > 0 ? (count / total) * 100 : 0;
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-hover">
      <span className="flex items-center gap-2 text-sm text-content-secondary">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        {label}
      </span>
      <span className="flex items-center gap-2 font-mono text-sm tabular-nums">
        <span className="text-content-primary">{fmtNumber(count)}</span>
        <span className="text-content-muted">{fmtPct(share)}</span>
      </span>
    </li>
  );
}
