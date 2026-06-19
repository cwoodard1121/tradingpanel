import { describe, expect, it } from "vitest";

import { computeSavings } from "@/lib/savings";
import type { Withdrawal } from "@/lib/types";

// Fills every required Withdrawal field; override per test.
function makeWithdrawal(overrides: Partial<Withdrawal> = {}): Withdrawal {
  return {
    id: "w-0",
    date: "2026-01-01",
    amount: 0,
    note: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeSavings", () => {
  const withdrawals: Withdrawal[] = [
    makeWithdrawal({
      id: "w-1",
      date: "2026-01-15",
      amount: 1000,
      created_at: "2026-01-15T00:00:00.000Z",
    }),
    makeWithdrawal({
      id: "w-2",
      date: "2026-02-15",
      amount: 2000,
      created_at: "2026-02-15T00:00:00.000Z",
    }),
  ];
  // Date.UTC month is 0-indexed: 2 === March -> 2026-03-15.
  const now = new Date(Date.UTC(2026, 2, 15));
  const s = computeSavings(withdrawals, 10000, now);

  it("totals withdrawals and remaining toward the goal", () => {
    expect(s.totalWithdrawn).toBe(3000);
    expect(s.remaining).toBe(7000);
  });

  it("computes progress toward the goal", () => {
    expect(s.progress).toBeCloseTo(0.3, 6);
  });

  it("computes months active and average monthly pace", () => {
    expect(s.monthsActive).toBeCloseTo(2, 0);
    expect(s.avgMonthlyWithdrawal).toBeCloseTo(1500, 0);
  });

  it("projects a completion date", () => {
    expect(s.projectedDate).not.toBeNull();
  });
});
