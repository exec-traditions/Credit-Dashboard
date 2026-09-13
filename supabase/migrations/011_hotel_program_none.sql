-- Allow a hotel_bookings row to represent a stay booked directly (not through
-- Amex FHR/THC, Chase "The Edit", or Citi Strata) — e.g. a Marriott Bonvoy
-- cash/points booking like Postcard Cabins Brazos Valley. These rows always
-- have credit_id/card_id = null and credits_used_cents = 0, so they never
-- enter the credit-usage math in hotel-credits.ts or the Overview tiles,
-- which read from the `credits` table, not from hotel_bookings.program.
alter table hotel_bookings drop constraint if exists hotel_bookings_program_check;
alter table hotel_bookings add constraint hotel_bookings_program_check
  check (program = any (array['fhr','thc','edit','citi_travel','none']));
