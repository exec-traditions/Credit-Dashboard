import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { data: weekends } = await db.from('hotel_weekends').select('*').order('sort_order').order('created_at')
  const { data: bookings } = await db.from('hotel_bookings').select('*').order('created_at')
  return NextResponse.json({ ok: true, weekends: weekends ?? [], bookings: bookings ?? [] })
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const {
    weekend_id, city, hotel_name, program, stay_dates, check_in, check_out,
    nights, stars, distance, total_cents, property_credit_cents, breakfast,
    parking, resort_fee, spend, offer, notes,
  } = body

  if (!weekend_id || !city || !hotel_name || !program) {
    return NextResponse.json({ ok: false, error: 'weekend_id, city, hotel_name, and program are required' }, { status: 400 })
  }

  const { data, error } = await db.from('hotel_bookings').insert({
    weekend_id, city, hotel_name, program, stay_dates: stay_dates ?? null,
    check_in: check_in ?? null, check_out: check_out ?? null,
    nights: nights ?? 1, stars: stars ?? null, distance: distance ?? null,
    total_cents: total_cents ?? null, property_credit_cents: property_credit_cents ?? null,
    breakfast: breakfast ?? null, parking: parking ?? null, resort_fee: resort_fee ?? null,
    spend: spend ?? [], offer: offer ?? null, notes: notes ?? null,
    status: 'option', booked: false, source: 'manual',
  }).select().single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, booking: data })
}
