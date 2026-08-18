-- ═══════════════════════════════════════════════════════════
-- Migration 007 — Points by issuer, not by card
-- One points balance per (owner, network) — e.g. one Amex MR
-- pool for Stephen, one for Katie — instead of one per card.
-- Replaces migration 006's card-level design.
-- ═══════════════════════════════════════════════════════════

drop table if exists point_transactions;
drop table if exists card_points;

create table points_accounts (
  id                     uuid primary key default gen_random_uuid(),
  owner                  text not null,          -- 'katie' | 'stephen'
  network                text not null,          -- 'amex' | 'chase' | 'citi' | ...
  program_name           text not null default '',
  balance                integer not null default 0,
  value_per_point_cents  numeric not null default 1.0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (owner, network)
);

create table point_transactions (
  id                  uuid primary key default gen_random_uuid(),
  points_account_id   uuid not null references points_accounts(id) on delete cascade,
  delta               integer not null,          -- positive = added, negative = redeemed
  note                text,                      -- e.g. "Utah Trip"
  occurred_on         date not null default current_date,
  created_at          timestamptz not null default now()
);

create index idx_point_tx_account  on point_transactions(points_account_id);
create index idx_point_tx_occurred on point_transactions(occurred_on);

-- One row per person per issuer they hold a card with.
-- value_per_point_cents seeded with each program's own travel-portal
-- redemption rate (not transfer-partner upside) -- editable anytime
-- in the Points tab. Chase Sapphire Reserve's flat 1.5c portal rate
-- was retired in the Points Boost overhaul; standard redemptions are
-- 1c flat, boosted rates only apply to select premium bookings.
insert into points_accounts (owner, network, program_name, value_per_point_cents)
select distinct owner, network,
  case network
    when 'amex'      then 'American Express Membership Rewards'
    when 'chase'     then 'Chase Ultimate Rewards'
    when 'citi'      then 'Citi ThankYou Points'
    when 'marriott'  then 'Marriott Bonvoy'
    when 'ihg'       then 'IHG One Rewards'
    when 'hilton'    then 'Hilton Honors'
    when 'southwest' then 'Southwest Rapid Rewards'
    else network
  end,
  case network
    when 'amex'      then 1.0
    when 'chase'     then 1.0
    when 'citi'      then 1.0
    when 'marriott'  then 0.7
    when 'ihg'       then 0.5
    when 'hilton'    then 0.5
    when 'southwest' then 1.3
    else 1.0
  end
from cards
where active = true and network is not null and network <> '' and network <> 'N/A';
