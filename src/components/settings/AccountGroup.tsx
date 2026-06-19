"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, NumberInput } from "@/components/ui/Input";
import { fmtUsd } from "@/lib/format";
import type { Settings } from "@/lib/types";
import { SaveBar } from "@/components/settings/SaveBar";
import { useGroupDraft } from "@/components/settings/useGroupDraft";

type AccountDraft = {
  account_balance: number | null;
  balance_presets: number[];
};

export interface AccountGroupProps {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
}

/**
 * AccountGroup — current account balance plus the quick-switch balance presets
 * used elsewhere (calculator). "Add current" snapshots the balance into a preset.
 */
export function AccountGroup({ settings, updateSettings }: AccountGroupProps) {
  const { draft, setField, setDraft, dirty, saving, saved, save, reset } =
    useGroupDraft<AccountDraft>(
      {
        account_balance: settings.account_balance,
        balance_presets: settings.balance_presets,
      },
      async (d) => {
        await updateSettings({
          account_balance: d.account_balance ?? 0,
          balance_presets: d.balance_presets,
        });
      },
    );

  const current = draft.account_balance;
  const canAddCurrent =
    current != null &&
    current > 0 &&
    !draft.balance_presets.some((p) => p === current);

  function addCurrent() {
    if (!canAddCurrent || current == null) return;
    setField(
      "balance_presets",
      [...draft.balance_presets, current].sort((a, b) => a - b),
    );
  }

  function removePreset(index: number) {
    setField(
      "balance_presets",
      draft.balance_presets.filter((_, i) => i !== index),
    );
  }

  function selectPreset(value: number) {
    setDraft({ ...draft, account_balance: value });
  }

  return (
    <Card title="Account" subtitle="Your trading balance and quick-switch presets.">
      <div className="space-y-5">
        <Field
          label="Account balance"
          hint="Used as the default equity for risk sizing."
        >
          <NumberInput
            value={draft.account_balance}
            onValueChange={(n) => setField("account_balance", n)}
            placeholder="25000"
            step={500}
            min={0}
          />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-content-secondary">
              Balance presets
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={addCurrent}
              disabled={!canAddCurrent}
            >
              + Add current
            </Button>
          </div>

          {draft.balance_presets.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-subtle px-3 py-3 text-xs text-content-muted">
              No presets yet. Add the current balance to switch back to it fast.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {draft.balance_presets.map((preset, i) => {
                const active = preset === draft.account_balance;
                return (
                  <li key={`${preset}-${i}`}>
                    <span
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full border py-1 pl-3 pr-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-brand/40 bg-brand-soft text-brand"
                          : "border-border bg-bg-elevated text-content-secondary",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() => selectPreset(preset)}
                        className="font-mono tabular-nums focus:outline-none"
                        aria-label={`Use ${fmtUsd(preset)} as the balance`}
                      >
                        {fmtUsd(preset, { decimals: 0 })}
                      </button>
                      <button
                        type="button"
                        onClick={() => removePreset(i)}
                        aria-label={`Remove ${fmtUsd(preset)} preset`}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-content-muted transition-colors hover:bg-loss-soft hover:text-loss focus:outline-none"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3 w-3"
                          aria-hidden="true"
                        >
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
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
