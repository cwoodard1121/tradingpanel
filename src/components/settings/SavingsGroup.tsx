"use client";

import { Card } from "@/components/ui/Card";
import { Field, NumberInput } from "@/components/ui/Input";
import type { Settings } from "@/lib/types";
import { SaveBar } from "@/components/settings/SaveBar";
import { useGroupDraft } from "@/components/settings/useGroupDraft";

type SavingsDraft = {
  challenge_price: number | null;
};

export interface SavingsGroupProps {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
}

/**
 * SavingsGroup — the target price of the $200k funded challenge. Powers the
 * savings tracker's progress and projection.
 */
export function SavingsGroup({ settings, updateSettings }: SavingsGroupProps) {
  const { draft, setField, dirty, saving, saved, save, reset } =
    useGroupDraft<SavingsDraft>(
      { challenge_price: settings.challenge_price },
      async (d) => {
        await updateSettings({ challenge_price: d.challenge_price });
      },
    );

  return (
    <Card
      title="Savings goal"
      subtitle="Target price for the $200k funded challenge."
    >
      <Field
        label="Challenge price"
        hint="What you'll pay for the challenge — your payouts are tracked toward this on the Savings tab."
      >
        <NumberInput
          value={draft.challenge_price}
          onValueChange={(n) => setField("challenge_price", n)}
          placeholder="100000"
          step={1000}
          min={0}
        />
      </Field>

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
