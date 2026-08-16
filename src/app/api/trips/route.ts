import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = db.from('trips').select('*').order('check_in', { ascending: true })

  if (status === 'all') {
    // return everything
  } else if (status) {
    query = query.eq('status', status)
  } else {
    // default: all non-cancelled
    query = query.neq('status', 'cancelled')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ trips: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, destination, check_in, check_out, travelers, target_cost_cents, notes } = body

  if (!title || !destination) {
    return NextResponse.json({ ok: false, error: 'title and destination are required' }, { status: 400 })
  }

  // Derive nights from dates
  let nights: number | null = null
  if (check_in && check_out) {
    const diff = (new Date(check_out).getTime() - new Date(check_in).getTime()) / 86400000
    nights = Math.round(diff)
  }

  const { data, error } = await db
    .from('trips')
    .insert({ title, destination, check_in, check_out, nights, travelers, target_cost_cents, notes })
    .select()
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, trip: data })
}
