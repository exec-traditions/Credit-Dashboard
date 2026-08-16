import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

/**
 * Add or spend from a balance-tracked certificate (e.g. United Flight
 * Credit, United TravelBank).
 * POST /api/certs/[id]/balance-transaction   ([id] = certificates.id)
 * body: { delta_cents: number, note?: string, occurred_on?: string }
 *   delta_cents > 0 -> add, delta_cents < 0 -> spend.
 * Balance is clamped at 0.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  let body: { delta_cents?: number; note?: string; occurred_on?: string } = {}
  try { body = await req.json() } catch { /* empty body */ }

  const delta = Math.trunc(body.delta_cents ?? 0)
  if (!delta) {
    return NextResponse.json({ ok: false, error: 'delta_cents is required and must be non-zero' }, { status: 400 })
  }

  const { data: cert, error: certErr } = await db
    .from('certificates')
    .select('id, balance_cents, is_balance_tracked')
    .eq('id', id)
    .single()

  if (certErr || !cert || !cert.is_balance_tracked) {
    return NextResponse.json({ ok: false, error: 'Balance-tracked certificate not found' }, { status: 404 })
  }

  const newBalance = Math.max(0, (cert.balance_cents ?? 0) + delta)
  const occurred_on = body.occurred_on || new Date().toISOString().slice(0, 10)

  const { error: txErr } = await db.from('cert_balance_transactions').insert({
    certificate_id: id,
    delta_cents: delta,
    note: body.note?.trim() || null,
    occurred_on,
  })
  if (txErr) return NextResponse.json({ ok: false, error: txErr.message }, { status: 500 })

  const { error: updErr } = await db
    .from('certificates')
    .update({ balance_cents: newBalance })
    .eq('id', id)
  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, balance_cents: newBalance })
}
