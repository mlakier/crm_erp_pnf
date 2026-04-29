'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  RecordDetailCell,
  RecordDetailEmptyState,
  RecordDetailHeaderCell,
  RecordDetailSection,
} from '@/components/RecordDetailPanels'
import SearchableSelect from '@/components/SearchableSelect'

export type TransactionExecutionLineOption = {
  id: string
  lineNumber: number
  itemId: string | null
  itemName: string | null
  description: string
  orderedQuantity: number
  alreadyProcessedQuantity: number
  openQuantity: number
}

export type TransactionExecutionLineRow = {
  id: string
  sourceLineItemId: string | null
  lineNumber: number
  itemId: string | null
  itemName: string | null
  description: string
  orderedQuantity: number
  alreadyProcessedQuantity: number
  openQuantity: number
  documentQuantity: number
  notes: string
}

export type TransactionExecutionLineVisibleColumn =
  | 'line'
  | 'item-id'
  | 'description'
  | 'ordered-qty'
  | 'already-processed-qty'
  | 'open-qty'
  | 'document-qty'
  | 'notes'

function executionRowsMatch(
  left: TransactionExecutionLineRow[],
  right: TransactionExecutionLineRow[],
) {
  if (left === right) return true
  if (left.length !== right.length) return false

  return left.every((row, index) => {
    const candidate = right[index]
    return (
      row.id === candidate.id &&
      row.sourceLineItemId === candidate.sourceLineItemId &&
      row.lineNumber === candidate.lineNumber &&
      row.itemId === candidate.itemId &&
      row.itemName === candidate.itemName &&
      row.description === candidate.description &&
      row.orderedQuantity === candidate.orderedQuantity &&
      row.alreadyProcessedQuantity === candidate.alreadyProcessedQuantity &&
      row.openQuantity === candidate.openQuantity &&
      row.documentQuantity === candidate.documentQuantity &&
      row.notes === candidate.notes
    )
  })
}

