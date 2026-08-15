import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { credit_id, certificate_id, amount_cents, status = 'planned', notes } = body

  // Exactly one of credit_id / certificate_id must be set
  if ((!credit_id && !certificate_id) || (credit_id && certificate_id)) {
    return NextResponse.json(
      { ok: false, error: 'Exactly one of credit_id or certificate_id is required' },
      { status: 400 }
    )
  }

  const { data, error } = await db
    .from('trip_allocations')
    .insert({
      trip_id:        params.id,
      credit_id:      credit_id ?? null,
      certificate_id: certificate_id ?? null,
      amount_cents,
      status,
      notes,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, allocation: data })
}
