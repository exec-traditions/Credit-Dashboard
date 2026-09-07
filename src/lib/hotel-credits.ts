/**
 * Shared logic for the Hotel Tracker tab — maps a booking's program to the
 * household hotel credit it draws on, and keeps usage_log in sync with the
 * sum of hotel_bookings so the Credits tab always reflects reality.
 *
 * This is the "vice versa" link between the Hotel Tracker and the rest of
 * the dashboard: book a stay here -> the card's credit balance updates
 * everywhere else automatically, because it's the same usage_log row.
 */
import { db } from '@/lib/supabase'
import { computePeriodKey, computeCardmemberPeriodKey, PeriodType } from '@/lib/period-key'

export type Program = 'fhr' | 'thc' | 'edit' | 'citi_travel'

/** Which credit (by exact name, as seeded in the `credits` table) each program draws on. */
export const PROGRAM_CREDIT_NAME: Record<Program, string> = {
  fhr:          'Plat Hotel Credit (FHR/THC)',
  thc:          'Plat Hotel Credit (FHR/THC)',
  edit:         'The Edit Hotel Credit',
  citi_travel:  'Annual Hotel Benefit',
}

/** How much of the card's credit one stay on this program consumes.
 *  Amex/Citi: the whole per-period statement credit goes to one stay.
 *  Edit: the $500/year credit is really two separate $250 bookings. */
export const PROGRAM_INCREMENT_CENTS: Record<Program, number> = {
  fhr: 30000, thc: 30000, edit: 25000, citi_travel: 30000,
}

export const PROGRAM_MIN_NIGHTS: Record<Program, number> = {
  fhr: 1, thc: 2, edit: 2, citi_travel: 2,
}

type CreditRow = {
  id: string; amount_cents: number; period_type: string; active: boolean
  card_id: string
  cards: { anniversary_month: number | null; anniversary_day: number | null } | null
}

/** Find the hotel credit on `cardId` that matches `program`, or null if the card doesn't carry one. */
export async function findCreditForCard(cardId: string, program: Program) {
  const { data } = await db
    .from('credits')
    .select('id, amount_cents, period_type, active, card_id, cards(anniversary_month, anniversary_day)')
    .eq('card_id', cardId)
    .eq('name', PROGRAM_CREDIT_NAME[program])
    .eq('active', true)
    .maybeSingle() as unknown as { data: CreditRow | null }
  return data
}

/** Compute the current period_key for a credit, same logic used dashboard-wide. */
export function periodKeyFor(credit: CreditRow, asOf: Date): string {
  const pType = credit.period_type as PeriodType
  if (pType === 'cardmember_year') {
    const ann = credit.cards
    return (ann?.anniversary_month && ann?.anniversary_day)
      ? computeCardmemberPeriodKey(ann.anniversary_month, ann.anniversary_day, asOf)
      : `cmy-${asOf.getFullYear()}`
  }
  return computePeriodKey(pType, asOf)
}

/**
 * Recompute usage_log for (credit_id, period_key) from the sum of every
 * booked hotel_bookings row against it. This is a full recompute (not an
 * increment), so it stays correct through book / unbook / edit / delete.
 * Deletes the usage_log row entirely when the sum is 0, so an unbooked
 * credit doesn't show a stray "used" row.
 */
export async function syncCreditUsage(creditId: string, periodKey: string) {
  const { data: rows } = await db
    .from('hotel_bookings')
    .select('credits_used_cents')
    .eq('credit_id', creditId)
    .eq('period_key', periodKey)
    .eq('booked', true)

  const sum = (rows ?? []).reduce((acc, r) => acc + (r.credits_used_cents ?? 0), 0)

  if (sum <= 0) {
    await db.from('usage_log').delete().eq('credit_id', creditId).eq('period_key', periodKey)
    return 0
  }

  await db.from('usage_log').upsert({
    credit_id: creditId,
    period_key: periodKey,
    amount_used_cents: sum,
    logged_at: new Date().toISOString(),
  }, { onConflict: 'credit_id,period_key' })

  return sum
}
