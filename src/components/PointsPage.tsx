'use client'

/**
 * PointsPage — one card per row: current balance, estimated $ value,
 * add/redeem forms (amount + note + date), and a transaction history.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Card, CardPoints, PointTransaction } from '@/types/db'

const fmtUsd = (dollars: number) =>
  '$' + dollars.toLocaleString(undefined, { maximumFractionDigits: 0 })

const todayIso = () => new Date().toISOString().slice(0, 10)

const dateFmt = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

interface Props {
  cards: Card[]
  cardPoints: CardPoints[]
  pointTransactions: PointTransaction[]
}

// ── One card's points block ─────────────────────────────────

function CardPointsRow({ card, cp, txs }: { card: Card; cp: CardPoints; txs: PointTransaction[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<'none' | 'add' | 'redeem'>('none')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayIso())
  const [saving, setSaving] = useState(false)
  const [editingSettings, setEditingSettings] = useState(false)
  const [programName, setProgramName] = useState(cp.program_name)
  const [valuePerPoint, setValuePerPoint] = useState(String(cp.value_per_point_cents))
  const [showHistory, setShowHistory] = useState(false)

  const estValue = (cp.balance * cp.value_per_point_cents) / 100

  const reset = () => { setMode('none'); setAmount(''); setNote(''); setDate(todayIso()) }

  async function submitTx() {
    const n = Math.trunc(Number(amount))
    if (!n || n <= 0) return
    setSaving(true)
    try {
      await fetch(`/api/points/${cp.id}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delta: mode === 'redeem' ? -n : n,
          note: note || null,
          occurred_on: date,
        }),
      })
      router.refresh()
      reset()
    } finally {
      setSaving(false)
    }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      await fetch(`/api/points/${cp.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_name: programName,
          value_per_point_cents: Number(valuePerPoint) || 0,
        }),
      })
      router.refresh()
      setEditingSettings(false)
    } finally {
      setSaving(false)
    }
  }

  async function undoTx(txId: string) {
    if (!confirm('Undo this transaction?')) return
    await fetch(`/api/points/transactions/${txId}`, { method: 'DELETE' })
    router.refresh()
  }

  const inp: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 7, border: '1px solid var(--sand)',
    fontSize: 13, color: 'var(--ink)', background: '#fff', boxSizing: 'border-box',
  }

  return (
    <div style={{ background: '#fff', border: '1px solid var(--sand)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.display_name}
          </p>
          {!editingSettings ? (
            <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 2 }}>
              {cp.program_name || 'Unnamed program'} · {cp.value_per_point_cents}¢/pt{' '}
              <button onClick={() => setEditingSettings(true)} style={{
                background: 'none', border: 'none', color: 'var(--terra)', fontSize: 11,
                cursor: 'pointer', padding: 0, marginLeft: 4,
              }}>edit</button>
            </p>
          ) : (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' as const }}>
              <input value={programName} onChange={e => setProgramName(e.target.value)}
                placeholder="Program name" style={{ ...inp, width: 170 }} />
              <input value={valuePerPoint} onChange={e => setValuePerPoint(e.target.value)}
                type="number" step="0.1" placeholder="¢/pt" style={{ ...inp, width: 70 }} />
              <button onClick={saveSettings} disabled={saving} style={{
                padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                background: 'var(--ox)', color: '#fff', border: 'none', cursor: 'pointer',
              }}>Save</button>
              <button onClick={() => setEditingSettings(false)} style={{
                padding: '6px 10px', borderRadius: 7, fontSize: 12,
                background: 'transparent', border: '1px solid var(--sand)', color: 'var(--bark)', cursor: 'pointer',
              }}>Cancel</button>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p className="fr" style={{ fontSize: 24 }}>{cp.balance.toLocaleString()}</p>
          <p style={{ fontSize: 12, color: 'var(--bark)' }}>≈ {fmtUsd(estValue)}</p>
        </div>
      </div>

      <div style={{ padding: '0 20px 14px', display: 'flex', gap: 8 }}>
        <button onClick={() => setMode(m => m === 'add' ? 'none' : 'add')} style={{
          padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer',
          background: mode === 'add' ? 'var(--ox)' : '#fff', color: mode === 'add' ? '#fff' : 'var(--ink)',
          border: '1px solid var(--sand)',
        }}>+ Add points</button>
        <button onClick={() => setMode(m => m === 'redeem' ? 'none' : 'redeem')} style={{
          padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer',
          background: mode === 'redeem' ? 'var(--ox)' : '#fff', color: mode === 'redeem' ? '#fff' : 'var(--ink)',
          border: '1px solid var(--sand)',
        }}>− Redeem points</button>
        {txs.length > 0 && (
          <button onClick={() => setShowHistory(s => !s)} style={{
            padding: '6px 14px', borderRadius: 7, fontSize: 12, cursor: 'pointer',
            background: 'transparent', color: 'var(--bark)', border: 'none', marginLeft: 'auto',
          }}>{showHistory ? 'Hide' : 'History'} ({txs.length})</button>
        )}
      </div>

      {mode !== 'none' && (
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center', borderTop: '1px solid var(--sand)', paddingTop: 14 }}>
          <input value={amount} onChange={e => setAmount(e.target.value)} type="number"
            placeholder={mode === 'add' ? 'Points added' : 'Points redeemed'} style={{ ...inp, width: 130 }} />
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder={mode === 'add' ? 'Note (optional)' : 'e.g. Utah Trip'} style={{ ...inp, width: 160 }} />
          <input value={date} onChange={e => setDate(e.target.value)} type="date" style={inp} />
          <button onClick={submitTx} disabled={saving || !amount} style={{
            padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            background: 'var(--ox)', color: '#fff', border: 'none',
            cursor: saving ? 'default' : 'pointer', opacity: saving || !amount ? .6 : 1,
          }}>{saving ? 'Saving…' : mode === 'add' ? 'Add' : 'Redeem'}</button>
        </div>
      )}

      {showHistory && txs.length > 0 && (
        <div style={{ borderTop: '1px solid var(--sand)' }}>
          {txs.map(tx => (
            <div key={tx.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 20px', borderTop: '1px solid var(--sand)', fontSize: 12,
            }}>
              <div>
                <span style={{ fontWeight: 600, color: tx.delta > 0 ? '#166534' : '#991b1b' }}>
                  {tx.delta > 0 ? '+' : ''}{tx.delta.toLocaleString()} pts
                </span>
                {tx.note && <span style={{ color: 'var(--bark)' }}> · {tx.note}</span>}
                <span style={{ color: 'var(--bark)' }}>
                  {' '}· {tx.delta < 0 ? 'Redeemed' : 'Added'} {dateFmt(tx.occurred_on)}
                </span>
              </div>
              <button onClick={() => undoTx(tx.id)} style={{
                background: 'none', border: 'none', color: 'var(--bark)', fontSize: 11,
                cursor: 'pointer', textDecoration: 'underline',
              }}>undo</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Points page ─────────────────────────────────────────

export default function PointsPage({ cards, cardPoints, pointTransactions }: Props) {
  const cpByCard = new Map(cardPoints.map(cp => [cp.card_id, cp]))
  const txByCardPoints = new Map<string, PointTransaction[]>()
  for (const tx of pointTransactions) {
    const list = txByCardPoints.get(tx.card_points_id) ?? []
    list.push(tx)
    txByCardPoints.set(tx.card_points_id, list)
  }

  const totalValue = cardPoints.reduce((s, cp) => s + (cp.balance * cp.value_per_point_cents) / 100, 0)
  const totalPoints = cardPoints.reduce((s, cp) => s + cp.balance, 0)

  const section = (owner: 'katie' | 'stephen', label: string) => {
    const ownerCards = cards.filter(c => c.owner === owner)
    return (
      <>
        <h2 className="fr" style={{ fontSize: 20, margin: '24px 0 16px' }}>{label}</h2>
        {ownerCards.map(card => {
          const cp = cpByCard.get(card.id)
          if (!cp) return null
          return <CardPointsRow key={card.id} card={card} cp={cp} txs={txByCardPoints.get(cp.id) ?? []} />
        })}
      </>
    )
  }

  return (
    <div>
      <div style={{ background: 'var(--ox)', borderRadius: 14, padding: 24, color: '#fff', marginBottom: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', opacity: .7 }}>
          Total estimated value
        </p>
        <p className="fr" style={{ fontSize: 48, lineHeight: 1, marginTop: 4 }}>{fmtUsd(totalValue)}</p>
        <p style={{ fontSize: 14, opacity: .6, marginTop: 4 }}>{totalPoints.toLocaleString()} points across all cards</p>
      </div>

      {section('katie', 'Katie')}
      {section('stephen', 'Stephen')}
    </div>
  )
}
