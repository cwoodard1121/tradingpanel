// =====================================================================
//  Backend-agnostic data access layer.
//
//  getDb() returns a Supabase-backed implementation when the project is
//  configured, otherwise a localStorage-backed implementation. Both
//  expose the identical DbApi surface so the DataProvider never has to
//  know which one it is talking to.
//
//  Every method is defensive: on any failure it throws an Error with a
//  human-friendly message, which the provider surfaces to the UI.
// =====================================================================

import type {
  Backend,
  Direction,
  Settings,
  Trade,
  TradeInput,
  TradeResult,
  Withdrawal,
  WithdrawalInput,
} from "@/lib/types";
import { DEFAULT_SETTINGS, normalizeSettings } from "@/lib/settingsDefaults";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

// ---------------------------------------------------------------------
//  Public contract
// ---------------------------------------------------------------------
export interface DbApi {
  backend: Backend;
  listTrades(): Promise<Trade[]>;
  createTrade(input: TradeInput): Promise<Trade>;
  updateTrade(id: string, patch: Partial<TradeInput>): Promise<Trade>;
  deleteTrade(id: string): Promise<void>;
  bulkInsertTrades(inputs: TradeInput[]): Promise<Trade[]>;
  listWithdrawals(): Promise<Withdrawal[]>;
  createWithdrawal(input: WithdrawalInput): Promise<Withdrawal>;
  deleteWithdrawal(id: string): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;
}

// ---------------------------------------------------------------------
//  localStorage keys
// ---------------------------------------------------------------------
const KEY_TRADES = "sta_trades";
const KEY_WITHDRAWALS = "sta_withdrawals";
const KEY_SETTINGS = "sta_settings";

// ---------------------------------------------------------------------
//  Column manifests (single source of truth for what we read/write)
// ---------------------------------------------------------------------
const TRADE_COLUMNS = [
  "date",
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
] as const satisfies readonly (keyof TradeInput)[];

const SETTINGS_COLUMNS = [
  "account_balance",
  "default_risk_pct",
  "leverage",
  "fee_mode",
  "fee_rate",
  "fee_fixed",
  "daily_loss_pct",
  "trailing_dd_pct",
  "profit_target_pct",
  "trailing_mode",
  "challenge_price",
  "balance_presets",
] as const satisfies readonly (keyof Settings)[];

// ---------------------------------------------------------------------
//  Small coercion helpers (resilient to string-y values from any source)
// ---------------------------------------------------------------------
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s.length === 0 ? null : s;
}

function bool(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

function asDirection(v: unknown): Direction | null {
  return v === "long" || v === "short" ? v : null;
}

function asResult(v: unknown): TradeResult | null {
  return v === "win" || v === "loss" || v === "breakeven" ? v : null;
}

function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback for environments without crypto.randomUUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const val = c === "x" ? r : (r & 0x3) | 0x8;
    return val.toString(16);
  });
}

/** Stable chronological order: date asc, then created_at asc. */
function byDateThenCreated<T extends { date: string; created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
    return 0;
  });
}

// ---------------------------------------------------------------------
//  Row <-> domain mappers
// ---------------------------------------------------------------------
type Row = Record<string, unknown>;

function rowToTrade(r: Row): Trade {
  const rawDate = r.date;
  const date = typeof rawDate === "string" ? rawDate.slice(0, 10) : String(rawDate ?? "");
  const created = typeof r.created_at === "string" ? r.created_at : new Date().toISOString();
  return {
    id: String(r.id ?? genId()),
    date,
    direction: asDirection(r.direction),
    result: asResult(r.result),
    pnl: num(r.pnl),
    risk_dollar: num(r.risk_dollar),
    risk_pct: num(r.risk_pct),
    r_multiple: num(r.r_multiple),
    session: str(r.session),
    entry: num(r.entry),
    stop: num(r.stop),
    target: num(r.target),
    size_btc: num(r.size_btc),
    sfp_15m: bool(r.sfp_15m),
    bos_3m: bool(r.bos_3m),
    entry_618: bool(r.entry_618),
    of_confirmed: bool(r.of_confirmed),
    tv_url: str(r.tv_url),
    atas_url: str(r.atas_url),
    after_url: str(r.after_url),
    notes: str(r.notes),
    created_at: created,
  };
}

