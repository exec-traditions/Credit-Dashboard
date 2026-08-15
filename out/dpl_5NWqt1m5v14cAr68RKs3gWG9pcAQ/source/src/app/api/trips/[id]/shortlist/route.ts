import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { hotel_name, hotel_library_id, rank, notes } = body

  if (!hotel_name) {
    return NextResponse.json({ ok: false, error: 'hotel_name is required' }, { status: 400 })
  }

  const { data, error } = await db
    .from('trip_shortlist')
    .insert({ trip_id: params.id, hotel_name, hotel_library_id, rank, notes })
    .select()
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, shortlist_entry: data })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await db
    .from('trip_shortlist')
    .select('*')
    .eq('trip_id', params.id)
    .order('rank', { ascending: true, nullsFirst: false })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ shortlist: data ?? [] })
}
