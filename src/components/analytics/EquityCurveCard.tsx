"use client";

// =====================================================================
//  Section B — the headline equity curve. AreaChart over the cumulative
//  account equity, gradient fill fading to transparent, dark tooltip and
//  a dashed baseline at the starting balance.
// =====================================================================

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { EquityPoint } from "@/lib/stats";
import { fmtDateShort, fmtPnl, fmtUsd } from "@/lib/format";
import { CHART, TooltipBox, TooltipRow } from "@/components/analytics/chartTheme";

interface EquityTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: EquityPoint }>;
}

function EquityTooltip({ active, payload }: EquityTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <TooltipBox title={`${fmtDateShort(p.date)} · trade #${p.index}`}>
      <div className="space-y-1">
        <TooltipRow color={CHART.brand} label="Equity" value={fmtUsd(p.equity)} />
        <TooltipRow label="Trade P&L" value={fmtPnl(p.pnl)} />
        <TooltipRow label="Cumulative" value={fmtPnl(p.cumPnl)} />
      </div>
    </TooltipBox>
  );
}

export interface EquityCurveCardProps {
  data: EquityPoint[];
  startingBalance: number;
}

export function EquityCurveCard({ data, startingBalance }: EquityCurveCardProps) {
  if (data.length === 0) return null;

  const last = data[data.length - 1];
  const netPnl = last.cumPnl;
  const up = netPnl >= 0;

  return (
    <Card
      title="Equity curve"
      subtitle={`Account equity across ${data.length} closed ${
        data.length === 1 ? "trade" : "trades"
      }`}
      right={
        <Badge tone={up ? "profit" : "loss"}>{fmtPnl(netPnl)}</Badge>
      }
    >
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 6, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.brand} stopOpacity={0.32} />
                <stop offset="55%" stopColor={CHART.brand} stopOpacity={0.1} />
                <stop offset="100%" stopColor={CHART.brand} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="index"
              tickFormatter={(v) => fmtDateShort(data[Number(v) - 1]?.date)}
              tick={{ fill: CHART.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: CHART.grid }}
              minTickGap={32}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v) => fmtUsd(Number(v), { decimals: 0 })}
              tick={{ fill: CHART.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={68}
              domain={["auto", "auto"]}
            />

            <RechartsTooltip
              content={<EquityTooltip />}
              cursor={{ stroke: CHART.axis, strokeDasharray: "3 3" }}
            />

            <ReferenceLine
              y={startingBalance}
              stroke={CHART.muted}
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={{
                value: "Start",
                position: "insideTopLeft",
                fill: CHART.muted,
                fontSize: 10,
              }}
            />

            <Area
              type="monotone"
              dataKey="equity"
              stroke={CHART.brand}
              strokeWidth={2}
              fill="url(#equityFill)"
              dot={false}
              activeDot={{
                r: 4,
                fill: CHART.brand,
                stroke: CHART.surface,
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
