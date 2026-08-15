import { NextRequest, NextResponse } from 'next/server'
import { checkPassword, createSessionCookie, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  let body: { password?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }

  if (!checkPassword(body.password ?? '')) {
    return NextResponse.json({ ok: false, error: 'Invalid password' }, { status: 401 })
  }

  const token = await createSessionCookie()
  const res = NextResponse.json({ ok: true })
  setSessionCookie(res, token)
  return res
}
