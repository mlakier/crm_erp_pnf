export type TransactionReferenceFieldMeta = {
  id: string
  label: string
  fieldType: string
  source?: string
  description?: string
}

export type TransactionReferenceSourceMeta = {
  id: string
  label: string
  linkedFieldLabel: string
  description: string
  fields: TransactionReferenceFieldMeta[]
  defaultVisibleFieldIds: string[]
  defaultColumns?: number
  defaultRows?: number
}

export type TransactionReferenceFieldCustomization = {
  visible: boolean
  order: number
  column: number
}

export type TransactionReferenceLayout = {
  id: string
  referenceId: string
  formColumns: number
  rows: number
  fields: Partial<Record<string, TransactionReferenceFieldCustomization>>
}

export function buildDefaultTransactionReferenceLayout(
  sources: TransactionReferenceSourceMeta[],
  referenceId: string,
  slotId = `reference-${referenceId}-1`,
): TransactionReferenceLayout {
  const source = sources.find((entry) => entry.id === referenceId) ?? sources[0]
  const formColumns = Math.min(4, Math.max(1, source?.defaultColumns ?? 2))
  const rows = Math.max(1, source?.defaultRows ?? 2)

  return {
    id: slotId,
    referenceId: source?.id ?? referenceId,
    formColumns,
    rows,
    fields: Object.fromEntries(
      (source?.fields ?? []).map((field, index) => {
        const column = (index % formColumns) + 1
        const order = Math.floor(index / formColumns)
        return [
          field.id,
          {
            visible: source?.defaultVisibleFieldIds.includes(field.id) ?? false,
            column,
            order,
          },
        ]
      }),
    ),
  }
}

function normalizeColumnCount(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(4, Math.max(1, Math.trunc(value)))
}

function normalizeRowCount(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(12, Math.max(1, Math.trunc(value)))
}

export function normalizeTransactionReferenceLayout(
  layout: TransactionReferenceLayout,
  sources: TransactionReferenceSourceMeta[],
): TransactionReferenceLayout {
  const source = sources.find((entry) => entry.id === layout.referenceId) ?? sources[0]
  if (!source) return layout

  const nextFields: Partial<Record<string, TransactionReferenceFieldCustomization>> = {}
  const occupied = new Set<string>()
  const formColumns = Math.min(4, Math.max(1, layout.formColumns))
  let rows = Math.min(12, Math.max(1, layout.rows))
  let maxVisibleRow = -1

  for (const field of source.fields) {
    const fieldConfig = layout.fields[field.id]
    if (!fieldConfig) continue

    if (fieldConfig.visible === false) {
      nextFields[field.id] = {
        visible: false,
        column: Math.min(formColumns, Math.max(1, fieldConfig.column)),
        order: Math.max(0, Math.trunc(fieldConfig.order)),
      }
      continue
    }

    let column = Math.min(formColumns, Math.max(1, fieldConfig.column))
    let row = Math.max(0, Math.trunc(fieldConfig.order))
    let key = `${column}:${row}`

    while (row >= rows || occupied.has(key)) {
      let placed = false
      for (let candidateRow = 0; candidateRow < rows; candidateRow += 1) {
        for (let candidateColumn = 1; candidateColumn <= formColumns; candidateColumn += 1) {
          const candidateKey = `${candidateColumn}:${candidateRow}`
          if (!occupied.has(candidateKey)) {
            column = candidateColumn
            row = candidateRow
            key = candidateKey
            placed = true
            break
          }
        }
        if (placed) break
      }

      if (!placed) {
        row = rows
        column = 1
        rows += 1
        key = `${column}:${row}`
      }
    }

    occupied.add(key)
    maxVisibleRow = Math.max(maxVisibleRow, row)
    nextFields[field.id] = {
      visible: true,
      column,
      order: row,
    }
  }

  return {
    ...layout,
    referenceId: source.id,
    formColumns,
    rows: Math.min(12, Math.max(1, maxVisibleRow + 2)),
    fields: nextFields,
  }
}

export function mergeTransactionReferenceLayouts(
  value: unknown,
  fallback: TransactionReferenceLayout[],
  sources: TransactionReferenceSourceMeta[],
): TransactionReferenceLayout[] {
  if (!Array.isArray(value)) return fallback
  if (value.length === 0) return []

  const merged = value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry, index) => {
      const source =
        sources.find((candidate) => candidate.id === String(entry.referenceId ?? '')) ??
        sources[0]
      if (!source) return null

      const base = buildDefaultTransactionReferenceLayout(
        sources,
        source.id,
        typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `reference-${index + 1}`,
      )

      const fieldOverrides =
        entry.fields && typeof entry.fields === 'object'
          ? (entry.fields as Record<string, unknown>)
          : {}

      const fields = Object.fromEntries(
        source.fields.map((field) => {
          const override =
            fieldOverrides[field.id] && typeof fieldOverrides[field.id] === 'object'
              ? (fieldOverrides[field.id] as Record<string, unknown>)
              : {}
          return [
            field.id,
            {
              visible:
                override.visible === undefined
                  ? base.fields[field.id]?.visible !== false
                  : override.visible === true,
              column: normalizeColumnCount(override.column, base.fields[field.id]?.column ?? 1),
              order:
                typeof override.order === 'number' && Number.isFinite(override.order)
                  ? Math.max(0, Math.trunc(override.order))
                  : base.fields[field.id]?.order ?? 0,
            },
          ]
        }),
      ) as Partial<Record<string, TransactionReferenceFieldCustomization>>

      return normalizeTransactionReferenceLayout(
        {
          id: base.id,
          referenceId: source.id,
          formColumns: normalizeColumnCount(entry.formColumns, base.formColumns),
          rows: normalizeRowCount(entry.rows, base.rows),
          fields,
        },
        sources,
      )
    })
    .filter((entry): entry is TransactionReferenceLayout => Boolean(entry))

  return merged
}
