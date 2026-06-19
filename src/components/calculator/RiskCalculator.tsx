"use client";

// =====================================================================
//  TOOL 1 — Risk / Position-Size Calculator (the hero screen).
//
//  Live-computes a BTC position size from account balance + risk % + a
//  limit/stop spread, then surfaces the actionable numbers a trader needs
//  before clicking buy: size in BTC, target price at the chosen R:R,
//  dollar risk, projected profit (net & gross of fees), notional, margin
//  and an estimated liquidation price.
//
//  All math is delegated to computeTrade() — this file only maps inputs
//  in and renders the CalcResult out. Working state lives locally and is
//  seeded once from persisted Settings; account balance + presets persist
//  back through the DataProvider.
//
//  SSR-safe: useState initializers read the (deterministic) default
//  Settings, so the first client render matches the server HTML. No
//  window/Date/localStorage at module scope or during render.
// =====================================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { computeTrade, type CalcResult } from "@/lib/calc";
import type { FeeMode } from "@/lib/types";
import { useData } from "@/components/providers/DataProvider";
import {
  fmtBtc,
  fmtNumber,
  fmtPct,
  fmtPnl,
  fmtPrice,
  fmtUsd,
} from "@/lib/format";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Segmented } from "@/components/ui/Segmented";
import { Toggle } from "@/components/ui/Toggle";
import { Field, NumberInput } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CopyButton } from "@/components/calculator/CopyButton";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

// ---- fraction <-> percent helpers (settings store fee_rate as a fraction) ----
function fracToPct(frac: number): number {
  return Math.round(frac * 1e8) / 1e6;
}
function pctToFrac(pct: number): number {
  return Math.round(pct * 1e6) / 1e8;
}

type RiskMode = "preset" | "custom";

