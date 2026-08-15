-- ═══════════════════════════════════════════════════════════
-- Migration 003 — V3.1 credit data corrections
-- Source-verified against amex/chase/citi/hilton, Apr 2026
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Schema: add autopilot column ─────────────────────────
alter table credits add column if not exists autopilot boolean not null default false;

-- ─── 2. Remove fabricated credits ────────────────────────────
-- Equinox: never existed on post-refresh Plat
delete from credits where name = 'Equinox';

-- Certs posing as credits (belong in certificates table only)
delete from credits where name in (
  'Free Night Award (35k pts)',
  'IHG Free Night Award (Anniversary)',
  'Free Weekend Night Award',
  'Anniversary Points (6000 pts)'
);

-- ─── 3. Remove wrong Citi credits ────────────────────────────
-- Lululemon belongs on Plat (inserted below); T&E credit is fabricated
delete from credits
  where name in ('Travel and Entertainment Credit', 'Lululemon Credit')
  and card_id in (
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000018'
  );

-- ─── 4. Fix amounts / period_types ───────────────────────────

-- CLEAR+: $189 → $209
update credits set amount_cents = 20900 where name = 'CLEAR+';

-- Digital Entertainment: $20 → $25/mo, autopilot
update credits set amount_cents = 2500, autopilot = true
  where name = 'Digital Entertainment';

-- Global Entry: $100 → $120, rename (all issuers)
update credits
  set amount_cents = 12000,
      name = 'Global Entry / TSA PreCheck — $120 every 4 years'
  where name like 'Global Entry%';

-- Walmart+: set autopilot (amount $1295 already correct)
update credits set autopilot = true where name = 'Walmart+';

-- Uber Cash: set autopilot on all cards
update credits set autopilot = true where name = 'Uber Cash';

-- Saks: semiannual $50, ends Jun 30 2026
update credits
  set period_type = 'semiannual',
      amount_cents = 5000,
      ends_permanently = '2026-06-30'
  where name = 'Saks Fifth Avenue';

-- Amex Gold Resy: quarterly $100 → semiannual $50
update credits set amount_cents = 5000, period_type = 'semiannual'
  where name = 'Resy Credit'
  and card_id in (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000014'
  );

-- Gold autopilot credits
update credits set autopilot = true where name like 'Dining Credit%';
update credits set autopilot = true where name like 'Dunkin%';

-- CSR: OpenTable → semiannual $150 (was quarterly $100)
update credits set amount_cents = 15000, period_type = 'semiannual'
  where name = 'OpenTable Dining Credit';

-- CSR: The Edit → annual $500 (was semiannual $250)
update credits set amount_cents = 50000, period_type = 'annual'
  where name = 'The Edit Hotel Credit';

-- CSR: fix monthly amounts + autopilot
update credits set amount_cents = 2500, autopilot = true
  where name = 'DoorDash DashPass Credit';
update credits set amount_cents = 1000, autopilot = true
  where name = 'Lyft Pink Credit';
update credits set amount_cents = 1000, autopilot = true
  where name = 'Peloton Credit';


-- ─── 5. New credits: all 6 Plats ─────────────────────────────
-- Resy $100/qtr (Sept 2025 refresh)
insert into credits (card_id, name, amount_cents, period_type, category, single_instance, is_primary_instance, pools_per_user, autopilot) values
('00000000-0000-0000-0000-000000000001','Resy Credit',10000,'quarterly','dining',false,false,false,false),
('00000000-0000-0000-0000-000000000002','Resy Credit',10000,'quarterly','dining',false,false,false,false),
('00000000-0000-0000-0000-000000000003','Resy Credit',10000,'quarterly','dining',false,false,false,false),
('00000000-0000-0000-0000-000000000011','Resy Credit',10000,'quarterly','dining',false,false,false,false),
('00000000-0000-0000-0000-000000000012','Resy Credit',10000,'quarterly','dining',false,false,false,false),
('00000000-0000-0000-0000-000000000013','Resy Credit',10000,'quarterly','dining',false,false,false,false);

