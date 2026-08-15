-- ═══════════════════════════════════════════════════════════
-- Seed data — Katie & Stephen's cards and credits
-- Run in Supabase SQL Editor after 001_initial_schema.sql
-- ═══════════════════════════════════════════════════════════

-- Card UUID key:
--  Katie:   k-plat-1 = …0001, k-plat-2 = …0002, k-plat-3 = …0003
--           k-gold-1 = …0004, k-csr-1  = …0005, k-sw-1   = …0006
--           k-mar-1  = …0007, k-citi-1 = …0008
--  Stephen: s-plat-1 = …0011, s-plat-2 = …0012, s-plat-3 = …0013
--           s-gold-1 = …0014, s-csr-1  = …0015, s-ihg-1  = …0016
--           s-hil-1  = …0017, s-citi-1 = …0018

-- ── CARDS ────────────────────────────────────────────────────

insert into cards (id, owner, network, issuer, display_name, last4, annual_fee_cents, fee_waived, anniversary_month, anniversary_day) values

-- Katie
('00000000-0000-0000-0000-000000000001', 'katie', 'amex', 'American Express', 'Amex Platinum ···1002', '1002', 69500, true, null, null),
('00000000-0000-0000-0000-000000000002', 'katie', 'amex', 'American Express', 'Amex Platinum #2', null, 69500, true, null, null),
('00000000-0000-0000-0000-000000000003', 'katie', 'amex', 'American Express', 'Amex Platinum #3', null, 69500, true, null, null),
('00000000-0000-0000-0000-000000000004', 'katie', 'amex', 'American Express', 'Amex Gold', null, 32500, true, null, null),
('00000000-0000-0000-0000-000000000005', 'katie', 'chase', 'Chase', 'Chase Sapphire Reserve', null, 55000, true, 12, 25),
('00000000-0000-0000-0000-000000000006', 'katie', 'southwest', 'Chase', 'Southwest Rapid Rewards Premier', null, 9900, true, null, null),
('00000000-0000-0000-0000-000000000007', 'katie', 'marriott', 'Chase', 'Marriott Bonvoy Boundless', null, 9500, true, null, null),
('00000000-0000-0000-0000-000000000008', 'katie', 'citi', 'Citi', 'Citi Strata Elite', null, 59500, true, null, null),

-- Stephen
('00000000-0000-0000-0000-000000000011', 'stephen', 'amex', 'American Express', 'Amex Platinum ···2005', '2005', 69500, true, null, null),
('00000000-0000-0000-0000-000000000012', 'stephen', 'amex', 'American Express', 'Amex Platinum #2', null, 69500, true, null, null),
('00000000-0000-0000-0000-000000000013', 'stephen', 'amex', 'American Express', 'Amex Platinum #3', null, 69500, true, null, null),
('00000000-0000-0000-0000-000000000014', 'stephen', 'amex', 'American Express', 'Amex Gold', null, 32500, true, null, null),
('00000000-0000-0000-0000-000000000015', 'stephen', 'chase', 'Chase', 'Chase Sapphire Reserve', null, 55000, true, 10, 12),
('00000000-0000-0000-0000-000000000016', 'stephen', 'ihg', 'Chase', 'IHG One Rewards Premier', null, 9900, true, null, null),
('00000000-0000-0000-0000-000000000017', 'stephen', 'hilton', 'Amex', 'Hilton Honors Aspire', null, 55000, true, 11, 2),
('00000000-0000-0000-0000-000000000018', 'stephen', 'citi', 'Citi', 'Citi Strata Elite', null, 59500, true, null, null);


-- ── CREDITS ──────────────────────────────────────────────────

insert into credits (card_id, name, amount_cents, period_type, category, single_instance, is_primary_instance, pools_per_user) values

-- ─── KATIE: Amex Platinum #1 (primary) ───────────────────────
('00000000-0000-0000-0000-000000000001', 'Uber Cash', 1500, 'monthly', 'lifestyle', false, false, true),
('00000000-0000-0000-0000-000000000001', 'Walmart+', 1295, 'monthly', 'lifestyle', true, true, false),
('00000000-0000-0000-0000-000000000001', 'Digital Entertainment', 2000, 'monthly', 'lifestyle', false, false, false),
('00000000-0000-0000-0000-000000000001', 'Plat Hotel Credit (FHR/THC)', 30000, 'semiannual', 'hotel', false, false, false),
('00000000-0000-0000-0000-000000000001', 'Saks Fifth Avenue', 5000, 'ended', 'lifestyle', false, false, false),
('00000000-0000-0000-0000-000000000001', 'CLEAR+', 18900, 'annual', 'travel', true, true, false),
('00000000-0000-0000-0000-000000000001', 'Airline Incidentals', 20000, 'annual', 'travel', false, false, false),
('00000000-0000-0000-0000-000000000001', 'Global Entry / TSA Pre✓', 10000, 'annual', 'travel', false, false, false),
('00000000-0000-0000-0000-000000000001', 'Equinox', 30000, 'annual', 'lifestyle', false, false, false),

