import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'
import { parseRateResponse } from '@/lib/rate-prompt'

export async function POST(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { trip_id, raw_json } = body

  // Validate and parse the Claude response
  let parsed
  try {
    parsed = parseRateResponse(typeof raw_json === 'string' ? raw_json : JSON.stringify(raw_json))
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 422 })
  }

  // Determine check_in / check_out from trip or from the Claude response
  let check_in: string = parsed.trip.check_in
  let check_out: string = parsed.trip.check_out

  if (trip_id) {
    const { data: trip } = await db
      .from('trips')
      .select('check_in, check_out')
      .eq('id', trip_id)
      .single()
    if (trip?.check_in)  check_in  = trip.check_in
    if (trip?.check_out) check_out = trip.check_out
  }

  // Upsert one rate_cache row per hotel
  let upserted = 0
  for (const hotel of parsed.hotels) {
    const row = {
      hotel_name:          hotel.name,
      trip_id:             trip_id ?? null,
      check_in,
      check_out,
      rate_low_cents:      Math.round((hotel.rates?.low ?? 0) * 100),
      rate_high_cents:     Math.round((hotel.rates?.high ?? 0) * 100),
      rate_confidence:     hotel.rates?.confidence ?? null,
      rate_source:         hotel.rates?.source ?? null,
      amenity_total_cents: Math.round((hotel.amenity?.total_usd ?? 0) * 100),
      amenity_breakdown:   hotel.amenity?.breakdown ?? null,
      net_low_cents:       Math.round((hotel.net_cost?.low_total ?? 0) * 100),
      net_high_cents:      Math.round((hotel.net_cost?.high_total ?? 0) * 100),
      better_than_free:    hotel.net_cost?.better_than_free ?? false,
      fhr_confirmed:       hotel.eligibility?.fhr ?? null,
      thc_confirmed:       hotel.eligibility?.thc ?? null,
      edit_confirmed:      hotel.eligibility?.edit ?? null,
      researched_at:       parsed.researched_at,
      raw_json:            parsed as unknown as Record<string, unknown>,
    }

    const { error } = await db
      .from('rate_cache')
      .upsert(row, { onConflict: 'hotel_name,check_in,check_out' })

    if (!error) upserted++
  }

  return NextResponse.json({ ok: true, upserted })
}

export async function GET(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const trip_id    = searchParams.get('trip_id')
  const hotel_name = searchParams.get('hotel_name')
  const check_in   = searchParams.get('check_in')
  const check_out  = searchParams.get('check_out')

  let query = db.from('rate_cache').select('*').order('researched_at', { ascending: false })

  if (trip_id)    query = query.eq('trip_id', trip_id)
  if (hotel_name) query = query.eq('hotel_name', hotel_name)
  if (check_in)   query = query.eq('check_in', check_in)
  if (check_out)  query = query.eq('check_out', check_out)

  const { data, error } = await query
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // Mark entries older than 30 days as stale
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString()
  const entries = (data ?? []).map(e => ({
    ...e,
    stale: e.researched_at < thirtyDaysAgo,
  }))

  return NextResponse.json({ entries })
}
