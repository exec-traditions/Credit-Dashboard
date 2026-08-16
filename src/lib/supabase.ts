/**
 * Supabase server client — always uses the service-role key.
 * Safe to call from API routes and Server Components only.
 * Never import this in client components.
 *
 * Lazily initialized so the app can BUILD without env vars
 * (e.g. first Vercel deploy before keys are configured).
 * Missing env only errors at request time.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'

let _db: SupabaseClient<Database> | null = null

function getDb(): SupabaseClient<Database> {
  if (_db) return _db
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL')
  if (!key) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY')
  _db = createClient<Database>(url, key, { auth: { persistSession: false } })
  return _db
}

/** Proxy so existing `db.from(...)` call sites work unchanged. */
export const db = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getDb()
    const value = client[prop as keyof SupabaseClient<Database>]
    return typeof value === 'function' ? (value as Function).bind(client) : value
  },
})
