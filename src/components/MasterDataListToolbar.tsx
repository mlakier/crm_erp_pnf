import Link from 'next/link'
import type { ReactNode } from 'react'
import ColumnSelector from '@/components/ColumnSelector'
import ExportButton from '@/components/ExportButton'

export type MasterDataListColumn = {
  id: string
  label: string
  locked?: boolean
}

export type MasterDataListSortOption = {
  value: string
  label: string
}

export type MasterDataListToolbarProps = {
  query?: string
  searchPlaceholder: string
  tableId: string
  exportFileName: string
  columns: MasterDataListColumn[]
  sort?: string
  sortOptions?: MasterDataListSortOption[]
  resetHref?: string
  compactExport?: boolean
  extraControls?: ReactNode
}

export default function MasterDataListToolbar({
  query,
  searchPlaceholder,
  tableId,
  exportFileName,
  columns,
  sort,
  sortOptions,
  resetHref,
  compactExport = false,
  extraControls,
}: MasterDataListToolbarProps) {
  return (
    <form className="border-b px-6 py-4" method="get" style={{ borderColor: 'var(--border-muted)' }}>
      <div className="flex items-center gap-3 flex-nowrap">
        <input
          type="text"
          name="q"
          defaultValue={query ?? ''}
          placeholder={searchPlaceholder}
          className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm text-white"
          style={{ borderColor: 'var(--border-muted)' }}
        />
        <input type="hidden" name="page" value="1" />
        {sortOptions && sortOptions.length > 0 ? (
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-md border bg-transparent px-3 py-2 text-sm text-white"
            style={{ borderColor: 'var(--border-muted)' }}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
        {resetHref ? (
          <Link
            href={resetHref}
            className="rounded-md border px-3 py-2 text-sm font-medium text-center"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
          >
            Reset
          </Link>
        ) : null}
        {extraControls}
        <ExportButton tableId={tableId} fileName={exportFileName} compact={compactExport} />
        <ColumnSelector tableId={tableId} columns={columns} />
      </div>
    </form>
  )
}