-- ─── KATIE: Amex Platinum #2 ─────────────────────────────────
('00000000-0000-0000-0000-000000000002', 'Uber Cash', 1500, 'monthly', 'lifestyle', false, false, true),
('00000000-0000-0000-0000-000000000002', 'Digital Entertainment', 2000, 'monthly', 'lifestyle', false, false, false),
('00000000-0000-0000-0000-000000000002', 'Plat Hotel Credit (FHR/THC)', 30000, 'semiannual', 'hotel', false, false, false),
('00000000-0000-0000-0000-000000000002', 'Airline Incidentals', 20000, 'annual', 'travel', false, false, false),

-- ─── KATIE: Amex Platinum #3 ─────────────────────────────────
('00000000-0000-0000-0000-000000000003', 'Uber Cash', 1500, 'monthly', 'lifestyle', false, false, true),
('00000000-0000-0000-0000-000000000003', 'Digital Entertainment', 2000, 'monthly', 'lifestyle', false, false, false),
('00000000-0000-0000-0000-000000000003', 'Plat Hotel Credit (FHR/THC)', 30000, 'semiannual', 'hotel', false, false, false),
('00000000-0000-0000-0000-000000000003', 'Airline Incidentals', 20000, 'annual', 'travel', false, false, false),

-- ─── KATIE: Amex Gold ────────────────────────────────────────
('00000000-0000-0000-0000-000000000004', 'Dining Credit (Grubhub/Cheesecake etc)', 1000, 'monthly', 'dining', false, false, false),
('00000000-0000-0000-0000-000000000004', 'Uber Cash', 1000, 'monthly', 'lifestyle', false, false, true),
('00000000-0000-0000-0000-000000000004', 'Resy Credit', 10000, 'quarterly', 'dining', false, false, false),
('00000000-0000-0000-0000-000000000004', 'Dunkin'' Credit', 700, 'monthly', 'dining', false, false, false),

-- ─── KATIE: Chase Sapphire Reserve ───────────────────────────
('00000000-0000-0000-0000-000000000005', 'Travel Credit', 30000, 'cardmember_year', 'travel', false, false, false),
('00000000-0000-0000-0000-000000000005', 'DoorDash DashPass Credit', 500, 'monthly', 'dining', false, false, false),
('00000000-0000-0000-0000-000000000005', 'Lyft Pink Credit', 500, 'monthly', 'lifestyle', false, false, false),
('00000000-0000-0000-0000-000000000005', 'The Edit Hotel Credit', 25000, 'semiannual', 'hotel', false, false, false),
('00000000-0000-0000-0000-000000000005', 'OpenTable Dining Credit', 10000, 'quarterly', 'dining', false, false, false),
('00000000-0000-0000-0000-000000000005', 'Peloton Credit', 600, 'monthly', 'lifestyle', false, false, false),

-- ─── KATIE: Southwest Premier ────────────────────────────────
('00000000-0000-0000-0000-000000000006', 'Anniversary Points (6,000 pts)', 6000, 'annual', 'travel', false, false, false),

-- ─── KATIE: Marriott Bonvoy ──────────────────────────────────
('00000000-0000-0000-0000-000000000007', 'Free Night Award (≤35k pts)', 15000, 'annual', 'hotel', false, false, false),

-- ─── KATIE: Citi Strata Elite ────────────────────────────────
('00000000-0000-0000-0000-000000000008', 'Travel & Entertainment Credit', 25000, 'annual', 'travel', false, false, false),
('00000000-0000-0000-0000-000000000008', 'Lululemon Credit', 7500, 'quarterly', 'lifestyle', false, false, false),


