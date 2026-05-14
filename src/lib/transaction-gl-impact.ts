export type TransactionGlImpactColumnKey =
  | 'date'
  | 'journalNumber'
  | 'sourceType'
  | 'sourceNumber'
  | 'account'
  | 'department'
  | 'location'
  | 'class'
  | 'description'
  | 'debit'
  | 'credit'
  | 'txnAmount'
  | 'localAmount'
  | 'functionalAmount'
  | 'groupAmount'

export type TransactionGlImpactFontSize = 'xs' | 'sm'
export type TransactionGlImpactWidthMode = 'auto' | 'compact' | 'normal' | 'wide'

export type TransactionGlImpactSettings = {
  fontSize: TransactionGlImpactFontSize
}

export type TransactionGlImpactColumnCustomization = {
  visible: boolean
  order: number
  widthMode: TransactionGlImpactWidthMode
}

export type TransactionGlImpactColumnMeta = {
  id: TransactionGlImpactColumnKey
  label: string
  description?: string
}

export type SeededDimensionDisplayKey = 'department' | 'location' | 'class'

export type SeededDimensionDisplayLabels = Partial<Record<SeededDimensionDisplayKey, string>>

const DIMENSION_COLUMN_LABEL_KEYS: Partial<Record<string, SeededDimensionDisplayKey>> = {
  department: 'department',
  departmentId: 'department',
  location: 'location',
  locationId: 'location',
  class: 'class',
  classId: 'class',
}

export function applySeededDimensionLabels<T extends { id: string; label: string; description?: string }>(
  columns: readonly T[],
  dimensionLabels?: SeededDimensionDisplayLabels,
): T[] {
  return columns.map((column) => {
    const dimensionKey = DIMENSION_COLUMN_LABEL_KEYS[column.id]
    const label = dimensionKey ? dimensionLabels?.[dimensionKey]?.trim() : ''
    if (!label || label === column.label) return { ...column }

    return {
      ...column,
      label,
      description: column.description?.replace(/\b(Department|Location|Class)\b/g, label),
    }
  })
}

export type TransactionGlImpactRow = {
  id: string
  date: string
  journalNumber: string
  sourceType: string
  sourceNumber: string
  account: string
  department: string
  location: string
  class: string
  description: string
  debit: number
  credit: number
  txnAmount: number
  localAmount: number
  functionalAmount: number
  groupAmount: number
}

export const TRANSACTION_GL_IMPACT_COLUMNS: TransactionGlImpactColumnMeta[] = [
  { id: 'date', label: 'Date', description: 'Posting date of the journal entry line.' },
  { id: 'journalNumber', label: 'GL Posting #', description: 'System or manual GL posting number that posted the impact.' },
  { id: 'sourceType', label: 'Source', description: 'Source document type for the posted entry.' },
  { id: 'sourceNumber', label: 'Source Txn', description: 'Source transaction number for the posted entry.' },
  { id: 'account', label: 'Account', description: 'GL account impacted by the posting.' },
  { id: 'department', label: 'Department', description: 'Department dimension carried by the posted line.' },
  { id: 'location', label: 'Location', description: 'Location dimension carried by the posted line.' },
  { id: 'class', label: 'Class', description: 'Class dimension carried by the posted line.' },
  { id: 'description', label: 'Description', description: 'Posted line description or memo.' },
  { id: 'debit', label: 'Debit', description: 'Debit amount posted by the entry.' },
  { id: 'credit', label: 'Credit', description: 'Credit amount posted by the entry.' },
  { id: 'txnAmount', label: 'TXN Amount', description: 'Signed transaction-currency amount for the posted line.' },
  { id: 'localAmount', label: 'Local Amount', description: 'Signed local-currency amount for the posted line.' },
  { id: 'functionalAmount', label: 'Functional Amount', description: 'Signed functional-currency amount for the posted line.' },
  { id: 'groupAmount', label: 'Group Amount', description: 'Signed group-currency amount for the posted line.' },
]

export const TRANSACTION_GL_IMPACT_SETTING_AVAILABILITY = Object.fromEntries(
  TRANSACTION_GL_IMPACT_COLUMNS.map((column) => [column.id, ['widthMode']]),
) as Record<TransactionGlImpactColumnKey, string[]>

const DEFAULT_TRANSACTION_GL_IMPACT_WIDTHS: Record<
  TransactionGlImpactColumnKey,
  TransactionGlImpactWidthMode
> = {
  date: 'normal',
  journalNumber: 'normal',
  sourceType: 'normal',
  sourceNumber: 'normal',
  account: 'wide',
  department: 'normal',
  location: 'normal',
  class: 'normal',
  description: 'wide',
  debit: 'normal',
  credit: 'normal',
  txnAmount: 'normal',
  localAmount: 'normal',
  functionalAmount: 'normal',
  groupAmount: 'normal',
}

export function defaultTransactionGlImpactSettings(): TransactionGlImpactSettings {
  return { fontSize: 'xs' }
}

export function defaultTransactionGlImpactColumns(): Record<
  TransactionGlImpactColumnKey,
  TransactionGlImpactColumnCustomization
> {
  return Object.fromEntries(
    TRANSACTION_GL_IMPACT_COLUMNS.map((column, index) => [
      column.id,
      {
        visible:
          column.id === 'localAmount' ||
          column.id === 'functionalAmount' ||
          column.id === 'groupAmount'
            ? false
            : true,
        order: index,
        widthMode: DEFAULT_TRANSACTION_GL_IMPACT_WIDTHS[column.id],
      },
    ]),
  ) as Record<TransactionGlImpactColumnKey, TransactionGlImpactColumnCustomization>
}

export function getOrderedVisibleTransactionGlImpactColumns(
  columnDefinitions: readonly TransactionGlImpactColumnMeta[],
  columnCustomization?: Partial<Record<TransactionGlImpactColumnKey, Partial<TransactionGlImpactColumnCustomization>>>,
) {
  const defaultOrderById = new Map(columnDefinitions.map((column, index) => [column.id, index]))

  return [...columnDefinitions]
    .filter((column) => (columnCustomization?.[column.id]?.visible ?? true) !== false)
    .sort(
      (left, right) =>
        (columnCustomization?.[left.id]?.order ?? defaultOrderById.get(left.id) ?? 0) -
        (columnCustomization?.[right.id]?.order ?? defaultOrderById.get(right.id) ?? 0),
    )
}
