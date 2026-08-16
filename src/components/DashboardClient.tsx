'use client'

/**
 * DashboardClient — the entire dashboard UI as a single client component.
 *
 * Design tokens match credit-dashboard.html exactly:
 *   canvas #F5F1EA · ink #1C1917 · ox #6B1A1A · sand #D4C5A9 · bark #8B7355
 *   Fraunces (fr class) + Inter
 *
 * Tab structure: Credits | Certs | Trips | Notes
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Card, Certificate, CertRedemption, CertBalanceTransaction, Trip, PinnedNote, PointsAccount, PointTransaction } from '@/types/db'
import type { EnrichedCredit } from '@/types/enriched'
import TodayPage from '@/components/TodayPage'
import PointsPage from '@/components/PointsPage'

interface Props {
  cards:              Card[]
  credits:            EnrichedCredit[]
  certificates:       Certificate[]
  certRedemptions:    CertRedemption[]
  certBalanceTransactions: CertBalanceTransaction[]
  trips:              Trip[]
  notes:              PinnedNote[]
  pointsAccounts:     PointsAccount[]
  pointTransactions:  PointTransaction[]
  today:              string
}

// ── Helpers ────────────────────────────────────────────────────

const fmt = (cents: number) =>
  '$' + Math.round(cents / 100).toLocaleString()

// Shows cents when amount is non-integer dollars (e.g. $12.95, not $13)
const fmtAmount = (cents: number) => {
  const d = cents / 100
  return d % 1 === 0 ? '$' + d.toLocaleString() : '$' + d.toFixed(2)
}

const periodLabel = (pt: string) => ({
  monthly: '/mo', quarterly: '/qtr', semiannual: '/half',
  annual: '/yr', cardmember_year: '/yr', ended: ''
}[pt] ?? '')

// ── Nav item ───────────────────────────────────────────────────

function NavItem({ label, icon, active, onClick }: {
  label: string; icon: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10,
        background: active ? 'var(--ox)' : 'transparent',
        color: active ? '#fff' : 'var(--bark)',
        border: 'none', cursor: 'pointer', fontSize: 14,
        fontWeight: 500, width: '100%', textAlign: 'left',
        transition: 'background .15s, color .15s',
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      {label}
    </button>
  )
}

// ── Credit row ─────────────────────────────────────────────────

function CreditRow({ credit, onToggle }: {
  credit: EnrichedCredit
  onToggle: (id: string, used: boolean) => void
}) {
  const used = credit.is_used
  const pl   = periodLabel(credit.period_type)
  const ap   = credit.autopilot

  return (
    <div
      onClick={ap ? undefined : () => onToggle(credit.id, !used)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', cursor: ap ? 'default' : 'pointer',
        borderTop: '1px solid var(--sand)',
        background: used ? 'rgba(22,101,52,.04)' : '#fff',
        transition: 'background .1s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 500,
          color: used ? 'var(--bark)' : 'var(--ink)',
          textDecoration: used ? 'line-through' : 'none',
        }}>
          {credit.name}
        </p>
        <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 2 }}>
          {fmtAmount(credit.amount_cents)}{pl}{ap ? ' · autopilot' : ''}
        </p>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        {ap ? (
          used ? (
            <span style={{
              fontSize: 11, fontWeight: 700, background: '#e0f2fe', color: '#0369a1',
              padding: '3px 8px', borderRadius: 999,
            }}>⚡ Auto · ✓ Used</span>
          ) : (
            <span style={{
              fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e',
              padding: '3px 8px', borderRadius: 999,
            }}>⚡ Paused</span>
          )
        ) : used ? (
          <span style={{
            fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#166534',
            padding: '3px 8px', borderRadius: 999,
          }}>✓ Used</span>
        ) : (
          <span style={{
            fontSize: 11, color: 'var(--bark)',
            padding: '3px 8px', borderRadius: 999,
            border: '1px solid var(--sand)',
          }}>Mark used</span>
        )}
      </div>
    </div>
  )
}

// ── Card accordion ─────────────────────────────────────────────

function CardAccordion({ card, credits, onToggle }: {
  card: Card
  credits: EnrichedCredit[]
  onToggle: (id: string, used: boolean) => void
}) {
  const [open, setOpen] = useState(false)

  // Count only primary-instance credits for totals (e.g. exclude Stephen's Walmart+ non-primary row)
  const countedCredits = credits.filter(c => !c.single_instance || c.is_primary_instance)
  const totalAnnual = countedCredits.reduce((s, c) => s + c.annual_value, 0)
  const usedYtd     = countedCredits.reduce((s, c) => s + c.ytd_used_cents, 0)
  const pct = totalAnnual > 0 ? Math.round(usedYtd / totalAnnual * 100) : 0

  const netBadge: Record<string, string> = {
    amex: '#2C2C2C', chase: '#1A2B4A', citi: '#003087',
    ihg: '#006A4E', hilton: '#005B8E', marriott: '#8B0000', southwest: '#304CB2',
  }
  const badgeBg = netBadge[card.network] ?? '#555'

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--sand)', overflow: 'hidden', marginBottom: 12 }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px', cursor: 'pointer',
        }}
      >
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '4px 10px',
          borderRadius: 999, background: badgeBg, color: '#E8DDD0', flexShrink: 0,
        }}>
          {card.network.toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.display_name}
          </p>
          <p style={{ fontSize: 12, color: 'var(--bark)' }}>
            {card.owner === 'katie' ? 'Katie' : 'Stephen'}{card.fee_waived ? ' · fee waived' : ''}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 500 }}>{fmt(usedYtd)} used</p>
          <p style={{ fontSize: 12, color: 'var(--bark)' }}>{fmt(totalAnnual)} total</p>
        </div>
        <span style={{ color: 'var(--bark)', transform: open ? 'rotate(180deg)' : '', transition: 'transform .2s' }}>▾</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, background: 'var(--sand)', margin: '0 20px 4px', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: pct === 100 ? '#22c55e' : 'var(--terra)',
          borderRadius: 999, transition: 'width .3s',
        }} />
      </div>

      {/* Credits */}
      {open && (
        <div>
          {credits.length === 0 ? (
            <p style={{ padding: '16px 20px', fontSize: 13, color: 'var(--bark)' }}>No credits configured.</p>
          ) : (
            credits.map(c => <CreditRow key={c.id} credit={c} onToggle={onToggle} />)
          )}
        </div>
      )}
    </div>
  )
}

