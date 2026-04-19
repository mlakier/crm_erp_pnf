import type { ReactNode } from 'react'
import {
  RecordDetailCell,
  RecordDetailEmptyState,
  RecordDetailHeaderCell,
  RecordDetailSection,
} from '@/components/RecordDetailPanels'
import TableHorizontalScrollbar from '@/components/TableHorizontalScrollbar'

export type TransactionLineColumn<T> = {
  id: string
  label: string
  render: (row: T, index: number) => ReactNode
  align?: 'left' | 'center' | 'right'
  sticky?: boolean
  width?: number
}

export default function TransactionLineTable<T>({
  title,
  count,
  summary,
  tableId,
  emptyMessage,
  columns,
  rows,
  getRowKey,
}: {
  title: string
  count: number
  summary?: ReactNode
  tableId?: string
  emptyMessage: string
  columns: Array<TransactionLineColumn<T>>
  rows: T[]
  getRowKey: (row: T, index: number) => string
}) {
  const alignClassName = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center'
    if (align === 'right') return 'text-right'
    return 'text-left'
  }

  const stickyMeta = columns.reduce<Array<{ left: number; width: number } | null>>((acc, column) => {
    if (!column.sticky) {
      acc.push(null)
      return acc
    }

    const width = column.width ?? (column.id === 'description' ? 320 : 88)
    const lastSticky = [...acc].reverse().find((entry) => entry !== null)
    const left = lastSticky ? lastSticky.left + lastSticky.width : 0
    acc.push({ left, width })
    return acc
  }, [])

  return (
    <RecordDetailSection title={title} count={count} summary={summary}>
      {rows.length === 0 ? (
        <RecordDetailEmptyState message={emptyMessage} />
      ) : (
        <>
          <div id={tableId} className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  {columns.map((column, index) => {
                    const sticky = stickyMeta[index]
                    return (
                      <RecordDetailHeaderCell
                        key={column.id}
                        className={alignClassName(column.align)}
                      >
                        <span
                          className={sticky ? 'sticky block z-20' : 'block'}
                          style={
                            sticky
                              ? {
                                  left: sticky.left,
                                  minWidth: sticky.width,
                                  width: sticky.width,
                                  backgroundColor: 'var(--card)',
                                  boxShadow: '1px 0 0 0 var(--border-muted)',
                                }
                              : column.width
                                ? { minWidth: column.width, width: column.width }
                                : undefined
                          }
                        >
                          {column.label}
                        </span>
                      </RecordDetailHeaderCell>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={getRowKey(row, index)}
                    style={index < rows.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}
                  >
                    {columns.map((column, columnIndex) => {
                      const sticky = stickyMeta[columnIndex]
                      return (
                        <RecordDetailCell key={column.id} className={alignClassName(column.align)}>
                          <span
                            className={sticky ? 'sticky block z-10' : 'block'}
                            style={
                              sticky
                                ? {
                                    left: sticky.left,
                                    minWidth: sticky.width,
                                    width: sticky.width,
                                    backgroundColor: 'var(--card)',
                                    boxShadow: '1px 0 0 0 var(--border-muted)',
                                  }
                                : column.width
                                  ? { minWidth: column.width, width: column.width }
                                  : undefined
                            }
                          >
                            {column.render(row, index)}
                          </span>
                        </RecordDetailCell>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tableId ? <TableHorizontalScrollbar targetId={tableId} /> : null}
        </>
      )}
    </RecordDetailSection>
  )
}
