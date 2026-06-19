// =====================================================================
//  Section H — phase-aware prop-firm panel.
//
//  CHALLENGE / EVALUATION phase leads with a "Progress to live account"
//  hero, a pass-condition checklist and a "Time to live account" ETA,
//  then surfaces the consistency / daily-loss / trailing-drawdown
//  guardrails beneath.
//
//  FUNDED / LIVE phase leads with payout readiness, keeps daily-loss and
//  trailing-drawdown front and centre, and softens the profit target into
//  a payout goal.
// =====================================================================

import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tooltip } from "@/components/ui/Tooltip";
import { MiniStat } from "@/components/analytics/MiniStat";
import type { PropFirmStatus } from "@/lib/propfirm";
import { fmtDate, fmtDateShort, fmtNumber, fmtPct, fmtPnl, fmtUsd } from "@/lib/format";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Human ETA from a fractional day count. */
function formatEta(days: number): string {
  if (days <= 0) return "Now";
  const d = Math.round(days);
  if (d <= 1) return "≈ 1 day";
  if (d <= 45) return `≈ ${fmtNumber(d)} days`;
  const weeks = Math.round(days / 7);
  if (weeks <= 12) return `≈ ${fmtNumber(weeks)} weeks`;
  return `≈ ${fmtNumber(Math.round(days / 30))} months`;
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
        {badge != null && <Badge tone={statusBadgeTone[status]}>{badge}</Badge>}
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
      <span className={cn("font-mono font-medium tabular-nums", toneClass)}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Check glyphs
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

/** Checkbox-style tick (✓) / empty (▢) for the pass checklist. */
function CheckboxIcon({ done }: { done: boolean }) {
  return done ? (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-profit/15 text-profit ring-1 ring-inset ring-profit/30"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3 w-3"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  ) : (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border-strong bg-bg-elevated"
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------
//  CHALLENGE — "Progress to live account" hero
// ---------------------------------------------------------------------
function ProgressHero({ pf }: { pf: PropFirmStatus }) {
  const ch = pf.challenge;
  const pct = ch.progress * 100;
  const ready = ch.passReady;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5",
        ready
          ? "border-profit/30 bg-gradient-to-br from-profit-soft via-bg-elevated/40 to-bg-elevated/20 shadow-[0_0_0_1px_rgba(34,197,94,0.25),0_4px_24px_rgba(34,197,94,0.12)]"
          : "border-brand/25 bg-gradient-to-br from-brand-soft via-bg-elevated/40 to-bg-elevated/20 shadow-glow",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full blur-3xl",
          ready ? "bg-profit/10" : "bg-brand/10",
        )}
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-content-secondary">
              Progress to live account
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-content-primary">
                {fmtPct(pct, { decimals: 0 })}
              </span>
              <span className="text-sm text-content-secondary">to a live account</span>
            </div>
          </div>
          <Badge
            tone={ready ? "profit" : "brand"}
            className="self-start whitespace-normal text-left"
          >
            {ready ? "Pass-ready → advance to live account" : "Challenge in progress"}
          </Badge>
        </div>

        <ProgressBar
          value={Math.max(0, ch.current)}
          max={ch.targetAmount > 0 ? ch.targetAmount : 1}
          tone={ready ? "profit" : "brand"}
        />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
          <span className="font-mono tabular-nums text-content-secondary">
            {fmtPnl(ch.current)}{" "}
            <span className="text-content-muted">/ {fmtUsd(ch.targetAmount)} target</span>
          </span>
          <span className="font-mono tabular-nums">
            {ch.remaining > 0 ? (
              <>
                <span className="text-warn">{fmtUsd(ch.remaining)}</span>
                <span className="text-content-muted"> to a live account</span>
              </>
            ) : (
              <span className="text-profit">Profit target cleared</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
//  CHALLENGE — pass-condition checklist
// ---------------------------------------------------------------------
function PassChecklist({ pf }: { pf: PropFirmStatus }) {
  const ch = pf.challenge;
  const c = ch.conditions;
  const score = pf.consistency.score;

  const items: { label: string; done: boolean; detail: string }[] = [
    {
      label: "Profit target reached",
      done: c.profitTargetReached,
      detail: `${fmtPnl(ch.current)} / ${fmtUsd(ch.targetAmount)}`,
    },
    {
      label: "Daily-loss limit never breached",
      done: c.dailyLossOk,
      detail: `cap -${fmtUsd(pf.dailyLoss.limit)}/day`,
    },
    {
      label: "Trailing drawdown respected",
      done: c.trailingOk,
      detail: `floor ${fmtUsd(pf.trailing.ddLine)}`,
    },
    {
      label: `Consistency ≤ ${fmtNumber(pf.consistency.threshold)}%`,
      done: c.consistencyOk,
      detail: score !== null ? fmtPct(score) : "—",
    },
  ];
  const cleared = items.filter((i) => i.done).length;
  const allOk = cleared === items.length;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-bg-elevated/50 p-4",
        allOk ? statusRing.ok : statusRing.neutral,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-content-secondary">
          Pass checklist
        </h4>
        <Badge tone={allOk ? "profit" : "default"}>
          {fmtNumber(cleared)}/{fmtNumber(items.length)} cleared
        </Badge>
      </div>

      <ul className="space-y-0.5">
        {items.map((it) => (
          <li
            key={it.label}
            className="flex items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-bg-hover"
          >
            <CheckboxIcon done={it.done} />
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-xs font-medium",
                it.done ? "text-content-primary" : "text-content-secondary",
              )}
            >
              {it.label}
            </span>
            <span
              className={cn(
                "shrink-0 font-mono text-[11px] tabular-nums",
                it.done ? "text-profit" : "text-content-muted",
              )}
            >
              {it.detail}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------
//  CHALLENGE — "Time to live account" ETA
// ---------------------------------------------------------------------
function EtaCard({ pf }: { pf: PropFirmStatus }) {
  const ch = pf.challenge;
  const hasEta = ch.etaDays !== null;
  const reached = ch.etaDays === 0;
  const status: RuleStatus = ch.passReady || reached ? "ok" : hasEta ? "neutral" : "warn";
  const paceTone =
    ch.avgDailyProfit > 0 ? "text-profit" : ch.avgDailyProfit < 0 ? "text-loss" : "text-content-muted";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-bg-elevated/50 p-4",
        statusRing[status],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-content-secondary">
          Time to live account
          <Tooltip content="Projected from your average daily profit across your trading span. A pace estimate, not a guarantee.">
            <InfoGlyph />
          </Tooltip>
        </h4>
        {reached ? (
          <Badge tone="profit">Reached</Badge>
        ) : hasEta ? (
          <Badge tone="brand">On pace</Badge>
        ) : (
          <Badge tone="warn">No ETA</Badge>
        )}
      </div>

      {reached ? (
        <>
          <div className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-profit">
            Now
          </div>
          <p className="text-xs text-profit">
            Profit target reached — clear any open checks and advance to a live account.
          </p>
        </>
      ) : hasEta ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-content-primary">
              {formatEta(ch.etaDays as number)}
            </span>
            <span className="font-mono text-sm tabular-nums text-content-secondary">
              ~{fmtDateShort(ch.etaDate)}
            </span>
          </div>
          <p className="text-xs text-content-secondary">
            At <span className={cn("font-mono tabular-nums", paceTone)}>{fmtPnl(ch.avgDailyProfit)}</span>
            /day pace, {fmtUsd(ch.remaining)} of target remains.
          </p>
        </>
      ) : (
        <>
          <div className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-content-muted">
            —
          </div>
          <p className="text-xs text-content-muted">
            Need more profitable history to project a live-account date. Bank a few green days
            and a pace appears here.
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
//  FUNDED — payout-readiness banner
// ---------------------------------------------------------------------
function PayoutBanner({ pf }: { pf: PropFirmStatus }) {
  const { payout } = pf;
  const ready = payout.ready;
  const daysOk = payout.profitableDays >= payout.profitableDaysRequired;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        ready ? "border-profit/30 bg-profit-soft" : "border-border-subtle bg-bg-elevated/50",
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
//  Shared rule cards
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
          {fmtUsd(c.profitNeededToClear)} more profit to clear the {fmtNumber(c.threshold)}% rule.
        </p>
      )}
    </RuleCard>
  );
}

function DailyLossCard({ pf }: { pf: PropFirmStatus }) {
  const d = pf.dailyLoss;
  const status: RuleStatus = d.breached ? "danger" : d.bufferPct < 0.25 ? "warn" : "ok";
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
  const status: RuleStatus = t.breached ? "danger" : t.bufferPct < 0.25 ? "warn" : "ok";
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

function ProfitTargetCard({ pf, funded = false }: { pf: PropFirmStatus; funded?: boolean }) {
  const p = pf.profitTarget;
  const status: RuleStatus = p.reached ? "ok" : "neutral";
  const pct = p.targetAmount > 0 ? p.progress * 100 : 0;

  return (
    <RuleCard
      title={funded ? "Payout goal" : "Profit target"}
      status={status}
      badge={p.reached ? "Reached" : `${fmtPct(p.pct)} goal`}
      hint={
        funded
          ? "A soft milestone toward your next payout — not a pass/fail line now that you're funded."
          : "Net profit required to pass the evaluation / unlock the next phase."
      }
    >
      <div className="space-y-1.5">
        <Line
          label="Progress"
          value={fmtPnl(p.current)}
          tone={p.current > 0 ? "profit" : p.current < 0 ? "loss" : undefined}
        />
        <Line label={funded ? "Goal" : "Target"} value={fmtUsd(p.targetAmount)} tone="muted" />
        <Line
          label="Remaining"
          value={p.reached ? "—" : fmtUsd(p.remaining)}
          tone={p.reached ? "profit" : funded ? "muted" : "warn"}
        />
      </div>
      <ProgressBar
        value={Math.max(0, p.current)}
        max={p.targetAmount > 0 ? p.targetAmount : 1}
        tone={p.reached ? "profit" : "brand"}
      />
      <p className="text-right font-mono text-xs tabular-nums text-content-secondary">
        {fmtPct(pct, { decimals: 0 })} of {funded ? "payout goal" : "target"}
      </p>
    </RuleCard>
  );
}

// ---------------------------------------------------------------------
//  Panel
// ---------------------------------------------------------------------
export function PropFirmPanel({ pf }: { pf: PropFirmStatus }) {
  const isChallenge = pf.phase === "challenge";

  return (
    <Card
      title="Prop firm"
      subtitle={`${isChallenge ? "Challenge" : "Funded-account"} guardrails on a ${fmtUsd(
        pf.balance,
        { decimals: 0 },
      )} account`}
      right={
        <Badge tone={isChallenge ? "brand" : "profit"}>
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              isChallenge ? "bg-brand" : "bg-profit",
            )}
            aria-hidden="true"
          />
          {isChallenge ? "Challenge / Evaluation" : "Funded / Live"}
        </Badge>
      }
    >
      <div className="space-y-4">
        {isChallenge ? (
          <>
            <ProgressHero pf={pf} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <PassChecklist pf={pf} />
              <EtaCard pf={pf} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ConsistencyCard pf={pf} />
              <DailyLossCard pf={pf} />
              <TrailingDdCard pf={pf} />
            </div>
          </>
        ) : (
          <>
            <PayoutBanner pf={pf} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DailyLossCard pf={pf} />
              <TrailingDdCard pf={pf} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ConsistencyCard pf={pf} />
              <ProfitTargetCard pf={pf} funded />
            </div>
          </>
        )}

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
              pf.payout.profitableDays >= pf.payout.profitableDaysRequired ? "profit" : "warn"
            }
          />
        </div>
      </div>
    </Card>
  );
}
