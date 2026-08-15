'use client'

/**
 * TodayPage — the v4 landing view.
 *
 *  1. Utilization scoreboard: annual value, captured YTD, per-owner split
 *  2. Card ROI: captured value vs annual fee per card
 *  3. Action queue: every unused, non-autopilot credit in the current
 *     period, ranked by deadline → value. One-tap mark-used with undo.
 */

import { useMemo, useState } from 'react'
import type { Card } from '@/types/db'
import type { EnrichedCredit } from '@/types/enriched'
import { periodEnd, daysLeft, urgency, Urgency } from '@/lib/deadlines'
import type { PeriodType } from '@/lib/period-key'

const fmt = (cents: number) => '$' + Math.round(cents / 100).toLocaleString()
const fmtAmount = (cents: number) => {
  const d = cents / 100
  return d % 1 === 0 ? '$' + d.toLocaleString() : '$' + d.toFixed(2)
}

const URGENCY_STYLE: Record<Urgency, { bg: string; fg: string; label: string }> = {
  critical: { bg: '#fee2e2', fg: '#991b1b', label: 'd left' },
  soon:     { bg: '#fef3c7', fg: '#92400e', label: 'd left' },
  later:    { bg: '#f1f5f9', fg: '#475569', label: 'd left' },
}

type QueueItem = {
  credit: EnrichedCredit
  card: Card
  end: Date
  days: number
  urg: Urgency
}

// Credits hidden from the Today tab entirely (still visible on the Credits tab).
// Matched by exact name.
const HIDDEN_ON_TODAY = new Set<string>([
  'Global Entry / TSA PreCheck — $120 every 4 years',
  'CLEAR+',
  'Blacklane Credit',
])

