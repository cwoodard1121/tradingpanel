-- =====================================================================
--  Bitcoin Trading App — Supabase schema
--  Run this once in: Supabase -> SQL Editor -> New query -> Run.
--  Safe to re-run: uses "if not exists" / "or replace" where possible.
-- =====================================================================

-- ---------------------------------------------------------------------
--  trades
-- ---------------------------------------------------------------------
create table if not exists public.trades (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  time         text,                 -- 'HH:MM' 24h, the time the trade was taken
  direction    text,                 -- 'long' | 'short'
  result       text,                 -- 'win' | 'loss' | 'breakeven'
  pnl          numeric,
  risk_dollar  numeric,
  risk_pct     numeric,
  r_multiple   numeric,
  session      text,
  entry        numeric,
  stop         numeric,
  target       numeric,
  size_btc     numeric,
  sfp_15m      boolean default false,
  bos_3m       boolean default false,
  entry_618    boolean default false,
  of_confirmed boolean default false,
  tv_url       text,
  atas_url     text,
  after_url    text,
  notes        text,
  created_at   timestamptz default now()
);

-- Idempotent add for existing installs.
alter table public.trades add column if not exists time text;

create index if not exists trades_date_idx on public.trades (date);
create index if not exists trades_created_at_idx on public.trades (created_at);

-- ---------------------------------------------------------------------
--  withdrawals (cash taken out as income; feeds the $200k tracker)
-- ---------------------------------------------------------------------
create table if not exists public.withdrawals (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  amount     numeric not null,
  note       text,
  created_at timestamptz default now()
);

create index if not exists withdrawals_date_idx on public.withdrawals (date);

-- ---------------------------------------------------------------------
--  settings (single-row config; app keeps one row)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id                uuid primary key default gen_random_uuid(),
  account_balance   numeric default 25000,
  default_risk_pct  numeric default 0.5,
  leverage          numeric default 30,
  fee_mode          text    default 'percent',   -- 'percent' | 'fixed'
  fee_rate          numeric default 0.00055,
  fee_fixed         numeric default 0,
  daily_loss_pct    numeric default 3,
  trailing_dd_pct   numeric default 6,
  profit_target_pct numeric default 6,
  trailing_mode     text    default 'peak',       -- 'peak' | 'lock_at_start'
  challenge_price   numeric,                       -- price of the $200k challenge
  account_phase     text    default 'challenge',   -- 'challenge' | 'funded'
  balance_presets   jsonb   default '[25000, 200000]'::jsonb,
  updated_at        timestamptz default now()
);

-- Idempotent add for existing installs.
alter table public.settings add column if not exists account_phase text default 'challenge';

-- Seed exactly one settings row if none exists.
insert into public.settings (account_balance)
select 25000
where not exists (select 1 from public.settings);

-- ---------------------------------------------------------------------
--  Row Level Security
--  No auth in this app — it talks to Supabase with the anon key only.
--  Enable RLS but add permissive policies so the anon key can read/write.
--  (It's a private, single-user app. Keep your anon key reasonably private
--   and export CSV backups regularly.)
-- ---------------------------------------------------------------------
alter table public.trades      enable row level security;
alter table public.withdrawals enable row level security;
alter table public.settings    enable row level security;

drop policy if exists "anon full access trades"      on public.trades;
drop policy if exists "anon full access withdrawals" on public.withdrawals;
drop policy if exists "anon full access settings"    on public.settings;

create policy "anon full access trades"
  on public.trades for all
  using (true) with check (true);

create policy "anon full access withdrawals"
  on public.withdrawals for all
  using (true) with check (true);

create policy "anon full access settings"
  on public.settings for all
  using (true) with check (true);
