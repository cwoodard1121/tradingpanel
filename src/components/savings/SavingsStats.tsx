import { StatCard } from "@/components/ui/StatCard";
import { fmtDate, fmtNumber, fmtUsd } from "@/lib/format";
import type { SavingsStatus } from "@/lib/savings";

export interface SavingsStatsProps {
  savings: SavingsStatus;
  hasWithdrawals: boolean;
}

/**
 * SavingsStats — three KPI tiles summarising pace: projected finish date,
 * average monthly payout, and how long you've been saving. Each tile degrades
 * gracefully with a friendly note when there isn't enough data yet.
 */
export function SavingsStats({ savings, hasWithdrawals }: SavingsStatsProps) {
  const hasTarget = savings.challengePrice != null && savings.challengePrice > 0;
  const reached = hasTarget && savings.remaining === 0;

  // ---- Projected completion ----------------------------------------
  let projValue: string;
  let projTone: "default" | "profit" | "brand";
  let projSub: string;
  if (!hasTarget) {
    projValue = "—";
    projTone = "default";
    projSub = "Set a target to project a date.";
  } else if (reached) {
    projValue = "Reached";
    projTone = "profit";
    projSub = "You've hit your savings goal.";
  } else if (savings.projectedDate != null && savings.projectedMonthsToGoal != null) {
    projValue = fmtDate(savings.projectedDate);
    projTone = "brand";
    projSub = `~${fmtNumber(savings.projectedMonthsToGoal, 1)} months at current pace`;
  } else {
    projValue = "—";
    projTone = "default";
    projSub = "Log more payouts to project a date.";
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Projected completion"
        value={projValue}
        tone={projTone}
        sub={projSub}
        hint="Estimated from your average monthly payout and the amount remaining. Pace can change as you log more."
      />
      <StatCard
        label="Avg monthly payout"
        value={hasWithdrawals ? fmtUsd(savings.avgMonthlyWithdrawal) : "—"}
        tone="default"
        sub={
          hasWithdrawals
            ? "Total saved ÷ months active."
            : "Log a payout to start tracking."
        }
      />
      <StatCard
        label="Months active"
        value={hasWithdrawals ? fmtNumber(savings.monthsActive, 1) : "—"}
        tone="default"
        sub={
          hasWithdrawals
            ? "Since your first payout."
            : "Your saving streak starts here."
        }
      />
    </div>
  );
}
