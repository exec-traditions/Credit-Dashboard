import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

/**
 * Undo a points transaction: deletes the log row and reverses its
 * effect on the card's balance.
 * DELETE /api/points/transactions/[txId]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { txId: string } }
) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { txId } = params

  const { data: tx, error: txErr } = await db
    .from('point_transactions')
    .select('id, card_points_id, delta')
    .eq('id', txId)
    .single()
  if (txErr || !tx) {
    return NextResponse.json({ ok: false, error: 'Transaction not found' }, { status: 404 })
  }

  const { data: cp } = await db
    .from('card_points')
    .select('id, balance')
    .eq('id', tx.card_points_id)
    .single()

  const newBalance = Math.max(0, (cp?.balance ?? 0) - tx.delta)

  const { error: delErr } = await db.from('point_transactions').delete().eq('id', txId)
  if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 })

  await db
    .from('card_points')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', tx.card_points_id)

  return NextResponse.json({ ok: true, balance: newBalance })
}
