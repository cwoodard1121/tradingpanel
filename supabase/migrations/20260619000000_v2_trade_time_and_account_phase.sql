-- =====================================================================
--  Migration: v2 — log trade time + Challenge/Funded account phase
--
--  Auto-applied by the Supabase GitHub integration (migrations run in
--  filename order). Idempotent + safe to re-run; touches no existing data.
--
--  Adds:
--    trades.time            text  -- 'HH:MM' 24h, the time the trade was taken
--    settings.account_phase text  -- 'challenge' | 'funded' (default 'challenge')
-- =====================================================================

alter table public.trades   add column if not exists time          text;
alter table public.settings add column if not exists account_phase text default 'challenge';

-- Make sure the existing settings row has a phase (never null).
update public.settings set account_phase = 'challenge' where account_phase is null;
