import { describe, expect, it } from "vitest";

import { computeStats } from "@/lib/stats";
import type { Trade } from "@/lib/types";

// Fills every required Trade field; override per test.
function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "t-0",
    date: "2026-01-01",
    time: null,
    direction: null,
    result: null,
    pnl: null,
    risk_dollar: null,
    risk_pct: null,
    r_multiple: null,
    session: null,
    entry: null,
    stop: null,
    target: null,
    size_btc: null,
    sfp_15m: false,
    bos_3m: false,
    entry_618: false,
    of_confirmed: false,
    tv_url: null,
    atas_url: null,
    after_url: null,
    notes: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const FIXED_NOW = new Date(Date.UTC(2026, 0, 10));

describe("computeStats", () => {
  const t1 = makeTrade({
    id: "t-1",
    date: "2026-01-05",
    pnl: 250,
    risk_dollar: 125,
    session: "New York",
    direction: "long",
    result: "win",
    created_at: "2026-01-05T12:00:00.000Z",
  });
  const t2 = makeTrade({
    id: "t-2",
    date: "2026-01-06",
    pnl: -125,
    risk_dollar: 125,
    session: "PM",
    direction: "short",
    result: "loss",
    created_at: "2026-01-06T12:00:00.000Z",
  });
  const stats = computeStats([t1, t2], 25000, FIXED_NOW);

  it("aggregates P&L and win/loss counts", () => {
    expect(stats.totalPnl).toBe(125);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.winRate).toBe(50);
    expect(stats.grossProfit).toBe(250);
    expect(stats.grossLoss).toBe(125);
    expect(stats.profitFactor).toBe(2);
  });

  it("computes expectancy in R and dollars", () => {
    expect(stats.expectancyR).toBe(0.5);
    expect(stats.averageTrade).toBe(62.5);
  });

  it("computes streaks", () => {
    expect(stats.maxWinStreak).toBe(1);
    expect(stats.maxLossStreak).toBe(1);
  });

  it("builds the equity curve and drawdown", () => {
    const last = stats.equityCurve[stats.equityCurve.length - 1];
    expect(last.equity).toBe(25125);
    expect(stats.maxDrawdownDollar).toBe(125);
  });

  it("counts profitable days", () => {
    expect(stats.profitableDays).toBe(1);
  });
});
