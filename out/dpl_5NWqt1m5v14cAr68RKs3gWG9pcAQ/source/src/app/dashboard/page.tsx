/**
 * Dashboard — server component, fetches data on every request.
 * Renders the full single-page shell; tab switching is client-side.
 */
import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'
import { computePeriodKey, computeCardmemberPeriodKey, PeriodType, PERIOD_MULTIPLIER } from '@/lib/period-key'
import DashboardClient from '@/components/DashboardClient'
import type { Card, Credit, UsageLog, Certificate, CertRedemption, Trip, PinnedNote } from '@/types/db'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const auth = await isAuthenticated()
  if (!auth) redirect('/login')

  const today = new Date()

  // ── Parallel data load ──────────────────────────────────────
  const [
    { data: cards },
    { data: rawCredits },
    { data: usageLogs },
    { data: certificates },
    { data: certRedemptions },
    { data: trips },
    { data: notes },
  ] = await Promise.all([
    db.from('cards').select('*').eq('active', true).order('owner').order('created_at'),
    db.from('credits').select('*, cards(anniversary_month,anniversary_day)')
      .eq('active', true),
    db.from('usage_log').select('*'),
    db.from('certificates').select('*').neq('status', 'expired').order('created_at'),
    db.from('cert_redemptions').select('*') as unknown as Promise<{ data: CertRedemption[] | null }>,
    db.from('trips').select('*').neq('status', 'cancelled').order('check_in'),
    db.from('pinned_notes').select('*').order('pinned', { ascending: false }).order('sort_order'),
  ])

  // ── Attach period state to each credit ──────────────────────
  const usageIndex = new Map<string, UsageLog>()
  for (const ul of usageLogs ?? []) {
    usageIndex.set(`${ul.credit_id}::${ul.period_key}`, ul)
  }

  const credits = (rawCredits ?? []).map((c) => {
    const cardAnn = c.cards as { anniversary_month: number | null; anniversary_day: number | null } | null
    const pType = c.period_type as PeriodType
    let periodKey: string

    if (pType === 'cardmember_year') {
      periodKey = (cardAnn?.anniversary_month && cardAnn?.anniversary_day)
        ? computeCardmemberPeriodKey(cardAnn.anniversary_month, cardAnn.anniversary_day, today)
        : `cmy-${today.getFullYear()}`
    } else {
      periodKey = computePeriodKey(pType, today)
    }

    const usage = usageIndex.get(`${c.id}::${periodKey}`)

    // Autopilot default: absence of row = used; row with amount=0 = explicit override (not used)
    // Non-autopilot default: absence of row = not used; row with amount>0 = used
    const used_cents = c.autopilot
      ? (usage === undefined ? c.amount_cents : usage.amount_used_cents)
      : (usage?.amount_used_cents ?? 0)

    const annualValue = c.amount_cents * PERIOD_MULTIPLIER[pType]
    const currentMonth = today.getMonth() + 1  // 1-12
    const currentYear  = today.getFullYear()

    // YTD used: for autopilot monthly credits, sum elapsed months minus explicit pauses.
    // For everything else, use the current-period used_cents.
    let ytd_used_cents: number
    if (c.autopilot && pType === 'monthly') {
      let count = 0
      for (let m = 1; m <= currentMonth; m++) {
        const pk = `${currentYear}-${String(m).padStart(2, '0')}`
        const ul = usageIndex.get(`${c.id}::${pk}`)
        if (ul === undefined || ul.amount_used_cents > 0) count++
        // amount_used_cents === 0 → explicit pause for that month, skip
      }
      ytd_used_cents = count * c.amount_cents
    } else {
      ytd_used_cents = used_cents
    }

    return {
      ...c,
      cards: undefined,         // drop join
      period_key:      periodKey,
      used_cents,
      remaining_cents: Math.max(0, c.amount_cents - used_cents),
      is_used:         used_cents >= c.amount_cents,
      annual_value:    annualValue,
      ytd_used_cents,
    }
  })

  return (
    <DashboardClient
      cards={cards ?? []}
      credits={credits}
      certificates={certificates ?? []}
      certRedemptions={certRedemptions ?? []}
      trips={trips ?? []}
      notes={notes ?? []}
      today={today.toISOString()}
    />
  )
}