-- ─── STEPHEN: Amex Platinum #1 (primary) ─────────────────────
('00000000-0000-0000-0000-000000000011', 'Uber Cash', 1500, 'monthly', 'lifestyle', false, false, true),
('00000000-0000-0000-0000-000000000011', 'Walmart+', 1295, 'monthly', 'lifestyle', true, true, false),
('00000000-0000-0000-0000-000000000011', 'Digital Entertainment', 2000, 'monthly', 'lifestyle', false, false, false),
('00000000-0000-0000-0000-000000000011', 'Plat Hotel Credit (FHR/THC)', 30000, 'semiannual', 'hotel', false, false, false),
('00000000-0000-0000-0000-000000000011', 'Saks Fifth Avenue', 5000, 'ended', 'lifestyle', false, false, false),
('00000000-0000-0000-0000-000000000011', 'CLEAR+', 18900, 'annual', 'travel', true, true, false),
('00000000-0000-0000-0000-000000000011', 'Airline Incidentals', 20000, 'annual', 'travel', false, false, false),
('00000000-0000-0000-0000-000000000011', 'Global Entry / TSA Pre✓', 10000, 'annual', 'travel', false, false, false),
('00000000-0000-0000-0000-000000000011', 'Equinox', 30000, 'annual', 'lifestyle', false, false, false),

-- ─── STEPHEN: Amex Platinum #2 ───────────────────────────────
('00000000-0000-0000-0000-000000000012', 'Uber Cash', 1500, 'monthly', 'lifestyle', false, false, true),
('00000000-0000-0000-0000-000000000012', 'Digital Entertainment', 2000, 'monthly', 'lifestyle', false, false, false),
('00000000-0000-0000-0000-000000000012', 'Plat Hotel Credit (FHR/THC)', 30000, 'semiannual', 'hotel', false, false, false),
('00000000-0000-0000-0000-000000000012', 'Airline Incidentals', 20000, 'annual', 'travel', false, false, false),

-- ─── STEPHEN: Amex Platinum #3 ───────────────────────────────
('00000000-0000-0000-0000-000000000013', 'Uber Cash', 1500, 'monthly', 'lifestyle', false, false, true),
('00000000-0000-0000-0000-000000000013', 'Digital Entertainment', 2000, 'monthly', 'lifestyle', false, false, false),
('00000000-0000-0000-0000-000000000013', 'Plat Hotel Credit (FHR/THC)', 30000, 'semiannual', 'hotel', false, false, false),
('00000000-0000-0000-0000-000000000013', 'Airline Incidentals', 20000, 'annual', 'travel', false, false, false),

-- ─── STEPHEN: Amex Gold ──────────────────────────────────────
('00000000-0000-0000-0000-000000000014', 'Dining Credit (Grubhub/Cheesecake etc)', 1000, 'monthly', 'dining', false, false, false),
('00000000-0000-0000-0000-000000000014', 'Uber Cash', 1000, 'monthly', 'lifestyle', false, false, true),
('00000000-0000-0000-0000-000000000014', 'Resy Credit', 10000, 'quarterly', 'dining', false, false, false),
('00000000-0000-0000-0000-000000000014', 'Dunkin'' Credit', 700, 'monthly', 'dining', false, false, false),

-- ─── STEPHEN: Chase Sapphire Reserve ─────────────────────────
('00000000-0000-0000-0000-000000000015', 'Travel Credit', 30000, 'cardmember_year', 'travel', false, false, false),
('00000000-0000-0000-0000-000000000015', 'DoorDash DashPass Credit', 500, 'monthly', 'dining', false, false, false),
('00000000-0000-0000-0000-000000000015', 'Lyft Pink Credit', 500, 'monthly', 'lifestyle', false, false, false),
('00000000-0000-0000-0000-000000000015', 'The Edit Hotel Credit', 25000, 'semiannual', 'hotel', false, false, false),
('00000000-0000-0000-0000-000000000015', 'OpenTable Dining Credit', 10000, 'quarterly', 'dining', false, false, false),
('00000000-0000-0000-0000-000000000015', 'Peloton Credit', 600, 'monthly', 'lifestyle', false, false, false),

-- ─── STEPHEN: IHG One Rewards Premier ────────────────────────
('00000000-0000-0000-0000-000000000016', 'IHG Free Night Award (Anniversary)', 15000, 'annual', 'hotel', false, false, false),
('00000000-0000-0000-0000-000000000016', 'United TravelBank Credit', 5000, 'annual', 'travel', false, false, false),
('00000000-0000-0000-0000-000000000016', 'Global Entry / TSA Pre✓', 10000, 'annual', 'travel', false, false, false),

