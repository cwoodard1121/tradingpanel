"use client";

// =====================================================================
//  Section E — R-multiple distribution. Bars are red for losing buckets
//  and green for winning buckets. Reference lines call out the +2R / -1R
//  clustering you'd expect from a disciplined fixed-risk strategy.
// =====================================================================

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/Card";
import type { RBucket } from "@/lib/stats";
import { fmtNumber } from "@/lib/format";
import { CHART, TooltipBox, TooltipRow } from "@/components/analytics/chartTheme";

/** Color a bucket by the sign of the R values it holds. */
function bucketColor(b: RBucket): string {
  if (b.max <= 0) return CHART.loss;
  if (b.min >= 0) return CHART.profit;
  return CHART.warn;
}

interface RTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RBucket }>;
}

function RTooltip({ active, payload }: RTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const b = payload[0].payload;
  const range =
    b.min === -Infinity
      ? "≤ -3R"
      : b.max === Infinity
        ? "> +3R"
        : `${b.min.toFixed(1)}R to ${b.max.toFixed(1)}R`;
  return (
    <TooltipBox title={range}>
      <TooltipRow color={bucketColor(b)} label="Trades" value={fmtNumber(b.count)} />
    </TooltipBox>
  );
}

export function RDistributionChart({ data }: { data: RBucket[] }) {
  const total = data.reduce((s, b) => s + b.count, 0);
  if (total === 0) return null;

  return (
    <Card
      title="R-multiple distribution"
      subtitle="How your outcomes cluster — a clean +2 / -1 split is the discipline tell"
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 6, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: CHART.axis, fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: CHART.grid }}
              interval={0}
              tickFormatter={(v: string) => (v.endsWith(".0") ? v.slice(0, -2) : v)}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: CHART.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <RechartsTooltip
              content={<RTooltip />}
              cursor={{ fill: CHART.elevated, opacity: 0.5 }}
            />

            <ReferenceLine
              x="-1.0"
              stroke={CHART.loss}
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{ value: "-1R", position: "top", fill: CHART.loss, fontSize: 10 }}
            />
            <ReferenceLine
              x="2.0"
              stroke={CHART.profit}
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{ value: "+2R", position: "top", fill: CHART.profit, fontSize: 10 }}
            />

            <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {data.map((b) => (
                <Cell key={b.label} fill={bucketColor(b)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-content-muted">
        Bars left of zero are losers (red), right are winners (green). If you trade a
        fixed plan, expect a tall stack near{" "}
        <span className="font-mono text-profit">+2R</span> and another near{" "}
        <span className="font-mono text-loss">-1R</span>. Fat tails outside that range
        mean you cut winners early or let losers run past stop.
      </p>
    </Card>
  );
}
