-- ═══════════════════════════════════════════════════════════
-- Migration 005 — V3.7 Recurring Certificates
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Schema: recurring cert columns ───────────────────────
alter table certificates
  add column if not exists cert_type text not null default 'one_time'
    check (cert_type in ('one_time','recurring')),
  add column if not exists anniversary_month smallint
    check (anniversary_month between 1 and 12),
  add column if not exists anniversary_day smallint
    check (anniversary_day between 1 and 31),
  add column if not exists first_issue_year smallint;

-- ─── 2. cert_redemptions table ───────────────────────────────
create table if not exists cert_redemptions (
  id             uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references certificates(id) on delete cascade,
  year           integer not null,
  redeemed_at    timestamptz not null default now(),
  unique (certificate_id, year)
);

create index if not exists idx_cert_redemptions_cert_id on cert_redemptions(certificate_id);

-- ─── 3. Delete old certs ─────────────────────────────────────
-- All 5 IHG bonus/anniversary nights (all committed to DFW + Austin trips)
delete from certificates
where card_id = '00000000-0000-0000-0000-000000000016';

-- Old one-time Marriott and Hilton certs (replaced by recurring templates below)
delete from certificates
where name in (
  'Marriott Free Night Award (≤35k pts)',
  'Hilton Free Weekend Night'
);

-- ─── 4. Recurring cert templates ─────────────────────────────
-- Marriott Bonvoy (Katie ···0007, Oct 24, first issue 2025)
insert into certificates
  (name, cert_type, card_id, anniversary_month, anniversary_day, first_issue_year,
   value_low_cents, value_high_cents, status, notes)
values (
  'Marriott Bonvoy Free Night Award', 'recurring',
  '00000000-0000-0000-0000-000000000007',
  10, 24, 2025,
  15000, 25000, 'active',
  'Up to 35,000 points; can top up with points for higher-category properties'
);

-- Hilton Aspire (Stephen ···0017, Nov 2, first issue 2025)
insert into certificates
  (name, cert_type, card_id, anniversary_month, anniversary_day, first_issue_year,
   value_low_cents, value_high_cents, status, notes)
values (
  'Hilton Aspire Free Night Reward', 'recurring',
  '00000000-0000-0000-0000-000000000017',
  11, 2, 2025,
  40000, 90000, 'active',
  'Any Hilton property, no category cap'
);

-- IHG Premier (Stephen ···0016, May 1, first issue 2026)
insert into certificates
  (name, cert_type, card_id, anniversary_month, anniversary_day, first_issue_year,
   value_low_cents, value_high_cents, status, notes)
values (
  'IHG Premier Anniversary Free Night', 'recurring',
  '00000000-0000-0000-0000-000000000016',
  5, 1, 2026,
  10000, 25000, 'active',
  '40,000-point cert; can top up with points for higher-category properties'
);

-- ─── 5. Verify ───────────────────────────────────────────────
-- select name, cert_type, anniversary_month, anniversary_day, first_issue_year
-- from certificates order by cert_type, name;
