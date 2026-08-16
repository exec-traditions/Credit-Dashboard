import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { computePeriodKey, computeCardmemberPeriodKey, PeriodType } from '@/lib/period-key'

// Fail-closed: CREDITS_API_KEY must be set and must match.
// To call this route, pass the key as: x-api-key: <value>
// Set CREDITS_API_KEY in Vercel env vars before deploying.
const API_KEY = process.env.CREDITS_API_KEY

export async function GET(req: NextRequest) {
  if (!API_KEY) {
    console.error('[/api/credits] CREDITS_API_KEY env var is not set — refusing all requests')
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const provided = req.headers.get('x-api-key')
  if (provided !== API_KEY) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    const [cardsRes, creditsRes, usageRes] = await Promise.all([
      db.from('cards').select('id, owner, display_name, last4, active').eq('active', true),
      // Exclude autopilot credits — auto-consumed each period, never manually actionable.
      // Join cards for anniversary dates needed by cardmember_year period key.
      db.from('credits')
        .select('id, card_id, name, amount_cents, period_type, category, active, autopilot, cards(anniversary_month, anniversary_day)')
        .eq('active', true)
        .eq('autopilot', false),
      db.from('usage_log').select('credit_id, period_key, amount_used_cents'),
    ])

    if (cardsRes.error) throw cardsRes.error
    if (creditsRes.error) throw creditsRes.error
    if (usageRes.error) throw usageRes.error

    const cards = cardsRes.data ?? []
    const credits = creditsRes.data ?? []
    const usageLogs = usageRes.data ?? []

    const usageMap: Record<string, Record<string, number>> = {}
    for (const row of usageLogs) {
      if (!usageMap[row.credit_id]) usageMap[row.credit_id] = {}
      usageMap[row.credit_id][row.period_key] =
        (usageMap[row.credit_id][row.period_key] ?? 0) + row.amount_used_cents
    }

    const cardMap = Object.fromEntries(cards.map(c => [c.id, c]))
    const data: Record<string, Record<string, { card: { display_name: string; last4: string | null }; credits: object[] }>> = {}

    for (const credit of credits) {
      const card = cardMap[credit.card_id]
      if (!card) continue

      const pType = credit.period_type as PeriodType
      let periodKey: string
      if (pType === 'cardmember_year') {
        // Use anniversary-aware computation — falls back to calendar year if dates missing
        const ann = (credit as unknown as { cards: { anniversary_month: number | null; anniversary_day: number | null } | null }).cards
        periodKey = (ann?.anniversary_month && ann?.anniversary_day)
          ? computeCardmemberPeriodKey(ann.anniversary_month, ann.anniversary_day, now)
          : `cmy-${now.getFullYear()}`
      } else if (pType === 'ended') {
        periodKey = 'ended'
      } else {
        periodKey = computePeriodKey(pType, now)
      }

      const owner = card.owner
      const cardKey = card.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
      if (!data[owner]) data[owner] = {}
      if (!data[owner][cardKey]) {
        data[owner][cardKey] = { card: { display_name: card.display_name, last4: card.last4 }, credits: [] }
      }

      const usedCents = usageMap[credit.id]?.[periodKey] ?? 0
      const remainingCents = Math.max(0, credit.amount_cents - usedCents)
      data[owner][cardKey].credits.push({
        name: credit.name,
        category: credit.category,
        period: credit.period_type,
        period_key: periodKey,
        total: credit.amount_cents / 100,
        used: usedCents / 100,
        remaining: remainingCents / 100,
        fully_used: remainingCents === 0,
      })
    }

    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const quarter = Math.ceil(month / 3)
    const half = month <= 6 ? 'H1' : 'H2'

    return NextResponse.json(
      { ok: true, as_of: now.toISOString(), year, half, quarter, data },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[/api/credits] error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load credits' }, { status: 500 })
  }
}
