'use client'

import { useState } from 'react'
import type { Card, Certificate, CertBalanceTransaction } from '@/types/db'

const fmt = (cents: number) =>
  '$' + Math.round(cents / 100).toLocaleString()

// ── Balance-tracked certificate row (e.g. United Flight Credit / TravelBank) ──
// Moved to its own file to force a fresh build after a stuck Vercel build cache
// kept serving an old compiled bundle that was missing the expires_at display.

export default function BalanceCertRow({ cert, card, txs, onCertUpdated, onTransactionAdded, onTransactionRemoved }: {
  cert: Certificate
  card: Card | undefined
  txs: CertBalanceTransaction[]
  onCertUpdated: (cert: Certificate) => void
  onTransactionAdded: (tx: CertBalanceTransaction) => void
  onTransactionRemoved: (txId: string) => void
}) {
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

  const expFmt = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  async function submitTx() {
    const dollars = Number(amount)
    if (!dollars || dollars <= 0) return
    const deltaCents = Math.round(dollars * 100) * (mode === 'spend' ? -1 : 1)
    setSaving(true)
    try {
      const res = await fetch(`/api/certs/${cert.id}/balance-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta_cents: deltaCents, note: note || null, occurred_on: date }),
      })
      const j = await res.json()
      if (j.ok) {
        onCertUpdated({ ...cert, balance_cents: j.balance_cents })
        if (j.transaction) onTransactionAdded(j.transaction)
        reset()
      }
    } finally {
      setSaving(false)
    }
  }

  async function undoTx(txId: string) {
    if (!confirm('Undo this transaction?')) return
    const res = await fetch(`/api/certs/balance-transactions/${txId}`, { method: 'DELETE' })
    const j = await res.json()
    if (j.ok) {
      onCertUpdated({ ...cert, balance_cents: j.balance_cents })
      onTransactionRemoved(txId)
    }
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
          {cert.expires_at && (
            <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginTop: 4 }}>
              Expires {expFmt(cert.expires_at)}
            </p>
          )}
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
