import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'
import { findCreditForCard, periodKeyFor, syncCreditUsage, PROGRAM_INCREMENT_CENTS, Program } from '@/lib/hotel-credits'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = params
  const body = await req.json()

  const { data: existing, error: fErr } = await db.from('hotel_bookings').select('*').eq('id', id).single()
  if (fErr || !existing) return NextResponse.json({ ok: false, error: 'Booking not found' }, { status: 404 })

  // ── Book with a specific card ──────────────────────────────────
  if (body.book === true) {
    const cardId = body.card_id as string | undefined
    if (!cardId) return NextResponse.json({ ok: false, error: 'card_id is required to book' }, { status: 400 })

    const program = existing.program as Program
    const credit = await findCreditForCard(cardId, program)
    if (!credit) {
      return NextResponse.json({ ok: false, error: `That card doesn't carry a ${program.toUpperCase()} hotel credit` }, { status: 422 })
    }

    const today = new Date()
    const periodKey = periodKeyFor(credit, today)
    const increment = PROGRAM_INCREMENT_CENTS[program]

    // Guard: don't let this booking push usage past the credit's cap for the period
    // (excluding this booking's own prior contribution, in case it's already booked elsewhere).
    const { data: siblings } = await db.from('hotel_bookings')
      .select('id, credits_used_cents')
      .eq('credit_id', credit.id).eq('period_key', periodKey).eq('booked', true).neq('id', id)
    const alreadyUsed = (siblings ?? []).reduce((a, r) => a + (r.credits_used_cents ?? 0), 0)
    if (alreadyUsed + increment > credit.amount_cents) {
      return NextResponse.json({
        ok: false,
        error: `Not enough ${program.toUpperCase()} credit left on this card for ${periodKey} — $${(alreadyUsed / 100).toFixed(0)} of $${(credit.amount_cents / 100).toFixed(0)} already used`,
      }, { status: 422 })
    }

    // If this booking was previously booked against a different credit/period, sync that one down first.
    const prevCreditId = existing.credit_id as string | null
    const prevPeriodKey = existing.period_key as string | null

    const { data: updated, error: uErr } = await db.from('hotel_bookings').update({
      card_id: cardId, credit_id: credit.id, period_key: periodKey,
      credits_used_cents: increment, booked: true, status: 'booked',
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single()
    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 })

    await syncCreditUsage(credit.id, periodKey)
    if (prevCreditId && prevPeriodKey && (prevCreditId !== credit.id || prevPeriodKey !== periodKey)) {
      await syncCreditUsage(prevCreditId, prevPeriodKey)
    }

    return NextResponse.json({ ok: true, booking: updated })
  }

  // ── Unbook ──────────────────────────────────────────────────────
  if (body.book === false) {
    const prevCreditId = existing.credit_id as string | null
    const prevPeriodKey = existing.period_key as string | null

    const { data: updated, error: uErr } = await db.from('hotel_bookings').update({
      card_id: null, credit_id: null, period_key: null, credits_used_cents: 0,
      booked: false, status: 'option', updated_at: new Date().toISOString(),
    }).eq('id', id).select().single()
    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 })

    if (prevCreditId && prevPeriodKey) await syncCreditUsage(prevCreditId, prevPeriodKey)
    return NextResponse.json({ ok: true, booking: updated })
  }

  // ── Plain field edit (no card/credit change) ────────────────────
  const editable = ['city', 'hotel_name', 'program', 'stay_dates', 'check_in', 'check_out',
    'nights', 'stars', 'distance', 'total_cents', 'property_credit_cents', 'breakfast',
    'parking', 'resort_fee', 'spend', 'offer', 'notes', 'status', 'weekend_id']
  const patch: Record<string, unknown> = {}
  for (const k of editable) if (k in body) patch[k] = body[k]
  patch.updated_at = new Date().toISOString()

  const { data: updated, error: uErr } = await db.from('hotel_bookings').update(patch).eq('id', id).select().single()
  if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 })
  return NextResponse.json({ ok: true, booking: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = params
  const { data: existing } = await db.from('hotel_bookings').select('credit_id, period_key').eq('id', id).single()

  const { error } = await db.from('hotel_bookings').delete().eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  if (existing?.credit_id && existing?.period_key) {
    await syncCreditUsage(existing.credit_id, existing.period_key)
  }
  return NextResponse.json({ ok: true })
}
