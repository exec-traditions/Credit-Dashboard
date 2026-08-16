import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await isAuthenticated(req)
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true })
}