export default function TransactionExecutionLinesSection({
  rows,
  editing,
  lineOptions,
  onChange,
  title,
  summary,
  sourceLineLabel = 'line',
  alreadyProcessedQuantityLabel = 'Already Processed Qty',
  documentQuantityLabel = 'Quantity',
  remoteConfig,
  visibleColumnIds,
  allowAddLines = editing,
  emptyViewMessage = 'No execution lines yet.',
  emptyEditMessage,
}: {
  rows: TransactionExecutionLineRow[]
  editing?: boolean
  lineOptions: TransactionExecutionLineOption[]
  onChange?: (rows: TransactionExecutionLineRow[]) => void
  title: string
  summary?: string
  sourceLineLabel?: string
  alreadyProcessedQuantityLabel?: string
  documentQuantityLabel?: string
  remoteConfig?: {
    recordId: string
    userId?: string | null
    apiBasePath: string
    recordIdFieldName: string
    sourceLineItemFieldName: string
  }
  visibleColumnIds?: TransactionExecutionLineVisibleColumn[]
  allowAddLines?: boolean
  emptyViewMessage?: string
  emptyEditMessage?: string
}) {
  const [localRows, setLocalRows] = useState<TransactionExecutionLineRow[]>(rows)
  const [savingRowId, setSavingRowId] = useState<string | null>(null)

  useEffect(() => {
    setLocalRows((current) => (executionRowsMatch(current, rows) ? current : rows))
  }, [rows])

  useEffect(() => {
    if (!onChange || executionRowsMatch(localRows, rows)) return
    onChange(localRows)
  }, [localRows, onChange, rows])

  const availableOptions = useMemo(() => {
    const selectedIds = new Set(localRows.map((row) => row.sourceLineItemId).filter(Boolean))
    return lineOptions.filter((option) => !selectedIds.has(option.id))
  }, [lineOptions, localRows])

  function toRow(option: TransactionExecutionLineOption): TransactionExecutionLineRow {
    return {
      id: `draft-${option.id}`,
      sourceLineItemId: option.id,
      lineNumber: option.lineNumber,
      itemId: option.itemId,
      itemName: option.itemName,
      description: option.description,
      orderedQuantity: option.orderedQuantity,
      alreadyProcessedQuantity: option.alreadyProcessedQuantity,
      openQuantity: option.openQuantity,
      documentQuantity: 0,
      notes: '',
    }
  }

  function addLine() {
    const next = availableOptions[0]
    if (!next) return

    if (!remoteConfig) {
      setLocalRows((prev) => [...prev, toRow(next)])
      return
    }

    void (async () => {
      setSavingRowId(`draft-${next.id}`)
      try {
        const response = await fetch(remoteConfig.apiBasePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [remoteConfig.recordIdFieldName]: remoteConfig.recordId,
            [remoteConfig.sourceLineItemFieldName]: next.id,
            quantity: Math.min(1, next.openQuantity),
            notes: '',
            userId: remoteConfig.userId ?? null,
          }),
        })
        if (!response.ok) return
        const created = (await response.json()) as { id: string }
        setLocalRows((prev) => [
          ...prev,
          {
            ...toRow(next),
            id: created.id,
            documentQuantity: Math.min(1, next.openQuantity),
          },
        ])
      } finally {
        setSavingRowId(null)
      }
    })()
  }

  function removeLine(id: string) {
    if (!remoteConfig || id.startsWith('draft-')) {
      setLocalRows((prev) => prev.filter((row) => row.id !== id))
      return
    }

    void (async () => {
      setSavingRowId(id)
      try {
        const response = await fetch(`${remoteConfig.apiBasePath}?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        })
        if (!response.ok) return
        setLocalRows((prev) => prev.filter((row) => row.id !== id))
      } finally {
        setSavingRowId(null)
      }
    })()
  }

  function updateRow(id: string, patch: Partial<TransactionExecutionLineRow>) {
    setLocalRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row
        const next = { ...row, ...patch }
        if (patch.documentQuantity !== undefined) {
          const parsed = Number(patch.documentQuantity)
          next.documentQuantity = Number.isFinite(parsed)
            ? Math.max(0, Math.min(row.openQuantity, Math.trunc(parsed)))
            : 0
        }
        return next
      }),
    )
  }

  function swapLineOption(id: string, sourceLineItemId: string) {
    const option = lineOptions.find((candidate) => candidate.id === sourceLineItemId)
    if (!option) return
    setLocalRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              sourceLineItemId: option.id,
              lineNumber: option.lineNumber,
              itemId: option.itemId,
              itemName: option.itemName,
              description: option.description,
              orderedQuantity: option.orderedQuantity,
              alreadyProcessedQuantity: option.alreadyProcessedQuantity,
              openQuantity: option.openQuantity,
              documentQuantity: Math.min(row.documentQuantity, option.openQuantity),
            }
          : row,
      ),
    )
    if (remoteConfig && !id.startsWith('draft-')) {
      void persistRow(id, { sourceLineItemId: option.id })
    }
  }

  async function persistRow(
    id: string,
    patch: Partial<{
      sourceLineItemId: string | null
      documentQuantity: number
      notes: string
    }>,
  ) {
    if (!remoteConfig || id.startsWith('draft-')) return
    const row = localRows.find((candidate) => candidate.id === id)
    if (!row) return
    setSavingRowId(id)
    try {
      await fetch(`${remoteConfig.apiBasePath}?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [remoteConfig.sourceLineItemFieldName]: patch.sourceLineItemId ?? row.sourceLineItemId,
          quantity: patch.documentQuantity ?? row.documentQuantity,
          notes: patch.notes ?? row.notes,
          userId: remoteConfig.userId ?? null,
        }),
      })
    } finally {
      setSavingRowId(null)
    }
  }

  const totalDocumentQuantity = localRows.reduce((sum, row) => sum + row.documentQuantity, 0)
  const columns =
    visibleColumnIds ??
    ['line', 'item-id', 'description', 'ordered-qty', 'already-processed-qty', 'open-qty', 'document-qty', 'notes']
  const sourceLineLabelLower = sourceLineLabel.toLowerCase()
  const addLineHelperText =
    editing && allowAddLines
      ? availableOptions.length > 0
        ? `Add eligible ${sourceLineLabelLower}s and enter the ${documentQuantityLabel.toLowerCase()} for this document.`
        : lineOptions.length > 0
          ? `All eligible ${sourceLineLabelLower}s are already added.`
          : `No open ${sourceLineLabelLower}s are available for this document.`
      : null

  return (
    <RecordDetailSection
      title={title}
      count={localRows.length}
      summary={summary ?? (editing ? `${documentQuantityLabel} ${totalDocumentQuantity}` : undefined)}
      actions={
        editing ? (
          <div className="flex items-center gap-3">
            {addLineHelperText ? (
              <span className="hidden text-[11px] md:inline" style={{ color: 'var(--text-muted)' }}>
                {addLineHelperText}
              </span>
            ) : null}
            <button
              type="button"
              onClick={addLine}
              disabled={!allowAddLines || availableOptions.length === 0}
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
            >
              Add Line
            </button>
          </div>
        ) : null
      }
    >
      {localRows.length === 0 ? (
        <RecordDetailEmptyState
          message={editing ? (emptyEditMessage ?? `Add one or more ${sourceLineLabel.toLowerCase()}s to continue.`) : emptyViewMessage}
        />
      ) : (
        <table className="min-w-full">
          <thead>
            <tr>
              {columns.includes('line') ? <RecordDetailHeaderCell>Line</RecordDetailHeaderCell> : null}
              {columns.includes('item-id') ? <RecordDetailHeaderCell>Item Id</RecordDetailHeaderCell> : null}
              {columns.includes('description') ? <RecordDetailHeaderCell>Description</RecordDetailHeaderCell> : null}
              {columns.includes('ordered-qty') ? <RecordDetailHeaderCell>Ordered Qty</RecordDetailHeaderCell> : null}
              {columns.includes('already-processed-qty') ? (
                <RecordDetailHeaderCell>{alreadyProcessedQuantityLabel}</RecordDetailHeaderCell>
              ) : null}
              {columns.includes('open-qty') ? <RecordDetailHeaderCell>Open Qty</RecordDetailHeaderCell> : null}
              {columns.includes('document-qty') ? (
                <RecordDetailHeaderCell>{documentQuantityLabel}</RecordDetailHeaderCell>
              ) : null}
              {columns.includes('notes') ? <RecordDetailHeaderCell>Notes</RecordDetailHeaderCell> : null}
              {editing ? <RecordDetailHeaderCell>Actions</RecordDetailHeaderCell> : null}
            </tr>
          </thead>
          <tbody>
            {localRows.map((row, index) => (
              <tr
                key={row.id}
                style={index < localRows.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : undefined}
              >
                {columns.includes('line') ? (
                  <RecordDetailCell>
                    {editing ? (
                      <SearchableSelect
                        selectedValue={row.sourceLineItemId ?? ''}
                        options={[...lineOptions]
                          .filter(
                            (option) =>
                              option.id === row.sourceLineItemId ||
                              availableOptions.some((available) => available.id === option.id),
                          )
                          .map((option) => ({
                            value: option.id,
                            label: `${sourceLineLabel} ${option.lineNumber}`,
                          }))}
                        placeholder={`Select ${sourceLineLabel.toLowerCase()}`}
                        onSelect={(value) => swapLineOption(row.id, value)}
                      />
                    ) : (
                      row.lineNumber
                    )}
                  </RecordDetailCell>
                ) : null}
                {columns.includes('item-id') ? <RecordDetailCell>{row.itemId ?? '-'}</RecordDetailCell> : null}
                {columns.includes('description') ? <RecordDetailCell>{row.description || '-'}</RecordDetailCell> : null}
                {columns.includes('ordered-qty') ? <RecordDetailCell>{row.orderedQuantity}</RecordDetailCell> : null}
                {columns.includes('already-processed-qty') ? (
                  <RecordDetailCell>{row.alreadyProcessedQuantity}</RecordDetailCell>
                ) : null}
                {columns.includes('open-qty') ? <RecordDetailCell>{row.openQuantity}</RecordDetailCell> : null}
                {columns.includes('document-qty') ? (
                  <RecordDetailCell>
                    {editing ? (
                      <input
                        type="number"
                        min={0}
                        max={row.openQuantity}
                        value={row.documentQuantity}
                        onChange={(event) => updateRow(row.id, { documentQuantity: Number(event.target.value) })}
                        onBlur={() => {
                          void persistRow(row.id, { documentQuantity: row.documentQuantity })
                        }}
                        className="w-24 rounded-md border bg-transparent px-2 py-2 text-sm text-white"
                        style={{ borderColor: 'var(--border-muted)' }}
                      />
                    ) : (
                      row.documentQuantity
                    )}
                  </RecordDetailCell>
                ) : null}
                {columns.includes('notes') ? (
                  <RecordDetailCell>
                    {editing ? (
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(event) => updateRow(row.id, { notes: event.target.value })}
                        onBlur={() => {
                          void persistRow(row.id, { notes: row.notes })
                        }}
                        className="w-full rounded-md border bg-transparent px-2 py-2 text-sm text-white"
                        style={{ borderColor: 'var(--border-muted)' }}
                      />
                    ) : (
                      row.notes || '-'
                    )}
                  </RecordDetailCell>
                ) : null}
                {editing ? (
                  <RecordDetailCell>
                    <button
                      type="button"
                      onClick={() => removeLine(row.id)}
                      disabled={savingRowId === row.id}
                      className="rounded-md border px-2 py-1 text-xs"
                      style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                    >
                      {savingRowId === row.id ? 'Saving...' : 'Remove'}
                    </button>
                  </RecordDetailCell>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </RecordDetailSection>
  )
}
