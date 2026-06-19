"use client";

import { Card } from "@/components/ui/Card";
import { Field, NumberInput } from "@/components/ui/Input";
import type { Settings } from "@/lib/types";
import { SaveBar } from "@/components/settings/SaveBar";
import { useGroupDraft } from "@/components/settings/useGroupDraft";

type RiskDraft = {
  default_risk_pct: number | null;
  leverage: number | null;
};

export interface RiskGroupProps {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
}

/**
 * RiskGroup — the defaults the calculator pre-fills: risk per trade and the
 * leverage used to derive notional / margin.
 */
export function RiskGroup({ settings, updateSettings }: RiskGroupProps) {
  const { draft, setField, dirty, saving, saved, save, reset } =
    useGroupDraft<RiskDraft>(
      {
        default_risk_pct: settings.default_risk_pct,
        leverage: settings.leverage,
      },
      async (d) => {
        await updateSettings({
          default_risk_pct: d.default_risk_pct ?? 0,
          leverage: d.leverage ?? 1,
        });
      },
    );

  return (
    <Card title="Risk defaults" subtitle="Pre-filled when you size a new trade.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Default risk per trade"
          hint="Percent of account risked on each idea."
        >
          <div className="relative">
            <NumberInput
              value={draft.default_risk_pct}
              onValueChange={(n) => setField("default_risk_pct", n)}
              placeholder="0.5"
              step={0.1}
              min={0}
              max={100}
              className="pr-9"
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-content-muted">
              %
            </span>
          </div>
        </Field>

        <Field label="Leverage" hint="Used to compute notional and margin.">
          <div className="relative">
            <NumberInput
              value={draft.leverage}
              onValueChange={(n) => setField("leverage", n)}
              placeholder="30"
              step={1}
              min={1}
              max={500}
              className="pr-10"
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-content-muted">
              ×
            </span>
          </div>
        </Field>
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
