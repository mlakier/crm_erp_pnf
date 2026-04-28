type LabelOption = {
  value: string
  label: string
}

export function formatFallbackRecordLabel(value: string | null | undefined) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return '-'

  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function createRecordLabelMapFromValues(values: string[]) {
  return Object.fromEntries(
    values.map((value) => [value.toLowerCase(), value]),
  ) as Record<string, string>
}

export function createRecordLabelMapFromOptions(options: LabelOption[]) {
  return Object.fromEntries(
    options.map((option) => [option.value.toLowerCase(), option.label]),
  ) as Record<string, string>
}

export function formatRecordLabel(
  value: string | null | undefined,
  labelMap: Record<string, string>,
) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return '-'
  return labelMap[normalized] ?? formatFallbackRecordLabel(value)
}
