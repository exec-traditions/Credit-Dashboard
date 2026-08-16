'use client'

/**
 * PointsPage — one row per person per issuer (e.g. "American Express
 * (Stephen)"), not per card. Shows balance, estimated $ value using a
 * realistic per-program valuation, add/redeem forms, and history.
 *
 * All mutations update local state directly (no router.refresh()) so
 * the active tab and any other open edit forms on the page are never
 * disturbed — you can have multiple accounts open and editing at once.
 */

import { useState } from 'react'
import type { PointsAccount, PointTransaction } from '@/types/db'

const fmtUsd = (dollars: number) =>
  '$' + dollars.toLocaleString(undefined, { maximumFractionDigits: 0 })

const todayIso = () => new Date().toISOString().slice(0, 10)

const dateFmt = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// Display label for the issuer, independent of the stored program_name
// (which can be edited freely) — used for the card header only.
const NETWORK_LABEL: Record<string, string> = {
  amex: 'American Express',
  chase: 'Chase',
  citi: 'Citi',
  marriott: 'Marriott',
  ihg: 'IHG',
  hilton: 'Hilton',
  southwest: 'Southwest',
}

interface Props {
  pointsAccounts: PointsAccount[]
  pointTransactions: PointTransaction[]
  onAccountUpdated: (account: PointsAccount) => void
  onTransactionAdded: (tx: PointTransaction) => void
  onTransactionRemoved: (txId: string) => void
}

// ── One issuer's points block (per person) ──────────────────