// ── Q2 reset banner ────────────────────────────────────────────

function Q2ResetBanner({ today }: { today: string }) {
  const d    = new Date(today)
  const month = d.getMonth() + 1 // 1-based
  const day   = d.getDate()

  // Show banner Apr 1 – Jun 30 (Q2 is resetting Jul 1)
  if (month < 4 || month > 6) return null

  const daysLeft = Math.ceil(
    (new Date(d.getFullYear(), 6, 1).getTime() - d.getTime()) / 86400000
  )

  return (
    <div style={{
      background: '#fffbeb', border: '1px solid #f59e0b',
      borderRadius: 10, padding: '12px 16px', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 16 }}>⏳</span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
          Q2 credits resetting Jul 1 — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
        </p>
        <p style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>
          Use quarterly credits (Resy, OpenTable, Lululemon, Hilton Incidentals) before they reset.
        </p>
      </div>
    </div>
  )
}

// ── Credits page ───────────────────────────────────────────────

function CreditsPage({ cards, credits, onToggle, today }: {
  cards: Card[]
  credits: EnrichedCredit[]
  onToggle: (id: string, used: boolean) => void
  today: string
}) {
  // All credits are displayed — non-primary single-instance rows show in the card but are excluded from totals
  const creditsByCard = new Map<string, EnrichedCredit[]>()
  for (const c of credits) {
    const list = creditsByCard.get(c.card_id) ?? []
    list.push(c)
    creditsByCard.set(c.card_id, list)
  }

  // Top-level totals count only primary-instance credits (e.g. only one Walmart+ across both Plats)
  const countedCredits = credits.filter(c => !c.single_instance || c.is_primary_instance)
  const totalAnnual = countedCredits.reduce((s, c) => s + c.annual_value, 0)
  const usedYtd     = countedCredits.reduce((s, c) => s + c.ytd_used_cents, 0)

  return (
    <div>
      <Q2ResetBanner today={today} />

      {/* YTD bar */}
      <div style={{
        background: 'var(--ox)', borderRadius: 14, padding: 24,
        color: '#fff', marginBottom: 32,
      }}>
        <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', opacity: .7 }}>
          Used this period
        </p>
        <p className="fr" style={{ fontSize: 48, lineHeight: 1, marginTop: 4 }}>
          {fmt(usedYtd)}
        </p>
        <p style={{ fontSize: 14, opacity: .6, marginTop: 4 }}>
          of {fmt(totalAnnual)} annual value · {Math.round(usedYtd / totalAnnual * 100) || 0}% captured
        </p>
      </div>

      {/* Katie */}
      <h2 className="fr" style={{ fontSize: 20, marginBottom: 16 }}>Katie</h2>
      {cards.filter(c => c.owner === 'katie').map(card => (
        <CardAccordion
          key={card.id}
          card={card}
          credits={creditsByCard.get(card.id) ?? []}
          onToggle={onToggle}
        />
      ))}

      {/* Stephen */}
      <h2 className="fr" style={{ fontSize: 20, margin: '24px 0 16px' }}>Stephen</h2>
      {cards.filter(c => c.owner === 'stephen').map(card => (
        <CardAccordion
          key={card.id}
          card={card}
          credits={creditsByCard.get(card.id) ?? []}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

// ── Balance-tracked certificate row (e.g. United Flight Credit / TravelBank) ──

function BalanceCertRow({ cert, card, txs }: {
  cert: Certificate
  card: Card | undefined
  txs: CertBalanceTransaction[]
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'none' | 'add' | 'spend'>('none')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const balance = cert.balance_cents ?? 0
  const reset = () => { setMode('none'); setAmount(''); setNote(''); setDate(new Date().toISOString().slice(0, 10)) }

  const dFmt = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  async function submitTx() {
    const dollars = Number(amount)
    if (!dollars || dollars <= 0) return
    const deltaCents = Math.round(dollars * 100) * (mode === 'spend' ? -1 : 1)
    setSaving(true)
    try {
      await fetch(`/api/certs/${cert.id}/balance-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta_cents: deltaCents, note: note || null, occurred_on: date }),
      })
      router.refresh()
      reset()
    } finally {
      setSaving(false)
    }
  }

  async function undoTx(txId: string) {
    if (!confirm('Undo this transaction?')) return
    await fetch(`/api/certs/balance-transactions/${txId}`, { method: 'DELETE' })
    router.refresh()
  }

  const inp: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 7, border: '1px solid var(--sand)',
    fontSize: 13, color: 'var(--ink)', background: '#fff', boxSizing: 'border-box',
  }
  const btn = (bg: string, color: string): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500,
    background: bg, color, border: 'none', cursor: 'pointer',
  })

  return (
    <div style={{ background: '#fff', border: '1px solid var(--sand)', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600 }}>{cert.name}</p>
          <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 2 }}>{card?.display_name ?? '—'}</p>
        </div>
        <p className="fr" style={{ fontSize: 22 }}>{fmt(balance)}</p>
      </div>

      <div style={{ padding: '0 20px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        {mode === 'none' ? (
          <>
            <button onClick={() => setMode('add')} style={btn('#dcfce7', '#166534')}>+ Add</button>
            <button onClick={() => setMode('spend')} style={btn('#fef3c7', '#92400e')}>− Spend</button>
            {txs.length > 0 && (
              <button onClick={() => setShowHistory(h => !h)} style={btn('transparent', 'var(--bark)')}>
                {showHistory ? 'Hide' : 'Show'} history ({txs.length})
              </button>
            )}
          </>
        ) : (
          <div style={{ width: '100%' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: mode === 'spend' ? '#92400e' : '#166534', marginBottom: 8 }}>
              {mode === 'spend' ? 'Spend from balance' : 'Add to balance'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input type="number" step="0.01" placeholder="Amount ($)" value={amount}
                onChange={e => setAmount(e.target.value)} style={inp} />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
            </div>
            <input placeholder={mode === 'spend' ? 'Note — e.g. Utah Trip flight' : 'Note — optional'}
              value={note} onChange={e => setNote(e.target.value)} style={{ ...inp, width: '100%', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={submitTx} disabled={saving || !amount} style={btn('var(--ox)', '#fff')}>
                {saving ? 'Saving…' : 'Confirm'}
              </button>
              <button onClick={reset} style={btn('transparent', 'var(--bark)')}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {showHistory && txs.length > 0 && (
        <div style={{ borderTop: '1px solid var(--sand)' }}>
          {txs.map(tx => (
            <div key={tx.id} style={{
              padding: '10px 20px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', borderTop: '1px solid var(--sand)',
            }}>
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink)' }}>
                  {tx.delta_cents > 0 ? '+' : ''}{fmt(tx.delta_cents)}
                  {tx.note ? ` · ${tx.note}` : ''}
                </p>
                <p style={{ fontSize: 11, color: 'var(--bark)', marginTop: 2 }}>{dFmt(tx.occurred_on)}</p>
              </div>
              <button onClick={() => undoTx(tx.id)} style={{
                fontSize: 11, color: '#dc2626', background: 'transparent',
                border: 'none', cursor: 'pointer', padding: 0,
              }}>Undo</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Certs page ────────────────────────────────────────────────

function CertsPage({ certificates, cards, certRedemptions: initRedemptions, certBalanceTransactions, today: todayStr }: {
  certificates:    Certificate[]
  cards:           Card[]
  certRedemptions: CertRedemption[]
  certBalanceTransactions: CertBalanceTransaction[]
  today:           string
}) {
  const router = useRouter()
  const [redemptions, setRedemptions] = useState(initRedemptions)
  const cardMap = new Map(cards.map(c => [c.id, c]))
  const today   = new Date(todayStr)

  const txsByCert = new Map<string, CertBalanceTransaction[]>()
  for (const tx of certBalanceTransactions) {
    const list = txsByCert.get(tx.certificate_id) ?? []
    list.push(tx)
    txsByCert.set(tx.certificate_id, list)
  }
  for (const list of txsByCert.values()) {
    list.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
  }

  const dateFmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  async function handleRedeem(certId: string, year: number, currentlyRedeemed: boolean) {
    // Optimistic update
    setRedemptions(prev =>
      currentlyRedeemed
        ? prev.filter(r => !(r.certificate_id === certId && r.year === year))
        : [...prev, { id: 'opt', certificate_id: certId, year, redeemed_at: new Date().toISOString() }]
    )
    try {
      await fetch(`/api/certs/${certId}/${currentlyRedeemed ? 'unredeem' : 'redeem'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })
      router.refresh()
    } catch {
      setRedemptions(initRedemptions) // revert
    }
  }

  const recurring = certificates.filter(c => c.cert_type === 'recurring')
  const onetime   = certificates.filter(c => c.cert_type !== 'recurring'
    && c.status !== 'redeemed' && c.status !== 'expired')

  return (
    <div>
      <h2 className="fr" style={{ fontSize: 20, marginBottom: 16 }}>Certificates</h2>

      {/* ── Recurring annual certs ── */}
      {recurring.map(cert => {
        const card = cardMap.get(cert.card_id)
        const redeemedYears = new Set(
          redemptions.filter(r => r.certificate_id === cert.id).map(r => r.year)
        )

        // Guard: skip certs without anniversary dates
        if (!cert.anniversary_month || !cert.anniversary_day) return null

        // At most 1 instance: current active cert OR upcoming if redeemed and next ≤30 days out
        const annMonth0       = cert.anniversary_month - 1   // JS months are 0-indexed
        const annDay          = cert.anniversary_day
        const thisYearAnn     = new Date(today.getFullYear(), annMonth0, annDay)
        const issueYear       = thisYearAnn <= today ? today.getFullYear() : today.getFullYear() - 1
        const currentIssue    = new Date(issueYear,     annMonth0, annDay)
        const currentExpiry   = new Date(issueYear + 1, annMonth0, annDay)
        const currentRedeemed = redeemedYears.has(issueYear)

        type Inst = { year: number; issue: Date; expiry: Date; status: 'active' | 'upcoming' }
        const instances: Inst[] = []

        if (!currentRedeemed) {
          instances.push({ year: issueYear, issue: currentIssue, expiry: currentExpiry, status: 'active' })
        } else {
          const nextIssue = new Date(issueYear + 1, annMonth0, annDay)
          const daysUntil = Math.ceil((nextIssue.getTime() - today.getTime()) / 86400000)
          if (daysUntil > 0 && daysUntil <= 30) {
            instances.push({
              year: issueYear + 1, issue: nextIssue,
              expiry: new Date(issueYear + 2, annMonth0, annDay),
              status: 'upcoming',
            })
          }
        }

        return (
          <div key={cert.id} style={{
            background: '#fff', border: '1px solid var(--sand)', borderRadius: 12, marginBottom: 16,
          }}>
            {/* Card header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--sand)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{cert.name}</p>
                <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 2 }}>{card?.display_name ?? '—'}</p>
              </div>
              {cert.value_low_cents && (
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--bark)' }}>
                  {fmt(cert.value_low_cents)}
                  {cert.value_high_cents && cert.value_high_cents !== cert.value_low_cents
                    ? `–${fmt(cert.value_high_cents)}` : ''} value
                </p>
              )}
            </div>

            {/* Single instance row */}
            {instances.length === 0 ? (
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--sand)' }}>
                <p style={{ fontSize: 13, color: 'var(--bark)', opacity: .5 }}>
                  Redeemed — next cert issues {dateFmt(new Date(issueYear + 1, annMonth0, annDay))}
                </p>
              </div>
            ) : instances.map(inst => {
              const daysUntil = Math.ceil((inst.issue.getTime() - today.getTime()) / 86400000)
              return (
                <div key={inst.year}
                  onClick={() => { if (inst.status === 'active') handleRedeem(cert.id, inst.year, false) }}
                  style={{
                    padding: '12px 20px', borderBottom: '1px solid var(--sand)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: inst.status === 'active' ? 'pointer' : 'default',
                  }}
                >
                  <p style={{ fontSize: 13, color: 'var(--bark)' }}>
                    {inst.status === 'upcoming'
                      ? `Issues ${dateFmt(inst.issue)} · ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`
                      : `Issued ${dateFmt(inst.issue)}`}
                  </p>
                  {inst.status === 'active' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <p style={{ fontSize: 11, color: '#b45309', fontWeight: 500 }}>
                        Expires {dateFmt(inst.expiry)}
                      </p>
                      <span style={{ fontSize: 11, color: 'var(--bark)', padding: '3px 8px', borderRadius: 999, border: '1px solid var(--sand)', whiteSpace: 'nowrap' }}>
                        Mark used
                      </span>
                    </div>
                  )}
                  {inst.status === 'upcoming' && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e40af', padding: '3px 8px', borderRadius: 999, background: '#eff6ff' }}>
                      Upcoming
                    </span>
                  )}
                </div>
              )
            })}

            {cert.notes && (
              <p style={{ padding: '10px 20px', fontSize: 12, color: 'var(--bark)' }}>{cert.notes}</p>
            )}
          </div>
        )
      })}

      {/* ── One-time certs ── */}
      {onetime.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '20px 0 12px' }}>Other Certificates</h3>
          {onetime.map(cert => {
            const card = cardMap.get(cert.card_id)
            const isCommitted = cert.status === 'committed'

            if (cert.is_balance_tracked) {
              return (
                <BalanceCertRow
                  key={cert.id}
                  cert={cert}
                  card={card}
                  txs={txsByCert.get(cert.id) ?? []}
                />
              )
            }

            return (
              <div key={cert.id} style={{
                background: '#fff', border: '1px solid var(--sand)', borderRadius: 12,
                padding: '16px 20px', marginBottom: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{cert.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 2 }}>{card?.display_name ?? '—'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                      background: isCommitted ? '#eff6ff' : '#fef9ee',
                      color: isCommitted ? '#1e40af' : '#b45309',
                    }}>
                      {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                    </span>
                    {cert.value_low_cents && (
                      <p style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                        {fmt(cert.value_low_cents)}
                        {cert.value_high_cents && cert.value_high_cents !== cert.value_low_cents
                          ? `–${fmt(cert.value_high_cents)}` : ''} value
                      </p>
                    )}
                  </div>
                </div>
                {cert.expires_at && (
                  <p style={{ fontSize: 11, color: 'var(--bark)', marginTop: 8 }}>
                    Expires {new Date(cert.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
                {cert.notes && <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 4 }}>{cert.notes}</p>}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ── Trips page ─────────────────────────────────────────────────

function TripsPage({ trips }: { trips: Trip[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    title: '', category: 'Domestic', destination: '',
    check_in: '', check_out: '',
    travelers: 'Katie & Stephen', target_nightly: '', notes: '',
  })

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const categoryNote = `Category: ${form.category}`
      const notesText = [categoryNote, form.notes || null].filter(Boolean).join('\n')
      await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          destination: form.destination,
          check_in: form.check_in || null,
          check_out: form.check_out || null,
          travelers: form.travelers,
          target_cost_cents: form.target_nightly
            ? Math.round(parseFloat(form.target_nightly) * 100) : null,
          notes: notesText || null,
          status: 'planning',
        }),
      })
      router.refresh()
      setAdding(false)
      setForm({ title: '', category: 'Domestic', destination: '', check_in: '', check_out: '', travelers: 'Katie & Stephen', target_nightly: '', notes: '' })
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(tripId: string) {
    if (!confirm('Cancel this trip? This cannot be undone.')) return
    setCancelling(prev => new Set(prev).add(tripId))
    try {
      await fetch(`/api/trips/${tripId}/cancel`, { method: 'POST' })
      router.refresh()
    } finally {
      setCancelling(prev => { const s = new Set(prev); s.delete(tripId); return s })
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--sand)', fontSize: 13, color: 'var(--ink)',
    background: '#fff', boxSizing: 'border-box',
  }

  const statusColor: Record<string, string> = {
    planning: '#92400e', researching: '#1e40af',
    booked: '#166534', completed: 'var(--bark)',
  }

  const TripCard = ({ trip }: { trip: Trip }) => (
    <div style={{ background: '#fff', border: '1px solid var(--sand)', borderRadius: 12, padding: '16px 20px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="fr" style={{ fontSize: 16 }}>{trip.title}</p>
          <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 2 }}>
            {trip.destination}
            {trip.check_in && ` · ${new Date(trip.check_in + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            {trip.check_out && `–${new Date(trip.check_out + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            {trip.nights ? ` · ${trip.nights}n` : ''}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: '#f5f5f5', color: statusColor[trip.status] ?? 'var(--bark)' }}>
          {trip.status}
        </span>
      </div>
      {trip.travelers && <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 6 }}>👥 {trip.travelers}</p>}
      {trip.target_cost_cents != null && (
        <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 4 }}>
          Target: {trip.target_cost_cents === 0 ? 'Go for free' : fmt(trip.target_cost_cents) + '/night'}
        </p>
      )}
      {trip.notes && <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 4 }}>{trip.notes}</p>}
      {trip.status !== 'completed' && trip.status !== 'cancelled' && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--sand)' }}>
          <button
            onClick={() => handleCancel(trip.id)}
            disabled={cancelling.has(trip.id)}
            style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12,
              background: 'transparent', border: '1px solid #fca5a5',
              color: '#dc2626', cursor: cancelling.has(trip.id) ? 'default' : 'pointer',
              opacity: cancelling.has(trip.id) ? .5 : 1,
            }}
          >
            {cancelling.has(trip.id) ? 'Cancelling…' : 'Cancel Trip'}
          </button>
        </div>
      )}
    </div>
  )

  const upcoming  = trips.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
  const completed = trips.filter(t => t.status === 'completed')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="fr" style={{ fontSize: 20 }}>Trips</h2>
        {!adding && (
          <button onClick={() => setAdding(true)} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: 'var(--ox)', color: '#fff', border: 'none', cursor: 'pointer',
          }}>+ Add Trip</button>
        )}
      </div>

      {/* Add Trip form */}
      {adding && (
        <div style={{ background: '#fff', border: '1px solid var(--sand)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>New Trip</p>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: 12 }}>
              <input required placeholder="Trip name *" value={form.title}
                onChange={e => set('title', e.target.value)} style={inp} />
              <select required value={form.category}
                onChange={e => set('category', e.target.value)} style={inp}>
                <option value="Local/TX">Local / Texas</option>
                <option value="Domestic">Domestic</option>
                <option value="International">International</option>
              </select>
              <input required placeholder="Destination *" value={form.destination}
                onChange={e => set('destination', e.target.value)} style={inp} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--bark)', display: 'block', marginBottom: 4 }}>Start date *</label>
                  <input required type="date" value={form.check_in}
                    onChange={e => set('check_in', e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--bark)', display: 'block', marginBottom: 4 }}>End date *</label>
                  <input required type="date" value={form.check_out}
                    onChange={e => set('check_out', e.target.value)} style={inp} />
                </div>
              </div>
              <input placeholder="Travelers (default: Katie & Stephen)" value={form.travelers}
                onChange={e => set('travelers', e.target.value)} style={inp} />
              <input type="number" placeholder="Target nightly rate ($) — optional" value={form.target_nightly}
                onChange={e => set('target_nightly', e.target.value)} style={inp} />
              <textarea placeholder="Notes — optional" value={form.notes} rows={3}
                onChange={e => set('notes', e.target.value)}
                style={{ ...inp, resize: 'vertical' as const }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button type="submit" disabled={saving} style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: 'var(--ox)', color: '#fff', border: 'none', cursor: saving ? 'default' : 'pointer',
                opacity: saving ? .6 : 1,
              }}>{saving ? 'Saving…' : 'Create Trip'}</button>
              <button type="button" onClick={() => setAdding(false)} style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13,
                background: 'transparent', border: '1px solid var(--sand)',
                color: 'var(--bark)', cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Trip list */}
      {upcoming.length === 0 && !adding && (
        <p style={{ color: 'var(--bark)', fontSize: 14 }}>No trips yet.</p>
      )}
      {upcoming.map(t => <TripCard key={t.id} trip={t} />)}
      {completed.length > 0 && <>
        <h2 className="fr" style={{ fontSize: 20, margin: '24px 0 16px', opacity: .6 }}>Completed</h2>
        {completed.map(t => <TripCard key={t.id} trip={t} />)}
      </>}
    </div>
  )
}

