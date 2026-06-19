// =====================================================================
//  Number / date formatting helpers. Display rules from the spec:
//    USDT -> 2 decimals, BTC -> 3 decimals.
// =====================================================================

export function fmtUsd(
  value: number | null | undefined,
  opts: { decimals?: number; sign?: boolean } = {},
): string {
  const { decimals = 2, sign = false } = opts;
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const s = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (sign && value > 0) return `+$${s}`;
  if (value < 0) return `-$${s.replace("-", "")}`;
  return `$${s}`;
}

/** Signed USD, always shows + or - (used for P&L). */
export function fmtPnl(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (value > 0) return `+$${abs}`;
  if (value < 0) return `-$${abs}`;
  return `$${abs}`;
}

export function fmtBtc(value: number | null | undefined, decimals = 3): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Price with thousands separators — BTC prices, 1 decimal by default. */
export function fmtPrice(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtPct(
  value: number | null | undefined,
  opts: { decimals?: number; sign?: boolean } = {},
): string {
  const { decimals = 1, sign = false } = opts;
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const s = value.toFixed(decimals);
  if (sign && value > 0) return `+${s}%`;
  return `${s}%`;
}

export function fmtR(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const s = value.toFixed(decimals);
  return value > 0 ? `+${s}R` : `${s}R`;
}

export function fmtNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 'YYYY-MM-DD' -> 'Mon DD, YYYY' (locale-safe, no timezone drift). */
export function fmtDate(date: string | null | undefined): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function fmtDateShort(date: string | null | undefined): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
