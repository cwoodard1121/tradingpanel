# Build a Bitcoin trading app — risk calculator + trade journal

## Overview

Build me a personal web app with two tools I use daily.

I day-trade **Bitcoin** with one specific model. I find setups on TradingView (Fibonacci retracements, break-of-structure, swing-failure patterns) and use ATAS order flow (delta, volume, open interest) as confirmation. I **execute on MetaTrader 5 (MT5)** — it's my prop firm's funded-account platform. I risk a fixed % of the account per trade, take payouts as income, and I'm saving toward a larger ($200k) funded challenge.

Two tools:
1. **Risk calculator** — I type in my limit (entry) and my stop, pick 0.5% or 1% risk, and it tells me the position size in BTC to enter into MT5.
2. **Trade journal + analytics** — log trades (replacing my Google Sheet), see all trades in a sortable table, and view clean stats including prop-firm metrics.

It's just for me, but I want it deployed online so I can use it from my phone and desktop. Keep it dead simple: a **Supabase** database and the app hosted on **Vercel**. No login or auth — I'm fine with it being open, nobody else will be on it. It should look clean and modern.

## My strategy (the only model I trade)

1. Spot a significant **SFP (swing failure pattern) on the 15-minute** chart.
2. Drop to the **3-minute** and wait for a **BOS (break of structure)** confirming the reversal.
3. Place a **limit order at the 0.618** retracement of the move.
4. **Stop loss at the swing high/low** (the swept extreme).
5. **Target is always 2:1 RR.**

Because the target is always 2R, the app should auto-calculate it from my entry and stop — I only ever input two prices. Direction is inferred from the stop: stop below entry = long, stop above entry = short.

## IMPORTANT — Bitcoin sizing, and leverage is not risk

Size is a **quantity of BTC**, and P&L is `quantity x price move`. **Leverage only affects margin, not my risk** — my risk is set entirely by my stop distance and size. I enter the trade on MT5 manually, so the app just needs to give me a clean **BTC quantity**.

## Suggested stack (use your judgment)

- Next.js (App Router) + TypeScript + Tailwind. (A Vite + React SPA is also fine — whichever deploys to Vercel most cleanly.)
- Recharts or Chart.js for charts.
- **Supabase** (Postgres) for storage, via the standard `@supabase/supabase-js` client. No auth — the app reads/writes directly with the anon key. Keep table policies simple/open since it's just me.
- **Deploy on Vercel.** Supabase URL + anon key go in env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- CSV import/export so I can move data to/from my Google Sheet — this also doubles as my backup, since there's no login gate.
- Responsive, dark mode by default, mobile-friendly.

## Deployment & data

Keep setup to a few steps:
1. Create a Supabase project and run the schema below in its SQL editor.
2. Push the repo to GitHub, import it into Vercel, and set the two env vars above.
3. Deploy. Done.

Suggested schema (adjust as needed):

```sql
create table trades (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  direction   text,                 -- 'long' | 'short'
  result      text,                 -- 'win' | 'loss' | 'breakeven'
  pnl         numeric,
  risk_dollar numeric,
  risk_pct    numeric,
  r_multiple  numeric,
  session     text,
  entry       numeric,
  stop        numeric,
  target      numeric,
  size_btc    numeric,
  sfp_15m     boolean default false,
  bos_3m      boolean default false,
  entry_618   boolean default false,
  of_confirmed boolean default false,
  tv_url      text,
  atas_url    text,
  after_url   text,
  notes       text,
  created_at  timestamptz default now()
);

create table withdrawals (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  amount     numeric not null,
  created_at timestamptz default now()
);

create table settings (
  id                uuid primary key default gen_random_uuid(),
  account_balance   numeric default 25000,
  default_risk_pct  numeric default 0.5,
  leverage          numeric default 30,
  fee_mode          text    default 'percent',  -- 'percent' | 'fixed'
  fee_rate          numeric default 0.00055,
  fee_fixed         numeric default 0,
  daily_loss_pct    numeric default 3,
  trailing_dd_pct   numeric default 6,
  profit_target_pct numeric default 6,
  trailing_mode     text    default 'peak',      -- 'peak' | 'lock_at_start'
  challenge_price   numeric                       -- price of the $200k challenge
);
```

You can leave Row Level Security off (or add a permissive policy) since there's no login. Just remind me to hit the CSV export now and then so I always have a backup of my trades.

## Tool 1 — Risk / position-size calculator (the hero screen)

Must be exactly correct; I use it before every trade. Keep the flow dead simple: pick risk, type two prices, read the size.

### Inputs

