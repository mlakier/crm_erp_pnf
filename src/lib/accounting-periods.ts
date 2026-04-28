export type AccountingPeriodMatcherOption = {
  id: string
  startDate: string | Date
  endDate: string | Date
  subsidiaryId?: string | null
  closed?: boolean
  status?: string | null
}

function normalizeDateOnly(value: string | Date | null | undefined): string | null {
  if (!value) return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

export function findAccountingPeriodIdForDate(
  periods: AccountingPeriodMatcherOption[],
  dateValue: string | Date | null | undefined,
  subsidiaryId?: string | null,
): string {
  const normalizedDate = normalizeDateOnly(dateValue)
  if (!normalizedDate) return ''

  const matches = periods
    .map((period) => ({
      ...period,
      normalizedStartDate: normalizeDateOnly(period.startDate),
      normalizedEndDate: normalizeDateOnly(period.endDate),
    }))
    .filter((period) => {
      if (!period.normalizedStartDate || !period.normalizedEndDate) return false
      if (normalizedDate < period.normalizedStartDate || normalizedDate > period.normalizedEndDate) return false
      return !period.subsidiaryId || !subsidiaryId || period.subsidiaryId === subsidiaryId
    })
    .sort((left, right) => {
      const leftSubsidiaryScore = left.subsidiaryId && left.subsidiaryId === subsidiaryId ? 0 : left.subsidiaryId ? 1 : 2
      const rightSubsidiaryScore = right.subsidiaryId && right.subsidiaryId === subsidiaryId ? 0 : right.subsidiaryId ? 1 : 2
      if (leftSubsidiaryScore !== rightSubsidiaryScore) return leftSubsidiaryScore - rightSubsidiaryScore

      const leftClosedScore = left.closed ? 1 : 0
      const rightClosedScore = right.closed ? 1 : 0
      if (leftClosedScore !== rightClosedScore) return leftClosedScore - rightClosedScore

      return (right.normalizedStartDate ?? '').localeCompare(left.normalizedStartDate ?? '')
    })

  return matches[0]?.id ?? ''
}
