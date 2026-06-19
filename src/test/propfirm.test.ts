import { describe, expect, it } from "vitest";

import { computePropFirm } from "@/lib/propfirm";
import { DEFAULT_SETTINGS } from "@/lib/settingsDefaults";
import type { Settings, Trade } from "@/lib/types";

// Fills every required Trade field; override per test.
function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "t-0",
    date: "2026-01-01",
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

describe("computePropFirm", () => {
  const settings: Settings = { ...DEFAULT_SETTINGS, account_balance: 25000 };
  const t1 = makeTrade({
    id: "t-1",
    date: "2026-01-05",
    pnl: 250,
    risk_dollar: 125,
    direction: "long",
    result: "win",
    created_at: "2026-01-05T12:00:00.000Z",
  });
  const t2 = makeTrade({
    id: "t-2",
    date: "2026-01-06",
    pnl: -125,
    risk_dollar: 125,
    direction: "short",
    result: "loss",
    created_at: "2026-01-06T12:00:00.000Z",
  });
  const status = computePropFirm([t1, t2], settings, FIXED_NOW);

  it("computes the consistency rule", () => {
    expect(status.consistency.totalProfit).toBe(125);
    expect(status.consistency.bestDayProfit).toBe(250);
    expect(status.consistency.score).toBe(200);
    expect(status.consistency.passing).toBe(false);
    expect(status.consistency.profitNeededToClear).toBe(250 / 0.2 - 125);
    expect(status.consistency.profitNeededToClear).toBe(1125);
  });

  it("computes the daily-loss limit", () => {
    expect(status.dailyLoss.limit).toBe(750);
  });

  it("computes trailing drawdown (peak mode)", () => {
    expect(status.trailing.ddAmount).toBe(1500);
    expect(status.trailing.peakEquity).toBe(25250);
    expect(status.trailing.ddLine).toBe(23750);
    expect(status.trailing.currentEquity).toBe(25125);
    expect(status.trailing.bufferLeft).toBe(1375);
    expect(status.trailing.breached).toBe(false);
  });

  it("computes the profit target", () => {
    expect(status.profitTarget.targetAmount).toBe(1500);
  });

  it("computes payout readiness", () => {
    expect(status.payout.profitableDays).toBe(1);
    expect(status.payout.ready).toBe(false);
  });
});

describe("computePropFirm — trailing mode lock_at_start vs peak", () => {
  // One big winner: peak equity = 25000 + 5000 = 30000, ddAmount = 1500.
  const bigGain = makeTrade({
    id: "t-big",
    date: "2026-01-05",
    pnl: 5000,
    risk_dollar: 125,
    direction: "long",
    result: "win",
    created_at: "2026-01-05T12:00:00.000Z",
  });

  const peakSettings: Settings = {
    ...DEFAULT_SETTINGS,
    account_balance: 25000,
    trailing_mode: "peak",
  };
  const lockSettings: Settings = {
    ...DEFAULT_SETTINGS,
    account_balance: 25000,
    trailing_mode: "lock_at_start",
  };

  const peak = computePropFirm([bigGain], peakSettings, FIXED_NOW);
  const lock = computePropFirm([bigGain], lockSettings, FIXED_NOW);

  it("peak mode trails the peak equity", () => {
    expect(peak.trailing.peakEquity).toBe(30000);
    expect(peak.trailing.ddAmount).toBe(1500);
    // peak - ddAmount = 30000 - 1500
    expect(peak.trailing.ddLine).toBe(28500);
  });

  it("lock_at_start caps the dd line at the starting balance", () => {
    expect(lock.trailing.peakEquity).toBe(30000);
    // min(28500, 25000) = 25000
    expect(lock.trailing.ddLine).toBe(25000);
  });

  it("the two modes differ once peak - ddAmount exceeds the balance", () => {
    expect(peak.trailing.ddLine).toBeGreaterThan(lock.trailing.ddLine);
    expect(peak.trailing.ddLine - lock.trailing.ddLine).toBe(3500);
  });
});
