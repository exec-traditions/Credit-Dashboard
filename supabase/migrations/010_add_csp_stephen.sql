-- ═══════════════════════════════════════════════════════════
-- Migration 010 — Add Stephen's new Chase Sapphire Preferred ···3865
-- Source-verified against chase.com, Aug 2026 (post June 2026 refresh)
-- Fee waived under MLA (matches all other personal cards).
-- Apple TV + DashPass free membership perks skipped — overlap
-- with Chase Sapphire Reserve, which already carries both.
-- Global Entry/TSA PreCheck and DoorDash DashPass credit added
-- following the same pattern used for every other card.
-- ═══════════════════════════════════════════════════════════

with new_card as (
  insert into cards (owner, network, issuer, display_name, last4, annual_fee_cents, fee_waived, anniversary_month, anniversary_day)
  values ('stephen', 'chase', 'Chase', 'Chase Sapphire Preferred ···3865', '3865', 0, true, 8, 31)
  returning id
)
insert into credits (card_id, name, amount_cents, period_type, category, single_instance, is_primary_instance, pools_per_user, autopilot)
select id, 'Chase Travel Hotel Credit', 10000, 'annual', 'travel', false, false, false, false from new_card
union all
select id, 'DoorDash DashPass Credit', 1000, 'monthly', 'dining', false, false, false, true from new_card
union all
select id, 'Global Entry / TSA PreCheck — $120 every 4 years', 12000, 'annual', 'travel', false, false, false, false from new_card;
