export const MASTER_DATA_FALLBACK = '-'

export function displayMasterDataValue(
  value: string | number | null | undefined,
  fallback: string = MASTER_DATA_FALLBACK
) {
  if (value === null || value === undefined) {
    return fallback
  }

  if (typeof value === 'string' && value.trim() === '') {
    return fallback
  }

  return String(value)
}

export function formatMasterDataDate(
  value: Date | string | null | undefined,
  fallback: string = MASTER_DATA_FALLBACK
) {
  if (!value) {
    return fallback
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString()
}
