import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

/**
 * Update a points account's program name and/or estimated value per point.
 * PATCH /api/points/[id]/settings   ([id] = points_accounts.id)
 * body: { program_name?: string, value_per_point_cents?: number }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  let body: { program_name?: string; value_per_point_cents?: number } = {}
  try { body = await req.json() } catch { /* empty body */ }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.program_name !== undefined) update.program_name = body.program_name.trim()
  if (body.value_per_point_cents !== undefined) update.value_per_point_cents = body.value_per_point_cents

  const { error } = await db.from('points_accounts').update(update).eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