// =====================================================================
//  Small presentational helpers (local to this screen).
// =====================================================================
function SectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-wide text-content-secondary",
        className,
      )}
    >
      {children}
    </p>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "default" | "brand" | "long" | "short";
}) {
  const color =
    tone === "brand"
      ? "text-brand"
      : tone === "long"
        ? "text-long"
        : tone === "short"
          ? "text-short"
          : "text-content-primary";
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-content-muted">
        {label}
      </span>
      <span
        className={cn(
          "truncate font-mono text-sm font-semibold tabular-nums sm:text-base",
          color,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ArrowUpRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

function ArrowDownRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M7 7 17 17M17 9v8H9" />
    </svg>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "h-4 w-4 text-content-muted transition-transform duration-200",
        open && "rotate-180",
      )}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function WarnGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

// =====================================================================
//  Main component.
// =====================================================================
export function RiskCalculator() {
  const router = useRouter();
  const { settings, updateSettings, initializing } = useData();

  // ---- working state (seeded from settings, then user-owned) --------
  const [balance, setBalance] = useState<number | null>(
    () => settings.account_balance,
  );
  const [riskMode, setRiskMode] = useState<RiskMode>(() =>
    settings.default_risk_pct === 0.5 || settings.default_risk_pct === 1
      ? "preset"
      : "custom",
  );
  const [presetRisk, setPresetRisk] = useState<number>(() =>
    settings.default_risk_pct === 1 ? 1 : 0.5,
  );
  const [customRisk, setCustomRisk] = useState<number | null>(
    () => settings.default_risk_pct,
  );

  const [entry, setEntry] = useState<number | null>(null);
  const [stop, setStop] = useState<number | null>(null);
  const [rr, setRr] = useState<number | null>(2);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [leverage, setLeverage] = useState<number | null>(
    () => settings.leverage,
  );
  const [feeMode, setFeeMode] = useState<FeeMode>(() => settings.fee_mode);
  const [feeRatePct, setFeeRatePct] = useState<number | null>(() =>
    fracToPct(settings.fee_rate),
  );
  const [feeFixed, setFeeFixed] = useState<number | null>(
    () => settings.fee_fixed,
  );

  // ---- seed once from persisted settings after the data layer loads --
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || initializing) return;
    seededRef.current = true;
    setBalance(settings.account_balance);
    setLeverage(settings.leverage);
    setFeeMode(settings.fee_mode);
    setFeeRatePct(fracToPct(settings.fee_rate));
    setFeeFixed(settings.fee_fixed);
    if (settings.default_risk_pct === 0.5 || settings.default_risk_pct === 1) {
      setRiskMode("preset");
      setPresetRisk(settings.default_risk_pct);
    } else {
      setRiskMode("custom");
      setCustomRisk(settings.default_risk_pct);
    }
  }, [initializing, settings]);

  // ---- persist the active balance (debounced) -----------------------
  useEffect(() => {
    if (!seededRef.current) return;
    if (balance == null || !(balance > 0)) return;
    if (balance === settings.account_balance) return;
    const id = window.setTimeout(() => {
      void updateSettings({ account_balance: balance });
    }, 700);
    return () => window.clearTimeout(id);
  }, [balance, settings.account_balance, updateSettings]);

  // ---- effective risk % ---------------------------------------------
  const riskPct = riskMode === "custom" ? customRisk : presetRisk;

  // ---- compute (delegated to the lib) -------------------------------
  const result: CalcResult = useMemo(
    () =>
      computeTrade({
        balance: balance ?? NaN,
        riskPct: riskPct ?? NaN,
        entry: entry ?? NaN,
        stop: stop ?? NaN,
        rr: rr ?? 2,
        leverage: leverage ?? 30,
        feeMode,
        feeRate: feeMode === "percent" ? pctToFrac(feeRatePct ?? 0) : 0,
        feeFixed: feeMode === "fixed" ? (feeFixed ?? 0) : 0,
      }),
    [balance, riskPct, entry, stop, rr, leverage, feeMode, feeRatePct, feeFixed],
  );

  const isLong = result.direction === "long";
  const isShort = result.direction === "short";

  // ---- balance presets ----------------------------------------------
  const presets = settings.balance_presets;
  const canSavePreset =
    balance != null && balance > 0 && !presets.includes(balance);

  const applyPreset = useCallback(
    (p: number) => {
      setBalance(p);
      void updateSettings({ account_balance: p });
    },
    [updateSettings],
  );

  const savePreset = useCallback(() => {
    if (balance == null || !(balance > 0) || presets.includes(balance)) return;
    const next = Array.from(new Set([...presets, balance])).sort(
      (a, b) => a - b,
    );
    void updateSettings({ balance_presets: next });
  }, [balance, presets, updateSettings]);

  // ---- reset (for the next setup; keeps balance / risk / fees) ------
  const resetTrade = useCallback(() => {
    setEntry(null);
    setStop(null);
    setRr(2);
  }, []);

  // ---- "Log this trade" → journal prefill (URL CONTRACT) ------------
  const logTrade = useCallback(() => {
    if (!result.valid || !result.direction) return;
    const p = new URLSearchParams();
    p.set("prefill", "1");
    p.set("direction", result.direction);
    p.set("risk_dollar", String(result.riskDollar));
    if (riskPct != null) p.set("risk_pct", String(riskPct));
    if (entry != null) p.set("entry", String(entry));
    if (stop != null) p.set("stop", String(stop));
    if (result.target != null) p.set("target", String(result.target));
    p.set("size_btc", String(result.sizeBtc));
    router.push(`/journal?${p.toString()}`);
  }, [result, riskPct, entry, stop, router]);

  const hasSpread = entry != null && stop != null;
  const feeNote =
    feeMode === "percent"
      ? `${fmtPct(feeRatePct ?? 0, { decimals: 3 })} per side`
      : `${fmtUsd(feeFixed ?? 0)} flat`;

  // =================================================================
  //  Render
  // =================================================================
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ---- Page header ------------------------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            New Trade
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-content-primary sm:text-3xl">
            Position Size
          </h1>
          <p className="mt-1 text-sm text-content-secondary">
            Size every BTC trade to an exact, fixed risk before you click buy.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetTrade}>
          Reset setup
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        {/* ============================================================
            INPUTS
        ============================================================ */}
        <div className="space-y-5 lg:col-span-5">
          <Card padded bodyClassName="space-y-6">
            {/* --- Account balance --- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <SectionLabel>Account balance</SectionLabel>
                <span className="font-mono text-xs tabular-nums text-content-muted">
                  {fmtUsd(balance, { decimals: 0 })}
                </span>
              </div>
              <NumberInput
                value={balance}
                onValueChange={setBalance}
                placeholder="25000"
                step={100}
                min={0}
              />
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => {
                  const active = balance === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={cn(
                        "rounded-full border px-3 py-1 font-mono text-xs tabular-nums transition-colors duration-150",
                        active
                          ? "border-brand/40 bg-brand-soft text-brand"
                          : "border-border-subtle bg-bg-elevated text-content-secondary hover:border-border hover:bg-bg-hover hover:text-content-primary",
                      )}
                    >
                      {fmtUsd(p, { decimals: 0 })}
                    </button>
                  );
                })}
                {canSavePreset && (
                  <button
                    type="button"
                    onClick={savePreset}
                    className="rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-content-muted transition-colors duration-150 hover:border-brand/50 hover:text-brand"
                  >
                    + Save preset
                  </button>
                )}
              </div>
            </div>

            <div className="h-px bg-border-subtle" />

            {/* --- Risk per trade --- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <SectionLabel>Risk per trade</SectionLabel>
                <Badge tone="brand">{fmtUsd(result.riskDollar)} at risk</Badge>
              </div>
              <Segmented<number>
                options={[
                  { label: "0.5%", value: 0.5 },
                  { label: "1%", value: 1 },
                ]}
                value={riskMode === "preset" ? presetRisk : -1}
                onChange={(v) => {
                  setPresetRisk(v);
                  setRiskMode("preset");
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <Toggle
                  checked={riskMode === "custom"}
                  onChange={(b) => setRiskMode(b ? "custom" : "preset")}
                  label="Custom %"
                />
                {riskMode === "custom" && (
                  <div className="w-28">
                    <NumberInput
                      value={customRisk}
                      onValueChange={setCustomRisk}
                      placeholder="0.75"
                      step={0.05}
                      min={0}
                      max={100}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-border-subtle" />

            {/* --- Entry & Stop --- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <SectionLabel>Entry &amp; stop</SectionLabel>
                {hasSpread && result.direction && (
                  <Badge tone={isLong ? "long" : "short"}>
                    {isLong ? <ArrowUpRight /> : <ArrowDownRight />}
                    {isLong ? "LONG" : "SHORT"}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Limit / entry">
                  <NumberInput
                    value={entry}
                    onValueChange={setEntry}
                    placeholder="67000.4"
                    step={1}
                    min={0}
                  />
                </Field>
                <Field label="Stop">
                  <NumberInput
                    value={stop}
                    onValueChange={setStop}
                    placeholder="66451.1"
                    step={1}
                    min={0}
                  />
                </Field>
              </div>
              <p className="text-xs text-content-muted">
                Direction is inferred from your stop:{" "}
                <span className="text-content-secondary">
                  stop below entry = long, above = short.
                </span>
              </p>
            </div>

            <div className="h-px bg-border-subtle" />

            {/* --- Reward : Risk --- */}
            <div className="space-y-3">
              <SectionLabel>Reward : Risk</SectionLabel>
              <div className="flex items-center gap-3">
                <div className="w-28">
                  <NumberInput
                    value={rr}
                    onValueChange={setRr}
                    placeholder="2"
                    step={0.1}
                    min={0}
                  />
                </div>
                <p className="text-xs text-content-muted">
                  Target ={" "}
                  <span className="font-mono tabular-nums text-content-secondary">
                    {fmtPrice(result.target)}
                  </span>{" "}
                  at {fmtNumber(rr ?? 2, 1)}R.
                </p>
              </div>
            </div>

            {/* --- Advanced (leverage & fees) --- */}
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/40">
              <button
                type="button"
                onClick={() => setAdvancedOpen((o) => !o)}
                aria-expanded={advancedOpen}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-content-primary">
                    Settings
                  </span>
                  <span className="text-xs text-content-muted">
                    Leverage &amp; fees · margin / liquidation only
                  </span>
                </span>
                <ChevronDown open={advancedOpen} />
              </button>

              {advancedOpen && (
                <div className="space-y-4 border-t border-border-subtle px-4 py-4">
                  <Field
                    label="Leverage"
                    hint="Only affects required margin & the liquidation estimate — not your position size."
                  >
                    <NumberInput
                      value={leverage}
                      onValueChange={setLeverage}
                      placeholder="30"
                      step={1}
                      min={1}
                    />
                  </Field>

                  <div className="space-y-2">
                    <span className="text-xs font-medium text-content-secondary">
                      Fee mode
                    </span>
                    <Segmented<FeeMode>
                      options={[
                        { label: "Percent", value: "percent" },
                        { label: "Fixed", value: "fixed" },
                      ]}
                      value={feeMode}
                      onChange={setFeeMode}
                      size="sm"
                    />
                  </div>

                  {feeMode === "percent" ? (
                    <Field
                      label="Fee rate (per side)"
                      hint="Taker/maker fee as a % of notional, charged each side."
                    >
                      <NumberInput
                        value={feeRatePct}
                        onValueChange={setFeeRatePct}
                        placeholder="0.055"
                        step={0.005}
                        min={0}
                      />
                    </Field>
                  ) : (
                    <Field
                      label="Commission (round-turn)"
                      hint="Flat commission charged per trade (entry + exit)."
                    >
                      <NumberInput
                        value={feeFixed}
                        onValueChange={setFeeFixed}
                        placeholder="0"
                        step={0.5}
                        min={0}
                      />
                    </Field>
                  )}

                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand transition-colors hover:text-brand-hover"
                  >
                    Manage defaults in Settings
                    <ArrowRight />
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ============================================================
            OUTPUTS
        ============================================================ */}
        <div className="space-y-5 lg:col-span-7">
          {/* --- HERO: position size --- */}
          <Card
            padded
            className="relative overflow-hidden border-brand/25 bg-gradient-to-br from-bg-surface via-bg-surface to-bg-elevated shadow-glow"
            bodyClassName="relative"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-brand/10 blur-3xl"
            />
            <div className="relative space-y-5">
              <div className="flex items-center justify-between">
                <SectionLabel>Position size</SectionLabel>
                {result.direction ? (
                  <Badge tone={isLong ? "long" : "short"}>
                    {isLong ? <ArrowUpRight /> : <ArrowDownRight />}
                    {isLong ? "LONG" : "SHORT"}
                  </Badge>
                ) : (
                  <Badge tone="default">—</Badge>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
                <div className="flex items-end gap-2">
                  <span className="font-mono text-5xl font-semibold leading-none tracking-tight tabular-nums text-brand sm:text-6xl">
                    {result.valid ? fmtBtc(result.sizeBtc, 3) : "—"}
                  </span>
                  <span className="mb-1 text-base font-medium text-content-muted">
                    BTC
                  </span>
                </div>
                <CopyButton
                  className="ml-auto"
                  label="Copy size"
                  value={result.sizeBtc.toFixed(3)}
                  disabled={!result.valid}
                />
              </div>

              <p className="text-xs text-content-muted">
                {result.valid ? (
                  <>
                    ≈ {fmtBtc(result.positionSizeBtcRaw, 4)} BTC before 0.001
                    rounding ·{" "}
                    <span className="text-content-secondary">
                      {fmtUsd(result.notional, { decimals: 0 })} notional
                    </span>
                  </>
                ) : (
                  "Enter balance, entry & stop to size the trade."
                )}
              </p>

              {/* risk used bar */}
              {result.riskDollar > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-content-muted">Risk used</span>
                    <span className="font-mono tabular-nums text-content-secondary">
                      {fmtUsd(result.actualRisk)} / {fmtUsd(result.riskDollar)}
                    </span>
                  </div>
                  <ProgressBar
                    value={result.actualRisk}
                    max={result.riskDollar || 1}
                    tone="brand"
                  />
                </div>
              )}

              {/* inline context stats */}
              <div className="grid grid-cols-3 gap-3 rounded-xl border border-border-subtle bg-bg-base/40 p-3">
                <MiniStat label="Entry" value={fmtPrice(entry)} />
                <MiniStat label="Stop" value={fmtPrice(stop)} />
                <MiniStat
                  label="Target"
                  value={fmtPrice(result.target)}
                  tone="brand"
                />
              </div>

              {/* errors / guidance */}
              {!result.valid && result.errors.length > 0 && (
                <ul className="space-y-1 rounded-xl bg-loss-soft px-3 py-2.5">
                  {result.errors.map((e, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-loss"
                    >
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-loss" />
                      {e}
                    </li>
                  ))}
                </ul>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={logTrade}
                disabled={!result.valid}
              >
                Log this trade
                <ArrowRight />
              </Button>
            </div>
          </Card>

          {/* --- Projected profit --- */}
          <Card padded>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <SectionLabel>Net profit at target</SectionLabel>
                <p className="mt-2 font-mono text-3xl font-semibold tracking-tight tabular-nums text-profit sm:text-4xl">
                  {result.valid ? fmtPnl(result.netProfit) : "—"}
                </p>
                <p className="mt-1 text-xs text-content-muted">
                  after {feeNote} fees
                </p>
              </div>
              <div className="shrink-0 space-y-2 text-right">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-content-muted">
                    Gross
                  </p>
                  <p className="font-mono text-sm font-semibold tabular-nums text-content-primary">
                    {result.valid ? fmtPnl(result.grossProfit) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-content-muted">
                    Fees
                  </p>
                  <p className="font-mono text-sm font-semibold tabular-nums text-loss">
                    {result.valid ? `−${fmtUsd(result.fees)}` : "—"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* --- Secondary metrics --- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Notional"
              value={result.valid ? fmtUsd(result.notional, { decimals: 0 }) : "—"}
              hint="Position value at entry (size × entry price)."
            />
            <StatCard
              label="Margin"
              value={
                result.valid && leverage && leverage > 0
                  ? fmtUsd(result.requiredMargin, { decimals: 0 })
                  : "—"
              }
              sub={
                leverage && leverage > 0
                  ? `at ${fmtNumber(leverage)}× leverage`
                  : undefined
              }
              hint="Initial margin required = notional ÷ leverage."
            />
            <StatCard
              label="Est. liquidation"
              value={result.valid ? fmtPrice(result.liquidationPrice) : "—"}
              sub="estimate"
              tone={result.liquidationBetweenEntryStop ? "warn" : "default"}
              hint={
                result.liquidationBetweenEntryStop
                  ? "Estimated liquidation sits between entry and stop — at this leverage you could be liquidated before your stop is hit."
                  : "Rough isolated-margin estimate; ignores fees, funding & maintenance margin."
              }
            />
          </div>

          {/* --- Warnings --- */}
          {result.warnings.length > 0 && (
            <Card padded bodyClassName="space-y-2.5">
              <SectionLabel className="text-warn">Heads up</SectionLabel>
              <ul className="space-y-2.5">
                {result.warnings.map((w, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl bg-warn-soft px-3 py-2.5 text-xs leading-relaxed text-warn"
                  >
                    <WarnGlyph />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
