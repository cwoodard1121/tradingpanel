import type { Trade } from "@/lib/types";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { fmtNumber, fmtPnl, fmtPct, fmtR } from "@/lib/format";

// ---------------------------------------------------------------------
//  Derived result, falling back to the sign of P&L when `result` is null.
// ---------------------------------------------------------------------
function derivedResult(t: Trade): "win" | "loss" | "breakeven" | null {
  if (t.result) return t.result;
  if (t.pnl == null) return null;
  if (t.pnl > 0) return "win";
  if (t.pnl < 0) return "loss";
  return "breakeven";
}

/**
 * JournalSummary — a compact KPI strip across the top of the journal.
 * Pure render from the trade list (no dates, no hooks) so it is safe for
 * SSR and shows zeros before any trades exist.
 */
export function JournalSummary({
  trades,
  loading,
}: {
  trades: Trade[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-subtle bg-bg-surface p-4 shadow-card sm:p-5"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-7 w-24" />
          </div>
        ))}
      </div>
    );
  }

  const count = trades.length;
  const net = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  let wins = 0;
  let losses = 0;
  for (const t of trades) {
    const r = derivedResult(t);
    if (r === "win") wins += 1;
    else if (r === "loss") losses += 1;
  }
  const decided = wins + losses;
  const winRate = decided > 0 ? (wins / decided) * 100 : null;

  const rValues = trades
    .map((t) => t.r_multiple)
    .filter((r): r is number => r != null && Number.isFinite(r));
  const avgR = rValues.length > 0 ? rValues.reduce((a, b) => a + b, 0) / rValues.length : null;

  const netTone = net > 0 ? "profit" : net < 0 ? "loss" : "default";
  const rTone = avgR == null ? "default" : avgR > 0 ? "profit" : avgR < 0 ? "loss" : "default";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Trades" value={fmtNumber(count)} sub="logged" />
      <StatCard
        label="Net P&L"
        value={count === 0 ? "—" : fmtPnl(net)}
        tone={netTone}
        sub="all-time"
      />
      <StatCard
        label="Win rate"
        value={winRate == null ? "—" : fmtPct(winRate)}
        tone={winRate == null ? "default" : winRate >= 50 ? "profit" : "loss"}
        sub={decided > 0 ? `${wins}W · ${losses}L` : "no decided trades"}
        hint="Wins ÷ (wins + losses). Breakeven trades are excluded."
      />
      <StatCard
        label="Avg R"
        value={fmtR(avgR)}
        tone={rTone}
        sub={`${rValues.length} with R`}
        hint="Average R-multiple across trades that have an R value."
      />
    </div>
  );
}
