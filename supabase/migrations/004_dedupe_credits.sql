-- ═══════════════════════════════════════════════════════════
-- Migration 004 — Deduplicate credits + unique constraint
-- Fixes duplicate rows from 003 being run twice.
-- Keeps the row with the latest created_at per (card_id, name).
-- usage_log rows cascade-delete with their credit (already set).
-- ═══════════════════════════════════════════════════════════

-- Step 1: delete older duplicate rows
delete from credits
where id not in (
  select distinct on (card_id, name) id
  from credits
  order by card_id, name, created_at desc
);

-- Step 2: add unique constraint to prevent future duplicates
alter table credits
  add constraint credits_card_id_name_unique unique (card_id, name);

-- Step 3: verify — should return zero rows
-- select card_id, name, count(*)
-- from credits
-- group by card_id, name
-- having count(*) > 1;
