// =====================================================================
//  CSV import / export for trades.
//
//  - tradesToCsv: RFC-4180 output (CRLF line breaks, quoted fields).
//  - parseTradesCsv: robust reader that tolerates quoted fields with
//    embedded commas/newlines, case-insensitive headers with common
//    aliases, and a variety of value formats. Bad rows are reported,
//    not thrown.
//  - downloadCsv: trigger a browser download (guarded for SSR).
// =====================================================================

import type { Direction, Trade, TradeInput, TradeResult } from "@/lib/types";

/** Snake_case Trade column set (sans id/created_at), in a sensible order. */
export const TRADE_CSV_HEADERS: string[] = [
  "date",
  "time",
  "direction",
  "result",
  "pnl",
  "risk_dollar",
  "risk_pct",
  "r_multiple",
  "session",
  "entry",
  "stop",
  "target",
  "size_btc",
  "sfp_15m",
  "bos_3m",
  "entry_618",
  "of_confirmed",
  "tv_url",
  "atas_url",
  "after_url",
  "notes",
];

// ---------------------------------------------------------------------
//  Export
// ---------------------------------------------------------------------
function escapeCsv(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return escapeCsv(String(v));
}

export function tradesToCsv(trades: Trade[]): string {
  const lines: string[] = [];
  lines.push(TRADE_CSV_HEADERS.map(escapeCsv).join(","));
  for (const t of trades) {
    const record = t as unknown as Record<string, unknown>;
    lines.push(TRADE_CSV_HEADERS.map((h) => cell(record[h])).join(","));
  }
  return lines.join("\r\n");
}

// ---------------------------------------------------------------------
//  Tokenizer — splits raw CSV text into a grid of string cells.
//  Handles quoted fields, escaped quotes ("") and CR / LF / CRLF.
// ---------------------------------------------------------------------
function tokenize(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  // Strip a leading UTF-8 BOM if present.
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      if (s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  // Flush the final field/row.
  row.push(field);
  rows.push(row);
  return rows;
}

// ---------------------------------------------------------------------
//  Header alias resolution
// ---------------------------------------------------------------------
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/%/g, "pct")
    .replace(/\$/g, "dollar")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

const ALIAS_TO_COLUMN: Record<string, string> = {
  // date
  date: "date",
  tradedate: "date",
  day: "date",
  // time
  time: "time",
  entrytime: "time",
  tradetime: "time",
  timeofday: "time",
  hour: "time",
  // direction
  direction: "direction",
  side: "direction",
  longshort: "direction",
  dir: "direction",
  // result
  result: "result",
  outcome: "result",
  // pnl
  pnl: "pnl",
  pl: "pnl",
  pandl: "pnl",
  realizedpnl: "pnl",
  realisedpnl: "pnl",
  netpnl: "pnl",
  profit: "pnl",
  profitloss: "pnl",
  // risk $
  riskdollar: "risk_dollar",
  riskdollars: "risk_dollar",
  risk: "risk_dollar",
  riskusd: "risk_dollar",
  riskusdt: "risk_dollar",
  dollarrisk: "risk_dollar",
  // risk %
  riskpct: "risk_pct",
  riskpercent: "risk_pct",
  riskpercentage: "risk_pct",
  // r multiple
  rmultiple: "r_multiple",
  r: "r_multiple",
  rr: "r_multiple",
  rmult: "r_multiple",
  rvalue: "r_multiple",
  // session
  session: "session",
  killzone: "session",
  // entry
  entry: "entry",
  entryprice: "entry",
  // stop
  stop: "stop",
  stoploss: "stop",
  sl: "stop",
  stopprice: "stop",
  // target
  target: "target",
  tp: "target",
  takeprofit: "target",
  targetprice: "target",
  // size
  sizebtc: "size_btc",
  size: "size_btc",
  btc: "size_btc",
  positionsize: "size_btc",
  qty: "size_btc",
  quantity: "size_btc",
  // checkboxes
  sfp15m: "sfp_15m",
  sfp: "sfp_15m",
  sfp15: "sfp_15m",
  bos3m: "bos_3m",
  bos: "bos_3m",
  bos3: "bos_3m",
  entry618: "entry_618",
  fib618: "entry_618",
  "618": "entry_618",
  "0618": "entry_618",
  ofconfirmed: "of_confirmed",
  of: "of_confirmed",
  orderflow: "of_confirmed",
  orderflowconfirmed: "of_confirmed",
  ofconfirm: "of_confirmed",
  // urls
  tvurl: "tv_url",
  tv: "tv_url",
  tradingview: "tv_url",
  tradingviewurl: "tv_url",
  tvlink: "tv_url",
  atasurl: "atas_url",
  atas: "atas_url",
  ataslink: "atas_url",
  afterurl: "after_url",
  after: "after_url",
  afterlink: "after_url",
  // notes
  notes: "notes",
  note: "notes",
  comment: "notes",
  comments: "notes",
  description: "notes",
  remarks: "notes",
};

// ---------------------------------------------------------------------
//  Value parsers
// ---------------------------------------------------------------------
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function buildIso(y: string | number, mo: string | number, d: string | number): string | null {
  const Y = Number(y);
  const M = Number(mo);
  const D = Number(d);
  if (!Y || !M || !D || M < 1 || M > 12 || D < 1 || D > 31) return null;
  return `${Y}-${pad2(M)}-${pad2(D)}`;
}