function rowToWithdrawal(r: Row): Withdrawal {
  const rawDate = r.date;
  const date = typeof rawDate === "string" ? rawDate.slice(0, 10) : String(rawDate ?? "");
  const created = typeof r.created_at === "string" ? r.created_at : new Date().toISOString();
  return {
    id: String(r.id ?? genId()),
    date,
    amount: num(r.amount) ?? 0,
    note: str(r.note),
    created_at: created,
  };
}

function rowToSettings(r: Row): Settings {
  const presets = Array.isArray(r.balance_presets)
    ? (r.balance_presets as unknown[]).map((x) => Number(x)).filter((n) => Number.isFinite(n))
    : undefined;
  // Build a partial with only defined values so normalizeSettings can fill gaps.
  const partial: Partial<Settings> = {};
  if (r.id !== null && r.id !== undefined) partial.id = String(r.id);
  const ab = num(r.account_balance);
  if (ab !== null) partial.account_balance = ab;
  const drp = num(r.default_risk_pct);
  if (drp !== null) partial.default_risk_pct = drp;
  const lev = num(r.leverage);
  if (lev !== null) partial.leverage = lev;
  if (r.fee_mode === "percent" || r.fee_mode === "fixed") partial.fee_mode = r.fee_mode;
  const fr = num(r.fee_rate);
  if (fr !== null) partial.fee_rate = fr;
  const ff = num(r.fee_fixed);
  if (ff !== null) partial.fee_fixed = ff;
  const dlp = num(r.daily_loss_pct);
  if (dlp !== null) partial.daily_loss_pct = dlp;
  const tdd = num(r.trailing_dd_pct);
  if (tdd !== null) partial.trailing_dd_pct = tdd;
  const ptp = num(r.profit_target_pct);
  if (ptp !== null) partial.profit_target_pct = ptp;
  if (r.trailing_mode === "peak" || r.trailing_mode === "lock_at_start") {
    partial.trailing_mode = r.trailing_mode;
  }
  // challenge_price is legitimately nullable.
  partial.challenge_price = num(r.challenge_price);
  if (presets && presets.length > 0) partial.balance_presets = presets;
  return normalizeSettings(partial);
}

/** Pick only known trade columns whose value is defined. */
function pickTradeRow(input: Partial<TradeInput>): Row {
  const row: Row = {};
  for (const k of TRADE_COLUMNS) {
    const v = input[k];
    if (v !== undefined) row[k] = v;
  }
  return row;
}

/** Pick only known settings columns whose value is defined. */
function pickSettingsRow(patch: Partial<Settings>): Row {
  const row: Row = {};
  for (const k of SETTINGS_COLUMNS) {
    const v = patch[k];
    if (v !== undefined) row[k] = v;
  }
  return row;
}

// =====================================================================
//  Supabase implementation
// =====================================================================
function fail(context: string, error: { message?: string } | null | undefined): never {
  throw new Error(`${context}: ${error?.message ?? "unknown error"}`);
}

function requireClient() {
  const sb = getSupabase();
  if (!sb) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return sb;
}