-- Lululemon $75/qtr (Sept 2025 refresh)
insert into credits (card_id, name, amount_cents, period_type, category, single_instance, is_primary_instance, pools_per_user, autopilot) values
('00000000-0000-0000-0000-000000000001','Lululemon Credit',7500,'quarterly','lifestyle',false,false,false,false),
('00000000-0000-0000-0000-000000000002','Lululemon Credit',7500,'quarterly','lifestyle',false,false,false,false),
('00000000-0000-0000-0000-000000000003','Lululemon Credit',7500,'quarterly','lifestyle',false,false,false,false),
('00000000-0000-0000-0000-000000000011','Lululemon Credit',7500,'quarterly','lifestyle',false,false,false,false),
('00000000-0000-0000-0000-000000000012','Lululemon Credit',7500,'quarterly','lifestyle',false,false,false,false),
('00000000-0000-0000-0000-000000000013','Lululemon Credit',7500,'quarterly','lifestyle',false,false,false,false);

-- OURA Ring $200/yr (Sept 2025 refresh)
insert into credits (card_id, name, amount_cents, period_type, category, single_instance, is_primary_instance, pools_per_user, autopilot) values
('00000000-0000-0000-0000-000000000001','OURA Ring Credit',20000,'annual','lifestyle',false,false,false,false),
('00000000-0000-0000-0000-000000000002','OURA Ring Credit',20000,'annual','lifestyle',false,false,false,false),
('00000000-0000-0000-0000-000000000003','OURA Ring Credit',20000,'annual','lifestyle',false,false,false,false),
('00000000-0000-0000-0000-000000000011','OURA Ring Credit',20000,'annual','lifestyle',false,false,false,false),
('00000000-0000-0000-0000-000000000012','OURA Ring Credit',20000,'annual','lifestyle',false,false,false,false),
('00000000-0000-0000-0000-000000000013','OURA Ring Credit',20000,'annual','lifestyle',false,false,false,false);

-- ─── 6. Uber One — primary Plats only ────────────────────────
insert into credits (card_id, name, amount_cents, period_type, category, single_instance, is_primary_instance, pools_per_user, autopilot) values
('00000000-0000-0000-0000-000000000001','Uber One',1000,'monthly','lifestyle',true,true,false,true),
('00000000-0000-0000-0000-000000000011','Uber One',1000,'monthly','lifestyle',true,true,false,true);

-- ─── 7. Saks on secondary/tertiary Plats (missing from seed) ─
insert into credits (card_id, name, amount_cents, period_type, category, single_instance, is_primary_instance, pools_per_user, autopilot, ends_permanently) values
('00000000-0000-0000-0000-000000000002','Saks Fifth Avenue',5000,'semiannual','lifestyle',false,false,false,false,'2026-06-30'),
('00000000-0000-0000-0000-000000000003','Saks Fifth Avenue',5000,'semiannual','lifestyle',false,false,false,false,'2026-06-30'),
('00000000-0000-0000-0000-000000000012','Saks Fifth Avenue',5000,'semiannual','lifestyle',false,false,false,false,'2026-06-30'),
('00000000-0000-0000-0000-000000000013','Saks Fifth Avenue',5000,'semiannual','lifestyle',false,false,false,false,'2026-06-30');

-- ─── 8. CSR: new credits ─────────────────────────────────────
insert into credits (card_id, name, amount_cents, period_type, category, single_instance, is_primary_instance, pools_per_user, autopilot) values
('00000000-0000-0000-0000-000000000005','StubHub / viagogo Credit',15000,'semiannual','lifestyle',false,false,false,false),
('00000000-0000-0000-0000-000000000015','StubHub / viagogo Credit',15000,'semiannual','lifestyle',false,false,false,false),
('00000000-0000-0000-0000-000000000005','Global Entry / TSA PreCheck — $120 every 4 years',12000,'annual','travel',false,false,false,false),
('00000000-0000-0000-0000-000000000015','Global Entry / TSA PreCheck — $120 every 4 years',12000,'annual','travel',false,false,false,false);

