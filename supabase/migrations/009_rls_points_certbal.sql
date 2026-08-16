-- ═══════════════════════════════════════════════════════════
-- Migration 009 — Enable RLS on points_accounts, point_transactions,
-- and cert_balance_transactions.
-- These tables were created without RLS, leaving them fully open
-- to the anon key. Matches the existing app-wide pattern (auth is
-- enforced at the app layer via login, not per-row in Postgres).
-- ═══════════════════════════════════════════════════════════

alter table points_accounts enable row level security;
alter table point_transactions enable row level security;
alter table cert_balance_transactions enable row level security;

create policy app_full_access on points_accounts
  for all to anon, authenticated using (true) with check (true);

create policy app_full_access on point_transactions
  for all to anon, authenticated using (true) with check (true);

create policy app_full_access on cert_balance_transactions
  for all to anon, authenticated using (true) with check (true);
