import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

interface VerifyHotel {
  name: string
  eligibility: {
    fhr: boolean; thc: boolean; edit: boolean
    ihg: boolean; hilton: boolean; marriott: boolean
  }
  rates?: { low: number; high: number; source: string; confidence: string }
  notes?: string
}

interface VerifyBody {
  verified_at: string
  hotels: VerifyHotel[]
  date_range?: { check_in: string; check_out: string }
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: VerifyBody
  try { body = await req.json() }
  catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }

  if (!body.verified_at || !Array.isArray(body.hotels)) {
    return NextResponse.json({ ok: false, error: 'verified_at and hotels[] required' }, { status: 400 })
  }

  let updated = 0

  for (const hotel of body.hotels) {
    const patch: Record<string, unknown> = {
      program_fhr:      hotel.eligibility.fhr,
      program_thc:      hotel.eligibility.thc,
      program_edit:     hotel.eligibility.edit,
      program_ihg:      hotel.eligibility.ihg,
      program_hilton:   hotel.eligibility.hilton,
      program_marriott: hotel.eligibility.marriott,
      last_verified_at: body.verified_at,
    }
    if (hotel.notes)               patch.verification_notes = hotel.notes
    if (hotel.rates?.low  != null) patch.rate_low_cents     = Math.round(hotel.rates.low * 100)
    if (hotel.rates?.high != null) patch.rate_high_cents    = Math.round(hotel.rates.high * 100)
    if (hotel.rates?.source)       patch.rate_source        = hotel.rates.source
    if (hotel.rates?.confidence)   patch.rate_confidence    = hotel.rates.confidence
    if (body.date_range?.check_in)  patch.rate_check_in     = body.date_range.check_in
    if (body.date_range?.check_out) patch.rate_check_out    = body.date_range.check_out

    const { error } = await db
      .from('hotel_library')
      .update(patch)
      .ilike('name', hotel.name)   // case-insensitive name match

    if (!error) updated++
  }

  return NextResponse.json({ ok: true, updated })
}
