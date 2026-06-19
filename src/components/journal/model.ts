// ---------------------------------------------------------------------
//  The trading "model" checklist — the four confluences the journal
//  tracks for every BTC entry. Keys map 1:1 to the boolean Trade fields.
// ---------------------------------------------------------------------

export type ModelKey = "sfp_15m" | "bos_3m" | "entry_618" | "of_confirmed";

export interface ModelField {
  key: ModelKey;
  /** Full label used on the entry-form toggles. */
  label: string;
  /** Compact label used on the trade-card ticks. */
  short: string;
  /** One-line explainer for the form. */
  hint: string;
}

export const MODEL_FIELDS: ModelField[] = [
  { key: "sfp_15m", label: "15m SFP", short: "SFP", hint: "15-minute swing-failure pattern" },
  { key: "bos_3m", label: "3m BOS confirmed", short: "BOS", hint: "3-minute break of structure" },
  { key: "entry_618", label: "Entered at 0.618", short: "0.618", hint: "Fibonacci 0.618 retracement entry" },
  { key: "of_confirmed", label: "Order-flow confirmed", short: "OF", hint: "Order-flow / footprint confirmation" },
];
