// =====================================================================
//  Analytics engine — pure functions over the trade list.
//  All metrics here are deterministic given (trades, balance, now).
//  `now` is injected so results are testable; defaults to current time.
// =====================================================================

import type { Trade } from "./types";

/** Parse 'YYYY-MM-DD' as a UTC date (no timezone drift). */
export function parseDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
}

/** A trade counts toward P&L stats only once it has a realized pnl. */
export function hasPnl(t: Trade): boolean {
  return t.pnl !== null && t.pnl !== undefined && Number.isFinite(t.pnl);
}

/** Effective R multiple: prefer stored, else derive from pnl / risk_dollar. */
export function effectiveR(t: Trade): number | null {
  if (t.r_multiple !== null && t.r_multiple !== undefined && Number.isFinite(t.r_multiple)) {
    return t.r_multiple;
  }
  if (
    hasPnl(t) &&
    t.risk_dollar !== null &&
    t.risk_dollar !== undefined &&
    Number.isFinite(t.risk_dollar) &&
    t.risk_dollar > 0
  ) {
    return (t.pnl as number) / t.risk_dollar;
  }
  return null;
}

/** Win/loss/breakeven from realized pnl (result field is advisory only). */
export function outcome(t: Trade): "win" | "loss" | "breakeven" | null {
  if (!hasPnl(t)) return null;
  const p = t.pnl as number;
  if (p > 0) return "win";
  if (p < 0) return "loss";
  return "breakeven";
}

/** Sort by trade date then logging time (stable chronological order). */
export function chronological(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
  });
}

export interface GroupStat {
  key: string;
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number; // % over decided (win+loss)
  pnl: number;
}

export interface EquityPoint {
  index: number; // 1-based trade sequence
  date: string;
  pnl: number; // this trade's pnl
  cumPnl: number; // cumulative realized pnl
  equity: number; // balance + cumPnl
  drawdown: number; // peak equity so far - equity (>= 0)
}

export interface DayPnl {
  date: string;
  pnl: number;
  trades: number;
}

export interface RBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface Stats {
  // counts
  totalTrades: number; // rows in journal
  closedTrades: number; // rows with realized pnl
  wins: number;
  losses: number;
  breakeven: number;

  // pnl
  totalPnl: number;
  grossProfit: number;
  grossLoss: number; // positive magnitude
  profitFactor: number; // grossProfit / grossLoss (Infinity if no losses)
  averageTrade: number; // mean pnl
  expectancyDollar: number; // == averageTrade
  expectancyR: number; // mean R

  // win/loss shape
  winRate: number; // %
  avgWin: number;
  avgLoss: number; // negative
  largestWin: number;
  largestLoss: number; // negative
  smallestWin: number;
  smallestLoss: number; // negative, closest to 0

  // time windows
  thisWeekPnl: number;
  thisWeekWinRate: number;
  thisWeekTrades: number;
  thisMonthPnl: number;
  thisMonthTrades: number;

  // breakdowns
  bySession: GroupStat[];
  byDayOfWeek: GroupStat[];
  byDirection: GroupStat[];

  // curve + drawdown
  equityCurve: EquityPoint[];
  maxDrawdownDollar: number;
  maxDrawdownPct: number;
  currentDrawdownDollar: number;
  currentDrawdownPct: number;

  // streaks
  currentStreak: number; // + for wins, - for losses
  maxWinStreak: number;
  maxLossStreak: number;

  // days
  byDay: DayPnl[];
  bestDay: DayPnl | null;
  worstDay: DayPnl | null;
  profitableDays: number;
  losingDays: number;
  tradingDays: number;
  avgTradesPerWeek: number;

