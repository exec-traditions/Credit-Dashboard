-- ═══════════════════════════════════════════════════════════
-- Migration 006 — Points tracker
-- One point balance per card, with a full add/redeem history.
-- ═══════════════════════════════════════════════════════════

create table card_points (
  id                     uuid primary key default gen_random_uuid(),
  card_id                uuid not null unique references cards(id) on delete cascade,
  program_name           text not null default '',
  balance                integer not null default 0,
  value_per_point_cents  numeric not null default 1.0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table point_transactions (
  id               uuid primary key default gen_random_uuid(),
  card_points_id   uuid not null references card_points(id) on delete cascade,
  delta            integer not null,        -- positive = added, negative = redeemed
  note             text,                    -- e.g. "Utah Trip"
  occurred_on      date not null default current_date,
  created_at       timestamptz not null default now()
);

create index idx_point_tx_card_points on point_transactions(card_points_id);
create index idx_point_tx_occurred    on point_transactions(occurred_on);

-- One row per active card, ready to edit immediately in the UI.
insert into card_points (card_id, program_name, balance, value_per_point_cents)
select id, case network
    when 'amex' then 'Membership Rewards'
    when 'chase' then 'Ultimate Rewards'
    when 'citi' then 'ThankYou Points'
    when 'marriott' then 'Marriott Bonvoy'
    when 'ihg' then 'IHG One Rewards'
    when 'hilton' then 'Hilton Honors'
    when 'southwest' then 'Rapid Rewards'
    else ''
  end,
  0, 1.0
from cards
where active = true;
