# BTC Risk &amp; Journal

A premium, dark, mobile-first trading terminal for **Bitcoin day trading**. Three tools in one app:

- **Risk / position-size calculator** — the hero math. Type your balance, risk %, entry and stop; it sizes the position in BTC (rounded *down* to a clean lot), targets your reward, and flags liquidation danger before you click buy.
- **Trade journal** — log every trade (direction, R-multiple, P&amp;L, session, setup tags, chart links, notes), edit inline, and import/export CSV.
- **Prop-firm analytics** — equity curve, win-rate donut, R-distribution, expectancy, and the prop-firm guardrails (daily-loss limit, trailing drawdown, profit target) so you always know where you stand.

Plus a **Savings** tracker for withdrawals toward your next challenge/account.

> No login. Your data lives in **Supabase** (synced across phone + desktop) when configured, or falls back to your browser's **localStorage** automatically when it isn't. Because there's no auth, **export CSV backups regularly**.

---

## Tech stack

Next.js 14 (App Router) · TypeScript (strict) · TailwindCSS · Recharts · `@supabase/supabase-js`. Always-dark theme. Path alias `@/` → `src/`.

---

## 1. Local development

Requires Node 20+ (built and tested on Node 24).

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. With no environment variables set, the app runs immediately against **localStorage** — no Supabase account needed to try it.

Useful scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm test` | Run the math unit tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run lint` | Lint |

---

## 2. Supabase setup (optional, enables cross-device sync)

1. Create a project at <https://supabase.com>.
2. In the project's **SQL Editor**, open `supabase/schema.sql` from this repo, paste it in, and **Run**. This creates the `trades`, `withdrawals`, and `settings` tables.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 3. Environment variables

Copy the example file and fill in the two values from the step above:

```bash
cp .env.local.example .env.local
```

```ini
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

- **Both set** → the app uses Supabase and the top bar shows a green **Synced** badge.
- **Left blank** → the app automatically uses **localStorage** and shows a yellow **Local** badge.

Restart `npm run dev` after changing `.env.local`.

---

## 4. Deploy (Vercel)

1. Push this repo to GitHub.
2. In <https://vercel.com>, **Import** the GitHub repo (Vercel auto-detects Next.js — no config needed).
3. In **Project Settings → Environment Variables**, add the same two keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy.** Open the app on your phone and desktop — both read/write the same Supabase project, so your journal is in sync everywhere.

> The build succeeds even with **no** env vars set (it just ships the localStorage fallback), so deploys never fail for a missing key.

---

## 5. Back up your data (important — there's no auth)

The app has no login and no automatic cloud backups beyond your own Supabase rows. **Export a CSV regularly** from the Journal (or Settings) — especially if you're running in **Local** mode, where everything lives only in the current browser and is lost if you clear site data or switch devices. You can re-import that CSV at any time.

---

## 6. The position-size math

These run before every trade and must be exactly correct. Given **balance**, **risk %**, **entry**, **stop**, and a reward-to-risk multiple **RR** (default `2`):

```text
riskDollar      = balance × (riskPct / 100)
direction       = (stop < entry) ? "long" : "short"
stopDistance    = |entry − stop|
target          = long  ? entry + RR × stopDistance
                         : entry − RR × stopDistance
positionSizeBTC = riskDollar / stopDistance
sizeBTC         = floor(positionSizeBTC / 0.001) × 0.001   // round DOWN to a 0.001 BTC lot
actualRisk$     = sizeBTC × stopDistance
notional        = sizeBTC × entry
requiredMargin  = notional / leverage
grossProfit$    = sizeBTC × |target − entry|
fees            = percent: (entryNotional + exitNotional) × feeRate   // per side, round-turn
                  fixed:   feeFixed                                    // per round-turn trade
netProfit$      = grossProfit$ − fees
liquidation     ≈ long:  entry × (1 − 1/leverage)
                  short: entry × (1 + 1/leverage)
```

Size is always rounded **down** to the lot so you never over-risk.

### Sanity example

Risk **0.5%** of a **$25,000** account, **entry 67,000.4**, **stop 66,451.1**:

```text
riskDollar    = 25000 × 0.005           = $125.00
direction     = stop < entry            = long
stopDistance  = |67000.4 − 66451.1|     = 549.3
positionSize  = 125 / 549.3             ≈ 0.22756 BTC
sizeBTC       = floor(0.22756 / 0.001)  = 0.227 BTC   ✅
target        = 67000.4 + 2 × 549.3     = 68099.0     ✅
```

---

## 7. Tests

The risk/position-size and stats math is covered by Vitest unit tests (including the example above):

```bash
npm test
```

---

## Project structure

```text
src/
  app/                 # Next.js App Router pages + layout
  components/
    Nav.tsx            # responsive nav (top bar + mobile tab bar)
    providers/         # DataProvider (Supabase / localStorage context)
    ui/                # reusable UI kit (Card, Button, Modal, …)
  lib/
    calc.ts            # position-size / risk math (the hero)
    stats.ts           # journal analytics
    propfirm.ts        # daily-loss / trailing-drawdown / target guardrails
    savings.ts         # withdrawals → savings status
    csv.ts             # CSV import / export
    format.ts          # number & date formatters (used for every value)
    types.ts           # shared domain types
supabase/
  schema.sql           # run this in the Supabase SQL editor
```
