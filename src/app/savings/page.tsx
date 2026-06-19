"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { SavingsHero } from "@/components/savings/SavingsHero";
import { SavingsStats } from "@/components/savings/SavingsStats";
import { WithdrawalsByMonthChart } from "@/components/savings/WithdrawalsByMonthChart";
import { WithdrawalsCard } from "@/components/savings/WithdrawalsCard";
import { useData } from "@/components/providers/DataProvider";
import { computeSavings } from "@/lib/savings";

function ChartBarsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M4 19h16" />
      <rect x="5.5" y="11" width="3" height="6" rx="1" />
      <rect x="10.5" y="7" width="3" height="10" rx="1" />
      <rect x="15.5" y="4" width="3" height="13" rx="1" />
    </svg>
  );
}

function SavingsSkeleton() {
  return (
    <div className="space-y-6">
      <Card padded>
        <div className="space-y-4">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-2 w-full" />
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} padded>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-28" />
            <Skeleton className="mt-2 h-3 w-32" />
          </Card>
        ))}
      </div>
      <Card padded>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-16 w-full" />
        <Skeleton className="mt-3 h-12 w-full" />
      </Card>
    </div>
  );
}

export default function SavingsPage() {
  const {
    withdrawals,
    settings,
    addWithdrawal,
    deleteWithdrawal,
    updateSettings,
    initializing,
  } = useData();

  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
  }, []);

  const ready = mounted && !initializing && now != null;
  const savings = now ? computeSavings(withdrawals, settings.challenge_price, now) : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand">
          $200k Challenge
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-content-primary sm:text-3xl">
          Savings tracker
        </h1>
        <p className="max-w-2xl text-sm text-content-secondary">
          You&apos;re saving toward the $200k funded challenge from your trading
          payouts. Log each withdrawal and watch your runway to the goal.
        </p>
      </header>

      {!ready || savings == null ? (
        <SavingsSkeleton />
      ) : (
        <>
          <SavingsHero
            savings={savings}
            challengePrice={settings.challenge_price}
            onSaveTarget={(price) => updateSettings({ challenge_price: price })}
          />

          <SavingsStats savings={savings} hasWithdrawals={withdrawals.length > 0} />

          <WithdrawalsCard
            withdrawals={withdrawals}
            total={savings.totalWithdrawn}
            onAdd={async (input) => {
              await addWithdrawal(input);
            }}
            onDelete={deleteWithdrawal}
          />

          <Card
            title="Payouts by month"
            subtitle="How much you set aside each calendar month."
          >
            {savings.withdrawalsByMonth.length === 0 ? (
              <EmptyState
                icon={<ChartBarsIcon />}
                title="Nothing to chart yet"
                description="Once you log a few payouts, your monthly saving rhythm shows up here."
              />
            ) : (
              <WithdrawalsByMonthChart data={savings.withdrawalsByMonth} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
