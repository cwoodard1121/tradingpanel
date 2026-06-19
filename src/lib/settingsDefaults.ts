import type { Settings } from "./types";

/** Default settings — mirrors the Supabase `settings` table defaults. */
export const DEFAULT_SETTINGS: Settings = {
  account_balance: 25000,
  default_risk_pct: 0.5,
  leverage: 30,
  fee_mode: "percent",
  fee_rate: 0.00055,
  fee_fixed: 0,
  daily_loss_pct: 3,
  trailing_dd_pct: 6,
  profit_target_pct: 6,
  trailing_mode: "peak",
  challenge_price: null,
  account_phase: "challenge",
  balance_presets: [25000, 200000],
};

/** Coerce a partial/loosely-typed object (e.g. from Supabase or localStorage) into full Settings. */
export function normalizeSettings(raw: Partial<Settings> | null | undefined): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };
  // Guard the enums and arrays.
  if (s.fee_mode !== "percent" && s.fee_mode !== "fixed") s.fee_mode = "percent";
  if (s.trailing_mode !== "peak" && s.trailing_mode !== "lock_at_start") s.trailing_mode = "peak";
  if (s.account_phase !== "challenge" && s.account_phase !== "funded") s.account_phase = "challenge";
  if (!Array.isArray(s.balance_presets) || s.balance_presets.length === 0) {
    s.balance_presets = [...DEFAULT_SETTINGS.balance_presets];
  }
  return s;
}
