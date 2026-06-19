// =====================================================================
//  Prop-firm panel computations — funded-account risk rules.
//  All pure + deterministic given (trades, settings, now).
// =====================================================================

import type { Settings, Trade } from "./types";
import { chronological, hasPnl, parseDate } from "./stats";

export interface ConsistencyInfo {
  /** (bestDayProfit / totalProfit) * 100; null when there's no profit yet. */
  score: number | null;
  bestDayProfit: number;
  bestDayDate: string | null;
  totalProfit: number; // total net P&L
  passing: boolean; // score <= 20 (and profit > 0)
  /** Extra profit needed so best day is ≤ 20% of total: (bestDay/0.20) - total. */
  profitNeededToClear: number;
  threshold: number; // 20 (%)
}

export interface DailyLossInfo {
  limit: number; // dollar limit (balance * pct)
  pct: number;
  todaysPnl: number;
  todaysLoss: number; // positive magnitude of today's loss (0 if up)
  bufferLeft: number; // limit - todaysLoss
  bufferPct: number; // bufferLeft / limit
  breached: boolean;
}

export interface TrailingDdInfo {
  mode: "peak" | "lock_at_start";
  pct: number;
  ddAmount: number; // dollar buffer (balance * pct)
  peakEquity: number;
  ddLine: number; // equity floor you must stay above
  currentEquity: number;
  bufferLeft: number; // currentEquity - ddLine
  bufferPct: number; // bufferLeft / ddAmount
  breached: boolean;
}

export interface ProfitTargetInfo {
  pct: number;
  targetAmount: number;
  current: number; // total net pnl
  progress: number; // current / targetAmount (can exceed 1)
  remaining: number;
  reached: boolean;
}

export interface PayoutInfo {
  consistencyOk: boolean;
  profitableDays: number; // days with >= 0.5% of balance
  profitableDaysRequired: number; // 3
  minProfitableDayAmount: number; // 0.5% of balance
  ready: boolean;
}

export interface ChallengeProgress {
  targetAmount: number; // = profitTarget.targetAmount (balance * profit_target_pct/100)
  current: number; // total net pnl
  remaining: number; // max(0, target - current)
  progress: number; // current/target (0..1+)
  conditions: {
    profitTargetReached: boolean;
    dailyLossOk: boolean;
    trailingOk: boolean;
    consistencyOk: boolean;
  };
  passReady: boolean; // all four conditions true
  avgDailyProfit: number; // pace: totalPnl / span-days (first..last closed trade date inclusive, >=1)
  etaDays: number | null; // remaining>0 && avgDailyProfit>0 ? remaining/avgDailyProfit : (remaining===0 ? 0 : null)
  etaDate: string | null; // now advanced by etaDays days, "YYYY-MM-DD"; null when etaDays null
}

export interface PropFirmStatus {
  balance: number;
  totalPnl: number;
  phase: "challenge" | "funded";
  consistency: ConsistencyInfo;
  dailyLoss: DailyLossInfo;
  trailing: TrailingDdInfo;
  profitTarget: ProfitTargetInfo;
  payout: PayoutInfo;
  challenge: ChallengeProgress;
}

interface DayAgg {
  date: string;
  pnl: number;
}

