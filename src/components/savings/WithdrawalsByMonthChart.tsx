"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

import { fmtUsd } from "@/lib/format";

// Recharts renders SVG, so colours must be passed as concrete values rather
// than Tailwind classes. These mirror the palette in tailwind.config.ts.
const COLORS = {
  brand: "#f7931a",
  brandHover: "#ffa733",
  grid: "#202a38",
  axis: "#647082",
};

export interface WithdrawalsByMonthChartProps {
  data: { month: string; amount: number }[];
}

/** 'YYYY-MM' -> "Jun '26" (UTC, timezone-safe). */
function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

/** Compact axis ticks ($1.2k) — exact values are shown in the tooltip. */
function compactUsd(v: number): string {
  if (Math.abs(v) >= 1000) {
    return `$${(v / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`;
  }
  return fmtUsd(v, { decimals: 0 });
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const raw = payload[0]?.value;
  const value = typeof raw === "number" ? raw : 0;
  return (
    <div className="rounded-lg border border-border bg-bg-elevated px-3 py-2 shadow-card">
      <div className="text-[11px] font-medium uppercase tracking-wide text-content-secondary">
        {monthLabel(String(label))}
      </div>
      <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-content-primary">
        {fmtUsd(value)}
      </div>
    </div>
  );
}

/**
 * WithdrawalsByMonthChart — dark-themed bar chart of payouts saved per calendar
 * month. Bars use a subtle brand gradient with rounded tops.
 */
export function WithdrawalsByMonthChart({ data }: WithdrawalsByMonthChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="savingsBarFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.brandHover} stopOpacity={0.95} />
              <stop offset="100%" stopColor={COLORS.brand} stopOpacity={0.65} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke={COLORS.grid}
            strokeOpacity={0.7}
          />
          <XAxis
            dataKey="month"
            tickFormatter={monthLabel}
            tick={{ fill: COLORS.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: COLORS.grid }}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            tickFormatter={compactUsd}
            tick={{ fill: COLORS.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            cursor={{ fill: "#ffffff", fillOpacity: 0.04 }}
            content={<ChartTooltip />}
          />
          <Bar
            dataKey="amount"
            fill="url(#savingsBarFill)"
            radius={[6, 6, 0, 0]}
            maxBarSize={56}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
