"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, NumberInput } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { fmtPct, fmtUsd } from "@/lib/format";
import type { SavingsStatus } from "@/lib/savings";

export interface SavingsHeroProps {
  savings: SavingsStatus;
  challengePrice: number | null;
  onSaveTarget: (price: number | null) => Promise<void>;
}

/**
 * SavingsHero — the headline card. Big saved-so-far number, a brand progress
 * bar toward the challenge price, and an inline, obviously-persistent editor for
 * the target itself.
 */
export function SavingsHero({ savings, challengePrice, onSaveTarget }: SavingsHeroProps) {
  const [draft, setDraft] = useState<number | null>(challengePrice);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adopt the persisted target whenever it changes (initial load / external save).
  useEffect(() => {
    setDraft(challengePrice);
  }, [challengePrice]);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const dirty = draft !== challengePrice;
  const hasTarget = challengePrice != null && challengePrice > 0;
  const pct = Math.min(100, savings.progress * 100);

  async function handleSave() {
    setSaving(true);
    try {
      await onSaveTarget(draft);
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2200);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-card sm:p-6">
      {/* Ambient brand glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-brand/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-content-secondary">
              Saved toward challenge
            </span>
            {savings.remaining === 0 && hasTarget && (
              <Badge tone="profit">Goal reached</Badge>
            )}
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-brand sm:text-5xl">
              {fmtUsd(savings.totalWithdrawn)}
            </span>
            <span className="font-mono text-sm tabular-nums text-content-muted">
              {hasTarget ? `/ ${fmtUsd(challengePrice)}` : "saved"}
            </span>
          </div>
        </div>

        {/* Inline target editor */}
        <div className="w-full shrink-0 lg:w-64">
          <Field
            label="Challenge price target"
            hint="Set the price of the $200k funded challenge."
          >
            <div className="flex items-stretch gap-2">
              <NumberInput
                value={draft}
                onValueChange={setDraft}
                placeholder="100000"
                step={1000}
                min={0}
                className="flex-1"
              />
              <Button
                size="md"
                onClick={handleSave}
                disabled={!dirty || saving}
                loading={saving}
                className="shrink-0"
              >
                {saved && !dirty ? "Saved" : "Save"}
              </Button>
            </div>
          </Field>
        </div>
      </div>

      <div className="relative mt-6">
        <ProgressBar value={pct} max={100} tone="brand" />
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-mono tabular-nums text-brand">
            {hasTarget ? `${fmtPct(pct)} funded` : "No target set"}
          </span>
          <span className="font-mono tabular-nums text-content-secondary">
            {hasTarget ? `${fmtUsd(savings.remaining)} to go` : "—"}
          </span>
        </div>
      </div>
    </section>
  );
}
