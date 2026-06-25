"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  SESSION_PRESETS,
  type Direction,
  type Trade,
  type TradeInput,
  type TradeResult,
} from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, NumberInput, TextArea } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { MODEL_FIELDS } from "@/components/journal/model";
import { CheckIcon } from "@/components/journal/icons";
import { fmtDate } from "@/lib/format";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

const CUSTOM = "__custom__";

export interface PrefillData {
  direction: Direction | null;
  risk_dollar: number | null;
  risk_pct: number | null;
  entry: number | null;
  stop: number | null;
  target: number | null;
  size_btc: number | null;
  tv_url: string | null;
}

interface FormState {
  date: string;
  time: string;
  direction: Direction | null;
  result: TradeResult | null;
  resultTouched: boolean;
  pnl: number | null;
  risk_dollar: number | null;
  risk_pct: number | null;
  r_multiple: number | null;
  rTouched: boolean;
  sessionMode: "preset" | "custom";
  sessionPreset: string;
  sessionCustom: string;
  sfp_15m: boolean;
  bos_3m: boolean;
  entry_618: boolean;
  of_confirmed: boolean;
  entry: number | null;
  stop: number | null;
  target: number | null;
  size_btc: number | null;
  tv_url: string;
  atas_url: string;
  after_url: string;
  notes: string;
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeR(pnl: number | null, risk: number | null): number | null {
  if (pnl == null || risk == null || risk === 0) return null;
  const r = pnl / Math.abs(risk);
  if (!Number.isFinite(r)) return null;
  return Number(r.toFixed(2));
}

const isPreset = (s: string | null): boolean =>
  s != null && (SESSION_PRESETS as readonly string[]).includes(s);

function initState(
  initial: Trade | null | undefined,
  prefill: PrefillData | null | undefined,
): FormState {
  if (initial) {
    const preset = isPreset(initial.session);
    return {
      date: initial.date,
      time: initial.time ?? "",
      direction: initial.direction,
      result: initial.result,
      resultTouched: true,
      pnl: initial.pnl,
      risk_dollar: initial.risk_dollar,
      risk_pct: initial.risk_pct,
      r_multiple: initial.r_multiple,
      rTouched: true,
      sessionMode: initial.session && !preset ? "custom" : "preset",
      sessionPreset: preset ? (initial.session as string) : "",
      sessionCustom: initial.session && !preset ? initial.session : "",
      sfp_15m: initial.sfp_15m,
      bos_3m: initial.bos_3m,
      entry_618: initial.entry_618,
      of_confirmed: initial.of_confirmed,
      entry: initial.entry,
      stop: initial.stop,
      target: initial.target,
      size_btc: initial.size_btc,
      tv_url: initial.tv_url ?? "",
      atas_url: initial.atas_url ?? "",
      after_url: initial.after_url ?? "",
      notes: initial.notes ?? "",
    };
  }
  return {
    date: "",
    time: "",
    direction: prefill?.direction ?? null,
    result: null,
    resultTouched: false,
    pnl: null,
    risk_dollar: prefill?.risk_dollar ?? null,
    risk_pct: prefill?.risk_pct ?? null,
    r_multiple: null,
    rTouched: false,
    sessionMode: "preset",
    sessionPreset: "",
    sessionCustom: "",
    sfp_15m: false,
    bos_3m: false,
    entry_618: false,
    of_confirmed: false,
    entry: prefill?.entry ?? null,
    stop: prefill?.stop ?? null,
    target: prefill?.target ?? null,
    size_btc: prefill?.size_btc ?? null,
    tv_url: prefill?.tv_url ?? "",
    atas_url: "",
    after_url: "",
    notes: "",
  };
}

// ---------------------------------------------------------------------
//  Local label wrapper for non-<input> controls (avoids nesting buttons
//  inside a <label>, which Field does).
// ---------------------------------------------------------------------
function Labeled({
  label,
  right,
  hint,
  children,
}: {
  label: ReactNode;
  right?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-content-secondary">{label}</span>
        {right}
      </div>
      {children}
      {hint != null && <span className="text-xs text-content-muted">{hint}</span>}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wide text-content-secondary">
      {children}
    </div>
  );
}

const SESSION_OPTIONS = [
  { label: "— None —", value: "" },
  ...SESSION_PRESETS.map((s) => ({ label: s, value: s })),
  { label: "Custom…", value: CUSTOM },
];

export interface TradeFormProps {
  initial?: Trade | null;
  prefill?: PrefillData | null;
  prefilled?: boolean;
  onSubmit: (input: TradeInput) => Promise<void>;
  onCancel?: () => void;
}

/**
 * TradeForm — the fast-entry add/edit form. Auto-suggests result from the
 * P&L sign and auto-computes R from P&L ÷ risk (both overridable). Remount
 * it with a `key` to switch between add and edit modes.
 */
export function TradeForm({
  initial,
  prefill,
  prefilled,
  onSubmit,
  onCancel,
}: TradeFormProps) {
  const isEditing = !!initial;
  const [form, setForm] = useState<FormState>(() => initState(initial, prefill));
  const [busy, setBusy] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const successTimer = useRef<number | null>(null);

  // Default the date to today on the client only, to avoid an SSR mismatch.
  useEffect(() => {
    if (!isEditing) {
      setForm((f) => (f.date ? f : { ...f, date: todayStr() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (successTimer.current != null) window.clearTimeout(successTimer.current);
    };
  }, []);

  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function onPnlChange(n: number | null) {
    setForm((f) => {
      const next: FormState = { ...f, pnl: n };
      if (!f.resultTouched) {
        next.result = n == null ? null : n > 0 ? "win" : n < 0 ? "loss" : "breakeven";
      }
      if (!f.rTouched) next.r_multiple = computeR(n, f.risk_dollar);
      return next;
    });
  }

  function onRiskDollarChange(n: number | null) {
    setForm((f) => {
      const next: FormState = { ...f, risk_dollar: n };
      if (!f.rTouched) next.r_multiple = computeR(f.pnl, n);
      return next;
    });
  }

  function onSessionSelect(v: string) {
    if (v === CUSTOM) patch({ sessionMode: "custom" });
    else patch({ sessionMode: "preset", sessionPreset: v });
  }

  function buildInput(state: FormState): TradeInput {
    const session =
      state.sessionMode === "custom"
        ? state.sessionCustom.trim() || null
        : state.sessionPreset.trim() || null;
    return {
      date: state.date,
      time: state.time.trim() || null,
      direction: state.direction,
      result: state.result,
      pnl: state.pnl,
      risk_dollar: state.risk_dollar,
      risk_pct: state.risk_pct,
      r_multiple: state.r_multiple,
      session,
      entry: state.entry,
      stop: state.stop,
      target: state.target,
      size_btc: state.size_btc,
      sfp_15m: state.sfp_15m,
      bos_3m: state.bos_3m,
      entry_618: state.entry_618,
      of_confirmed: state.of_confirmed,
      tv_url: state.tv_url.trim() || null,
      atas_url: state.atas_url.trim() || null,
      after_url: state.after_url.trim() || null,
      notes: state.notes.trim() || null,
    };
  }

  async function submit() {
    setSubmitError(null);
    if (!form.date) {
      setDateError("Pick a date.");
      return;
    }
    setDateError(null);
    setBusy(true);
    try {
      await onSubmit(buildInput(form));
      if (isEditing) {
        onCancel?.();
        return;
      }
      // Reset for the next entry but keep the date for rapid same-day logging.
      const keepDate = form.date;
      const fresh = initState(null, null);
      fresh.date = keepDate;
      setForm(fresh);
      setSuccess(true);
      if (successTimer.current != null) window.clearTimeout(successTimer.current);
      successTimer.current = window.setTimeout(() => setSuccess(false), 2600);
      if (typeof document !== "undefined") {
        window.setTimeout(() => document.getElementById("trade-pnl")?.focus(), 0);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not save the trade.");
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  // Ctrl/Cmd+Enter from the notes textarea submits quickly.
  function onNotesKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  }

  const directionOptions: { label: string; value: Direction | "" }[] = [
    { label: "Long", value: "long" },
    { label: "Short", value: "short" },
  ];
  const resultOptions: { label: string; value: TradeResult | "" }[] = [
    { label: "Win", value: "win" },
    { label: "Loss", value: "loss" },
    { label: "Breakeven", value: "breakeven" },
  ];

  const sessionSelectValue =
    form.sessionMode === "custom" ? CUSTOM : form.sessionPreset;

  return (
    <Card
      title={isEditing ? "Edit trade" : "Log a trade"}
      subtitle={
        isEditing
          ? `Editing ${fmtDate(initial?.date)}`
          : "Fast entry — only the date is required."
      }
      right={
        isEditing ? (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : prefilled ? (
          <Badge tone="brand">From calculator</Badge>
        ) : null
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Success / error banners */}
        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-profit/30 bg-profit-soft px-3 py-2.5 text-sm text-profit">
            <CheckIcon className="h-4 w-4" />
            Trade logged. Ready for the next one.
          </div>
        )}
        {submitError && (
          <div className="rounded-xl border border-loss/30 bg-loss-soft px-3 py-2.5 text-sm text-loss">
            {submitError}
          </div>
        )}

        {/* Date + Time + Session */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" error={dateError ?? undefined}>
              <Input
                id="trade-date"
                type="date"
                value={form.date}
                onChange={(e) => {
                  patch({ date: e.target.value });
                  if (e.target.value) setDateError(null);
                }}
              />
            </Field>
            <Field label="Time">
              <Input
                id="trade-time"
                type="time"
                value={form.time}
                onChange={(e) => patch({ time: e.target.value })}
              />
            </Field>
          </div>
          <Labeled label="Session">
            <Select
              value={sessionSelectValue}
              onChange={onSessionSelect}
              options={SESSION_OPTIONS}
            />
            {form.sessionMode === "custom" && (
              <Input
                className="mt-2"
                placeholder="Custom session"
                value={form.sessionCustom}
                onChange={(e) => patch({ sessionCustom: e.target.value })}
              />
            )}
          </Labeled>
        </div>

        {/* Direction + Result */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled
            label="Direction"
            right={
              form.direction && (
                <button
                  type="button"
                  onClick={() => patch({ direction: null })}
                  className="text-[11px] text-content-muted transition-colors hover:text-content-secondary"
                >
                  Clear
                </button>
              )
            }
          >
            <Segmented<Direction | "">
              options={directionOptions}
              value={form.direction ?? ""}
              onChange={(v) => patch({ direction: v === "" ? null : v })}
            />
          </Labeled>
          <Labeled
            label="Result"
            right={
              form.result && (
                <button
                  type="button"
                  onClick={() => patch({ result: null, resultTouched: true })}
                  className="text-[11px] text-content-muted transition-colors hover:text-content-secondary"
                >
                  Clear
                </button>
              )
            }
          >
            <Segmented<TradeResult | "">
              options={resultOptions}
              value={form.result ?? ""}
              onChange={(v) =>
                patch({ result: v === "" ? null : v, resultTouched: true })
              }
            />
          </Labeled>
        </div>

        {/* P&L + R */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="P&L (USDT)">
            <NumberInput
              id="trade-pnl"
              value={form.pnl}
              onValueChange={onPnlChange}
              placeholder="0.00"
              step={1}
            />
          </Field>
          <Field
            label="R multiple"
            hint={
              form.rTouched
                ? "Manual override"
                : "Auto from P&L ÷ risk"
            }
          >
            <NumberInput
              value={form.r_multiple}
              onValueChange={(n) => patch({ r_multiple: n, rTouched: true })}
              placeholder="—"
              step={0.1}
            />
          </Field>
        </div>

        {/* Risk */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Risk (USDT)">
            <NumberInput
              value={form.risk_dollar}
              onValueChange={onRiskDollarChange}
              placeholder="0.00"
              step={1}
              min={0}
            />
          </Field>
          <Field label="Risk %">
            <NumberInput
              value={form.risk_pct}
              onValueChange={(n) => patch({ risk_pct: n })}
              placeholder="0.0"
              step={0.1}
              min={0}
            />
          </Field>
        </div>

        {/* Levels */}
        <div className="space-y-3">
          <SectionLabel>Levels</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Entry">
              <NumberInput
                value={form.entry}
                onValueChange={(n) => patch({ entry: n })}
                placeholder="0.0"
                step={1}
              />
            </Field>
            <Field label="Stop">
              <NumberInput
                value={form.stop}
                onValueChange={(n) => patch({ stop: n })}
                placeholder="0.0"
                step={1}
              />
            </Field>
            <Field label="Target">
              <NumberInput
                value={form.target}
                onValueChange={(n) => patch({ target: n })}
                placeholder="0.0"
                step={1}
              />
            </Field>
            <Field label="Size (BTC)">
              <NumberInput
                value={form.size_btc}
                onValueChange={(n) => patch({ size_btc: n })}
                placeholder="0.000"
                step={0.01}
                min={0}
              />
            </Field>
          </div>
        </div>

        {/* Model checklist */}
        <div className="space-y-3">
          <SectionLabel>Model checklist</SectionLabel>
          <div className="grid gap-3 rounded-xl border border-border-subtle bg-bg-elevated/50 p-3.5 sm:grid-cols-2">
            {MODEL_FIELDS.map((f) => (
              <Toggle
                key={f.key}
                checked={form[f.key]}
                onChange={(b) => setForm((prev) => ({ ...prev, [f.key]: b }))}
                label={f.label}
                hint={f.hint}
              />
            ))}
          </div>
        </div>

        {/* Screenshots */}
        <div className="space-y-3">
          <SectionLabel>Screenshots</SectionLabel>
          <Field label="TradingView URL">
            <Input
              type="url"
              inputMode="url"
              placeholder="https://www.tradingview.com/x/…"
              value={form.tv_url}
              onChange={(e) => patch({ tv_url: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ATAS URL">
              <Input
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={form.atas_url}
                onChange={(e) => patch({ atas_url: e.target.value })}
              />
            </Field>
            <Field label="After URL">
              <Input
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={form.after_url}
                onChange={(e) => patch({ after_url: e.target.value })}
              />
            </Field>
          </div>
        </div>

        {/* Notes */}
        <Field label="Notes" hint="Ctrl/⌘ + Enter to save">
          <TextArea
            rows={4}
            placeholder="Setup, execution, mistakes, lessons…"
            value={form.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            onKeyDown={onNotesKeyDown}
          />
        </Field>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" size="lg" loading={busy} className="flex-1">
            {isEditing ? "Save changes" : "Log trade"}
          </Button>
          {isEditing && (
            <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
