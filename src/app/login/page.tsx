'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/dashboard')
      } else {
        setError('Incorrect password.')
      }
    } catch {
      setError('Network error — try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--canvas)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid var(--sand)',
        padding: '40px 32px', width: '100%', maxWidth: 380,
      }}>
        <h1 className="fr" style={{ fontSize: 28, color: 'var(--ox)', marginBottom: 4 }}>
          Credit Dashboard
        </h1>
        <p style={{ fontSize: 13, color: 'var(--bark)', marginBottom: 28 }}>
          Katie &amp; Stephen
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600,
            color: 'var(--bark)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              border: '1px solid var(--sand)', fontSize: 14,
              background: 'var(--canvas)', color: 'var(--ink)',
              marginBottom: error ? 8 : 16, outline: 'none',
            }}
          />
          {error && (
            <p style={{ fontSize: 12, color: '#b91c1c', marginBottom: 12 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 8,
              background: 'var(--ox)', color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              opacity: !password ? 0.6 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
