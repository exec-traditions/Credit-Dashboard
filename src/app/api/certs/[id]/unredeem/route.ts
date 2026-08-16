import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { db } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  let body: { year?: number } = {}
  try { body = await req.json() } catch { /* empty body */ }

  const year = body.year ?? new Date().getFullYear()

  const { error } = await db
    .from('cert_redemptions')
    .delete()
    .eq('certificate_id', id)
    .eq('year', year)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, year })
}
