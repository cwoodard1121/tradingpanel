// =====================================================================
//  Shared domain types — the single source of truth for the whole app.
// =====================================================================

export type Direction = "long" | "short";
export type TradeResult = "win" | "loss" | "breakeven";
export type FeeMode = "percent" | "fixed";
export type TrailingMode = "peak" | "lock_at_start";

/** Suggested session presets — `session` is a free string, these just power the dropdown. */
export const SESSION_PRESETS = ["Asia", "London", "New York", "AM", "PM"] as const;

export interface Trade {
  id: string;
  date: string; // 'YYYY-MM-DD'
  time: string | null; // 'HH:MM' 24h — the time the trade was taken
  direction: Direction | null;
  result: TradeResult | null;
  pnl: number | null;
  risk_dollar: number | null;
  risk_pct: number | null;
  r_multiple: number | null;
  session: string | null;
  entry: number | null;
  stop: number | null;
  target: number | null;
  size_btc: number | null;
  sfp_15m: boolean;
  bos_3m: boolean;
  entry_618: boolean;
  of_confirmed: boolean;
  tv_url: string | null;
  atas_url: string | null;
  after_url: string | null;
  notes: string | null;
  created_at: string; // ISO timestamp
}

/** Shape used when creating/editing a trade (id + created_at are managed by the data layer). */
export type TradeInput = Omit<Trade, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export interface Withdrawal {
  id: string;
  date: string; // 'YYYY-MM-DD'
  amount: number;
  note: string | null;
  created_at: string;
}

export type WithdrawalInput = Omit<Withdrawal, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export interface Settings {
  id?: string;
  account_balance: number;
  default_risk_pct: number;
  leverage: number;
  fee_mode: FeeMode;
  fee_rate: number;
  fee_fixed: number;
  daily_loss_pct: number;
  trailing_dd_pct: number;
  profit_target_pct: number;
  trailing_mode: TrailingMode;
  challenge_price: number | null;
  /** Which trading phase the user is currently in. */
  account_phase: "challenge" | "funded";
  /** Account-balance quick-switch presets (client-managed). */
  balance_presets: number[];
}

export type Backend = "supabase" | "local";
