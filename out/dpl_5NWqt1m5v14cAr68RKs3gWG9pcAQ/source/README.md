# Credit Dashboard v3

Next.js + Supabase app for Katie & Stephen's card credit tracking.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** (Postgres + service-role key)
- **jose** (JWT session cookie, no third-party auth)
- **Vercel** (deploy target — free tier)

## First-time setup

### 1. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your **Project URL** and **service_role key** from Settings → API

### 2. Run migrations

In Supabase Studio → SQL Editor, paste and run:

```
supabase/migrations/001_initial_schema.sql
```

Or use the CLI:
```bash
supabase db push
```

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_PASSWORD=pick-a-strong-shared-password
SESSION_SECRET=$(openssl rand -base64 32)
```

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → enter your APP_PASSWORD.

## Deploy to Vercel

```bash
npx vercel
```

Add the same env vars in the Vercel dashboard (Settings → Environment Variables).

## Sharing with Stephen

Both Katie and Stephen use the same APP_PASSWORD — one shared login.
The dashboard distinguishes owners by the `owner` column in the `cards` table
(`'katie'` | `'stephen'`). There is no per-user session; whoever has the password
sees everything.

## Data model highlights

- **`usage_log`** is the source of truth — absence of a row = unused.
  Toggling "used" inserts a row; toggling back **deletes** it (not zeroes it).
- **`trip_allocations`** is intent-only. Cancelling a trip sets allocations to
  `cancelled` but never touches `usage_log`.
- **Period keys** auto-reset by date. A credit tagged `quarterly` stored as
  `2026-Q1` will automatically be treated as unused when `2026-Q2` starts.
- **`rate_cache`** replaces `localStorage` — Claude.ai rate research results
  are stored here, keyed by `(hotel_name, check_in, check_out)`.

## Rate research workflow

1. Open a trip on the Trips page → click **Generate Rate Search Prompt**
2. Copy the prompt → paste into [Claude.ai](https://claude.ai)
3. Copy Claude's JSON response → paste into the dashboard
4. Results are saved to `rate_cache` via `POST /api/rate-cache`

## File map

```
src/
  app/
    api/
      auth/login/          POST — set session cookie
      auth/check/          GET  — validate session
      credits/period-state GET  — all credits with current period usage
      credits/[id]/log     POST — mark credit used
      credits/[id]/unmark  POST — mark credit unused
      trips/               GET, POST
      trips/[id]/shortlist GET, POST
      trips/[id]/allocate  POST
      trips/[id]/cancel    POST
      rate-cache/          GET, POST
      hotel-library/       GET
      hotel-library/verify POST
      notes/               GET, POST
      notes/[id]/          PATCH, DELETE
    dashboard/page.tsx     — server component, data load
    login/page.tsx         — login form
  components/
    DashboardClient.tsx    — full UI (credits, certs, trips, notes tabs)
  lib/
    supabase.ts            — Supabase server client
    auth.ts                — cookie session helpers
    period-key.ts          — period key computation
    rate-prompt.ts         — Claude.ai prompt builder + response parser
  types/
    db.ts                  — TypeScript types from schema
  middleware.ts            — auth guard for all routes
supabase/
  migrations/
    001_initial_schema.sql — full schema (11 tables)
```
