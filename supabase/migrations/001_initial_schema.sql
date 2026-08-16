-- ═══════════════════════════════════════════════════════════
-- Credit Dashboard — Supabase Schema Migrations
-- Run in order. All tables use UUID primary keys.
-- No Supabase Auth — owner field is 'katie' | 'stephen'.
-- ═══════════════════════════════════════════════════════════

-- ── 001: cards ───────────────────────────────────────────────
create table cards (
  id                  uuid primary key default gen_random_uuid(),
  owner               text not null check (owner in ('katie','stephen')),
  network             text not null,
  issuer              text not null,
  display_name        text not null,
  last4               text,
  annual_fee_cents    integer not null default 0,
  fee_waived          boolean not null default true,
  anniversary_month   smallint check (anniversary_month between 1 and 12),
  anniversary_day     smallint check (anniversary_day   between 1 and 31),
  active              boolean not null default true,
  created_at          timestamptz not null default now()
);

create index idx_cards_owner on cards(owner);

-- ── 002: credits ─────────────────────────────────────────────
create table credits (
  id                  uuid primary key default gen_random_uuid(),
  card_id             uuid not null references cards(id) on delete cascade,
  name                text not null,
  amount_cents        integer not null,
  period_type         text not null check (period_type in
                        ('monthly','quarterly','semiannual','annual','cardmember_year','ended')),
  ends_permanently    date,
  category            text not null,
  single_instance     boolean not null default false,
  is_primary_instance boolean not null default false,
  pools_per_user      boolean not null default false,
  active              boolean not null default true,
  created_at          timestamptz not null default now()
);

create index idx_credits_card_id  on credits(card_id);
create index idx_credits_category on credits(category);

-- ── 003: usage_log ───────────────────────────────────────────
-- One row per (credit, period). Absence = unused.
-- period_key: '2026' | '2026-H1' | '2026-Q2' | '2026-04' | 'cmy-2026' | 'ended'
create table usage_log (
  id                  uuid primary key default gen_random_uuid(),
  credit_id           uuid not null references credits(id) on delete cascade,
  period_key          text not null,
  amount_used_cents   integer not null default 0,
  notes               text,
  logged_at           timestamptz not null default now(),
  unique (credit_id, period_key)
);

create index idx_usage_log_credit_id  on usage_log(credit_id);
create index idx_usage_log_period_key on usage_log(period_key);

-- ── 004: certificates ────────────────────────────────────────
create table certificates (
  id                  uuid primary key default gen_random_uuid(),
  card_id             uuid not null references cards(id) on delete cascade,
  name                text not null,
  status              text not null default 'pending'
                        check (status in ('pending','active','committed','redeemed','expired')),
  value_low_cents     integer,
  value_high_cents    integer,
  issued_at           date,
  expires_at          date,
  trip_id             uuid,
  notes               text,
  created_at          timestamptz not null default now()
);

create index idx_certs_card_id on certificates(card_id);
create index idx_certs_status  on certificates(status);

-- ── 005: trips ───────────────────────────────────────────────
create table trips (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  destination         text not null,
  check_in            date,
  check_out           date,
  nights              smallint,
  travelers           text,
  status              text not null default 'planning'
                        check (status in ('planning','researching','booked','completed','cancelled')),
  target_cost_cents   integer,
  notes               text,
  created_at          timestamptz not null default now()
);

create index idx_trips_status   on trips(status);
create index idx_trips_check_in on trips(check_in);

-- ── 006: trip_shortlist ──────────────────────────────────────
create table trip_shortlist (
  id                  uuid primary key default gen_random_uuid(),
  trip_id             uuid not null references trips(id) on delete cascade,
  hotel_name          text not null,
  hotel_library_id    uuid,
  rank                smallint,
  notes               text,
  created_at          timestamptz not null default now()
);

create index idx_shortlist_trip_id on trip_shortlist(trip_id);

-- ── 007: trip_allocations ────────────────────────────────────
-- Intent layer: allocations are planning only, do NOT affect usage_log.
create table trip_allocations (
  id                  uuid primary key default gen_random_uuid(),
  trip_id             uuid not null references trips(id) on delete cascade,
  credit_id           uuid references credits(id),
  certificate_id      uuid references certificates(id),
  amount_cents        integer not null default 0,
  status              text not null default 'planned'
                        check (status in ('planned','committed','cancelled')),
  notes               text,
  created_at          timestamptz not null default now(),
  check (
    (credit_id is not null and certificate_id is null) or
    (credit_id is null and certificate_id is not null)
  )
);

create index idx_allocations_trip_id on trip_allocations(trip_id);

-- ── 008: hotel_library ───────────────────────────────────────
create table hotel_library (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  city                text not null,
  state               char(2),
  region              text,
  program_fhr         boolean,
  program_thc         boolean,
  program_edit        boolean,
  program_ihg         boolean,
  program_hilton      boolean,
  program_marriott    boolean,
  rate_low_cents      integer,
  rate_high_cents     integer,
  rate_source         text,
  rate_confidence     text check (rate_confidence in ('HIGH','MEDIUM','LOW',null)),
  last_verified_at    timestamptz,
  verification_notes  text,
  active              boolean not null default true,
  created_at          timestamptz not null default now()
);

create index idx_hotel_library_region on hotel_library(region);
create index idx_hotel_library_state  on hotel_library(state);

-- ── 009: rate_cache ──────────────────────────────────────────
-- Stores Claude.ai rate research. Stale after 30 days.
create table rate_cache (
  id                  uuid primary key default gen_random_uuid(),
  hotel_name          text not null,
  hotel_library_id    uuid references hotel_library(id),
  trip_id             uuid references trips(id),
  check_in            date not null,
  check_out           date not null,
  rate_low_cents      integer,
  rate_high_cents     integer,
  rate_confidence     text check (rate_confidence in ('HIGH','MEDIUM','LOW')),
  rate_source         text,
  amenity_total_cents integer,
  amenity_breakdown   text,
  net_low_cents       integer,
  net_high_cents      integer,
  better_than_free    boolean,
  fhr_confirmed       boolean,
  thc_confirmed       boolean,
  edit_confirmed      boolean,
  researched_at       timestamptz not null,
  raw_json            jsonb,
  created_at          timestamptz not null default now(),
  unique (hotel_name, check_in, check_out)
);

create index idx_rate_cache_trip_id    on rate_cache(trip_id);
create index idx_rate_cache_hotel_name on rate_cache(hotel_name);
create index idx_rate_cache_researched on rate_cache(researched_at);

-- ── 010: dining_library ──────────────────────────────────────
create table dining_library (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  city                text not null,
  state               char(2),
  amex_opentable      boolean not null default false,
  resy_eligible       boolean not null default false,
  chase_dining        boolean not null default false,
  notes               text,
  active              boolean not null default true,
  created_at          timestamptz not null default now()
);

-- ── 011: pinned_notes ────────────────────────────────────────
create table pinned_notes (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  body                text not null,
  card_id             uuid references cards(id),
  pinned              boolean not null default false,
  sort_order          smallint not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_pinned_notes_card_id on pinned_notes(card_id);
create index idx_pinned_notes_sort    on pinned_notes(sort_order);
