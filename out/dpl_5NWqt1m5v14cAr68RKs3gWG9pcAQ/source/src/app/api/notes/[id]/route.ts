import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.title      !== undefined) patch.title      = body.title
  if (body.body       !== undefined) patch.body       = body.body
  if (body.card_id    !== undefined) patch.card_id    = body.card_id
  if (body.pinned     !== undefined) patch.pinned     = body.pinned
  if (body.sort_order !== undefined) patch.sort_order = body.sort_order

  const { data, error } = await db
    .from('pinned_notes')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, note: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await db.from('pinned_notes').delete().eq('id', params.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