function parseDateValue(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  let s = raw.trim();
  if (s === "") return null;
  // Drop any time component.
  s = s.split(/[ T]/)[0];

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return buildIso(m[1], m[2], m[3]);

  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m) return buildIso(m[1], m[2], m[3]);

  // US-style M/D/Y (2- or 4-digit year).
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let year = m[3];
    if (year.length === 2) year = `20${year}`;
    return buildIso(year, m[1], m[2]);
  }

  // M-D-Y with dashes.
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return buildIso(m[3], m[1], m[2]);

  // Last resort: let the engine try, then read UTC parts.
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  return null;
}

function parseTimeValue(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const s = raw.trim();
  if (s === "") return null;

  // 12-hour clock with an AM/PM marker, e.g. "9:05 AM", "12:30pm", "9 PM".
  const ampm = s.match(/^(\d{1,2})(?::(\d{1,2}))?\s*([AaPp])\.?[Mm]\.?$/);
  if (ampm) {
    let h = Number(ampm[1]);
    const min = ampm[2] !== undefined ? Number(ampm[2]) : 0;
    const isPm = ampm[3].toLowerCase() === "p";
    if (h >= 1 && h <= 12 && min >= 0 && min <= 59) {
      if (h === 12) h = 0;
      if (isPm) h += 12;
      return `${pad2(h)}:${pad2(min)}`;
    }
    // Out-of-range 12h value — fall through to keep the raw token.
  }

  // 24-hour clock, e.g. "14:30", "9:05", optionally with seconds "14:30:00".
  const hm = s.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (hm) {
    const h = Number(hm[1]);
    const min = Number(hm[2]);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      return `${pad2(h)}:${pad2(min)}`;
    }
  }

  // Unrecognized shape — keep the raw value so nothing is silently lost.
  return s;
}

function parseNum(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let s = raw.trim();
  if (s === "" || s === "-" || s === "—") return null;
  let neg = false;
  // Accounting-style negatives, e.g. (123.45)
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$,%\s]/g, "");
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -Math.abs(n) : n;
}

function parseDirection(raw: string | undefined): Direction | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s === "long" || s === "l" || s === "buy" || s === "bull") return "long";
  if (s === "short" || s === "s" || s === "sell" || s === "bear") return "short";
  return null;
}

function parseResult(raw: string | undefined): TradeResult | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s === "win" || s === "won" || s === "w") return "win";
  if (s === "loss" || s === "lose" || s === "lost" || s === "l") return "loss";
  if (s === "breakeven" || s === "break even" || s === "be" || s === "b" || s === "even") {
    return "breakeven";
  }
  return null;
}

const TRUE_SET = new Set(["y", "yes", "true", "1", "x", "t", "✓", "check", "checked"]);

function parseBool(raw: string | undefined): boolean {
  if (!raw) return false;
  return TRUE_SET.has(raw.trim().toLowerCase());
}

function cleanStr(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const s = raw.trim();
  return s === "" ? null : s;
}

// ---------------------------------------------------------------------
//  parseTradesCsv
// ---------------------------------------------------------------------
export function parseTradesCsv(text: string): {
  trades: TradeInput[];
  errors: string[];
  imported: number;
} {
  const trades: TradeInput[] = [];
  const errors: string[] = [];

  if (!text || text.trim() === "") {
    return { trades, errors: ["The file is empty."], imported: 0 };
  }

  const grid = tokenize(text);
  // Find the first non-empty row to use as the header.
  let headerIdx = -1;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i].some((c) => c.trim() !== "")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    return { trades, errors: ["The file is empty."], imported: 0 };
  }

  const headerCells = grid[headerIdx];
  const columnForIndex: (string | null)[] = headerCells.map((h) => {
    const key = normalizeHeader(h);
    return ALIAS_TO_COLUMN[key] ?? null;
  });

  if (!columnForIndex.some((c) => c !== null)) {
    return {
      trades,
      errors: ["No recognizable columns found in the header row."],
      imported: 0,
    };
  }

  for (let r = headerIdx + 1; r < grid.length; r++) {
    const cells = grid[r];
    // Skip completely empty rows silently.
    if (!cells.some((c) => c.trim() !== "")) continue;

    const rowNum = r + 1; // 1-based for human-friendly messages.
    const record: Record<string, string> = {};
    for (let i = 0; i < cells.length; i++) {
      const col = columnForIndex[i];
      if (col) record[col] = cells[i];
    }

    const date = parseDateValue(record.date);
    if (!date) {
      const seen = record.date !== undefined ? ` ("${record.date.trim()}")` : "";
      errors.push(`Row ${rowNum}: missing or invalid date${seen}.`);
      continue;
    }

    const trade: TradeInput = {
      date,
      time: parseTimeValue(record.time),
      direction: parseDirection(record.direction),
      result: parseResult(record.result),
      pnl: parseNum(record.pnl),
      risk_dollar: parseNum(record.risk_dollar),
      risk_pct: parseNum(record.risk_pct),
      r_multiple: parseNum(record.r_multiple),
      session: cleanStr(record.session),
      entry: parseNum(record.entry),
      stop: parseNum(record.stop),
      target: parseNum(record.target),
      size_btc: parseNum(record.size_btc),
      sfp_15m: parseBool(record.sfp_15m),
      bos_3m: parseBool(record.bos_3m),
      entry_618: parseBool(record.entry_618),
      of_confirmed: parseBool(record.of_confirmed),
      tv_url: cleanStr(record.tv_url),
      atas_url: cleanStr(record.atas_url),
      after_url: cleanStr(record.after_url),
      notes: cleanStr(record.notes),
    };
    trades.push(trade);
  }

  return { trades, errors, imported: trades.length };
}

// ---------------------------------------------------------------------
//  Browser download
// ---------------------------------------------------------------------
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
