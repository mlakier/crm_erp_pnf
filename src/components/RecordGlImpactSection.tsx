'use client'

import type { ReactNode } from 'react'
import {
  RecordDetailCell,
  RecordDetailEmptyState,
  RecordDetailHeaderCell,
  RecordDetailSection,
} from '@/components/RecordDetailPanels'

type ColumnDefinition<ColumnId extends string> = {
  id: ColumnId
  label: string
}

export default function RecordGlImpactSection<Row, ColumnId extends string>({
  title = 'GL Impact',
  count,
  summary,
  emptyMessage,
  rows,
  columns,
  fontSize = 'xs',
  getRowKey,
  renderCell,
  getHeaderClassName,
  getCellClassName,
}: {
  title?: string
  count?: number
  summary?: string
  emptyMessage: string
  rows: Row[]
  columns: Array<ColumnDefinition<ColumnId>>
  fontSize?: 'xs' | 'sm'
  getRowKey: (row: Row, index: number) => string
  renderCell: (row: Row, columnId: ColumnId, index: number) => ReactNode
  getHeaderClassName?: (columnId: ColumnId) => string | undefined
  getCellClassName?: (columnId: ColumnId, row: Row) => string | undefined
}) {
  const resolvedCount = count ?? rows.length

  return (
    <RecordDetailSection
      title={title}
      count={resolvedCount}
      summary={summary}
      collapsible
    >
      {rows.length === 0 ? (
        <RecordDetailEmptyState message={emptyMessage} />
      ) : (
        <table className={`min-w-full ${fontSize === 'sm' ? 'text-sm' : 'text-xs'}`}>
          <thead>
            <tr>
              {columns.map((column) => (
                <RecordDetailHeaderCell key={column.id} className={getHeaderClassName?.(column.id)}>
                  {column.label}
                </RecordDetailHeaderCell>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                style={index < rows.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : undefined}
              >
                {columns.map((column) => (
                  <RecordDetailCell key={column.id} className={getCellClassName?.(column.id, row)}>
                    {renderCell(row, column.id, index)}
                  </RecordDetailCell>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </RecordDetailSection>
  )
}