- **Account balance** — savable presets I switch between (e.g. $25,000, $200,000).
- **Risk toggle** — a clean segmented control with just two options: **0.5%** and **1%**. (That's the main control; a custom field can exist but the toggle is the default UI.)
- **Limit / entry price.**
- **Stop price.**
- **RR** — default 2.0, editable, but 2:1 is the norm. Target price is auto-calculated.
- **Settings**: leverage (default 30x, margin/liquidation only), and fees — let me choose either % of notional or fixed commission per trade.

### Outputs (lead with the actionable ones)

- **Position size in BTC** — the number I act on (round down to 0.001 BTC so I never over-risk).
- Auto-calculated **target price** at the chosen RR.
- Dollar risk allowed, and actual $ risk after rounding.
- Projected profit at target (net of fees).
- Secondary info: notional, required margin at leverage, approx liquidation price (label as estimate; warn if it sits between entry and stop).
- Warnings: size rounds to 0 (stop too wide for the risk), stop on the wrong side it implies, etc.

### Formulas (implement exactly)

```
riskDollar       = balance * (riskPct / 100)
direction        = (stop < entry) ? "long" : "short"
stopDistance     = abs(entry - stop)
target           = (direction == "long") ? entry + RR * stopDistance
                                          : entry - RR * stopDistance

positionSizeBTC  = riskDollar / stopDistance
sizeBTC          = floor(positionSizeBTC / 0.001) * 0.001    // round DOWN to 0.001 BTC
actualRisk$      = sizeBTC * stopDistance

notional         = sizeBTC * entry
requiredMargin   = notional / leverage
rewardDistance   = abs(target - entry)
grossProfit$     = sizeBTC * rewardDistance
// fees: either notional*feeRate per side, OR a fixed commission per trade
netProfit$       = grossProfit$ - roundTurnFees
```

Display USDT to 2 decimals, BTC to 3.

### Quick sanity example (verify against this — it uses my real chart)

Long, $25,000 account, 0.5% risk ($125). Limit/entry 67,000.4 (the 0.618), stop 66,451.1 (the swing low). Stop distance = 549.3.
- Auto target at 2:1 = 67,000.4 + 2*549.3 = **68,099.0** (this matches the level on my chart).
- positionSizeBTC = 125 / 549.3 = **0.227 BTC**.
- profit at target = 0.227 * 1,098.6 = ~$250 (2x the $125 risk, before fees).
Flip risk to 1% ($250): ~0.455 BTC, ~$500 at target. Build it so these come out (within rounding).

## Tool 2 — Trade journal

Replace my Google Sheet. My columns plus tags that match my model.

### Fields per trade

- Date
- Result — Win / Loss / Break-even (or auto-derive from P&L)
- Realized P&L
- Risk taken ($ and %) — auto-fill from the calculator
- R-multiple = P&L / risk$ (derived; should cluster near +2 and -1 given my fixed 2:1)
- Time / Session (e.g. PM, New York)
- Direction (Long / Short)
- Model checklist (checkboxes): 15m SFP, 3m BOS confirmed, entered at 0.618, order-flow confirmed (delta/OI)
- Setup screenshot URL (TradingView)
- ATAS screenshot URL
- After-trade screenshot URL
- Notes (free text — I write a lot here)

### Behavior

- Add / edit / delete. Fast entry is the priority.
- "Log from calculator" carries over direction, risk$, and risk%.
- CSV import (map my existing sheet) and CSV export.
- Screenshot links open in a new tab.

## Tool 3 — Analytics + all-trades table

### All-trades table
A clean, **sortable and filterable** table of every trade: sort by any column (date, P&L, R, session, direction), filter by date range / session / direction / result. This is the "see all my trades" view and should look sharp.

### Analytics dashboard
Keep what my sheet has (win rate, avg/largest/smallest win+loss, average trade, win rate by session, this week's win rate, win/loss donut) and add:

- Total P&L; this week and this month.
- Win rate overall and by session, day of week, time of day, and direction.
- Profit factor = gross profit / gross loss.
- Expectancy in $ and R.
- **Equity curve** (cumulative P&L over time) — the headline chart.
- Max drawdown ($ and %) and current drawdown.
- Win/loss streaks (current + max).
- Best day, worst day, # trades, profitable days, avg trades/week.
- R-multiple distribution (should bunch near +2 / -1 if I'm following the model — a useful discipline check).

### Prop-firm panel (build this)
Configurable account size and limits, live:
- **Consistency score** = (bestDayProfit / totalProfit) x 100; group P&L by calendar day, largest day / total net profit. Green if <= 20%, red if over. Also show profit still needed to clear 20% = (bestDay / 0.20) - totalProfit.
- **Daily loss limit** (default 3% of account): today's P&L vs limit, buffer left.
- **Trailing max drawdown** (default 6%): equity vs the trailing line, buffer left. Make the trailing behavior (trails peak vs locks at start balance) a setting with a tooltip to confirm with my firm.
- **Profit target** (default 6%): progress bar.
- **Payout readiness**: green when consistency <= 20% AND >= 3 profitable days (0.5%+).

### Savings-to-$200k tracker
Inputs: total cash withdrawn so far (from a simple withdrawals log) and the price of the $200k challenge (I'll enter it). Show a progress bar and a projected date from my average monthly withdrawal.

## Design

- Clean, modern, dark mode default; works on a phone.
- Calculator is the hero screen — pick risk, type two prices, read the BTC size.
- Dashboard readable at a glance; logging a trade is 2-3 taps.
- Round all displayed numbers sensibly.

## Build priorities (in order)

0. Scaffold the app with Supabase wired up (create the client, run the schema) so data saves from the start.
1. Risk calculator with correct math, BTC output (verify against the sanity example).
2. Trade journal with fast entry, Supabase persistence, CSV import/export.
3. Analytics: all-trades sortable table, equity curve, core stats, then the prop-firm panel.
4. Savings-to-$200k tracker.
5. Deploy to Vercel and confirm it works from my phone.

Ask me anything ambiguous before building — especially my fee/commission model and my firm's trailing-drawdown mechanic. Start by scaffolding the project with Supabase and the calculator, show me it working, then move on to the journal and analytics.
