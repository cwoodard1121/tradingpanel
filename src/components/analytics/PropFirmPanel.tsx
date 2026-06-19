// =====================================================================
//  Section H — prop-firm panel. Surfaces the funded-account guardrails:
//  consistency, daily loss limit, trailing max drawdown, profit target
//  and overall payout readiness.
// =====================================================================

import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tooltip } from "@/components/ui/Tooltip";
import { MiniStat } from "@/components/analytics/MiniStat";
import type { PropFirmStatus } from "@/lib/propfirm";
import { fmtDate, fmtNumber, fmtPct, fmtPnl, fmtUsd } from "@/lib/format";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------
//  Sub-card shell — a titled panel for a single rule.
// ---------------------------------------------------------------------
type RuleStatus = "ok" | "warn" | "danger" | "neutral";

const statusRing: Record<RuleStatus, string> = {
  ok: "border-profit/25",
  warn: "border-warn/30",
  danger: "border-loss/40",
  neutral: "border-border-subtle",
};

const statusBadgeTone: Record<RuleStatus, "profit" | "warn" | "loss" | "default"> = {
  ok: "profit",
  warn: "warn",
  danger: "loss",
  neutral: "default",
};

function RuleCard({
  title,
  status,
  badge,
  hint,
  children,
}: {
  title: ReactNode;
  status: RuleStatus;
  badge?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-bg-elevated/50 p-4",
        statusRing[status],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-content-secondary">
          {title}
          {hint != null && (
            <Tooltip content={hint}>
              <InfoGlyph />
            </Tooltip>
          )}
        </h4>
        {badge != null && (
          <Badge tone={statusBadgeTone[status]}>{badge}</Badge>
        )}
      </div>
      {children}
    </div>
  );
}

function InfoGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 text-content-muted transition-colors hover:text-content-secondary"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/** A compact label/value line used inside the rule cards. */
function Line({
  label,
  value,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "profit" | "loss" | "warn" | "muted";
}) {
  const toneClass =
    tone === "profit"
      ? "text-profit"
      : tone === "loss"
        ? "text-loss"
        : tone === "warn"
          ? "text-warn"
          : tone === "muted"
            ? "text-content-muted"
            : "text-content-primary";
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-content-secondary">{label}</span>
      <span className={cn("font-mono font-medium tabular-nums", toneClass)}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Payout-readiness banner
// ---------------------------------------------------------------------
function CheckIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-profit"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-content-muted"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function PayoutBanner({ pf }: { pf: PropFirmStatus }) {
  const { payout } = pf;
  const ready = payout.ready;
  const daysOk = payout.profitableDays >= payout.profitableDaysRequired;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        ready
          ? "border-profit/30 bg-profit-soft"
          : "border-border-subtle bg-bg-elevated/50",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl",
            ready ? "bg-profit/15 text-profit" : "bg-bg-elevated text-content-muted",
          )}
          aria-hidden="true"
        >
          {ready ? "✓" : "◴"}
        </span>
        <div>
          <Badge tone={ready ? "profit" : "warn"}>
            {ready ? "Payout ready" : "Not payout-ready yet"}
          </Badge>
          <p className="mt-1 text-xs text-content-secondary">
            {ready
              ? "Consistency cleared and profitable-day minimum met — you can request a withdrawal."
              : "Clear the checks below to unlock a payout request."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-center gap-1.5 text-xs text-content-secondary">
          <CheckIcon ok={payout.consistencyOk} />
          Consistency {payout.consistencyOk ? "cleared" : "needs work"}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-content-secondary">
          <CheckIcon ok={daysOk} />
          Profitable days{" "}
          <span className="font-mono tabular-nums text-content-primary">
            {fmtNumber(payout.profitableDays)}/{fmtNumber(payout.profitableDaysRequired)}
          </span>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Rule cards
// ---------------------------------------------------------------------
function ConsistencyCard({ pf }: { pf: PropFirmStatus }) {
  const c = pf.consistency;
  const hasProfit = c.score !== null;
  const status: RuleStatus = !hasProfit ? "neutral" : c.passing ? "ok" : "danger";

  return (
    <RuleCard
      title="Consistency"
      status={status}
      badge={hasProfit ? fmtPct(c.score ?? 0) : "—"}
      hint={`Your best single day must stay at or below ${fmtNumber(c.threshold)}% of total profit.`}
    >
      <div className="space-y-1.5">
        <Line
          label={`Best day (${c.bestDayDate ? fmtDate(c.bestDayDate) : "—"})`}
          value={fmtPnl(c.bestDayProfit)}
          tone={c.bestDayProfit > 0 ? "profit" : undefined}
        />
        <Line
          label="Total profit"
          value={fmtPnl(c.totalProfit)}
          tone={c.totalProfit > 0 ? "profit" : c.totalProfit < 0 ? "loss" : undefined}
        />
      </div>

      {hasProfit && (
        <ProgressBar
          value={Math.min(c.score ?? 0, 100)}
          max={100}
          tone={c.passing ? "profit" : "loss"}
        />
      )}

      {!hasProfit ? (
        <p className="text-xs text-content-muted">
          Bank a green day to start the consistency clock.
        </p>
      ) : c.passing ? (
        <p className="text-xs text-profit">
          Within the {fmtNumber(c.threshold)}% cap — consistency cleared.
        </p>
      ) : (
        <p className="text-xs text-warn">
          {fmtUsd(c.profitNeededToClear)} more profit to clear the{" "}
          {fmtNumber(c.threshold)}% rule.
        </p>
      )}
    </RuleCard>
  );
}

function DailyLossCard({ pf }: { pf: PropFirmStatus }) {
  const d = pf.dailyLoss;
  const status: RuleStatus = d.breached
    ? "danger"
    : d.bufferPct < 0.25
      ? "warn"
      : "ok";
  const bufferTone = d.breached ? "loss" : d.bufferPct < 0.25 ? "warn" : "profit";

  return (
    <RuleCard
      title="Daily loss limit"
      status={status}
      badge={d.breached ? "Breached" : `${fmtPct(d.pct)} cap`}
      hint="The most you may lose in a single trading day before the account is failed."
    >
      <div className="space-y-1.5">
        <Line label="Limit" value={`-${fmtUsd(d.limit)}`} tone="muted" />
        <Line
          label="Today's P&L"
          value={fmtPnl(d.todaysPnl)}
          tone={d.todaysPnl > 0 ? "profit" : d.todaysPnl < 0 ? "loss" : undefined}
        />
        <Line
          label="Buffer left"
          value={fmtUsd(Math.max(0, d.bufferLeft))}
          tone={bufferTone === "loss" ? "loss" : bufferTone === "warn" ? "warn" : "profit"}
        />
      </div>
      <ProgressBar
        value={Math.max(0, d.bufferLeft)}
        max={d.limit > 0 ? d.limit : 1}
        tone={bufferTone}
      />
    </RuleCard>
  );
}

function TrailingDdCard({ pf }: { pf: PropFirmStatus }) {
  const t = pf.trailing;
  const status: RuleStatus = t.breached
    ? "danger"
    : t.bufferPct < 0.25
      ? "warn"
      : "ok";
  const bufferTone = t.breached ? "loss" : t.bufferPct < 0.25 ? "warn" : "profit";
  const modeLabel = t.mode === "peak" ? "Trails peak" : "Locks at start";

  return (
    <RuleCard
      title="Trailing max drawdown"
      status={status}
      badge={t.breached ? "Breached" : `${fmtPct(t.pct)}`}
      hint="Confirm your firm's exact trailing rule — trails the peak vs locks at starting balance."
    >
      <div className="flex items-center justify-between gap-2">
        <Tooltip content="Confirm your firm's exact trailing rule — trails the peak vs locks at starting balance.">
          <Badge tone="default">{modeLabel}</Badge>
        </Tooltip>
        <span className="font-mono text-xs tabular-nums text-content-muted">
          buffer {fmtUsd(t.ddAmount)}
        </span>
      </div>

      <div className="space-y-1.5">
        <Line label="Peak equity" value={fmtUsd(t.peakEquity)} />
        <Line label="Current equity" value={fmtUsd(t.currentEquity)} />
        <Line label="DD line (floor)" value={fmtUsd(t.ddLine)} tone="muted" />
        <Line
          label="Buffer left"
          value={fmtUsd(Math.max(0, t.bufferLeft))}
          tone={bufferTone === "loss" ? "loss" : bufferTone === "warn" ? "warn" : "profit"}
        />
      </div>
      <ProgressBar
        value={Math.max(0, t.bufferLeft)}
        max={t.ddAmount > 0 ? t.ddAmount : 1}
        tone={bufferTone}
      />
    </RuleCard>
  );
}

function ProfitTargetCard({ pf }: { pf: PropFirmStatus }) {
  const p = pf.profitTarget;
  const status: RuleStatus = p.reached ? "ok" : "neutral";
  const pct = p.targetAmount > 0 ? p.progress * 100 : 0;

  return (
    <RuleCard
      title="Profit target"
      status={status}
      badge={p.reached ? "Reached" : `${fmtPct(p.pct)} goal`}
      hint="Net profit required to pass the evaluation / unlock the next phase."
    >
      <div className="space-y-1.5">
        <Line
          label="Progress"
          value={fmtPnl(p.current)}
          tone={p.current > 0 ? "profit" : p.current < 0 ? "loss" : undefined}
        />
        <Line label="Target" value={fmtUsd(p.targetAmount)} tone="muted" />
        <Line
          label="Remaining"
          value={p.reached ? "—" : fmtUsd(p.remaining)}
          tone={p.reached ? "profit" : "warn"}
        />
      </div>
      <ProgressBar
        value={Math.max(0, p.current)}
        max={p.targetAmount > 0 ? p.targetAmount : 1}
        tone={p.reached ? "profit" : "brand"}
      />
      <p className="text-right font-mono text-xs tabular-nums text-content-secondary">
        {fmtPct(pct, { decimals: 0 })} of target
      </p>
    </RuleCard>
  );
}

// ---------------------------------------------------------------------
//  Panel
// ---------------------------------------------------------------------
export function PropFirmPanel({ pf }: { pf: PropFirmStatus }) {
  return (
    <Card
      title="Prop firm"
      subtitle={`Funded-account guardrails on a ${fmtUsd(pf.balance, {
        decimals: 0,
      })} account`}
    >
      <div className="space-y-4">
        <PayoutBanner pf={pf} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ConsistencyCard pf={pf} />
          <DailyLossCard pf={pf} />
          <TrailingDdCard pf={pf} />
          <ProfitTargetCard pf={pf} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat
            label="Net P&L"
            value={fmtPnl(pf.totalPnl)}
            tone={pf.totalPnl > 0 ? "profit" : pf.totalPnl < 0 ? "loss" : "default"}
            sub="all closed trades"
          />
          <MiniStat
            label="Current equity"
            value={fmtUsd(pf.trailing.currentEquity)}
            sub="balance + P&L"
          />
          <MiniStat
            label="Peak equity"
            value={fmtUsd(pf.trailing.peakEquity)}
            sub="high-water mark"
          />
          <MiniStat
            label="Profitable days"
            value={`${fmtNumber(pf.payout.profitableDays)}/${fmtNumber(
              pf.payout.profitableDaysRequired,
            )}`}
            sub={`≥ ${fmtUsd(pf.payout.minProfitableDayAmount)} each`}
            tone={
              pf.payout.profitableDays >= pf.payout.profitableDaysRequired
                ? "profit"
                : "warn"
            }
          />
        </div>
      </div>
    </Card>
  );
}
