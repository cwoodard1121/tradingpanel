// =====================================================================
//  Savings / "$200k challenge" tracker.
//
//  Withdrawals are treated as cash saved toward buying the prop-firm
//  challenge. computeSavings() is a pure function over the withdrawal
//  list (now is injected for testability). All date math is done in UTC
//  via parseDate() to avoid timezone drift.
// =====================================================================

import type { Withdrawal } from "@/lib/types";
import { parseDate } from "@/lib/stats";

export interface SavingsStatus {
  /** Sum of all withdrawal amounts. */
  totalWithdrawn: number;
  /** The target price of the challenge (null if unset). */
  challengePrice: number | null;
  /** challengePrice - totalWithdrawn, floored at 0 (0 when no target). */
  remaining: number;
  /** totalWithdrawn / challengePrice (0..n, 0 when no/zero target). */
  progress: number;
  /** Months elapsed since the first withdrawal (>= 1 once withdrawing). */
  monthsActive: number;
  /** totalWithdrawn / monthsActive. */
  avgMonthlyWithdrawal: number;
  /** Months until the goal at the current pace (0 if reached, null if N/A). */
  projectedMonthsToGoal: number | null;
  /** YYYY-MM-DD of the projected completion date (null if N/A). */
  projectedDate: string | null;
  /** Withdrawals summed per calendar month (YYYY-MM), ascending. */
  withdrawalsByMonth: { month: string; amount: number }[];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a Date as YYYY-MM-DD using its UTC components. */
function toUtcDateString(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Advance `from` by a (possibly fractional) number of months; whole months
 *  shift the month, the fractional remainder is applied as ~30-day days. */
function advanceMonths(from: Date, months: number): Date {
  const whole = Math.floor(months);
  const frac = months - whole;
  const d = new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth() + whole,
      from.getUTCDate(),
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
    ),
  );
  if (frac > 0) d.setUTCDate(d.getUTCDate() + Math.round(frac * 30));
  return d;
}

export function computeSavings(
  withdrawals: Withdrawal[],
  challengePrice: number | null,
  now: Date = new Date(),
): SavingsStatus {
  // ---- totals & per-month grouping ---------------------------------
  let totalWithdrawn = 0;
  const monthMap = new Map<string, number>();
  for (const w of withdrawals) {
    const amount = Number.isFinite(w.amount) ? w.amount : 0;
    totalWithdrawn += amount;
    const d = parseDate(w.date);
    const month = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
    monthMap.set(month, (monthMap.get(month) ?? 0) + amount);
  }
  const withdrawalsByMonth = [...monthMap.entries()]
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));

  // ---- months active & average -------------------------------------
  let monthsActive = 0;
  let avgMonthlyWithdrawal = 0;
  if (withdrawals.length > 0) {
    let first = parseDate(withdrawals[0].date);
    for (const w of withdrawals) {
      const d = parseDate(w.date);
      if (d.getTime() < first.getTime()) first = d;
    }
    monthsActive = Math.max(
      1,
      (now.getUTCFullYear() - first.getUTCFullYear()) * 12 +
        (now.getUTCMonth() - first.getUTCMonth()) +
        (now.getUTCDate() - first.getUTCDate()) / 30,
    );
    avgMonthlyWithdrawal = totalWithdrawn / monthsActive;
  }

  // ---- remaining & progress ----------------------------------------
  const remaining = challengePrice != null ? Math.max(0, challengePrice - totalWithdrawn) : 0;
  const progress =
    challengePrice != null && challengePrice > 0 ? totalWithdrawn / challengePrice : 0;

  // ---- projection --------------------------------------------------
  let projectedMonthsToGoal: number | null;
  if (challengePrice != null && remaining > 0 && avgMonthlyWithdrawal > 0) {
    projectedMonthsToGoal = remaining / avgMonthlyWithdrawal;
  } else if (challengePrice != null && remaining === 0) {
    projectedMonthsToGoal = 0;
  } else {
    projectedMonthsToGoal = null;
  }

  const projectedDate =
    projectedMonthsToGoal != null ? toUtcDateString(advanceMonths(now, projectedMonthsToGoal)) : null;

  return {
    totalWithdrawn,
    challengePrice,
    remaining,
    progress,
    monthsActive,
    avgMonthlyWithdrawal,
    projectedMonthsToGoal,
    projectedDate,
    withdrawalsByMonth,
  };
}