function AccountRow({ acct, txs, onAccountUpdated, onTransactionAdded, onTransactionRemoved }: {
  acct: PointsAccount
  txs: PointTransaction[]
  onAccountUpdated: (account: PointsAccount) => void
  onTransactionAdded: (tx: PointTransaction) => void
  onTransactionRemoved: (txId: string) => void
}) {
  const [mode, setMode] = useState<'none' | 'add' | 'redeem'>('none')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayIso())
  const [saving, setSaving] = useState(false)
  const [editingSettings, setEditingSettings] = useState(false)
  const [programName, setProgramName] = useState(acct.program_name)
  const [valuePerPoint, setValuePerPoint] = useState(String(acct.value_per_point_cents))
  const [showHistory, setShowHistory] = useState(false)

  const estValue = (acct.balance * acct.value_per_point_cents) / 100

  const reset = () => { setMode('none'); setAmount(''); setNote(''); setDate(todayIso()) }

  async function submitTx() {
    const n = Math.trunc(Number(amount))
    if (!n || n <= 0) return
    setSaving(true)
    try {
      const res = await fetch(`/api/points/${acct.id}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delta: mode === 'redeem' ? -n : n,
          note: note || null,
          occurred_on: date,
        }),
      })
      const j = await res.json()
      if (j.ok) {
        onAccountUpdated({ ...acct, balance: j.balance })
        if (j.transaction) onTransactionAdded(j.transaction)
        reset()
      }
    } finally {
      setSaving(false)
    }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      const res = await fetch(`/api/points/${acct.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_name: programName,
          value_per_point_cents: Number(valuePerPoint) || 0,
        }),
      })
      const j = await res.json()
      if (j.ok && j.account) {
        onAccountUpdated(j.account)
        setEditingSettings(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function undoTx(txId: string) {
    if (!confirm('Undo this transaction?')) return
    const res = await fetch(`/api/points/transactions/${txId}`, { method: 'DELETE' })
    const j = await res.json()
    if (j.ok) {
      onAccountUpdated({ ...acct, balance: j.balance })
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
    <div style={{ background: '#fff', border: '1px solid var(--sand)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingSettings ? (
            <input value={programName} onChange={e => setProgramName(e.target.value)}
              style={{ ...inp, fontSize: 14, fontWeight: 600, marginBottom: 6 }} />
          ) : (
            <p style={{ fontSize: 14, fontWeight: 600 }}>{programName || NETWORK_LABEL[acct.network] || acct.network}</p>
          )}
          <p style={{ fontSize: 12, color: 'var(--bark)', marginTop: 2 }}>
            {acct.owner === 'katie' ? 'Katie' : 'Stephen'}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p className="fr" style={{ fontSize: 22 }}>{acct.balance.toLocaleString()}</p>
          {editingSettings ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <input value={valuePerPoint} onChange={e => setValuePerPoint(e.target.value)}
                style={{ ...inp, width: 60, fontSize: 12, padding: '4px 6px', textAlign: 'right' }} />
              <span style={{ fontSize: 11, color: 'var(--bark)' }}>¢/pt</span>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--bark)' }}>
              ~{fmtUsd(estValue)} · {acct.value_per_point_cents}¢/pt
            </p>
          )}
        </div>
      </div>

      {/* Action row */}
      <div style={{ padding: '0 20px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        {editingSettings ? (
          <>
            <button onClick={saveSettings} disabled={saving} style={btn('var(--ox)', '#fff')}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => {
              setEditingSettings(false)
              setProgramName(acct.program_name)
              setValuePerPoint(String(acct.value_per_point_cents))
            }} style={btn('transparent', 'var(--bark)')}>Cancel</button>
          </>
        ) : mode === 'none' ? (
          <>
            <button onClick={() => setMode('add')} style={btn('#dcfce7', '#166534')}>+ Add points</button>
            <button onClick={() => setMode('redeem')} style={btn('#fef3c7', '#92400e')}>− Redeem</button>
            <button onClick={() => setEditingSettings(true)} style={btn('transparent', 'var(--bark)')}>Edit</button>
            {txs.length > 0 && (
              <button onClick={() => setShowHistory(h => !h)} style={btn('transparent', 'var(--bark)')}>
                {showHistory ? 'Hide' : 'Show'} history ({txs.length})
              </button>
            )}
          </>
        ) : (
          <div style={{ width: '100%' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: mode === 'redeem' ? '#92400e' : '#166534', marginBottom: 8 }}>
              {mode === 'redeem' ? 'Redeem points' : 'Add points'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input type="number" placeholder="Amount" value={amount}
                onChange={e => setAmount(e.target.value)} style={inp} />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
            </div>
            <input placeholder={mode === 'redeem' ? 'Note — e.g. Utah Trip' : 'Note — optional'}
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

      {/* History */}
      {showHistory && txs.length > 0 && (
        <div style={{ borderTop: '1px solid var(--sand)' }}>
          {txs.map(tx => (
            <div key={tx.id} style={{
              padding: '10px 20px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', borderTop: '1px solid var(--sand)',
            }}>
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink)' }}>
                  {tx.delta > 0 ? '+' : ''}{tx.delta.toLocaleString()} pts
                  {tx.note ? ` · ${tx.note}` : ''}
                </p>
                <p style={{ fontSize: 11, color: 'var(--bark)', marginTop: 2 }}>{dateFmt(tx.occurred_on)}</p>
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

// ── Page ─────────────────────────────────────────────────────

export default function PointsPage({
  pointsAccounts, pointTransactions, onAccountUpdated, onTransactionAdded, onTransactionRemoved,
}: Props) {
  const txsByAccount = new Map<string, PointTransaction[]>()
  for (const tx of pointTransactions) {
    const list = txsByAccount.get(tx.points_account_id) ?? []
    list.push(tx)
    txsByAccount.set(tx.points_account_id, list)
  }
  for (const list of txsByAccount.values()) {
    list.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
  }

  const totalValue = pointsAccounts.reduce(
    (s, a) => s + (a.balance * a.value_per_point_cents) / 100, 0
  )

  const section = (owner: 'katie' | 'stephen', label: string) => {
    const accts = pointsAccounts.filter(a => a.owner === owner)
    if (accts.length === 0) return null
    return (
      <div key={owner}>
        <h2 className="fr" style={{ fontSize: 20, margin: owner === 'katie' ? '0 0 16px' : '24px 0 16px' }}>{label}</h2>
        {accts.map(a => (
          <AccountRow
            key={a.id}
            acct={a}
            txs={txsByAccount.get(a.id) ?? []}
            onAccountUpdated={onAccountUpdated}
            onTransactionAdded={onTransactionAdded}
            onTransactionRemoved={onTransactionRemoved}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div style={{ background: 'var(--ox)', borderRadius: 14, padding: 24, color: '#fff', marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', opacity: .7 }}>
          Total points value
        </p>
        <p className="fr" style={{ fontSize: 48, lineHeight: 1, marginTop: 4 }}>{fmtUsd(totalValue)}</p>
        <p style={{ fontSize: 14, opacity: .6, marginTop: 4 }}>
          across {pointsAccounts.length} account{pointsAccounts.length !== 1 ? 's' : ''}
        </p>
      </div>
      {section('katie', 'Katie')}
      {section('stephen', 'Stephen')}
      {pointsAccounts.length === 0 && (
        <p style={{ color: 'var(--bark)', fontSize: 14 }}>No points accounts yet.</p>
      )}
    </div>
  )
}
