"use client";

// =====================================================================
//  Analytics dashboard — headline stats, equity curve, drawdown, win/loss
//  donut, R-distribution, breakdowns, discipline, the prop-firm panel and
//  the full all-trades table.
//
//  SSR-safe: `now` is set inside useEffect, so the server render and first
//  client render both show skeletons (no hydration mismatch, no charts
//  rendering against an empty/garbage clock).
// =====================================================================

import { useEffect, useMemo, useState } from "react";

import { useData } from "@/components/providers/DataProvider";
import { computeStats } from "@/lib/stats";
import { computePropFirm } from "@/lib/propfirm";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

import { HeadlineStats } from "@/components/analytics/HeadlineStats";
import { EquityCurveCard } from "@/components/analytics/EquityCurveCard";
import { DrawdownCards } from "@/components/analytics/DrawdownCards";
import { WinLossDonut } from "@/components/analytics/WinLossDonut";
import { RDistributionChart } from "@/components/analytics/RDistributionChart";
import { Breakdowns } from "@/components/analytics/Breakdowns";
import { TimeOfDayBreakdown } from "@/components/analytics/TimeOfDayBreakdown";
import { DisciplineRow } from "@/components/analytics/DisciplineRow";
import { PropFirmPanel } from "@/components/analytics/PropFirmPanel";
import { AllTradesTable } from "@/components/analytics/AllTradesTable";

function PageHeader() {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-content-secondary">
        Performance
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-content-primary">
        Analytics
      </h1>
      <p className="text-sm text-content-secondary">
        Your edge, drawdown and prop-firm status at a glance.
      </p>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <PageHeader />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-7 w-24" />
            <Skeleton className="mt-2 h-3 w-20" />
          </Card>
        ))}
      </div>
      <Card>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-72 w-full" />
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-40 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-40 w-full" />
        </Card>
      </div>
      <Card>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-60 w-full" />
      </Card>
    </div>
  );
}

export default function AnalyticsPage() {
  const { trades, settings, initializing } = useData();

  // Gate all time-sensitive computation behind a client-only clock.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);
  const mounted = now !== null;

  const stats = useMemo(
    () => computeStats(trades, settings.account_balance, now ?? new Date(0)),
    [trades, settings.account_balance, now],
  );
  const pf = useMemo(
    () => computePropFirm(trades, settings, now ?? new Date(0)),
    [trades, settings, now],
  );

  if (!mounted || initializing) {
    return <AnalyticsSkeleton />;
  }

  // No realized P&L yet — show a friendly empty state (plus the raw table
  // if the user has logged any trades without results).
  if (stats.closedTrades === 0) {
    const hasAnyTrades = trades.length > 0;
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card padded={false}>
          <EmptyState
            title={hasAnyTrades ? "No closed trades yet" : "No trades logged yet"}
            description={
              hasAnyTrades
                ? "Your logged trades don't have a realized P&L yet. Add results in the journal to unlock your analytics."
                : "Size a trade in the calculator, log it to your journal, and your performance analytics light up here."
            }
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-black transition-colors hover:bg-brand-hover"
                >
                  Open calculator
                </a>
                <a
                  href="/journal"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-bg-elevated px-4 text-sm font-medium text-content-primary transition-colors hover:bg-bg-hover"
                >
                  Go to journal
                </a>
              </div>
            }
          />
        </Card>
        {hasAnyTrades && <AllTradesTable trades={trades} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      {/* A — headline KPIs */}
      <HeadlineStats stats={stats} />

      {/* B — equity curve */}
      <EquityCurveCard data={stats.equityCurve} startingBalance={settings.account_balance} />

      {/* C + D — drawdown & win/loss donut */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DrawdownCards stats={stats} />
        <WinLossDonut stats={stats} />
      </div>

      {/* E — R-multiple distribution */}
      <RDistributionChart data={stats.rDistribution} />

      {/* F — breakdowns */}
      <Breakdowns stats={stats} />

      {/* F2 — time-of-day breakdown (renders only when timed trades exist) */}
      <TimeOfDayBreakdown stats={stats} />

      {/* G — discipline */}
      <DisciplineRow stats={stats} />

      {/* H — prop-firm panel */}
      <PropFirmPanel pf={pf} />

      {/* I — all-trades table */}
      <AllTradesTable trades={trades} />
    </div>
  );
}