-- ─── STEPHEN: Hilton Honors Aspire ───────────────────────────
('00000000-0000-0000-0000-000000000017', 'Hilton Resort Credit', 20000, 'semiannual', 'hotel', false, false, false),
('00000000-0000-0000-0000-000000000017', 'Hilton Airline Incidentals', 5000, 'quarterly', 'travel', false, false, false),
('00000000-0000-0000-0000-000000000017', 'Free Weekend Night Award', 15000, 'annual', 'hotel', false, false, false),

-- ─── STEPHEN: Citi Strata Elite ──────────────────────────────
('00000000-0000-0000-0000-000000000018', 'Travel & Entertainment Credit', 25000, 'annual', 'travel', false, false, false),
('00000000-0000-0000-0000-000000000018', 'Lululemon Credit', 7500, 'quarterly', 'lifestyle', false, false, false);


-- ── CERTIFICATES ─────────────────────────────────────────────

insert into certificates (card_id, name, status, value_low_cents, value_high_cents, expires_at, notes) values
('00000000-0000-0000-0000-000000000007', 'Marriott Free Night Award (≤35k pts)', 'active', 15000, 25000, '2027-01-31', 'Issued annually on anniversary'),
('00000000-0000-0000-0000-000000000016', 'IHG Free Night Award #1', 'committed', 10000, 30000, '2026-12-31', 'Committed to DFW trip Jun 20'),
('00000000-0000-0000-0000-000000000016', 'IHG Free Night Award #2', 'committed', 10000, 30000, '2026-12-31', 'Committed to Austin trip Jul'),
('00000000-0000-0000-0000-000000000016', 'IHG Bonus Free Night #1', 'committed', 10000, 30000, '2026-07-31', 'Expires July 2026 — use soon'),
('00000000-0000-0000-0000-000000000016', 'IHG Bonus Free Night #2', 'committed', 10000, 30000, '2026-07-31', 'Expires July 2026 — use soon'),
('00000000-0000-0000-0000-000000000016', 'IHG Bonus Free Night #3', 'committed', 10000, 30000, '2026-07-31', 'Expires July 2026 — use soon'),
('00000000-0000-0000-0000-000000000017', 'Hilton Free Weekend Night', 'active', 20000, 60000, '2027-01-31', 'Issued annually on anniversary');


-- ── TRIPS ────────────────────────────────────────────────────

insert into trips (title, destination, check_in, check_out, nights, travelers, status, target_cost_cents, notes) values
('Dallas / Fort Worth', 'Dallas, TX', '2026-06-20', '2026-06-22', 2, 'Katie & Stephen', 'booked', 0, 'IHG certs committed. Research FHR/THC options for upgrade.'),
('Austin', 'Austin, TX', '2026-07-01', '2026-07-04', 3, 'Katie & Stephen', 'planning', 0, 'IHG cert committed. Q2 credits reset Jul 1 — good timing.'),
('Birthday Trip — September', 'TBD', '2026-09-01', '2026-09-05', 4, 'Katie & Stephen', 'planning', 0, 'Birthday trip — destination TBD');


-- ── PINNED NOTES ─────────────────────────────────────────────

insert into pinned_notes (title, body, pinned, sort_order) values
('Saks Fifth Avenue — In-Store Only', 'Saks credit works in-store only (not online). $50 Jan–Jun, $50 Jul–Dec. Credit ends permanently June 30, 2026 — use before then. Visit a Saks store and charge to your Amex Platinum.', true, 1),
('IHG Bonus Nights — URGENT', 'Stephen has 5 IHG bonus free nights expiring July 2026. 3 committed to DFW (Jun 20) and Austin (Jul). Remaining 2 need to be used or forfeited before July 31.', true, 2),
('FHR Booking Tips', 'Book Fine Hotels + Resorts through AmexTravel.com only — not the hotel direct. Benefits ($100 credit, breakfast, upgrade) only apply when booked through Amex Travel. Rate must be the Amex rate, not a lower direct rate.', false, 3),
('Edit by Chase — 2-Night Minimum', 'The Edit by Chase requires a 2-night minimum stay. $250 credit per stay (not per night). Book through Chase Travel portal. Available on CSR — both Katie and Stephen have this credit.', false, 4),
('Uber Cash Pooling', 'Uber Cash from multiple Platinum cards pools into one Uber account per person. Katie gets up to $45/mo (3 Plats) + $10 Gold = $55/mo. Stephen same. Set up auto-add in the Uber app.', false, 5);
