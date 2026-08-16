import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

/**
 * Add or redeem points for a card.
 * POST /api/points/[id]/transaction   ([id] = card_points.id)
 * body: { delta: number, note?: string, occurred_on?: string (ISO date) }
 *   delta > 0 -> add points, delta < 0 -> redeem points.
 * Balance is clamped at 0 (can't redeem more than available).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  let body: { delta?: number; note?: string; occurred_on?: string } = {}
  try { body = await req.json() } catch { /* empty body */ }

  const delta = Math.trunc(body.delta ?? 0)
  if (!delta) {
    return NextResponse.json({ ok: false, error: 'delta is required and must be non-zero' }, { status: 400 })
  }

  const { data: cp, error: cpErr } = await db
    .from('card_points')
    .select('id, balance')
    .eq('id', id)
    .single()

  if (cpErr || !cp) {
    return NextResponse.json({ ok: false, error: 'Card points row not found' }, { status: 404 })
  }

  const newBalance = Math.max(0, cp.balance + delta)
  const occurred_on = body.occurred_on || new Date().toISOString().slice(0, 10)

  const { error: txErr } = await db.from('point_transactions').insert({
    card_points_id: id,
    delta,
    note: body.note?.trim() || null,
    occurred_on,
  })
  if (txErr) return NextResponse.json({ ok: false, error: txErr.message }, { status: 500 })

  const { error: updErr } = await db
    .from('card_points')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, balance: newBalance })
}
