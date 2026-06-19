"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { Trade, TradeInput } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ImportIcon, ExportIcon } from "@/components/journal/icons";
import { downloadCsv, parseTradesCsv, tradesToCsv } from "@/lib/csv";
import { fmtNumber } from "@/lib/format";

interface ImportResult {
  imported: number;
  errors: string[];
}

export interface CsvToolbarProps {
  trades: Trade[];
  importTrades: (inputs: TradeInput[]) => Promise<void>;
}

/**
 * CsvToolbar — import / export trades as CSV. Import reads a file, parses it
 * with the shared parser, writes the good rows through the data layer and
 * reports the imported count plus any row errors in a modal.
 */
export function CsvToolbar({ trades, importTrades }: CsvToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleExport() {
    const csv = tradesToCsv(trades);
    downloadCsv("trades.csv", csv);
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so selecting the same file again still fires onChange.
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    try {
      const text = await file.text();
      const parsed = parseTradesCsv(text);
      if (parsed.trades.length > 0) {
        await importTrades(parsed.trades);
      }
      setResult({ imported: parsed.imported, errors: parsed.errors });
    } catch (err) {
      setResult({
        imported: 0,
        errors: [err instanceof Error ? err.message : "Could not read the file."],
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFile}
      />

      <Button
        variant="secondary"
        size="sm"
        loading={busy}
        onClick={() => fileRef.current?.click()}
      >
        {!busy && <ImportIcon className="h-4 w-4" />}
        Import
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleExport}
        disabled={trades.length === 0}
      >
        <ExportIcon className="h-4 w-4" />
        Export
      </Button>

      <Modal
        open={result !== null}
        onClose={() => setResult(null)}
        title="CSV import"
        size="md"
        footer={
          <Button onClick={() => setResult(null)}>Done</Button>
        }
      >
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={
                  result.imported > 0
                    ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-profit-soft text-profit"
                    : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warn-soft text-warn"
                }
              >
                <span className="font-mono text-lg font-semibold tabular-nums">
                  {fmtNumber(result.imported)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-content-primary">
                  {result.imported === 1
                    ? "1 trade imported"
                    : `${fmtNumber(result.imported)} trades imported`}
                </p>
                <p className="text-xs text-content-secondary">
                  {result.errors.length === 0
                    ? "All rows parsed cleanly."
                    : `${fmtNumber(result.errors.length)} row${
                        result.errors.length === 1 ? "" : "s"
                      } skipped.`}
                </p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-xl border border-border-subtle bg-bg-elevated p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-secondary">
                  Skipped rows
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto pr-1">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-xs leading-relaxed text-loss">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
