-- ═══════════════════════════════════════════════════════════
-- Migration 008 — Balance-tracked certificates
-- Some certs aren't "redeem once" — they're a running dollar
-- balance you draw down over time (United Flight Credit,
-- United TravelBank). Adds add/subtract + history, same
-- pattern as the Points tab.
-- ═══════════════════════════════════════════════════════════

alter table certificates
  add column if not exists is_balance_tracked boolean not null default false,
  add column if not exists balance_cents integer;

create table if not exists cert_balance_transactions (
  id             uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references certificates(id) on delete cascade,
  delta_cents    integer not null,        -- positive = added, negative = spent
  note           text,
  occurred_on    date not null default current_date,
  created_at     timestamptz not null default now()
);

create index if not exists idx_cert_bal_tx_cert      on cert_balance_transactions(certificate_id);
create index if not exists idx_cert_bal_tx_occurred  on cert_balance_transactions(occurred_on);

-- Turn the existing United Flight Credit into a tracked balance,
-- seeded with its current value.
update certificates
set is_balance_tracked = true,
    balance_cents = value_low_cents
where name = 'United Flight Credit';

-- Add United TravelBank Credit — same card, right after Flight Credit.
insert into certificates
  (name, cert_type, card_id, is_balance_tracked, balance_cents,
   value_low_cents, value_high_cents, status, notes)
select
  'United TravelBank Credit', 'one_time', card_id, true, 5000,
  5000, 5000, 'active',
  'Annual $50 TravelBank credit — tracked as a running balance'
from certificates
where name = 'United Flight Credit';
