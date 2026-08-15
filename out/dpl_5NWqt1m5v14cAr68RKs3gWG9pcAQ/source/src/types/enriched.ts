/** Credit enriched with current-period state — produced by dashboard/page.tsx. */
export type EnrichedCredit = {
  id: string
  card_id: string
  name: string
  amount_cents: number
  period_type: string
  category: string
  single_instance: boolean
  is_primary_instance: boolean
  autopilot: boolean
  ends_permanently: string | null
  period_key: string
  used_cents: number
  remaining_cents: number
  is_used: boolean
  annual_value: number
  ytd_used_cents: number
}