function createSupabaseDb(): DbApi {
  return {
    backend: "supabase",

    async listTrades(): Promise<Trade[]> {
      const sb = requireClient();
      const { data, error } = await sb
        .from("trades")
        .select("*")
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) fail("Failed to load trades", error);
      return (data ?? []).map((r) => rowToTrade(r as Row));
    },

    async createTrade(input: TradeInput): Promise<Trade> {
      const sb = requireClient();
      const row = pickTradeRow(input);
      if (input.id) row.id = input.id;
      if (input.created_at) row.created_at = input.created_at;
      const { data, error } = await sb.from("trades").insert(row).select().single();
      if (error) fail("Failed to create trade", error);
      return rowToTrade(data as Row);
    },

    async updateTrade(id: string, patch: Partial<TradeInput>): Promise<Trade> {
      const sb = requireClient();
      const row = pickTradeRow(patch);
      const { data, error } = await sb.from("trades").update(row).eq("id", id).select().single();
      if (error) fail("Failed to update trade", error);
      return rowToTrade(data as Row);
    },

    async deleteTrade(id: string): Promise<void> {
      const sb = requireClient();
      const { error } = await sb.from("trades").delete().eq("id", id);
      if (error) fail("Failed to delete trade", error);
    },

    async bulkInsertTrades(inputs: TradeInput[]): Promise<Trade[]> {
      if (inputs.length === 0) return [];
      const sb = requireClient();
      const rows = inputs.map((input) => {
        const row = pickTradeRow(input);
        if (input.id) row.id = input.id;
        if (input.created_at) row.created_at = input.created_at;
        return row;
      });
      const { data, error } = await sb.from("trades").insert(rows).select();
      if (error) fail("Failed to import trades", error);
      return (data ?? []).map((r) => rowToTrade(r as Row));
    },

    async listWithdrawals(): Promise<Withdrawal[]> {
      const sb = requireClient();
      const { data, error } = await sb
        .from("withdrawals")
        .select("*")
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) fail("Failed to load withdrawals", error);
      return (data ?? []).map((r) => rowToWithdrawal(r as Row));
    },

    async createWithdrawal(input: WithdrawalInput): Promise<Withdrawal> {
      const sb = requireClient();
      const row: Row = {
        date: input.date,
        amount: input.amount,
        note: input.note ?? null,
      };
      if (input.id) row.id = input.id;
      if (input.created_at) row.created_at = input.created_at;
      const { data, error } = await sb.from("withdrawals").insert(row).select().single();
      if (error) fail("Failed to create withdrawal", error);
      return rowToWithdrawal(data as Row);
    },

    async deleteWithdrawal(id: string): Promise<void> {
      const sb = requireClient();
      const { error } = await sb.from("withdrawals").delete().eq("id", id);
      if (error) fail("Failed to delete withdrawal", error);
    },

    async getSettings(): Promise<Settings> {
      const sb = requireClient();
      const { data, error } = await sb.from("settings").select("*").limit(1);
      if (error) fail("Failed to load settings", error);
      if (data && data.length > 0) return rowToSettings(data[0] as Row);
      // No row yet — best-effort seed one, then return defaults.
      try {
        await sb.from("settings").insert(pickSettingsRow(DEFAULT_SETTINGS));
      } catch {
        // ignore — read-only fallback to defaults is fine.
      }
      return normalizeSettings(DEFAULT_SETTINGS);
    },

    async saveSettings(patch: Partial<Settings>): Promise<Settings> {
      const sb = requireClient();
      // Find the existing single row (if any).
      const { data: existing, error: readErr } = await sb
        .from("settings")
        .select("id")
        .limit(1);
      if (readErr) fail("Failed to load settings", readErr);

      if (existing && existing.length > 0) {
        const id = (existing[0] as Row).id;
        const { data, error } = await sb
          .from("settings")
          .update(pickSettingsRow(patch))
          .eq("id", id as string)
          .select()
          .single();
        if (error) fail("Failed to save settings", error);
        return rowToSettings(data as Row);
      }

      // No row exists — insert a complete normalized row.
      const merged = normalizeSettings({ ...DEFAULT_SETTINGS, ...patch });
      const { data, error } = await sb
        .from("settings")
        .insert(pickSettingsRow(merged))
        .select()
        .single();
      if (error) fail("Failed to save settings", error);
      return rowToSettings(data as Row);
    },
  };
}

