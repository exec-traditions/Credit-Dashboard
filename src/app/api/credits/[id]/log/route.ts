import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'
import { computePeriodKey, computeCardmemberPeriodKey, PeriodType } from '@/lib/period-key'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  let body: { amount_cents?: number; notes?: string } = {}
  try { body = await req.json() } catch { /* empty body is fine */ }

  // Load credit + card anniversary
  type CreditRow = {
    id: string; amount_cents: number; period_type: string
    ends_permanently: string | null
    cards: { anniversary_month: number | null; anniversary_day: number | null } | null
  }
  const { data: credit, error: cErr } = await db
    .from('credits')
    .select('id, amount_cents, period_type, ends_permanently, cards(anniversary_month, anniversary_day)')
    .eq('id', id)
    .eq('active', true)
    .single() as unknown as { data: CreditRow | null; error: unknown }

  if (cErr || !credit) {
    return NextResponse.json({ ok: false, error: 'Credit not found' }, { status: 404 })
  }

  const today = new Date()
  const pType = credit.period_type as PeriodType
  let periodKey: string

  // A discontinued benefit can't be redeemed against, whatever its period_type.
  if (credit.ends_permanently && today > new Date(credit.ends_permanently + 'T23:59:59')) {
    return NextResponse.json(
      { ok: false, error: 'This credit has ended permanently' },
      { status: 422 }
    )
  }

  if (pType === 'ended') {
    periodKey = 'ended'
  } else if (pType === 'cardmember_year') {
    const card = credit.cards as { anniversary_month: number | null; anniversary_day: number | null } | null
    periodKey = (card?.anniversary_month && card?.anniversary_day)
      ? computeCardmemberPeriodKey(card.anniversary_month, card.anniversary_day, today)
      : `cmy-${today.getFullYear()}`
  } else {
    periodKey = computePeriodKey(pType, today)
  }

  const amount_used_cents = body.amount_cents ?? credit.amount_cents

  // Fetch existing row to preserve notes and take max amount
  const { data: existing } = await db
    .from('usage_log')
    .select('id, amount_used_cents, notes')
    .eq('credit_id', id)
    .eq('period_key', periodKey)
    .maybeSingle() as unknown as { data: { id: string; amount_used_cents: number; notes: string | null } | null }

  const finalAmount = existing
    ? Math.max(existing.amount_used_cents, amount_used_cents)
    : amount_used_cents

  // Preserve existing notes if the caller didn't supply new ones
  const finalNotes = body.notes !== undefined ? body.notes : (existing?.notes ?? null)

  const { data: upserted, error: uErr } = await db
    .from('usage_log')
    .upsert({
      credit_id:         id,
      period_key:        periodKey,
      amount_used_cents: finalAmount,
      notes:             finalNotes,
      logged_at:         new Date().toISOString(),
    }, { onConflict: 'credit_id,period_key' })
    .select()
    .single()

  if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    usage_log_id: upserted.id,
    period_key: periodKey,
    used_cents: finalAmount,
  })
}
