"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Direction, Trade, TradeInput } from "@/lib/types";
import { useData } from "@/components/providers/DataProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CsvToolbar } from "@/components/journal/CsvToolbar";
import { JournalSummary } from "@/components/journal/JournalSummary";
import { TradeForm, type PrefillData } from "@/components/journal/TradeForm";
import { TradesList } from "@/components/journal/TradesList";
import { fmtDate, fmtPnl } from "@/lib/format";

function parseDirParam(v: string | null): Direction | null {
  if (v === "long") return "long";
  if (v === "short") return "short";
  return null;
}

function numParam(v: string | null): number | null {
  if (v == null) return null;
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * JournalView — orchestrates the trade journal: prefill from the calculator,
 * the add/edit form, the trade feed, CSV import/export and delete confirms.
 * Must render inside a <Suspense> boundary (it reads useSearchParams).
 */
export function JournalView() {
  const {
    trades,
    initializing,
    addTrade,
    updateTrade,
    deleteTrade,
    importTrades,
  } = useData();

  const params = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);

  const [editing, setEditing] = useState<Trade | null>(null);
  const [deleting, setDeleting] = useState<Trade | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Prefill from the calculator's "Log this trade" deep link.
  const prefill = useMemo<PrefillData | null>(() => {
    if (params.get("prefill") !== "1") return null;
    return {
      direction: parseDirParam(params.get("direction")),
      risk_dollar: numParam(params.get("risk_dollar")),
      risk_pct: numParam(params.get("risk_pct")),
      entry: numParam(params.get("entry")),
      stop: numParam(params.get("stop")),
      target: numParam(params.get("target")),
      size_btc: numParam(params.get("size_btc")),
    };
  }, [params]);

  // Most-recent-first (the context keeps trades date/created ascending).
  const ordered = useMemo(() => {
    return [...trades].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
      return 0;
    });
  }, [trades]);

  function scrollToForm(focusId?: string) {
    if (typeof window === "undefined") return;
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (focusId) {
      window.setTimeout(() => document.getElementById(focusId)?.focus(), 250);
    }
  }

  async function handleSubmit(input: TradeInput) {
    if (editing) await updateTrade(editing.id, input);
    else await addTrade(input);
  }

  function handleEdit(trade: Trade) {
    setEditing(trade);
    scrollToForm();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteTrade(deleting.id);
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    // On large screens the journal breaks out past the global max-w-5xl
    // container so the dense desktop blotter can use the horizontal space
    // (capped at ~88rem, viewport-safe so it never overflows / scrolls).
    <div className="space-y-6 lg:mx-[calc((62rem_-_min(100vw_-_2rem,88rem))_/_2)]">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content-primary">
            Trade Journal
          </h1>
          <p className="mt-1 text-sm text-content-secondary">
            Log every BTC trade, tag your model, and keep the receipts.
          </p>
        </div>
        <CsvToolbar trades={trades} importTrades={importTrades} />
      </div>

      {/* KPI strip */}
      <JournalSummary trades={trades} loading={initializing} />

      {/* Form + feed. The blotter wants width, so the form only docks beside
          the feed on very wide screens (2xl); below that it sits on top at a
          comfortable max width while the table spans the full content area. */}
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)] 2xl:items-start">
        <div
          ref={formRef}
          className="w-full max-w-2xl 2xl:max-w-none 2xl:sticky 2xl:top-[5.5rem]"
        >
          <TradeForm
            key={editing?.id ?? "new"}
            initial={editing}
            prefill={editing ? null : prefill}
            prefilled={!editing && prefill !== null}
            onSubmit={handleSubmit}
            onCancel={editing ? () => setEditing(null) : undefined}
          />
        </div>

        <TradesList
          trades={ordered}
          initializing={initializing}
          editingId={editing?.id ?? null}
          onEdit={handleEdit}
          onDelete={(t) => setDeleting(t)}
          onStart={() => scrollToForm("trade-pnl")}
        />
      </div>

      {/* Delete confirmation */}
      <Modal
        open={deleting !== null}
        onClose={() => {
          if (!deleteBusy) setDeleting(null);
        }}
        title="Delete trade?"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeleting(null)}
              disabled={deleteBusy}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleteBusy}>
              Delete
            </Button>
          </>
        }
      >
        {deleting && (
          <p className="text-sm leading-relaxed text-content-secondary">
            This permanently removes the{" "}
            <span className="font-medium text-content-primary">
              {fmtDate(deleting.date)}
            </span>{" "}
            trade
            {deleting.pnl != null && (
              <>
                {" "}
                (
                <span
                  className={
                    deleting.pnl > 0
                      ? "font-mono text-profit"
                      : deleting.pnl < 0
                        ? "font-mono text-loss"
                        : "font-mono text-content-primary"
                  }
                >
                  {fmtPnl(deleting.pnl)}
                </span>
                )
              </>
            )}
            . This can&apos;t be undone.
          </p>
        )}
      </Modal>
    </div>
  );
}
