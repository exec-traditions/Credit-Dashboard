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

  type CreditRow = {
    id: string; period_type: string
    cards: { anniversary_month: number | null; anniversary_day: number | null } | null
  }
  const { data: credit, error: cErr } = await db
    .from('credits')
    .select('id, period_type, cards(anniversary_month, anniversary_day)')
    .eq('id', id)
    .eq('active', true)
    .single() as unknown as { data: CreditRow | null; error: unknown }

  if (cErr || !credit) {
    return NextResponse.json({ ok: false, error: 'Credit not found' }, { status: 404 })
  }

  const today = new Date()
  const pType = credit.period_type as PeriodType
  let periodKey: string

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

  // DELETE the usage_log row — absence means unused
  const { error: dErr } = await db
    .from('usage_log')
    .delete()
    .eq('credit_id', id)
    .eq('period_key', periodKey)

  if (dErr) return NextResponse.json({ ok: false, error: dErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, period_key: periodKey })
}