  // distribution
  rDistribution: RBucket[];
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfWeekUTC(now: Date): Date {
  // Week starts Monday.
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function groupStat(key: string, trades: Trade[]): GroupStat {
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let pnl = 0;
  for (const t of trades) {
    const o = outcome(t);
    if (o === "win") wins++;
    else if (o === "loss") losses++;
    else if (o === "breakeven") breakeven++;
    if (hasPnl(t)) pnl += t.pnl as number;
  }
  const decided = wins + losses;
  return {
    key,
    trades: trades.length,
    wins,
    losses,
    breakeven,
    winRate: decided > 0 ? (wins / decided) * 100 : 0,
    pnl,
  };
}

function buildRDistribution(rs: number[]): RBucket[] {
  // Buckets of width 0.5 from -3 to +3, with overflow tails.
  const buckets: RBucket[] = [];
  buckets.push({ label: "≤ -3", min: -Infinity, max: -3, count: 0 });
  for (let lo = -3; lo < 3; lo += 0.5) {
    const hi = lo + 0.5;
    buckets.push({ label: `${lo.toFixed(1)}`, min: lo, max: hi, count: 0 });
  }
  buckets.push({ label: "> 3", min: 3, max: Infinity, count: 0 });

  for (const r of rs) {
    let placed = false;
    for (const b of buckets) {
      // [min, max) except the final overflow which is (3, ∞)
      if (b.max === Infinity) {
        if (r > 3) {
          b.count++;
          placed = true;
        }
      } else if (b.min === -Infinity) {
        if (r <= -3) {
          b.count++;
          placed = true;
        }
      } else if (r >= b.min && r < b.max) {
        b.count++;
        placed = true;
      }
      if (placed) break;
    }
  }
  return buckets;
}

export function computeStats(
  trades: Trade[],
  balance: number,
  now: Date = new Date(),
): Stats {
  const all = chronological(trades);
  const closed = all.filter(hasPnl);

  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalPnl = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let smallestWin = Infinity;
  let smallestLoss = -Infinity;

  for (const t of closed) {
    const p = t.pnl as number;
    totalPnl += p;
    if (p > 0) {
      wins++;
      grossProfit += p;
      if (p > largestWin) largestWin = p;
      if (p < smallestWin) smallestWin = p;
    } else if (p < 0) {
      losses++;
      grossLoss += -p;
      if (p < largestLoss) largestLoss = p;
      if (p > smallestLoss) smallestLoss = p;
    } else {
      breakeven++;
    }
  }

  const decided = wins + losses;
  const winRate = decided > 0 ? (wins / decided) * 100 : 0;
  const avgWin = wins > 0 ? grossProfit / wins : 0;
  const avgLoss = losses > 0 ? -grossLoss / losses : 0;
  const averageTrade = closed.length > 0 ? totalPnl / closed.length : 0;
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const rValues = closed.map(effectiveR).filter((r): r is number => r !== null);
  const expectancyR =
    rValues.length > 0 ? rValues.reduce((a, b) => a + b, 0) / rValues.length : 0;

  // ---- equity curve + drawdown --------------------------------------
  const equityCurve: EquityPoint[] = [];
  let cum = 0;
  let peakEquity = balance;
  let maxDrawdownDollar = 0;
  let maxDrawdownPctAtPeak = 0;
  closed.forEach((t, i) => {
    const p = t.pnl as number;
    cum += p;
    const equity = balance + cum;
    if (equity > peakEquity) peakEquity = equity;
    const dd = peakEquity - equity;
    if (dd > maxDrawdownDollar) {
      maxDrawdownDollar = dd;
      maxDrawdownPctAtPeak = peakEquity > 0 ? (dd / peakEquity) * 100 : 0;
    }
    equityCurve.push({
      index: i + 1,
      date: t.date,
      pnl: p,
      cumPnl: cum,
      equity,
      drawdown: dd,
    });
  });
  const currentEquity = balance + cum;
  const currentDrawdownDollar = Math.max(0, peakEquity - currentEquity);
  const currentDrawdownPct =
    peakEquity > 0 ? (currentDrawdownDollar / peakEquity) * 100 : 0;

  // ---- streaks ------------------------------------------------------
  let currentStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let runWin = 0;
  let runLoss = 0;
  for (const t of closed) {
    const o = outcome(t);
    if (o === "win") {
      runWin++;
      runLoss = 0;
      if (runWin > maxWinStreak) maxWinStreak = runWin;
      currentStreak = runWin;
    } else if (o === "loss") {
      runLoss++;
      runWin = 0;
      if (runLoss > maxLossStreak) maxLossStreak = runLoss;
      currentStreak = -runLoss;
    } else {
      // breakeven resets both streaks
      runWin = 0;
      runLoss = 0;
      currentStreak = 0;
    }
  }

  // ---- breakdowns ---------------------------------------------------
  const bySessionMap = new Map<string, Trade[]>();
  const byDowMap = new Map<number, Trade[]>();
  const byDirMap = new Map<string, Trade[]>();
  for (const t of closed) {
    const sk = (t.session && t.session.trim()) || "Unspecified";
    if (!bySessionMap.has(sk)) bySessionMap.set(sk, []);
    bySessionMap.get(sk)!.push(t);

    const dow = parseDate(t.date).getUTCDay();
    if (!byDowMap.has(dow)) byDowMap.set(dow, []);
    byDowMap.get(dow)!.push(t);

    const dk = t.direction || "Unspecified";
    if (!byDirMap.has(dk)) byDirMap.set(dk, []);
    byDirMap.get(dk)!.push(t);
  }
  const bySession = [...bySessionMap.entries()]
    .map(([k, ts]) => groupStat(k, ts))
    .sort((a, b) => b.trades - a.trades);
  const byDayOfWeek = [0, 1, 2, 3, 4, 5, 6]
    .filter((d) => byDowMap.has(d))
    .map((d) => groupStat(DOW_LABELS[d], byDowMap.get(d)!));
  const byDirection = [...byDirMap.entries()]
    .map(([k, ts]) => groupStat(k === "long" ? "Long" : k === "short" ? "Short" : k, ts))
    .sort((a, b) => b.trades - a.trades);

  // ---- by calendar day ---------------------------------------------
  const dayMap = new Map<string, { pnl: number; trades: number }>();
  for (const t of closed) {
    const cur = dayMap.get(t.date) || { pnl: 0, trades: 0 };
    cur.pnl += t.pnl as number;
    cur.trades += 1;
    dayMap.set(t.date, cur);
  }
  const byDay: DayPnl[] = [...dayMap.entries()]
    .map(([date, v]) => ({ date, pnl: v.pnl, trades: v.trades }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  let bestDay: DayPnl | null = null;
  let worstDay: DayPnl | null = null;
  let profitableDays = 0;
  let losingDays = 0;
  for (const d of byDay) {
    if (bestDay === null || d.pnl > bestDay.pnl) bestDay = d;
    if (worstDay === null || d.pnl < worstDay.pnl) worstDay = d;
    if (d.pnl > 0) profitableDays++;
    else if (d.pnl < 0) losingDays++;
  }
  const tradingDays = byDay.length;

  // avg trades per week across the span of closed trades
  let avgTradesPerWeek = 0;
  if (closed.length > 0) {
    const first = parseDate(closed[0].date).getTime();
    const last = parseDate(closed[closed.length - 1].date).getTime();
    const days = Math.max(1, (last - first) / 86400000 + 1);
    const weeks = Math.max(1, days / 7);
    avgTradesPerWeek = closed.length / weeks;
  }

  // ---- time windows -------------------------------------------------
  const weekStart = startOfWeekUTC(now);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const monthStartStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;

  let thisWeekPnl = 0;
  let twWins = 0;
  let twLosses = 0;
  let thisWeekTrades = 0;
  let thisMonthPnl = 0;
  let thisMonthTrades = 0;
  for (const t of closed) {
    if (t.date >= weekStartStr) {
      thisWeekPnl += t.pnl as number;
      thisWeekTrades++;
      const o = outcome(t);
      if (o === "win") twWins++;
      else if (o === "loss") twLosses++;
    }
    if (t.date >= monthStartStr) {
      thisMonthPnl += t.pnl as number;
      thisMonthTrades++;
    }
  }
  const thisWeekWinRate = twWins + twLosses > 0 ? (twWins / (twWins + twLosses)) * 100 : 0;

  return {
    totalTrades: all.length,
    closedTrades: closed.length,
    wins,
    losses,
    breakeven,
    totalPnl,
    grossProfit,
    grossLoss,
    profitFactor,
    averageTrade,
    expectancyDollar: averageTrade,
    expectancyR,
    winRate,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    smallestWin: smallestWin === Infinity ? 0 : smallestWin,
    smallestLoss: smallestLoss === -Infinity ? 0 : smallestLoss,
    thisWeekPnl,
    thisWeekWinRate,
    thisWeekTrades,
    thisMonthPnl,
    thisMonthTrades,
    bySession,
    byDayOfWeek,
    byDirection,
    equityCurve,
    maxDrawdownDollar,
    maxDrawdownPct: maxDrawdownPctAtPeak,
    currentDrawdownDollar,
    currentDrawdownPct,
    currentStreak,
    maxWinStreak,
    maxLossStreak,
    byDay,
    bestDay,
    worstDay,
    profitableDays,
    losingDays,
    tradingDays,
    avgTradesPerWeek,
    rDistribution: buildRDistribution(rValues),
  };
}
