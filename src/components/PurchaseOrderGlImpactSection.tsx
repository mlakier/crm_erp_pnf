'use client'

import RecordGlImpactSection from '@/components/RecordGlImpactSection'
import { fmtCurrency } from '@/lib/format'
import {
  getOrderedVisibleTransactionGlImpactColumns,
  TRANSACTION_GL_IMPACT_COLUMNS,
  type TransactionGlImpactColumnCustomization,
  type TransactionGlImpactRow,
  type TransactionGlImpactSettings,
} from '@/lib/transaction-gl-impact'

export type PurchaseOrderGlImpactRow = TransactionGlImpactRow

function getColumnClassName(
  columnId: keyof TransactionGlImpactRow | keyof TransactionGlImpactColumnCustomization,
  columnCustomization?: Record<string, { widthMode?: string }>,
) {
  const widthMode = columnCustomization?.[columnId as string]?.widthMode ?? 'auto'
  const widthClass =
    widthMode === 'compact'
      ? 'w-24'
      : widthMode === 'normal'
        ? 'w-36'
        : widthMode === 'wide'
          ? 'w-56'
          : ''
  const alignment = columnId === 'debit' || columnId === 'credit' ? 'text-right' : ''
  const wrapping = columnId === 'description' ? 'max-w-[260px] whitespace-pre-wrap break-words' : ''
  return [widthClass, alignment, wrapping].filter(Boolean).join(' ')
}

export default function PurchaseOrderGlImpactSection({
  rows,
  settings,
  columnCustomization,
  emptyMessage,
}: {
  rows: PurchaseOrderGlImpactRow[]
  settings?: TransactionGlImpactSettings
  columnCustomization?: Record<string, TransactionGlImpactColumnCustomization>
  emptyMessage?: string
}) {
  const visibleColumns = getOrderedVisibleTransactionGlImpactColumns(
    TRANSACTION_GL_IMPACT_COLUMNS,
    columnCustomization,
  )

  return (
    <RecordGlImpactSection
      rows={rows}
      columns={visibleColumns}
      fontSize={settings?.fontSize === 'sm' ? 'sm' : 'xs'}
      summary={rows.length ? `${rows.length} lines` : undefined}
      emptyMessage={emptyMessage ?? 'No posted accounting impact is linked to this purchase order yet.'}
      getRowKey={(row) => row.id}
      getHeaderClassName={(columnId) => getColumnClassName(columnId, columnCustomization)}
      getCellClassName={(columnId) => getColumnClassName(columnId, columnCustomization)}
      renderCell={(row, columnId) => {
        switch (columnId) {
          case 'date':
            return row.date
          case 'journalNumber':
            return row.journalNumber
          case 'sourceType':
            return row.sourceType
          case 'sourceNumber':
            return row.sourceNumber
          case 'account':
            return row.account
          case 'description':
            return row.description
          case 'debit':
            return row.debit ? fmtCurrency(row.debit) : '-'
          case 'credit':
            return row.credit ? fmtCurrency(row.credit) : '-'
          default:
            return '-'
        }
      }}
    />
  )
}
