import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

/**
 * Undo a certificate balance transaction: deletes the log row and
 * reverses its effect on the certificate's balance.
 * DELETE /api/certs/balance-transactions/[txId]
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
    .from('cert_balance_transactions')
    .select('id, certificate_id, delta_cents')
    .eq('id', txId)
    .single()
  if (txErr || !tx) {
    return NextResponse.json({ ok: false, error: 'Transaction not found' }, { status: 404 })
  }

  const { data: cert } = await db
    .from('certificates')
    .select('id, balance_cents')
    .eq('id', tx.certificate_id)
    .single()

  const newBalance = Math.max(0, (cert?.balance_cents ?? 0) - tx.delta_cents)

  const { error: delErr } = await db.from('cert_balance_transactions').delete().eq('id', txId)
  if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 })

  await db
    .from('certificates')
    .update({ balance_cents: newBalance })
    .eq('id', tx.certificate_id)

  return NextResponse.json({ ok: true, balance_cents: newBalance })
}
