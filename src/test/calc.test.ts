import { describe, expect, it } from "vitest";

import { computeTrade, floorToLot, type CalcInput } from "@/lib/calc";

// Sensible defaults so each case overrides only what it cares about.
function makeInput(overrides: Partial<CalcInput> = {}): CalcInput {
  return {
    balance: 25000,
    riskPct: 0.5,
    entry: 67000.4,
    stop: 66451.1,
    rr: 2,
    leverage: 30,
    feeMode: "percent",
    feeRate: 0.00055,
    feeFixed: 0,
    ...overrides,
  };
}

describe("computeTrade", () => {
  it("Case A — long, 0.5% risk", () => {
    const r = computeTrade(makeInput());
    expect(r.direction).toBe("long");
    expect(r.riskDollar).toBe(125);
    expect(r.stopDistance).toBeCloseTo(549.3, 1);
    expect(r.target).not.toBeNull();
    expect(r.target as number).toBeCloseTo(68099.0, 1);
    expect(r.sizeBtc).toBe(0.227);
    expect(r.actualRisk).toBeCloseTo(124.69, 2);
    expect(r.grossProfit).toBeCloseTo(249.38, 2);
    expect(r.valid).toBe(true);
  });

  it("Case B — long, 1% risk", () => {
    const r = computeTrade(makeInput({ riskPct: 1 }));
    expect(r.riskDollar).toBe(250);
    expect(r.sizeBtc).toBe(0.455);
    expect(r.grossProfit).toBeCloseTo(499.86, 2);
  });

  it("Case C — short direction & target", () => {
    const r = computeTrade(makeInput({ entry: 100, stop: 110, rr: 2 }));
    expect(r.direction).toBe("short");
    expect(r.target).toBe(80);
  });

  it("Size rounds to zero — invalid with warnings", () => {
    const r = computeTrade(
      makeInput({ balance: 100, riskPct: 0.5, entry: 50000, stop: 49000 }),
    );
    expect(r.sizeBtc).toBe(0);
    expect(r.valid).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("Liquidation between entry and stop — flagged with warnings", () => {
    const r = computeTrade(
      makeInput({
        balance: 25000,
        riskPct: 1,
        entry: 100,
        stop: 98,
        rr: 2,
        leverage: 100,
        feeMode: "percent",
        feeRate: 0,
        feeFixed: 0,
      }),
    );
    expect(r.direction).toBe("long");
    expect(r.liquidationPrice).not.toBeNull();
    expect(r.liquidationPrice as number).toBeCloseTo(99, 6);
    expect(r.liquidationBetweenEntryStop).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("floorToLot", () => {
  it("rounds DOWN to the BTC lot increment", () => {
    expect(floorToLot(0.2299)).toBe(0.229);
    expect(floorToLot(0.227)).toBe(0.227);
    expect(floorToLot(0.0005)).toBe(0);
  });
});
