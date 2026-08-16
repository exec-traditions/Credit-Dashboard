import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const region  = searchParams.get('region')
  const state   = searchParams.get('state')
  const program = searchParams.get('program')  // 'fhr' | 'thc' | 'edit' | 'ihg' | 'hilton' | 'marriott'

  let query = db.from('hotel_library').select('*').eq('active', true)

  if (region)  query = query.eq('region', region)
  if (state)   query = query.eq('state', state)
  if (program) {
    const col = `program_${program}` as 'program_fhr' | 'program_thc' | 'program_edit' |
                                         'program_ihg' | 'program_hilton' | 'program_marriott'
    query = query.eq(col, true)
  }

  const { data, error } = await query.order('name')
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ hotels: data ?? [] })
}
