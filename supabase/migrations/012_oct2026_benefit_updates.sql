-- Oct 2026 benefit audit (applied live 2026-10-24)
-- 1) Amex Platinum hotel credit renamed to Lodging Credit (now includes Airbnb Luxe)
update credits set name = 'Plat Lodging Credit (FHR/THC/Luxe)'
 where name = 'Plat Hotel Credit (FHR/THC)';

-- 2) CLEAR+ credit raised $209 -> $219 (CLEAR price increase Jul 1, 2026) on Platinum + Aspire
update credits set amount_cents = 21900 where name = 'CLEAR+' and amount_cents = 20900;

-- 3) New Airbnb Experiences credit: up to $250/calendar year per Platinum card,
--    unlocked by a prepaid Airbnb Luxe booking via Amex Travel
insert into credits (card_id, name, amount_cents, period_type, category, single_instance, is_primary_instance, pools_per_user, autopilot, active)
select ca.id, 'Airbnb Experiences Credit (unlock w/ Luxe stay)', 25000, 'annual', 'travel', false, false, false, false, true
  from cards ca
 where ca.active and ca.display_name like 'Amex Platinum%'
   and not exists (select 1 from credits c where c.card_id = ca.id and c.name like 'Airbnb Experiences%');
