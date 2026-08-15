import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await db
    .from('pinned_notes')
    .select('*')
    .order('pinned', { ascending: false })
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ notes: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, body: noteBody, card_id, pinned = false, sort_order = 0 } = body

  if (!title || !noteBody) {
    return NextResponse.json({ ok: false, error: 'title and body are required' }, { status: 400 })
  }

  const { data, error } = await db
    .from('pinned_notes')
    .insert({ title, body: noteBody, card_id, pinned, sort_order })
    .select()
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, note: data })
}
