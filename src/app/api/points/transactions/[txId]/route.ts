import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

/**
 * Undo a points transaction: deletes the log row and reverses its
 * effect on the account's balance.
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
    .select('id, points_account_id, delta')
    .eq('id', txId)
    .single()
  if (txErr || !tx) {
    return NextResponse.json({ ok: false, error: 'Transaction not found' }, { status: 404 })
  }

  const { data: acct } = await db
    .from('points_accounts')
    .select('id, balance')
    .eq('id', tx.points_account_id)
    .single()

  const newBalance = Math.max(0, (acct?.balance ?? 0) - tx.delta)

  const { error: delErr } = await db.from('point_transactions').delete().eq('id', txId)
  if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 })

  await db
    .from('points_accounts')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', tx.points_account_id)

  return NextResponse.json({ ok: true, balance: newBalance })
}
