"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { Field, NumberInput } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { Tooltip } from "@/components/ui/Tooltip";
import type { Settings, TrailingMode } from "@/lib/types";
import { SaveBar } from "@/components/settings/SaveBar";
import { useGroupDraft } from "@/components/settings/useGroupDraft";

type ClassValue = string | false | null | undefined;
function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

type AccountPhase = Settings["account_phase"];

type PropFirmDraft = {
  account_phase: AccountPhase;
  daily_loss_pct: number | null;
  trailing_dd_pct: number | null;
  profit_target_pct: number | null;
  trailing_mode: TrailingMode;
};

export interface PropFirmGroupProps {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
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

/** Two-line label for the trading-phase pills: bold word over a tiny uppercase tag. */
function PhaseLabel({ title, tag }: { title: string; tag: string }) {
  return (
    <span className="flex flex-col items-center leading-tight">
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
        {tag}
      </span>
    </span>
  );
}

/** Contextual, softly-tinted explainer that reacts to the selected phase. */
function PhaseNote({ phase }: { phase: AccountPhase }) {
  const challenge = phase === "challenge";
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed transition-colors duration-200",
        challenge
          ? "border-brand/30 bg-brand-soft"
          : "border-profit/30 bg-profit-soft",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
          challenge ? "bg-brand" : "bg-profit",
        )}
      />
      <span className="text-content-secondary">
        {challenge ? (
          <>
            <b className="text-content-primary">Evaluation phase.</b> You&apos;re
            working toward the profit target to get funded — the limits below are
            exactly what you&apos;re judged against.
          </>
        ) : (
          <>
            <b className="text-content-primary">Live funded account.</b>{" "}
            You&apos;re taking payouts now — confirm your firm&apos;s exact rules
            for daily loss, trailing drawdown and consistency.
          </>
        )}
      </span>
    </div>
  );
}

const PHASE_TOOLTIP: ReactNode = (
  <span className="block space-y-1 text-left">
    <span className="block">
      <b className="text-content-primary">Challenge</b> — working toward the
      profit target to get funded.
    </span>
    <span className="block">
      <b className="text-content-primary">Funded</b> — live account taking
      payouts.
    </span>
    <span className="block text-content-secondary">
      Always confirm your firm&apos;s exact rules.
    </span>
  </span>
);

function PctField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number | null;
  onChange: (n: number | null) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <NumberInput
          value={value}
          onValueChange={onChange}
          placeholder="0"
          step={0.5}
          min={0}
          max={100}
          className="pr-9"
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-content-muted">
          %
        </span>
      </div>
    </Field>
  );
}

/**
 * PropFirmGroup — which phase the account is in (Challenge vs Funded) plus the
 * guardrails analytics measures against: daily loss limit, trailing drawdown,
 * profit target, and how the trailing drawdown is anchored.
 */
export function PropFirmGroup({ settings, updateSettings }: PropFirmGroupProps) {
  const { draft, setField, dirty, saving, saved, save, reset } =
    useGroupDraft<PropFirmDraft>(
      {
        account_phase: settings.account_phase,
        daily_loss_pct: settings.daily_loss_pct,
        trailing_dd_pct: settings.trailing_dd_pct,
        profit_target_pct: settings.profit_target_pct,
        trailing_mode: settings.trailing_mode,
      },
      async (d) => {
        await updateSettings({
          account_phase: d.account_phase,
          daily_loss_pct: d.daily_loss_pct ?? 0,
          trailing_dd_pct: d.trailing_dd_pct ?? 0,
          profit_target_pct: d.profit_target_pct ?? 0,
          trailing_mode: d.trailing_mode,
        });
      },
    );

  return (
    <Card
      title="Prop-firm limits"
      subtitle="Your account phase and the rules it's judged against."
    >
      <div className="space-y-5">
        {/* Trading phase — top-level mode for the whole account.
            Not wrapped in <label>: a stray label click would otherwise toggle
            the segmented control when tapping the tooltip. */}
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-content-secondary">
            Trading phase
            <Tooltip content={PHASE_TOOLTIP}>
              <InfoGlyph />
            </Tooltip>
          </span>
          <Segmented<AccountPhase>
            size="lg"
            value={draft.account_phase}
            onChange={(v) => setField("account_phase", v)}
            options={[
              { label: <PhaseLabel title="Challenge" tag="Evaluation" />, value: "challenge" },
              { label: <PhaseLabel title="Funded" tag="Live" />, value: "funded" },
            ]}
          />
          <PhaseNote phase={draft.account_phase} />
        </div>

        <div className="border-t border-border-subtle pt-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PctField
              label="Daily loss limit"
              hint="Max loss in a single day."
              value={draft.daily_loss_pct}
              onChange={(n) => setField("daily_loss_pct", n)}
            />
            <PctField
              label="Trailing drawdown"
              hint="Max drawdown from the peak."
              value={draft.trailing_dd_pct}
              onChange={(n) => setField("trailing_dd_pct", n)}
            />
            <PctField
              label="Profit target"
              hint="Goal to pass the challenge."
              value={draft.profit_target_pct}
              onChange={(n) => setField("profit_target_pct", n)}
            />
          </div>
        </div>

        {/* Not wrapped in <label>: a stray label click would otherwise toggle
            the segmented control when tapping the tooltip. */}
        <div className="flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-content-secondary">
            Trailing drawdown mode
            <Tooltip
              content={
                <span className="block space-y-1 text-left">
                  <span className="block">
                    <b className="text-content-primary">Trail from peak</b> — the
                    drawdown trails your highest equity, so locked profit can
                    still be lost.
                  </span>
                  <span className="block">
                    <b className="text-content-primary">Lock at start</b> — the
                    floor freezes once you reach the starting balance and only
                    moves up to it.
                  </span>
                  <span className="block text-content-secondary">
                    Always confirm the exact rule with your firm.
                  </span>
                </span>
              }
            >
              <InfoGlyph />
            </Tooltip>
          </span>
          <Segmented<TrailingMode>
            value={draft.trailing_mode}
            onChange={(v) => setField("trailing_mode", v)}
            options={[
              { label: "Trail from peak", value: "peak" },
              { label: "Lock at start", value: "lock_at_start" },
            ]}
          />
        </div>
      </div>

      <SaveBar
        dirty={dirty}
        saving={saving}
        saved={saved}
        onSave={save}
        onReset={reset}
      />
    </Card>
  );
}
