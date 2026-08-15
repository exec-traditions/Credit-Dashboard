import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tripId = params.id

  // Cancel all active allocations for this trip
  const { data: cancelledAllocations, error: aErr } = await db
    .from('trip_allocations')
    .update({ status: 'cancelled' })
    .eq('trip_id', tripId)
    .neq('status', 'cancelled')
    .select()

  if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 })

  // Cancel the trip itself
  const { error: tErr } = await db
    .from('trips')
    .update({ status: 'cancelled' })
    .eq('id', tripId)

  if (tErr) return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 })

  // NOTE: usage_log is intentionally NOT touched — credits that were logged
  // stay logged. Allocations are planning intent only.

  return NextResponse.json({
    ok: true,
    trip_id: tripId,
    cancelled_allocations: cancelledAllocations ?? [],
  })
}
