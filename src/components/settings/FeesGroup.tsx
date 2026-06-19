"use client";

import { Card } from "@/components/ui/Card";
import { Field, NumberInput } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { fmtPct, fmtUsd } from "@/lib/format";
import type { FeeMode, Settings } from "@/lib/types";
import { SaveBar } from "@/components/settings/SaveBar";
import { useGroupDraft } from "@/components/settings/useGroupDraft";

type FeesDraft = {
  fee_mode: FeeMode;
  fee_rate: number | null;
  fee_fixed: number | null;
};

export interface FeesGroupProps {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
}

/**
 * FeesGroup — how trading fees are modelled. Percent applies a taker rate to
 * notional; Fixed applies a flat per-trade cost. Only the relevant input shows.
 */
export function FeesGroup({ settings, updateSettings }: FeesGroupProps) {
  const { draft, setField, dirty, saving, saved, save, reset } =
    useGroupDraft<FeesDraft>(
      {
        fee_mode: settings.fee_mode,
        fee_rate: settings.fee_rate,
        fee_fixed: settings.fee_fixed,
      },
      async (d) => {
        await updateSettings({
          fee_mode: d.fee_mode,
          fee_rate: d.fee_rate ?? 0,
          fee_fixed: d.fee_fixed ?? 0,
        });
      },
    );

  const ratePct = draft.fee_rate != null ? draft.fee_rate * 100 : null;

  return (
    <Card title="Fees" subtitle="Applied to P&L and break-even estimates.">
      <div className="space-y-4">
        <Field label="Fee model">
          <Segmented<FeeMode>
            value={draft.fee_mode}
            onChange={(v) => setField("fee_mode", v)}
            options={[
              { label: "Percent", value: "percent" },
              { label: "Fixed", value: "fixed" },
            ]}
          />
        </Field>

        {draft.fee_mode === "percent" ? (
          <Field
            label="Taker fee rate"
            hint={
              ratePct != null
                ? `Fraction of notional — ${fmtPct(ratePct, { decimals: 3 })} per side.`
                : "Fraction of notional charged per side (e.g. 0.00055)."
            }
          >
            <NumberInput
              value={draft.fee_rate}
              onValueChange={(n) => setField("fee_rate", n)}
              placeholder="0.00055"
              step={0.0001}
              min={0}
            />
          </Field>
        ) : (
          <Field
            label="Fixed fee per trade"
            hint={
              draft.fee_fixed != null
                ? `Flat ${fmtUsd(draft.fee_fixed)} charged per trade.`
                : "Flat cost in USD charged per trade."
            }
          >
            <NumberInput
              value={draft.fee_fixed}
              onValueChange={(n) => setField("fee_fixed", n)}
              placeholder="2.00"
              step={0.5}
              min={0}
            />
          </Field>
        )}
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
