"use client";

import { Card } from "@/components/ui/Card";
import { Field, NumberInput } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { Tooltip } from "@/components/ui/Tooltip";
import type { Settings, TrailingMode } from "@/lib/types";
import { SaveBar } from "@/components/settings/SaveBar";
import { useGroupDraft } from "@/components/settings/useGroupDraft";

type PropFirmDraft = {
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
 * PropFirmGroup — the funded-account guardrails analytics measures against:
 * daily loss limit, trailing drawdown, profit target, and how the trailing
 * drawdown is anchored.
 */
export function PropFirmGroup({ settings, updateSettings }: PropFirmGroupProps) {
  const { draft, setField, dirty, saving, saved, save, reset } =
    useGroupDraft<PropFirmDraft>(
      {
        daily_loss_pct: settings.daily_loss_pct,
        trailing_dd_pct: settings.trailing_dd_pct,
        profit_target_pct: settings.profit_target_pct,
        trailing_mode: settings.trailing_mode,
      },
      async (d) => {
        await updateSettings({
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
      subtitle="The rules your funded account is judged against."
    >
      <div className="space-y-4">
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