insert into credits (card_id, name, amount_cents, period_type, category, single_instance, is_primary_instance, pools_per_user, autopilot, ends_permanently) values
('00000000-0000-0000-0000-000000000005','2026 Select Hotel Credit',25000,'annual','hotel',false,false,false,false,'2026-12-31'),
('00000000-0000-0000-0000-000000000015','2026 Select Hotel Credit',25000,'annual','hotel',false,false,false,false,'2026-12-31');

-- ─── 9. Citi Strata Elite: replace credits ───────────────────
insert into credits (card_id, name, amount_cents, period_type, category, single_instance, is_primary_instance, pools_per_user, autopilot) values
('00000000-0000-0000-0000-000000000008','Annual Hotel Benefit',30000,'annual','hotel',false,false,false,false),
('00000000-0000-0000-0000-000000000018','Annual Hotel Benefit',30000,'annual','hotel',false,false,false,false),
('00000000-0000-0000-0000-000000000008','Annual Splurge Credit',20000,'annual','lifestyle',false,false,false,false),
('00000000-0000-0000-0000-000000000018','Annual Splurge Credit',20000,'annual','lifestyle',false,false,false,false),
('00000000-0000-0000-0000-000000000008','Blacklane Credit',10000,'semiannual','travel',false,false,false,false),
('00000000-0000-0000-0000-000000000018','Blacklane Credit',10000,'semiannual','travel',false,false,false,false),
('00000000-0000-0000-0000-000000000008','Global Entry / TSA PreCheck — $120 every 4 years',12000,'annual','travel',false,false,false,false),
('00000000-0000-0000-0000-000000000018','Global Entry / TSA PreCheck — $120 every 4 years',12000,'annual','travel',false,false,false,false);

-- ─── 10. Hilton Aspire: CLEAR+ (single_instance, not primary) ─
insert into credits (card_id, name, amount_cents, period_type, category, single_instance, is_primary_instance, pools_per_user, autopilot) values
('00000000-0000-0000-0000-000000000017','CLEAR+',20900,'annual','travel',true,false,false,false);

-- ─── 11. Marriott: 2026-only Airline Credit ───────────────────
insert into credits (card_id, name, amount_cents, period_type, category, single_instance, is_primary_instance, pools_per_user, autopilot, ends_permanently) values
('00000000-0000-0000-0000-000000000007','2026 Airline Credit',5000,'semiannual','travel',false,false,false,false,'2026-12-31');

-- ─── 12. Apple TV + Apple Music — pinned note (not a credit) ──
insert into pinned_notes (title, body, pinned, sort_order) values
('Apple TV + Apple Music (CSR Benefit)',
 'Both Katie and Stephen receive complimentary Apple TV+ and Apple Music through June 22, 2027 via Chase Sapphire Reserve. ~$288/yr combined value. Activate at apple.com/shop/buy-iphone/carrier-deals. Not a statement credit — no tracking needed.',
 false, 6);

-- ─── 13. Verification query — run after to check card totals ──
-- select c.display_name, c.owner,
--        count(cr.id) as credit_count,
--        sum(cr.amount_cents * case cr.period_type
--          when 'monthly' then 12 when 'quarterly' then 4
--          when 'semiannual' then 2 when 'annual' then 1
--          when 'cardmember_year' then 1 when 'ended' then 1 else 0 end) / 100 as annual_value_usd
-- from cards c
-- left join credits cr on cr.card_id = c.id and cr.active = true
--   and (not cr.single_instance or cr.is_primary_instance)
-- group by c.id, c.display_name, c.owner
-- order by c.owner, c.display_name;