// ── Notes page ─────────────────────────────────────────────────

function NotesPage({ notes }: { notes: PinnedNote[] }) {
  const pinned   = notes.filter(n => n.pinned)
  const unpinned = notes.filter(n => !n.pinned)

  function NoteCard({ note }: { note: PinnedNote }) {
    return (
      <div style={{
        background: '#fff', border: '1px solid var(--sand)', borderRadius: 12,
        padding: '16px 20px', marginBottom: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <p style={{ fontSize: 14, fontWeight: 600 }}>{note.title}</p>
          {note.pinned && <span style={{ fontSize: 10, color: 'var(--bark)' }}>📌</span>}
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink)', marginTop: 6, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {note.body}
        </p>
      </div>
    )
  }

  return (
    <div>
      {pinned.length > 0 && <>
        <h2 className="fr" style={{ fontSize: 20, marginBottom: 16 }}>Pinned</h2>
        {pinned.map(n => <NoteCard key={n.id} note={n} />)}
      </>}
      {unpinned.length > 0 && <>
        <h2 className="fr" style={{ fontSize: 20, margin: `${pinned.length > 0 ? 24 : 0}px 0 16px` }}>Notes</h2>
        {unpinned.map(n => <NoteCard key={n.id} note={n} />)}
      </>}
      {notes.length === 0 && <p style={{ color: 'var(--bark)', fontSize: 14 }}>No notes yet.</p>}
    </div>
  )
}

// ── Hotel Library page ─────────────────────────────────────────

type HotelRow = {
  id: string; name: string; city: string; state: string | null
  primary_program: string | null; also_bookable_via: string[] | null
  rate_low_cents: number | null; rate_high_cents: number | null
  rate_check_in: string | null; rate_check_out: string | null
  last_verified_at: string | null; verification_notes: string | null
}

type HotelSection = {
  key: string; label: string; creditSummary: string
  calcNet: ((low: number, high: number) => { netLow: number; netHigh: number; label: string }) | null
}

const PROG_LABEL: Record<string, string> = {
  fhr: 'FHR', thc: 'THC', edit: 'Edit',
  hilton: 'Hilton', ihg: 'IHG', marriott: 'Marriott', citi_travel: 'Citi',
}

const HOTEL_SECTIONS: HotelSection[] = [
  {
    key: 'fhr', label: 'Amex Fine Hotels + Resorts',
    creditSummary: '$300 Hotel Credit + $100 F&B + breakfast for 2 + upgrade',
    calcNet: (low, high) => ({
      netLow:  Math.max(0, low  * 2 - 52000) / 2,
      netHigh: Math.max(0, high * 2 - 52000) / 2,
      label: 'with FHR (2nt)',
    }),
  },
  {
    key: 'thc', label: 'Amex The Hotel Collection',
    creditSummary: '$300 Hotel Credit + $100 experience credit (2-night min)',
    calcNet: (low, high) => ({
      netLow:  Math.max(0, low  * 2 - 40000) / 2,
      netHigh: Math.max(0, high * 2 - 40000) / 2,
      label: 'with THC (2nt)',
    }),
  },
  {
    key: 'edit', label: 'Chase The Edit',
    creditSummary: '$250 hotel credit + breakfast (2-night min, ×2/year)',
    calcNet: (low, high) => ({
      netLow:  Math.max(0, low  * 2 - 37000) / 2,
      netHigh: Math.max(0, high * 2 - 37000) / 2,
      label: 'with Edit (2nt)',
    }),
  },
  {
    key: 'hilton', label: 'Hilton Honors (Aspire)',
    creditSummary: '$200 Aspire Resort Credit + Diamond breakfast (2-night, resort only)',
    calcNet: (low, high) => ({
      netLow:  Math.max(0, low  * 2 - 32000) / 2,
      netHigh: Math.max(0, high * 2 - 32000) / 2,
      label: 'with Aspire (2nt, resort)',
    }),
  },
  {
    key: 'ihg', label: 'IHG One Rewards',
    creditSummary: 'Free night cert (≤40k pts cap) · Platinum status',
    calcNet: null,
  },
  {
    key: 'marriott', label: 'Marriott Bonvoy',
    creditSummary: 'Free Night Award cert (≤35k pts) · Silver status',
    calcNet: null,
  },
  {
    key: 'citi_travel', label: 'Citi Travel Portal',
    creditSummary: '$300 hotel credit, single stay 2+ nights (×1/year)',
    calcNet: (low, high) => ({
      netLow:  Math.max(0, low  * 2 - 30000) / 2,
      netHigh: Math.max(0, high * 2 - 30000) / 2,
      label: 'with Citi (2nt)',
    }),
  },
]

function HotelLibraryPage() {
  const [hotels, setHotels] = useState<HotelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['fhr']))
  const [prompt, setPrompt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [rateCheckIn,  setRateCheckIn]  = useState('')
  const [rateCheckOut, setRateCheckOut] = useState('')
  const [pasteJson, setPasteJson] = useState('')
  const [parsing,   setParsing]   = useState(false)
  const [parseMsg,  setParseMsg]  = useState<string | null>(null)

  const loadHotels = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/hotel-library')
      const j = await r.json()
      setHotels(j.hotels ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHotels() }, [loadHotels])

  const grouped = useMemo(() => {
    const map = new Map<string, HotelRow[]>()
    for (const h of hotels) {
      const pg = h.primary_program ?? 'citi_travel'
      if (!map.has(pg)) map.set(pg, [])
      map.get(pg)!.push(h)
    }
    return map
  }, [hotels])

  const toggleSection = (key: string) =>
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })

  const generatePrompt = () => {
    if (hotels.length === 0) return
    const dateContext = (rateCheckIn && rateCheckOut)
      ? `Date range for rates: ${rateCheckIn} to ${rateCheckOut}\n`
      : ''
    const lines = hotels.map(h => {
      const pg = h.primary_program ? (PROG_LABEL[h.primary_program] ?? h.primary_program) : 'unknown'
      const also = h.also_bookable_via?.length
        ? ', also: ' + h.also_bookable_via.map(p => PROG_LABEL[p] ?? p).join(', ') : ''
      const flag = h.verification_notes ? ' [UNCONFIRMED]' : ''
      return `  ${h.name} (${h.city}${h.state ? ', ' + h.state : ''}) — primary: ${pg}${also}${flag}`
    }).join('\n')
    setPrompt(
      `You are a hotel program verification assistant. For each hotel below, verify program participation and rate ranges.\n\n` +
      dateContext +
      `Programs:\n  FHR: americanexpress.com/en-us/travel → Fine Hotels + Resorts\n` +
      `  THC: americanexpress.com/en-us/travel → The Hotel Collection\n` +
      `  Edit: travel.chase.com → The Edit by Chase\n` +
      `  Hilton/IHG/Marriott: confirm from hotel website or brand\n\n` +
      `Hotels:\n${lines}\n\n` +
      `Return JSON array:\n` +
      `[{ "name": "...", "eligibility": { "fhr": bool, "thc": bool, "edit": bool, "ihg": bool, "hilton": bool, "marriott": bool }, ` +
      `"rates": { "low": 000, "high": 000, "source": "website|estimate", "confidence": "high|medium|low" }, "notes": "..." }]`
    )
  }

  const copyPrompt = async () => {
    if (!prompt) return
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const parseAndUpdate = async () => {
    if (!pasteJson.trim()) return
    setParsing(true)
    setParseMsg(null)
    try {
      // Extract JSON array from the pasted text (handle markdown fences)
      const match = pasteJson.match(/\[[\s\S]*\]/)
      if (!match) { setParseMsg('❌ No JSON array found — paste the raw JSON'); return }
      const parsed = JSON.parse(match[0])
      const body: Record<string, unknown> = {
        verified_at: new Date().toISOString(),
        hotels: parsed,
      }
      if (rateCheckIn && rateCheckOut) {
        body.date_range = { check_in: rateCheckIn, check_out: rateCheckOut }
      }
      const r = await fetch('/api/hotel-library/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json()
      if (j.ok) {
        setParseMsg(`✓ Updated ${j.updated} hotel${j.updated !== 1 ? 's' : ''}`)
        setPasteJson('')
        setPrompt(null)
        loadHotels()
      } else {
        setParseMsg(`❌ ${j.error ?? 'Unknown error'}`)
      }
    } catch (e: unknown) {
      setParseMsg(`❌ ${e instanceof Error ? e.message : 'Parse error'}`)
    } finally {
      setParsing(false)
    }
  }

  const cardBase: React.CSSProperties = {
    background: '#fff', border: '1px solid var(--sand)', borderRadius: 10, padding: '12px 16px',
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' as const }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--bark)', display: 'block', marginBottom: 3 }}>Check-in (optional)</label>
            <input type="date" value={rateCheckIn} onChange={e => setRateCheckIn(e.target.value)} style={{
              padding: '7px 10px', borderRadius: 7, border: '1px solid var(--sand)',
              fontSize: 13, color: 'var(--ink)', background: '#fff',
            }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--bark)', display: 'block', marginBottom: 3 }}>Check-out (optional)</label>
            <input type="date" value={rateCheckOut} onChange={e => setRateCheckOut(e.target.value)} style={{
              padding: '7px 10px', borderRadius: 7, border: '1px solid var(--sand)',
              fontSize: 13, color: 'var(--ink)', background: '#fff',
            }} />
          </div>
          <button onClick={generatePrompt} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: 'var(--ox)', color: '#fff', border: 'none', cursor: 'pointer',
          }}>Generate Prompt</button>
          <p style={{ fontSize: 13, color: 'var(--bark)', marginLeft: 'auto' }}>{hotels.length} properties</p>
        </div>
      </div>

      {/* Prompt box + paste-back */}
      {prompt && (
        <div style={{ marginBottom: 24, background: '#fff', border: '1px solid var(--sand)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600 }}>1. Copy → paste into Claude.ai</p>
            <button onClick={copyPrompt} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12,
              background: copied ? '#dcfce7' : 'var(--sand)',
              color: copied ? '#166534' : 'var(--ink)',
              border: 'none', cursor: 'pointer', fontWeight: 500,
            }}>{copied ? 'Copied ✓' : 'Copy'}</button>
          </div>
          <textarea readOnly value={prompt} style={{
            width: '100%', height: 140, fontSize: 11, fontFamily: 'monospace',
            background: '#f8f5f0', border: '1px solid var(--sand)', borderRadius: 6,
            padding: 10, resize: 'vertical', color: 'var(--ink)', boxSizing: 'border-box',
          }} />

          <p style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 6 }}>2. Paste JSON response here</p>
          <textarea
            value={pasteJson}
            onChange={e => setPasteJson(e.target.value)}
            placeholder='Paste the JSON array Claude returned here…'
            style={{
              width: '100%', height: 120, fontSize: 11, fontFamily: 'monospace',
              border: '1px solid var(--sand)', borderRadius: 6,
              padding: 10, resize: 'vertical', color: 'var(--ink)', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <button onClick={parseAndUpdate} disabled={parsing || !pasteJson.trim()} style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500,
              background: parsing ? '#f5f5f5' : 'var(--ox)', color: parsing ? 'var(--bark)' : '#fff',
              border: 'none', cursor: parsing ? 'default' : 'pointer',
              opacity: (!pasteJson.trim() && !parsing) ? .5 : 1,
            }}>{parsing ? 'Updating…' : 'Update Library'}</button>
            <button onClick={() => { setPrompt(null); setPasteJson(''); setParseMsg(null) }} style={{
              padding: '7px 14px', borderRadius: 7, fontSize: 13,
              background: 'transparent', border: '1px solid var(--sand)',
              color: 'var(--bark)', cursor: 'pointer',
            }}>Dismiss</button>
            {parseMsg && <p style={{ fontSize: 13, color: parseMsg.startsWith('✓') ? '#166534' : '#dc2626' }}>{parseMsg}</p>}
          </div>
        </div>
      )}

      {/* Sections */}
      {loading ? (
        <p style={{ color: 'var(--bark)', fontSize: 14 }}>Loading…</p>
      ) : (
        HOTEL_SECTIONS.map(sec => {
          const secHotels = grouped.get(sec.key) ?? []
          const isOpen = openSections.has(sec.key)
          return (
            <div key={sec.key} style={{
              background: '#fff', border: '1px solid var(--sand)', borderRadius: 12, marginBottom: 10, overflow: 'hidden',
            }}>
              {/* Accordion header */}
              <div onClick={() => toggleSection(sec.key)} style={{
                padding: '14px 20px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                background: isOpen ? '#fdf8f2' : '#fff',
                userSelect: 'none' as const,
              }}>
                <span style={{ fontSize: 11, color: 'var(--bark)', fontWeight: 700, flexShrink: 0 }}>
                  {isOpen ? '▾' : '▸'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{sec.label}</p>
                    <span style={{
                      fontSize: 11, padding: '1px 7px', borderRadius: 999,
                      background: '#f0f4ff', color: '#1e40af', fontWeight: 600,
                    }}>
                      {secHotels.length} {secHotels.length === 1 ? 'hotel' : 'hotels'}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--bark)', marginTop: 3 }}>{sec.creditSummary}</p>
                </div>
              </div>

              {/* Hotel grid */}
              {isOpen && (
                <div style={{ padding: '8px 16px 16px', borderTop: '1px solid var(--sand)' }}>
                  {secHotels.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--bark)', paddingTop: 8 }}>
                      No properties yet — add via database.
                    </p>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                      gap: 10, paddingTop: 8,
                    }}>
                      {secHotels.map(h => {
                        const alsoVia = h.also_bookable_via ?? []
                        const hasRates = h.rate_low_cents != null && h.rate_high_cents != null
                        const unconfirmed = !!h.verification_notes
                        const net = (hasRates && sec.calcNet)
                          ? sec.calcNet(h.rate_low_cents!, h.rate_high_cents!) : null

                        return (
                          <div key={h.id} style={cardBase}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{h.name}</p>
                                <p style={{ fontSize: 11, color: 'var(--bark)', marginTop: 2 }}>
                                  {h.city}{h.state ? `, ${h.state}` : ''}
                                </p>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                                {unconfirmed && (
                                  <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 999, background: '#fef9ee', color: '#b45309' }}>
                                    Unconfirmed
                                  </span>
                                )}
                                {alsoVia.map(p => (
                                  <span key={p} style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 999, background: '#f0f4ff', color: '#1e40af' }}>
                                    +{PROG_LABEL[p] ?? p}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {hasRates ? (
                              <div style={{ marginTop: 8 }}>
                                <p style={{ fontSize: 11, color: 'var(--bark)' }}>
                                  {h.rate_check_in && h.rate_check_out
                                    ? `${new Date(h.rate_check_in + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${new Date(h.rate_check_out + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: `
                                    : 'Public: '}
                                  {fmtAmount(h.rate_low_cents!)}–{fmtAmount(h.rate_high_cents!)}/night
                                  {h.last_verified_at && (
                                    <span style={{ opacity: .6 }}>
                                      {' · '}verified {new Date(h.last_verified_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </span>
                                  )}
                                </p>
                                {net ? (
                                  <p style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginTop: 3 }}>
                                    ~{fmtAmount(Math.round(net.netLow))}–{fmtAmount(Math.round(net.netHigh))}/night {net.label}
                                  </p>
                                ) : (
                                  <p style={{ fontSize: 11, fontWeight: 600, color: '#166534', marginTop: 3 }}>
                                    {sec.key === 'ihg'
                                      ? 'Free w/ IHG Free Night cert (≤40k pts, top-up allowed)'
                                      : 'Free w/ Marriott Free Night Award (≤35k pts, top-up allowed)'}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p style={{ fontSize: 10, color: 'var(--bark)', marginTop: 8, opacity: .6 }}>
                                Rates not verified — use Re-verify Library
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

// ── Main dashboard ─────────────────────────────────────────────

export default function DashboardClient({ cards, credits: initialCredits, certificates, certRedemptions, certBalanceTransactions, trips, notes, pointsAccounts, pointTransactions, today }: Props) {
  const [tab, setTab] = useState<'today' | 'credits' | 'points' | 'certs' | 'trips' | 'notes' | 'hotels'>('today')
  const [credits, setCredits] = useState(initialCredits)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()

  const handleToggle = useCallback(async (id: string, markUsed: boolean) => {
    const credit = credits.find(c => c.id === id)
    const isAutopilot = credit?.autopilot ?? false

    // Optimistic update — row flips instantly
    setCredits(prev => prev.map(c =>
      c.id !== id ? c : {
        ...c,
        is_used:         markUsed,
        used_cents:      markUsed ? c.amount_cents : 0,
        remaining_cents: markUsed ? 0 : c.amount_cents,
      }
    ))

    try {
      const endpoint = isAutopilot
        ? (markUsed ? `/api/credits/${id}/unmark` : `/api/credits/${id}/log`)
        : (markUsed ? `/api/credits/${id}/log`   : `/api/credits/${id}/unmark`)
      const body = (isAutopilot && !markUsed)
        ? JSON.stringify({ amount_cents: 0 })
        : '{}'

      await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      // Refresh server component so per-card and page-level totals recompute
      router.refresh()
    } catch {
      // Revert optimistic update on failure
      setCredits(prev => prev.map(c =>
        c.id !== id ? c : {
          ...c,
          is_used:         !markUsed,
          used_cents:      !markUsed ? c.amount_cents : 0,
          remaining_cents: !markUsed ? 0 : c.amount_cents,
        }
      ))
    }
  }, [credits, router])

  const tabs = [
    { id: 'today'   as const, label: 'Today',         icon: '🎯' },
    { id: 'credits' as const, label: 'Credits',       icon: '💳' },
    { id: 'points'  as const, label: 'Points',        icon: '⭐' },
    { id: 'certs'   as const, label: 'Certificates',  icon: '🎟' },
    { id: 'trips'   as const, label: 'Trips',         icon: '✈️' },
    { id: 'hotels'  as const, label: 'Hotel Library', icon: '🏨' },
    { id: 'notes'   as const, label: 'Notes',         icon: '📋' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 767px) {
          .cc-sidebar { transform: translateX(-100%); position: fixed !important; z-index: 40; transition: transform .25s ease; height: 100vh !important; }
          .cc-sidebar.open { transform: translateX(0); }
          .cc-hamburger { display: flex !important; }
        }
      `}</style>

      {/* Hamburger — mobile only */}
      <button
        className="cc-hamburger"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open menu"
        style={{
          display: 'none', position: 'fixed', top: 14, left: 14, zIndex: 50,
          background: '#fff', border: '1px solid var(--sand)', borderRadius: 8,
          padding: '6px 8px', cursor: 'pointer', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="var(--ink)">
          <rect y="3" width="18" height="2" rx="1" fill="currentColor"/>
          <rect y="8" width="18" height="2" rx="1" fill="currentColor"/>
          <rect y="13" width="18" height="2" rx="1" fill="currentColor"/>
        </svg>
      </button>

      {/* Backdrop — mobile only */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 30 }}
        />
      )}

      {/* Sidebar */}
      <aside className={`cc-sidebar${mobileNavOpen ? ' open' : ''}`} style={{
        width: 220, minHeight: '100vh', background: '#fff',
        borderRight: '1px solid var(--sand)', display: 'flex',
        flexDirection: 'column', flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ padding: 24, borderBottom: '1px solid var(--sand)' }}>
          <h1 className="fr" style={{ fontSize: 22, color: 'var(--ink)' }}>Credit Dashboard</h1>
          <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 2 }}>Katie &amp; Stephen</p>
        </div>
        <nav style={{ flex: 1, padding: 12 }}>
          {tabs.map(t => (
            <NavItem
              key={t.id}
              label={t.label}
              icon={t.icon}
              active={tab === t.id}
              onClick={() => { setTab(t.id); setMobileNavOpen(false) }}
            />
          ))}
        </nav>
        <div style={{ padding: 12, borderTop: '1px solid var(--sand)' }}>
          <button
            onClick={async () => { await fetch('/api/auth/login', { method: 'DELETE' }); window.location.href = '/login' }}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 8,
              background: 'transparent', border: '1px solid var(--sand)',
              fontSize: 12, color: 'var(--bark)', cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 48px' }}>
          <div style={{ marginBottom: 32 }}>
            <h1 className="fr" style={{ fontSize: 28 }}>
              {tabs.find(t => t.id === tab)?.label}
            </h1>
          </div>

          {tab === 'today' && (
            <TodayPage cards={cards} credits={credits} onToggle={handleToggle} today={today} />
          )}
          {tab === 'credits' && (
            <CreditsPage cards={cards} credits={credits} onToggle={handleToggle} today={today} />
          )}
          {tab === 'points' && (
            <PointsPage pointsAccounts={pointsAccounts} pointTransactions={pointTransactions} />
          )}
          {tab === 'certs' && (
            <CertsPage
              certificates={certificates}
              cards={cards}
              certRedemptions={certRedemptions}
              certBalanceTransactions={certBalanceTransactions}
              today={today}
            />
          )}
          {tab === 'trips' && (
            <TripsPage trips={trips} />
          )}
          {tab === 'hotels' && (
            <HotelLibraryPage />
          )}
          {tab === 'notes' && (
            <NotesPage notes={notes} />
          )}
        </div>
      </main>
    </div>
  )
}
