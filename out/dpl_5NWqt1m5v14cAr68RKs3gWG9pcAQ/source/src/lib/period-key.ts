/**
 * Period-key computation — server-side TypeScript port of the dashboard JS helpers.
 *
 * Period key formats:
 *   annual          → '2026'
 *   semiannual      → '2026-H1' | '2026-H2'
 *   quarterly       → '2026-Q2'
 *   monthly         → '2026-04'
 *   cardmember_year → 'cmy-2026'  (relative to last anniversary date)
 *   ended           → 'ended'
 */

export type PeriodType =
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual'
  | 'cardmember_year'
  | 'ended'

export type PeriodKey = string

/**
 * Compute the current period key for a given period type.
 * Pass `today` explicitly so callers can unit-test with a fixed date.
 */
export function computePeriodKey(periodType: PeriodType, today: Date): PeriodKey {
  const y = today.getFullYear()
  const m = today.getMonth() + 1  // 1-12

  switch (periodType) {
    case 'monthly':
      return `${y}-${String(m).padStart(2, '0')}`
    case 'quarterly':
      return `${y}-Q${Math.ceil(m / 3)}`
    case 'semiannual':
      return `${y}-${m <= 6 ? 'H1' : 'H2'}`
    case 'annual':
      return String(y)
    case 'cardmember_year':
      // Caller must use computeCardmemberPeriodKey for proper logic.
      // This fallback returns the calendar year.
      return `cmy-${y}`
    case 'ended':
      return 'ended'
    default:
      return String(y)
  }
}

/**
 * Compute a cardmember-year period key.
 *
 * @param anniversaryMonth  1-12  (e.g. 12 for December)
 * @param anniversaryDay    1-31  (e.g. 25 for Dec 25)
 * @param today             date to compute relative to
 *
 * Returns 'cmy-YYYY' where YYYY is the year in which the current
 * cardmember year started (i.e. the year of the last anniversary that
 * has already passed, or the current year if today is on/after the anniversary).
 */
export function computeCardmemberPeriodKey(
  anniversaryMonth: number,
  anniversaryDay: number,
  today: Date
): PeriodKey {
  const thisYearAnn = new Date(today.getFullYear(), anniversaryMonth - 1, anniversaryDay)
  if (today >= thisYearAnn) {
    return `cmy-${today.getFullYear()}`
  } else {
    return `cmy-${today.getFullYear() - 1}`
  }
}

/**
 * Annual value multiplier for a period type.
 * Use this when computing how much a credit is worth per year.
 */
export const PERIOD_MULTIPLIER: Record<PeriodType, number> = {
  monthly:          12,
  quarterly:         4,
  semiannual:        2,
  annual:            1,
  cardmember_year:   1,
  ended:             1,
}
