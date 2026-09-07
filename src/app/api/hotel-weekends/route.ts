import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const { id, label, sub, best } = body
  if (!id || !label) return NextResponse.json({ ok: false, error: 'id and label are required' }, { status: 400 })

  const { data, error } = await db.from('hotel_weekends')
    .insert({ id, label, sub: sub ?? null, best: best ?? null })
    .select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, weekend: data })
}
