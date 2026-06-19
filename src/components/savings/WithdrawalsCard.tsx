"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, NumberInput } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { fmtDate, fmtUsd } from "@/lib/format";
import type { Withdrawal, WithdrawalInput } from "@/lib/types";

export interface WithdrawalsCardProps {
  withdrawals: Withdrawal[];
  total: number;
  onAdd: (input: WithdrawalInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7" />
      <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
    </svg>
  );
}

function PiggyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M19 9.5a4.5 4.5 0 0 0-4.5-4h-3A5.5 5.5 0 0 0 6 11v.5l-2 1.5v3h2.2A5.5 5.5 0 0 0 9 18.8V21h2.5v-1.5h2V21H16v-2.4a5.5 5.5 0 0 0 2-2.1h2v-4.5Z" />
      <path d="M15.5 11h.01" />
    </svg>
  );
}

/**
 * WithdrawalsCard — the payout log. Inline add row at the top, a scrollable list
 * below, and a Modal confirm before any delete (never window.confirm).
 */
export function WithdrawalsCard({
  withdrawals,
  total,
  onAdd,
  onDelete,
}: WithdrawalsCardProps) {
  const [date, setDate] = useState<string>("");
  const [amount, setAmount] = useState<number | null>(null);
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Withdrawal | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Default the date to today *after* mount to avoid SSR hydration drift.
  useEffect(() => {
    setDate(todayIso());
  }, []);

  // Newest first for display (the store keeps them date-ascending).
  const ordered = useMemo(() => [...withdrawals].reverse(), [withdrawals]);

  async function handleAdd() {
    if (amount == null || !(amount > 0)) {
      setError("Enter a payout amount greater than 0.");
      return;
    }
    if (!date) {
      setError("Pick a date for this payout.");
      return;
    }
    setError(null);
    setAdding(true);
    try {
      await onAdd({ date, amount, note: note.trim() === "" ? null : note.trim() });
      setAmount(null);
      setNote("");
    } catch {
      setError("Couldn't save that payout. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onDelete(pendingDelete.id);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card
      title="Payout log"
      subtitle="Every withdrawal you save toward the challenge."
      right={
        <Badge tone="brand">
          {withdrawals.length} {withdrawals.length === 1 ? "payout" : "payouts"} ·{" "}
          {fmtUsd(total)}
        </Badge>
      }
      bodyClassName="space-y-4"
    >
      {/* Add row */}
      <div className="rounded-xl border border-border-subtle bg-bg-base/40 p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_1.4fr_auto] sm:items-end">
          <Field label="Date" className="sm:w-40">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="[color-scheme:dark]"
            />
          </Field>
          <Field label="Amount">
            <NumberInput
              value={amount}
              onValueChange={setAmount}
              placeholder="500.00"
              step={50}
              min={0}
            />
          </Field>
          <Field label="Note" hint="Optional — e.g. which firm / account.">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="May payout"
              maxLength={120}
            />
          </Field>
          <Button onClick={handleAdd} loading={adding} className="w-full sm:w-auto">
            Add payout
          </Button>
        </div>
        {error != null && <p className="mt-2 text-xs text-loss">{error}</p>}
      </div>

      {/* List */}
      {ordered.length === 0 ? (
        <EmptyState
          icon={<PiggyIcon />}
          title="No payouts logged yet"
          description="Add your first withdrawal above to start saving toward the funded challenge."
        />
      ) : (
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle">
          {ordered.map((w) => (
            <li
              key={w.id}
              className="flex items-center gap-3 px-3.5 py-3 transition-colors duration-150 hover:bg-bg-hover sm:px-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-semibold tabular-nums text-profit">
                    {fmtUsd(w.amount)}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-content-muted">
                    {fmtDate(w.date)}
                  </span>
                </div>
                {w.note != null && w.note !== "" && (
                  <p className="mt-0.5 truncate text-xs text-content-secondary">
                    {w.note}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(w)}
                aria-label="Delete payout"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-loss-soft hover:text-loss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Delete confirm */}
      <Modal
        open={pendingDelete != null}
        onClose={() => (deleting ? undefined : setPendingDelete(null))}
        title="Delete payout?"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Delete
            </Button>
          </>
        }
      >
        {pendingDelete != null && (
          <p className="text-sm text-content-secondary">
            This will remove the{" "}
            <span className="font-mono font-semibold tabular-nums text-content-primary">
              {fmtUsd(pendingDelete.amount)}
            </span>{" "}
            payout from {fmtDate(pendingDelete.date)}. This can&apos;t be undone.
          </p>
        )}
      </Modal>
    </Card>
  );
}
