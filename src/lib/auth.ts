/**
 * Cookie-based session auth.
 *
 * No per-user identity — everyone who knows APP_PASSWORD sees the same data.
 * Session is a signed JWT (HS256) stored in an httpOnly cookie.
 */
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

const COOKIE_NAME = 'session'
const MAX_AGE     = 60 * 60 * 24 * 30  // 30 days

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('Missing env: SESSION_SECRET')
  return new TextEncoder().encode(s)
}

export async function createSessionCookie(): Promise<string> {
  const token = await new SignJWT({ role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
  return token
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

/** Check request cookies; return true if session is valid. */
export async function isAuthenticated(req?: NextRequest): Promise<boolean> {
  try {
    let token: string | undefined
    if (req) {
      token = req.cookies.get(COOKIE_NAME)?.value
    } else {
      const store = await cookies()
      token = store.get(COOKIE_NAME)?.value
    }
    if (!token) return false
    return verifySession(token)
  } catch {
    return false
  }
}

/** Verify APP_PASSWORD in constant time to prevent timing attacks. */
export function checkPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD
  if (!expected) return false
  try {
    const a = Buffer.from(input.padEnd(expected.length))
    const b = Buffer.from(expected.padEnd(input.length))
    // Lengths must match first
    if (input.length !== expected.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/** Set session cookie on a NextResponse. */
export function setSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
  return res
}

/** Clear session cookie. */
export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
  return res
}

/** Middleware helper — redirect to /login if not authenticated. */
export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const auth = await isAuthenticated(req)
  if (!auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return null
}
