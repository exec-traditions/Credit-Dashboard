/**
 * Deadline engine — computes when the current period for a credit ends,
 * so the UI can rank "use it or lose it" urgency automatically.
 */
import type { PeriodType } from './period-key'

/** Inclusive last day of the current period, ignoring any permanent end date. */
function rawPeriodEnd(
  periodType: PeriodType,
  today: Date,
  opts?: {
    anniversaryMonth?: number | null
    anniversaryDay?: number | null
    endsPermanently?: string | null
  }
): Date | null {
  const y = today.getFullYear()
  const m = today.getMonth() // 0-11

  switch (periodType) {
    case 'monthly':
      return new Date(y, m + 1, 0)
    case 'quarterly': {
      const qEndMonth = Math.floor(m / 3) * 3 + 3 // exclusive
      return new Date(y, qEndMonth, 0)
    }
    case 'semiannual':
      return m <= 5 ? new Date(y, 6, 0) : new Date(y, 12, 0)
    case 'annual':
      return new Date(y, 12, 0)
    case 'cardmember_year': {
      const mm = opts?.anniversaryMonth
      const dd = opts?.anniversaryDay
      if (!mm || !dd) return new Date(y, 12, 0)
      // Period ends the day before the next anniversary
      const thisYearAnn = new Date(y, mm - 1, dd)
      const nextAnn = today >= thisYearAnn ? new Date(y + 1, mm - 1, dd) : thisYearAnn
      return new Date(nextAnn.getTime() - 86400000)
    }
    case 'ended':
      return opts?.endsPermanently ? new Date(opts.endsPermanently + 'T23:59:59') : null
    default:
      return null
  }
}

/**
 * Inclusive last day of the current period for a credit. Null = no deadline,
 * or the credit has been permanently discontinued.
 *
 * `ends_permanently` is honored for ANY period_type, not just 'ended'. A
 * discontinued benefit (e.g. Amex Platinum's Saks credit, retired 2026-06-30)
 * stops appearing once that date passes, and never shows a period end that
 * outlives it.
 */
export function periodEnd(
  periodType: PeriodType,
  today: Date,
  opts?: {
    anniversaryMonth?: number | null
    anniversaryDay?: number | null
    endsPermanently?: string | null
  }
): Date | null {
  const raw = rawPeriodEnd(periodType, today, opts)
  if (!opts?.endsPermanently) return raw

  const hardEnd = new Date(opts.endsPermanently + 'T23:59:59')
  if (today > hardEnd) return null        // discontinued — hide it
  if (!raw) return hardEnd
  return raw > hardEnd ? hardEnd : raw    // period can't outlive the benefit
}

/** Whole days remaining until end-of-day of `end` (0 = due today). */
export function daysLeft(end: Date, today: Date): number {
  const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59)
  return Math.max(0, Math.floor((endOfDay.getTime() - today.getTime()) / 86400000))
}

export type Urgency = 'critical' | 'soon' | 'later'

export function urgency(days: number): Urgency {
  if (days <= 7) return 'critical'
  if (days <= 21) return 'soon'
  return 'later'
}
