'use client'

/**
 * PartialUseEditor — inline "some used" editor for a credit.
 * Enter the dollar amount used so far this period; shows what's left.
 * Saving 0 clears the usage; saving the full amount marks the credit used.
 */

import { useState } from 'react'

const fmtAmount = (cents: number) => {
  const d = cents / 100
  return d % 1 === 0 ? '$' + d.toLocaleString() : '$' + d.toFixed(2)
}

export default function PartialUseEditor({ amountCents, usedCents, onSave, onCancel, indent = 20 }: {
  amountCents: number
  usedCents: number
  onSave: (usedCents: number) => void
  onCancel: () => void
  indent?: number
}) {
  const [val, setVal] = useState(usedCents > 0 ? String(usedCents / 100) : '')

  const parsed = Number(val)
  const valid  = val.trim() !== '' && Number.isFinite(parsed) && parsed >= 0
  const cents  = valid ? Math.min(amountCents, Math.round(parsed * 100)) : 0
  const left   = amountCents - cents

  const save = () => { if (valid) onSave(cents) }

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: `10px 16px 12px ${indent}px`, background: '#fdf8f2',
        borderTop: '1px dashed var(--sand)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--bark)' }}>Used $</span>
      <input
        autoFocus
        type="number" inputMode="decimal" min={0} max={amountCents / 100} step="0.01"
        value={val}
        placeholder="0"
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel() }}
        style={{
          width: 84, fontSize: 16, padding: '6px 8px', borderRadius: 8,
          border: '1px solid var(--sand)', background: '#fff', color: 'var(--ink)',
        }}
      />
      <span style={{ fontSize: 12, color: 'var(--bark)', flex: 1, minWidth: 90 }}>
        of {fmtAmount(amountCents)}{valid ? ` · ${fmtAmount(left)} left` : ''}
      </span>
      <button onClick={save} disabled={!valid} style={{
        fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
        cursor: valid ? 'pointer' : 'default', opacity: valid ? 1 : .5,
        background: 'var(--ox)', border: 'none', color: '#fff',
      }}>Save</button>
      <button onClick={onCancel} style={{
        fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
        background: 'transparent', border: '1px solid var(--sand)', color: 'var(--bark)',
      }}>Cancel</button>
    </div>
  )
}
