import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'
import { computePeriodKey, computeCardmemberPeriodKey, PeriodType } from '@/lib/period-key'

export async function GET(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()

  // Load all active credits with their card anniversary dates
  const { data: credits, error: cErr } = await db
    .from('credits')
    .select(`
      id, card_id, name, period_type, amount_cents, ends_permanently, category,
      single_instance, is_primary_instance, pools_per_user,
      cards ( anniversary_month, anniversary_day )
    `)
    .eq('active', true)

  if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 })

  // Compute current period key for each credit
  const creditPeriods = (credits ?? []).map(c => {
    let periodKey: string
    const pType = c.period_type as PeriodType
    if (pType === 'cardmember_year') {
      const card = c.cards as { anniversary_month: number | null; anniversary_day: number | null } | null
      const mm = card?.anniversary_month
      const dd = card?.anniversary_day
      if (mm && dd) {
        periodKey = computeCardmemberPeriodKey(mm, dd, today)
      } else {
        periodKey = `cmy-${today.getFullYear()}`
      }
    } else {
      periodKey = computePeriodKey(pType, today)
    }
    return { credit_id: c.id, period_key: periodKey, credit: c }
  })

  // Batch-load matching usage_log rows
  const creditIds = creditPeriods.map(cp => cp.credit_id)
  const { data: usageLogs, error: uErr } = await db
    .from('usage_log')
    .select('credit_id, period_key, amount_used_cents')
    .in('credit_id', creditIds)

  if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 })

  // Index usage by credit_id+period_key
  const usageIndex = new Map<string, number>()
  for (const row of usageLogs ?? []) {
    usageIndex.set(`${row.credit_id}::${row.period_key}`, row.amount_used_cents)
  }

  // Merge
  const result = creditPeriods.map(({ credit_id, period_key, credit }) => {
    const amount_cents = credit.amount_cents
    const used_cents = usageIndex.get(`${credit_id}::${period_key}`) ?? 0
    const remaining_cents = Math.max(0, amount_cents - used_cents)
    return {
      credit_id,
      card_id:          credit.card_id,
      name:             credit.name,
      period_type:      credit.period_type,
      period_key,
      amount_cents,
      used_cents,
      remaining_cents,
      is_used:          used_cents >= amount_cents,
      ends_permanently: credit.ends_permanently ?? null,
    }
  })

  return NextResponse.json({
    computed_at: new Date().toISOString(),
    credits: result,
  })
}