function dailyTotals(trades: Trade[]): DayAgg[] {
  const map = new Map<string, number>();
  for (const t of trades) {
    if (!hasPnl(t)) continue;
    map.set(t.date, (map.get(t.date) || 0) + (t.pnl as number));
  }
  return [...map.entries()]
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function computePropFirm(
  trades: Trade[],
  settings: Settings,
  now: Date = new Date(),
): PropFirmStatus {
  const balance = settings.account_balance || 0;
  const closed = chronological(trades).filter(hasPnl);
  const totalPnl = closed.reduce((s, t) => s + (t.pnl as number), 0);

  const days = dailyTotals(closed);

  // ---- Consistency --------------------------------------------------
  let bestDayProfit = 0;
  let bestDayDate: string | null = null;
  for (const d of days) {
    if (d.pnl > bestDayProfit) {
      bestDayProfit = d.pnl;
      bestDayDate = d.date;
    }
  }
  const totalProfit = totalPnl;
  const score = totalProfit > 0 ? (bestDayProfit / totalProfit) * 100 : null;
  const threshold = 20;
  const passing = score !== null && score <= threshold;
  // profit so that bestDay / (total + x) = 0.20  ->  x = bestDay/0.20 - total
  const profitNeededToClear =
    bestDayProfit > 0 ? Math.max(0, bestDayProfit / 0.2 - totalProfit) : 0;

  const consistency: ConsistencyInfo = {
    score,
    bestDayProfit,
    bestDayDate,
    totalProfit,
    passing,
    profitNeededToClear,
    threshold,
  };

  // ---- Daily loss limit --------------------------------------------
  const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
    now.getUTCDate(),
  ).padStart(2, "0")}`;
  const dlLimit = balance * (settings.daily_loss_pct / 100);
  const todaysPnl = days.find((d) => d.date === todayStr)?.pnl ?? 0;
  const todaysLoss = todaysPnl < 0 ? -todaysPnl : 0;
  const dlBuffer = dlLimit - todaysLoss;
  const dailyLoss: DailyLossInfo = {
    limit: dlLimit,
    pct: settings.daily_loss_pct,
    todaysPnl,
    todaysLoss,
    bufferLeft: dlBuffer,
    bufferPct: dlLimit > 0 ? dlBuffer / dlLimit : 1,
    breached: todaysLoss >= dlLimit && dlLimit > 0,
  };

  // ---- Trailing max drawdown ---------------------------------------
  const ddAmount = balance * (settings.trailing_dd_pct / 100);
  let peakEquity = balance;
  let cum = 0;
  for (const t of closed) {
    cum += t.pnl as number;
    const eq = balance + cum;
    if (eq > peakEquity) peakEquity = eq;
  }
  const currentEquity = balance + totalPnl;
  let ddLine = peakEquity - ddAmount;
  if (settings.trailing_mode === "lock_at_start") {
    // Trails the peak but locks once it reaches the starting balance.
    ddLine = Math.min(ddLine, balance);
  }
  const trailingBuffer = currentEquity - ddLine;
  const trailing: TrailingDdInfo = {
    mode: settings.trailing_mode,
    pct: settings.trailing_dd_pct,
    ddAmount,
    peakEquity,
    ddLine,
    currentEquity,
    bufferLeft: trailingBuffer,
    bufferPct: ddAmount > 0 ? trailingBuffer / ddAmount : 1,
    breached: currentEquity <= ddLine,
  };

  // ---- Profit target ------------------------------------------------
  const targetAmount = balance * (settings.profit_target_pct / 100);
  const profitTarget: ProfitTargetInfo = {
    pct: settings.profit_target_pct,
    targetAmount,
    current: totalPnl,
    progress: targetAmount > 0 ? totalPnl / targetAmount : 0,
    remaining: Math.max(0, targetAmount - totalPnl),
    reached: totalPnl >= targetAmount && targetAmount > 0,
  };

  // ---- Payout readiness --------------------------------------------
  const minProfitableDayAmount = balance * 0.005; // 0.5% of account
  const profitableDays = days.filter((d) => d.pnl >= minProfitableDayAmount).length;
  const profitableDaysRequired = 3;
  const payout: PayoutInfo = {
    consistencyOk: passing,
    profitableDays,
    profitableDaysRequired,
    minProfitableDayAmount,
    ready: passing && profitableDays >= profitableDaysRequired,
  };

  // ---- Challenge progress (phase-aware) ----------------------------
  const phase: "challenge" | "funded" =
    settings.account_phase === "funded" ? "funded" : "challenge";

  const challengeCurrent = totalPnl;
  const challengeRemaining = Math.max(0, targetAmount - challengeCurrent);
  const challengeProgress = targetAmount > 0 ? challengeCurrent / targetAmount : 0;

  // Worst single calendar-day loss (positive magnitude; 0 if no losing day).
  let worstDayLoss = 0;
  for (const d of days) {
    if (d.pnl < 0 && -d.pnl > worstDayLoss) worstDayLoss = -d.pnl;
  }

  const conditions = {
    profitTargetReached: challengeCurrent >= targetAmount && targetAmount > 0,
    dailyLossOk: worstDayLoss < dlLimit,
    trailingOk: !trailing.breached,
    consistencyOk: passing,
  };
  const passReady =
    conditions.profitTargetReached &&
    conditions.dailyLossOk &&
    conditions.trailingOk &&
    conditions.consistencyOk;

  // Pace: net pnl spread over the inclusive span of trading days (>= 1 day).
  let spanDays = 1;
  if (days.length > 0) {
    const first = parseDate(days[0].date).getTime();
    const last = parseDate(days[days.length - 1].date).getTime();
    spanDays = Math.max(1, (last - first) / 86400000 + 1);
  }
  const avgDailyProfit = totalPnl / spanDays;

  let etaDays: number | null;
  if (challengeRemaining > 0 && avgDailyProfit > 0) {
    etaDays = challengeRemaining / avgDailyProfit;
  } else if (challengeRemaining === 0) {
    etaDays = 0;
  } else {
    etaDays = null;
  }

  let etaDate: string | null = null;
  if (etaDays !== null) {
    const eta = new Date(now.getTime() + etaDays * 86400000);
    etaDate = `${eta.getUTCFullYear()}-${String(eta.getUTCMonth() + 1).padStart(2, "0")}-${String(
      eta.getUTCDate(),
    ).padStart(2, "0")}`;
  }

  const challenge: ChallengeProgress = {
    targetAmount,
    current: challengeCurrent,
    remaining: challengeRemaining,
    progress: challengeProgress,
    conditions,
    passReady,
    avgDailyProfit,
    etaDays,
    etaDate,
  };

  return {
    balance,
    totalPnl,
    phase,
    consistency,
    dailyLoss,
    trailing,
    profitTarget,
    payout,
    challenge,
  };
}
