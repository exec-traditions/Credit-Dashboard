/**
 * Rate Search Prompt Template — Credit Dashboard v3
 *
 * Canonical, deterministic prompt builder. Same inputs → same output, every time.
 * Used server-side to generate the prompt the user pastes into Claude.ai.
 */

export interface RatePromptTrip {
  destination: string
  check_in:    string
  check_out:   string
  nights:      string
  travelers:   string
}

export interface RatePromptHotel {
  name:              string
  programs_to_check: string[]
}

export interface RateResult {
  researched_at: string
  trip: { destination: string; check_in: string; check_out: string; nights: number }
  hotels: Array<{
    name:        string
    eligibility: { fhr: boolean; thc: boolean; edit: boolean }
    rates:       { low: number; high: number; source: string; confidence: 'HIGH'|'MEDIUM'|'LOW'; fetched_at: string }
    amenity:     { total_usd: number; breakdown: string }
    net_cost:    { low_total: number; high_total: number; better_than_free: boolean }
  }>
  reality_check: { comparable_name: string; comparable_rate: number; source: string }
}

export function buildRatePrompt(trip: RatePromptTrip, hotels: RatePromptHotel[]): string {
  const hotelLines = hotels
    .map(h => `  { "name": "${h.name}", "programs_to_check": ${JSON.stringify(h.programs_to_check)} }`)
    .join(',\n')

  return [
    'You are a hotel rate research assistant. Search the web now — do not use training data.',
    'Return ONLY valid JSON matching the schema below. No prose, no explanation, no markdown.',
    '',
    'TRIP DETAILS:',
    `  destination: "${trip.destination}"`,
    `  check_in:    "${trip.check_in}"`,
    `  check_out:   "${trip.check_out}"`,
    `  nights:      "${trip.nights}"`,
    `  travelers:   "${trip.travelers}"`,
    '',
    'HOTELS TO RESEARCH:',
    '[', hotelLines, ']', '',
    'FOR EACH HOTEL — FOLLOW THESE STEPS IN ORDER:',
    '',
    'STEP 1 — PROGRAM ELIGIBILITY (search live, do not use training data)',
    '  FHR: search americanexpress.com/en-us/travel → Fine Hotels + Resorts. Confirm property appears.',
    '  THC: same site → The Hotel Collection. Confirm or deny.',
    '  Edit: search travel.chase.com → The Edit by Chase. Confirm or deny.',
    '  IHG/Hilton/Marriott: confirm brand affiliation from the hotel\'s own website.',
    '',
    'STEP 2 — PUBLIC NIGHTLY RATES (search live for the exact dates)',
    '  Sources: Booking.com, Hotels.com, Expedia, Google Hotels.',
    '  Record lowest standard room rate (low) and highest non-suite rate (high).',
    '  Confidence: HIGH = major OTA ≤14d ahead | MEDIUM = hotel direct or 14-30d | LOW = >30d',
    '',
    'STEP 3 — AMENITY VALUE',
    '  FHR: $100 amenity + $60/night breakfast × nights. amenity.total_usd = 100 + (60 × nights)',
    '  THC (2-night min): $100 experience credit. amenity.total_usd = 100',
    '  Edit (2-night min): $100–150 credit + breakfast. Use confirmed Chase Travel amount.',
    '',
    'STEP 4 — NET COST',
    '  low_total = (rates.low × nights) - amenity.total_usd',
    '  high_total = (rates.high × nights) - amenity.total_usd',
    '  better_than_free = amenity.total_usd >= (rates.low × nights)',
    '',
    'STEP 5 — REALITY CHECK',
    '  Find cheapest 4-star hotel for same dates NOT on the research list.',
    '',
    'RETURN THIS EXACT JSON — no other text:',
    '{',
    '  "researched_at": "<ISO 8601 timestamp>",',
    '  "trip": {',
    `    "destination": "${trip.destination}", "check_in": "${trip.check_in}", "check_out": "${trip.check_out}", "nights": <int>`,
    '  },',
    '  "hotels": [{',
    '    "name": "...",',
    '    "eligibility": { "fhr": true|false, "thc": true|false, "edit": true|false },',
    '    "rates": { "low": N, "high": N, "source": "...", "confidence": "HIGH|MEDIUM|LOW", "fetched_at": "..." },',
    '    "amenity": { "total_usd": N, "breakdown": "..." },',
    '    "net_cost": { "low_total": N, "high_total": N, "better_than_free": true|false }',
    '  }],',
    '  "reality_check": { "comparable_name": "...", "comparable_rate": N, "source": "..." }',
    '}',
  ].join('\n')
}

export function parseRateResponse(raw: string): RateResult {
  const stripped = raw.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
  let data: unknown
  try { data = JSON.parse(stripped) } catch (e) { throw new Error(`Invalid JSON: ${(e as Error).message}`) }
  const r = data as Record<string, unknown>
  if (!r.researched_at || typeof r.researched_at !== 'string') throw new Error('Missing researched_at')
  if (!Array.isArray(r.hotels) || r.hotels.length === 0) throw new Error('Missing or empty hotels array')
  for (const h of r.hotels as Record<string, unknown>[]) {
    if (!h.name)        throw new Error('Hotel entry missing name')
    if (!h.eligibility) throw new Error(`Hotel "${h.name}" missing eligibility`)
    if (!h.rates)       throw new Error(`Hotel "${h.name}" missing rates`)
    if (!h.net_cost)    throw new Error(`Hotel "${h.name}" missing net_cost`)
  }
  return data as RateResult
}
