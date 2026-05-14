'use client'

type MasterDataInlineEditControlsProps = {
  allowInlineEdit: boolean
  inlineEdit: boolean
  changedCount: number
  isPending?: boolean
  message?: string
  error?: string
  onStart: () => void
  onCancel: () => void
  onSave: () => void
}

export default function MasterDataInlineEditControls({
  allowInlineEdit,
  inlineEdit,
  changedCount,
  isPending = false,
  message,
  error,
  onStart,
  onCancel,
  onSave,
}: MasterDataInlineEditControlsProps) {
  if (!allowInlineEdit && !message && !error) return null

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {inlineEdit ? (
        <>
          <span className="rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
            {changedCount} changed
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border px-3 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isPending || changedCount === 0}
            className="rounded-md px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-primary-strong)' }}
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="rounded-md px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--accent-primary-strong)' }}
        >
          Inline Edit
        </button>
      )}
      {message ? <span className="text-xs text-emerald-300">{message}</span> : null}
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  )
}