export default function TodayPage({ cards, credits, onToggle, today: todayStr }: {
  cards: Card[]
  credits: EnrichedCredit[]
  onToggle: (id: string, used: boolean) => void
  today: string
}) {
  const today = useMemo(() => new Date(todayStr), [todayStr])
  const cardMap = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards])
  const [justUsed, setJustUsed] = useState<Set<string>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const toggleGroup = (name: string) =>
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })

  // ── Scoreboard math ─────────────────────────────────────────
  const counted = credits.filter(c => !c.single_instance || c.is_primary_instance)
  const totalAnnual = counted.reduce((s, c) => s + c.annual_value, 0)
  const capturedYtd = counted.reduce((s, c) => s + c.ytd_used_cents, 0)
  const pct = totalAnnual > 0 ? Math.round(capturedYtd / totalAnnual * 100) : 0

  const ownerStats = (owner: string) => {
    const ownerCards = new Set(cards.filter(c => c.owner === owner).map(c => c.id))
    const cs = counted.filter(c => ownerCards.has(c.card_id))
    const total = cs.reduce((s, c) => s + c.annual_value, 0)
    const used = cs.reduce((s, c) => s + c.ytd_used_cents, 0)
    return { total, used, pct: total > 0 ? Math.round(used / total * 100) : 0 }
  }
  const katie = ownerStats('katie')
  const stephen = ownerStats('stephen')

  // ── Card ROI ────────────────────────────────────────────────
  const cardRoi = useMemo(() => {
    return cards.map(card => {
      const cs = counted.filter(c => c.card_id === card.id)
      const captured = cs.reduce((s, c) => s + c.ytd_used_cents, 0)
      const potential = cs.reduce((s, c) => s + c.annual_value, 0)
      const fee = card.annual_fee_cents
      return { card, captured, potential, fee, net: captured - fee }
    }).sort((a, b) => b.fee - a.fee)
  }, [cards, counted])

  // ── Action queue ────────────────────────────────────────────
  const queue: QueueItem[] = useMemo(() => {
    const items: QueueItem[] = []
    for (const c of credits) {
      if (c.autopilot) continue
      if (HIDDEN_ON_TODAY.has(c.name)) continue
      if (c.is_used && !justUsed.has(c.id)) continue
      if (c.single_instance && !c.is_primary_instance) continue
      const card = cardMap.get(c.card_id)
      if (!card) continue
      // Skip permanently-ended credits whose end date has passed
      if (c.ends_permanently && today > new Date(c.ends_permanently + 'T23:59:59')) continue
      const end = periodEnd(c.period_type as PeriodType, today, {
        anniversaryMonth: card.anniversary_month,
        anniversaryDay: card.anniversary_day,
        endsPermanently: c.ends_permanently,
      })
      if (!end) continue
      const d = daysLeft(end, today)
      items.push({ credit: c, card, end, days: d, urg: urgency(d) })
    }
    // Rank: deadline first, then value at stake descending
    items.sort((a, b) => a.days - b.days || b.credit.remaining_cents - a.credit.remaining_cents)
    return items
  }, [credits, cardMap, today, justUsed])

  const atStake = queue
    .filter(q => !q.credit.is_used)
    .reduce((s, q) => s + q.credit.remaining_cents, 0)
  const critical = queue.filter(q => q.urg === 'critical' && !q.credit.is_used)

  // ── Group same-name queue items (e.g. "Plat Hotel Credit (FHR/THC)" x 6) ──
  // Order preserved from `queue` (already sorted by deadline → value); each
  // group surfaces at the position of its first (soonest) instance.
  type Group = { name: string; items: QueueItem[] }
  const groupedQueue: Group[] = useMemo(() => {
    const order: string[] = []
    const map = new Map<string, QueueItem[]>()
    for (const item of queue) {
      const key = item.credit.name
      if (!map.has(key)) { map.set(key, []); order.push(key) }
      map.get(key)!.push(item)
    }
    return order.map(name => ({ name, items: map.get(name)! }))
  }, [queue])

  const handleUse = (id: string) => {
    setJustUsed(prev => new Set(prev).add(id))
    onToggle(id, true)
  }
  const handleUndo = (id: string) => {
    setJustUsed(prev => { const n = new Set(prev); n.delete(id); return n })
    onToggle(id, false)
  }

  const dateFmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // Renders one instance row (used both for single-item groups and for
  // each item nested inside an expanded multi-instance group).
  const ItemRow = ({ credit, card, end, days, urg, nested }: QueueItem & { nested?: boolean }) => {
    const st = URGENCY_STYLE[urg]
    const used = credit.is_used
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: nested ? '10px 16px 10px 40px' : '12px 16px',
        background: used ? 'rgba(22,101,52,.05)' : (nested ? '#fbf9f5' : '#fff'),
        borderTop: '1px solid var(--sand)',
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
          background: used ? '#dcfce7' : st.bg, color: used ? '#166534' : st.fg,
          flexShrink: 0, minWidth: 64, textAlign: 'center',
        }}>
          {used ? '✓ Used' : days === 0 ? 'Today!' : `${days}${st.label}`}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontWeight: 500,
            textDecoration: used ? 'line-through' : 'none',
            color: used ? 'var(--bark)' : 'var(--ink)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {credit.name}
          </p>
          <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 1 }}>
            {card.owner === 'katie' ? 'Katie' : 'Stephen'} · {card.display_name} · resets {dateFmt(end)}
          </p>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
          {fmtAmount(credit.remaining_cents > 0 ? credit.remaining_cents : credit.amount_cents)}
        </span>
        {used ? (
          <button onClick={() => handleUndo(credit.id)} style={{
            fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--sand)', color: 'var(--bark)', flexShrink: 0,
          }}>Undo</button>
        ) : (
          <button onClick={() => handleUse(credit.id)} style={{
            fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
            background: 'var(--ox)', border: 'none', color: '#fff', flexShrink: 0,
          }}>Mark used</button>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* ── Scoreboard ──────────────────────────────────────── */}
      <div style={{
        display: 'grid', gap: 12, marginBottom: 24,
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      }}>
        <div style={{ background: 'var(--ox)', borderRadius: 14, padding: 20, color: '#fff' }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', opacity: .7 }}>Captured YTD</p>
          <p className="fr" style={{ fontSize: 34, lineHeight: 1.1, marginTop: 4 }}>{fmt(capturedYtd)}</p>
          <p style={{ fontSize: 12, opacity: .65, marginTop: 4 }}>of {fmt(totalAnnual)} · {pct}%</p>
        </div>
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid var(--sand)' }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--bark)' }}>At stake now</p>
          <p className="fr" style={{ fontSize: 34, lineHeight: 1.1, marginTop: 4, color: 'var(--ink)' }}>{fmt(atStake)}</p>
          <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 4 }}>
            {critical.length > 0
              ? `${critical.length} credit${critical.length !== 1 ? 's' : ''} expiring within 7 days`
              : 'nothing critical this week'}
          </p>
        </div>
        {[{ label: 'Katie', s: katie }, { label: 'Stephen', s: stephen }].map(({ label, s }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid var(--sand)' }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--bark)' }}>{label}</p>
            <p className="fr" style={{ fontSize: 34, lineHeight: 1.1, marginTop: 4 }}>{s.pct}%</p>
            <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 4 }}>{fmt(s.used)} of {fmt(s.total)}</p>
            <div style={{ height: 4, background: 'var(--sand)', borderRadius: 999, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.pct}%`, background: s.pct >= 100 ? '#22c55e' : 'var(--terra)', borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Action queue ────────────────────────────────────── */}
      <h2 className="fr" style={{ fontSize: 20, marginBottom: 4 }}>Use it or lose it</h2>
      <p style={{ fontSize: 13, color: 'var(--bark)', marginBottom: 16 }}>
        Unused credits this period, ranked by deadline. Tap to mark used.
      </p>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--sand)', overflow: 'hidden', marginBottom: 32 }}>
        {queue.length === 0 && (
          <p style={{ padding: 20, fontSize: 13, color: 'var(--bark)' }}>
            Everything is used up this period. Nothing to do. 🎉
          </p>
        )}
        {groupedQueue.map(({ name, items }, i) => {
          if (items.length === 1) {
            return <ItemRow key={items[0].credit.id} {...items[0]} />
          }
          // Multi-instance group: collapsed "Name x N" row, expands to a dropdown
          const soonest = items[0] // items are already deadline-sorted within queue
          const st = URGENCY_STYLE[soonest.urg]
          const open = expandedGroups.has(name)
          return (
            <div key={name}>
              <div
                onClick={() => toggleGroup(name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', cursor: 'pointer',
                  borderTop: i === 0 ? 'none' : '1px solid var(--sand)',
                  background: open ? '#fdf8f2' : '#fff',
                }}
              >
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                  background: st.bg, color: st.fg, flexShrink: 0, minWidth: 64, textAlign: 'center',
                }}>
                  {soonest.days === 0 ? 'Today!' : `${soonest.days}${st.label}`}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 14, fontWeight: 500, color: 'var(--ink)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {name} <span style={{ color: 'var(--bark)', fontWeight: 400 }}>x {items.length}</span>
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 1 }}>
                    {items.length} unused · tap to {open ? 'collapse' : 'expand'}
                  </p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                  {fmtAmount(items.reduce((s, it) => s + (it.credit.remaining_cents > 0 ? it.credit.remaining_cents : it.credit.amount_cents), 0))}
                </span>
                <span style={{ color: 'var(--bark)', flexShrink: 0, transform: open ? 'rotate(180deg)' : '', transition: 'transform .15s' }}>▾</span>
              </div>
              {open && items.map(item => <ItemRow key={item.credit.id} {...item} nested />)}
            </div>
          )
        })}
      </div>

      {/* ── Card ROI ────────────────────────────────────────── */}
      <h2 className="fr" style={{ fontSize: 20, marginBottom: 4 }}>Fee vs. value</h2>
      <p style={{ fontSize: 13, color: 'var(--bark)', marginBottom: 16 }}>
        Has each card paid for itself this year?
      </p>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--sand)', overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px',
          padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--bark)',
          textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--sand)',
        }}>
          <span>Card</span>
          <span style={{ textAlign: 'right' }}>Fee</span>
          <span style={{ textAlign: 'right' }}>Captured</span>
          <span style={{ textAlign: 'right' }}>Net</span>
        </div>
        {cardRoi.map(({ card, captured, fee, net }) => (
          <div key={card.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px',
            padding: '11px 16px', fontSize: 13, borderTop: '1px solid var(--sand)',
            alignItems: 'center',
          }}>
            <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {card.display_name}
              <span style={{ color: 'var(--bark)', fontSize: 11 }}>
                {' '}· {card.owner === 'katie' ? 'K' : 'S'}
              </span>
            </span>
            <span style={{ textAlign: 'right', color: 'var(--bark)' }}>{fmt(fee)}</span>
            <span style={{ textAlign: 'right' }}>{fmt(captured)}</span>
            <span style={{
              textAlign: 'right', fontWeight: 700,
              color: net >= 0 ? '#166534' : '#991b1b',
            }}>
              {net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
