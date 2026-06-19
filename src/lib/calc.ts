// =====================================================================
//  Risk / position-size calculator — the hero math.
//  MUST be exactly correct (used before every trade).
//
//  Formulas (implemented exactly per spec):
//    riskDollar      = balance * (riskPct / 100)
//    direction       = (stop < entry) ? "long" : "short"
//    stopDistance    = abs(entry - stop)
//    target          = long  ? entry + RR * stopDistance
//                            : entry - RR * stopDistance
//    positionSizeBTC = riskDollar / stopDistance
//    sizeBTC         = floor(positionSizeBTC / 0.001) * 0.001   // round DOWN
//    actualRisk$     = sizeBTC * stopDistance
//    notional        = sizeBTC * entry
//    requiredMargin  = notional / leverage
//    rewardDistance  = abs(target - entry)
//    grossProfit$    = sizeBTC * rewardDistance
//    fees: notional*feeRate per side, OR fixed commission per round-turn trade
//    netProfit$      = grossProfit$ - roundTurnFees
// =====================================================================

import type { Direction, FeeMode } from "./types";

export const BTC_LOT = 0.001; // round position size DOWN to this increment

export interface CalcInput {
  balance: number;
  riskPct: number; // percent, e.g. 0.5 or 1
  entry: number;
  stop: number;
  rr: number; // reward-to-risk multiple, default 2
  leverage: number;
  feeMode: FeeMode;
  feeRate: number; // fraction of notional, per side (e.g. 0.00055)
  feeFixed: number; // fixed commission per round-turn trade (USD)
}

export interface CalcResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  direction: Direction | null;
  riskDollar: number; // dollar risk allowed
  stopDistance: number;
  target: number | null;
  positionSizeBtcRaw: number; // before rounding
  sizeBtc: number; // rounded DOWN to BTC_LOT — the number to act on
  actualRisk: number; // sizeBtc * stopDistance (after rounding)
  notional: number; // sizeBtc * entry
  requiredMargin: number; // notional / leverage
  rewardDistance: number;
  grossProfit: number; // at target
  fees: number; // round-turn fees
  netProfit: number; // grossProfit - fees
  liquidationPrice: number | null; // estimate
  liquidationBetweenEntryStop: boolean;
}

/** Round a BTC quantity DOWN to the lot size so we never over-risk. */
export function floorToLot(qty: number, lot: number = BTC_LOT): number {
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  // Scale to integer lots to avoid binary float drift (e.g. 0.227 * 1000).
  const lots = Math.floor(qty / lot + 1e-9);
  // Re-derive via integer math then divide to keep clean decimals.
  return Math.round(lots * lot * 1e8) / 1e8;
}

/**
 * Estimate liquidation price for an isolated-margin position.
 *   long:  entry * (1 - 1/leverage)
 *   short: entry * (1 + 1/leverage)
 * This is a rough estimate (ignores fees/funding/maintenance margin).
 */
export function estimateLiquidation(
  entry: number,
  leverage: number,
  direction: Direction,
): number | null {
  if (!Number.isFinite(entry) || !Number.isFinite(leverage) || leverage <= 0) return null;
  return direction === "long"
    ? entry * (1 - 1 / leverage)
    : entry * (1 + 1 / leverage);
}

