'use client'

import SearchableSelect from '@/components/SearchableSelect'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

export function DetailTableDisplayControl({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
      <span>Display</span>
      <div className="w-20">
        <SearchableSelect
          selectedValue={String(value)}
          options={PAGE_SIZE_OPTIONS.map((option) => ({ value: String(option), label: String(option) }))}
          placeholder="Rows"
          searchPlaceholder="Search rows"
          onSelect={(nextValue) => onChange(Number(nextValue))}
          textClassName="text-xs"
        />
      </div>
    </label>
  )
}

export function DetailTablePaginationFooter({
  total,
  page,
  pageSize,
  onPageChange,
}: {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow = total === 0 ? 0 : Math.min(total, page * pageSize)

  return (
    <div
      className="flex items-center justify-between border-t px-6 py-4 text-sm"
      style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
    >
      <p>
        Showing {startRow}-{endRow} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-md border px-3 py-2 font-medium disabled:opacity-50"
          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
        >
          Previous
        </button>
        <span className="px-2" style={{ color: 'var(--text-muted)' }}>
          Page {totalPages === 0 ? 0 : page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-md border px-3 py-2 font-medium disabled:opacity-50"
          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
        >
          Next
        </button>
      </div>
    </div>
  )
}