// =====================================================================
//  localStorage implementation
// =====================================================================
function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    throw new Error(`Failed to write local storage (${key}): ${msg}`);
  }
}

function createLocalDb(): DbApi {
  function loadTrades(): Trade[] {
    return byDateThenCreated(readLocal<Row[]>(KEY_TRADES, []).map(rowToTrade));
  }
  function loadWithdrawals(): Withdrawal[] {
    return byDateThenCreated(readLocal<Row[]>(KEY_WITHDRAWALS, []).map(rowToWithdrawal));
  }

  return {
    backend: "local",

    async listTrades(): Promise<Trade[]> {
      return loadTrades();
    },

    async createTrade(input: TradeInput): Promise<Trade> {
      const trades = loadTrades();
      const trade = rowToTrade({
        ...pickTradeRow(input),
        id: input.id ?? genId(),
        created_at: input.created_at ?? new Date().toISOString(),
      });
      const next = byDateThenCreated([...trades, trade]);
      writeLocal(KEY_TRADES, next);
      return trade;
    },

    async updateTrade(id: string, patch: Partial<TradeInput>): Promise<Trade> {
      const trades = loadTrades();
      const idx = trades.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error("Failed to update trade: not found.");
      const merged = rowToTrade({
        ...trades[idx],
        ...pickTradeRow(patch),
        id: trades[idx].id,
        created_at: trades[idx].created_at,
      });
      trades[idx] = merged;
      writeLocal(KEY_TRADES, byDateThenCreated(trades));
      return merged;
    },

    async deleteTrade(id: string): Promise<void> {
      const trades = loadTrades().filter((t) => t.id !== id);
      writeLocal(KEY_TRADES, trades);
    },

    async bulkInsertTrades(inputs: TradeInput[]): Promise<Trade[]> {
      const trades = loadTrades();
      const now = Date.now();
      const created = inputs.map((input, i) =>
        rowToTrade({
          ...pickTradeRow(input),
          id: input.id ?? genId(),
          // Preserve import order within the same millisecond.
          created_at: input.created_at ?? new Date(now + i).toISOString(),
        }),
      );
      const next = byDateThenCreated([...trades, ...created]);
      writeLocal(KEY_TRADES, next);
      return created;
    },

    async listWithdrawals(): Promise<Withdrawal[]> {
      return loadWithdrawals();
    },

    async createWithdrawal(input: WithdrawalInput): Promise<Withdrawal> {
      const withdrawals = loadWithdrawals();
      const withdrawal = rowToWithdrawal({
        date: input.date,
        amount: input.amount,
        note: input.note ?? null,
        id: input.id ?? genId(),
        created_at: input.created_at ?? new Date().toISOString(),
      });
      writeLocal(KEY_WITHDRAWALS, byDateThenCreated([...withdrawals, withdrawal]));
      return withdrawal;
    },

    async deleteWithdrawal(id: string): Promise<void> {
      const withdrawals = loadWithdrawals().filter((w) => w.id !== id);
      writeLocal(KEY_WITHDRAWALS, withdrawals);
    },

    async getSettings(): Promise<Settings> {
      return normalizeSettings(readLocal<Partial<Settings>>(KEY_SETTINGS, DEFAULT_SETTINGS));
    },

    async saveSettings(patch: Partial<Settings>): Promise<Settings> {
      const current = normalizeSettings(readLocal<Partial<Settings>>(KEY_SETTINGS, DEFAULT_SETTINGS));
      const merged = normalizeSettings({ ...current, ...patch });
      writeLocal(KEY_SETTINGS, merged);
      return merged;
    },
  };
}

// =====================================================================
//  Factory (cached singleton)
// =====================================================================
let dbInstance: DbApi | null = null;

export function getDb(): DbApi {
  if (dbInstance) return dbInstance;
  dbInstance = isSupabaseConfigured ? createSupabaseDb() : createLocalDb();
  return dbInstance;
}