export function computeTrade(input: CalcInput): CalcResult {
  const { balance, riskPct, entry, stop, rr, leverage, feeMode, feeRate, feeFixed } = input;

  const errors: string[] = [];
  const warnings: string[] = [];

  const base: CalcResult = {
    valid: false,
    errors,
    warnings,
    direction: null,
    riskDollar: 0,
    stopDistance: 0,
    target: null,
    positionSizeBtcRaw: 0,
    sizeBtc: 0,
    actualRisk: 0,
    notional: 0,
    requiredMargin: 0,
    rewardDistance: 0,
    grossProfit: 0,
    fees: 0,
    netProfit: 0,
    liquidationPrice: null,
    liquidationBetweenEntryStop: false,
  };

  // ---- Validation ----------------------------------------------------
  if (!Number.isFinite(balance) || balance <= 0) errors.push("Enter an account balance.");
  if (!Number.isFinite(riskPct) || riskPct <= 0) errors.push("Risk % must be greater than 0.");
  if (!Number.isFinite(entry) || entry <= 0) errors.push("Enter a valid entry / limit price.");
  if (!Number.isFinite(stop) || stop <= 0) errors.push("Enter a valid stop price.");
  if (Number.isFinite(entry) && Number.isFinite(stop) && entry === stop)
    errors.push("Stop can't equal entry — there'd be no risk distance.");

  const riskDollar =
    Number.isFinite(balance) && Number.isFinite(riskPct) ? balance * (riskPct / 100) : 0;
  base.riskDollar = riskDollar;

  if (errors.length > 0) {
    return base;
  }

  // ---- Direction & distances ----------------------------------------
  const direction: Direction = stop < entry ? "long" : "short";
  const stopDistance = Math.abs(entry - stop);
  const effRr = Number.isFinite(rr) && rr > 0 ? rr : 2;
  if (!Number.isFinite(rr) || rr <= 0) warnings.push("RR was invalid — defaulted to 2.0.");

  const target =
    direction === "long"
      ? entry + effRr * stopDistance
      : entry - effRr * stopDistance;

  // ---- Position size -------------------------------------------------
  const positionSizeBtcRaw = riskDollar / stopDistance;
  const sizeBtc = floorToLot(positionSizeBtcRaw, BTC_LOT);
  const actualRisk = sizeBtc * stopDistance;

  const notional = sizeBtc * entry;
  const requiredMargin = leverage > 0 ? notional / leverage : 0;
  const rewardDistance = Math.abs(target - entry);
  const grossProfit = sizeBtc * rewardDistance;

  // ---- Fees (round-turn) --------------------------------------------
  let fees = 0;
  if (feeMode === "percent") {
    const entryNotional = sizeBtc * entry;
    const exitNotional = sizeBtc * target;
    fees = (entryNotional + exitNotional) * (Number.isFinite(feeRate) ? feeRate : 0);
  } else {
    // fixed commission per trade = round turn
    fees = Number.isFinite(feeFixed) ? feeFixed : 0;
  }
  const netProfit = grossProfit - fees;

  // ---- Liquidation estimate -----------------------------------------
  const liquidationPrice = estimateLiquidation(entry, leverage, direction);
  let liquidationBetweenEntryStop = false;
  if (liquidationPrice !== null) {
    if (direction === "long") {
      // long: stop < entry. Liq sits between stop and entry => hit before stop.
      liquidationBetweenEntryStop = liquidationPrice > stop && liquidationPrice < entry;
    } else {
      // short: stop > entry. Liq sits between entry and stop => hit before stop.
      liquidationBetweenEntryStop = liquidationPrice < stop && liquidationPrice > entry;
    }
  }

  // ---- Warnings ------------------------------------------------------
  if (sizeBtc <= 0) {
    warnings.push(
      `Size rounds to 0 BTC — your stop (${stopDistance.toFixed(1)} wide) is too far for ${riskDollar.toFixed(
        2,
      )} of risk. Tighten the stop or raise risk.`,
    );
  }
  if (liquidationBetweenEntryStop) {
    warnings.push(
      "Estimated liquidation sits between entry and stop — at this leverage you could be liquidated before your stop is hit. Increase leverage (lowers margin/liq risk) or reduce size.",
    );
  }

  return {
    valid: sizeBtc > 0,
    errors,
    warnings,
    direction,
    riskDollar,
    stopDistance,
    target,
    positionSizeBtcRaw,
    sizeBtc,
    actualRisk,
    notional,
    requiredMargin,
    rewardDistance,
    grossProfit,
    fees,
    netProfit,
    liquidationPrice,
    liquidationBetweenEntryStop,
  };
}
