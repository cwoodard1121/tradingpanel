"use client";

// =====================================================================
//  Section F2 — time-of-day breakdown. P&L by 4-hour window as a compact
//  dark bar chart, with per-window win-rate / P&L / trade-count rows
//  beneath. Only trades that carry a usable time are counted; the whole
//  card hides itself when there's nothing to show.
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
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { GroupStat, Stats } from "@/lib/stats";
import { fmtNumber, fmtPct, fmtPnl, fmtUsd } from "@/lib/format";
import { CHART, TooltipBox, TooltipRow } from "@/components/analytics/chartTheme";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Colour a window by the sign of its net P&L. */
function barColor(pnl: number): string {
  if (pnl > 0) return CHART.profit;
  if (pnl < 0) return CHART.loss;
  return CHART.muted;
}

interface TodTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: GroupStat }>;
}

function TodTooltip({ active, payload }: TodTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const g = payload[0].payload;
  return (
    <TooltipBox
      title={`${g.key} · ${fmtNumber(g.trades)} ${g.trades === 1 ? "trade" : "trades"}`}
    >
      <div className="space-y-1">
        <TooltipRow color={barColor(g.pnl)} label="P&L" value={fmtPnl(g.pnl)} />
        <TooltipRow label="Win rate" value={fmtPct(g.winRate, { decimals: 0 })} />
        <TooltipRow
          label="W / L"
          value={`${fmtNumber(g.wins)} / ${fmtNumber(g.losses)}`}
        />
      </div>
    </TooltipBox>
  );
}

function TodRow({ g }: { g: GroupStat }) {
  const winTone = g.winRate >= 50 ? "profit" : "loss";
  const pnlTone =
    g.pnl > 0 ? "text-profit" : g.pnl < 0 ? "text-loss" : "text-content-secondary";

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-bg-hover">
      <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-content-primary">
        {g.key}
      </span>
      <ProgressBar value={g.winRate} max={100} tone={winTone} className="flex-1" />
      <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-content-secondary">
        {fmtPct(g.winRate, { decimals: 0 })}
      </span>
      <span
        className={cn(
          "w-[4.5rem] shrink-0 text-right font-mono text-xs font-semibold tabular-nums",
          pnlTone,
        )}
      >
        {fmtPnl(g.pnl)}
      </span>
      <span className="hidden w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-content-muted sm:inline">
        {fmtNumber(g.trades)}t
      </span>
    </div>
  );
}

export function TimeOfDayBreakdown({ stats }: { stats: Stats }) {
  const data = stats.byTimeOfDay;
  if (data.length === 0) return null;

  const timed = data.reduce((s, g) => s + g.trades, 0);
  const best = data.reduce((a, b) => (b.pnl > a.pnl ? b : a));

  return (
    <Card
      title="Time of day"
      subtitle="Win rate & P&L by 4-hour window (UTC)"
      right={
        <span className="font-mono text-[11px] tabular-nums text-content-muted">
          {fmtNumber(timed)} timed
        </span>
      }
    >
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 6, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="key"
              tick={{ fill: CHART.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: CHART.grid }}
              interval={0}
            />
            <YAxis
              tick={{ fill: CHART.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => fmtUsd(v, { decimals: 0 })}
            />
            <RechartsTooltip
              content={<TodTooltip />}
              cursor={{ fill: CHART.elevated, opacity: 0.5 }}
            />
            <ReferenceLine y={0} stroke={CHART.grid} />
            <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={40}>
              {data.map((g) => (
                <Cell key={g.key} fill={barColor(g.pnl)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-0.5 sm:grid-cols-2 sm:gap-x-4">
        {data.map((g) => (
          <TodRow key={g.key} g={g} />
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-content-muted">
        Best window:{" "}
        <span className="font-mono text-content-secondary">{best.key}</span> at{" "}
        <span
          className={cn(
            "font-mono",
            best.pnl > 0 ? "text-profit" : best.pnl < 0 ? "text-loss" : "text-content-secondary",
          )}
        >
          {fmtPnl(best.pnl)}
        </span>
        . Trades logged without a time are excluded.
      </p>
    </Card>
  );
}
