'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import MasterDataInlineEditPortal from '@/components/MasterDataInlineEditPortal'
import ListRowActions from '@/components/ListRowActions'
import SearchableSelect from '@/components/SearchableSelect'
import {
  MasterDataBodyCell,
  MasterDataEmptyStateRow,
  MasterDataHeaderCell,
  MasterDataMutedCell,
} from '@/components/MasterDataTableCells'
import type { EditField } from '@/components/EditButton'
import { MASTER_DATA_HEADER_CELL_STYLE, MASTER_DATA_TABLE_DIVIDER_STYLE, getMasterDataRowStyle } from '@/lib/master-data-table'

type InlineColumn = {
  id: string
  label: string
  fieldName?: string
  link?: boolean
}

type InlineRow = {
  id: string
  href?: string
  cells: Record<string, string>
  fields: EditField[]
}

type DraftMap = Record<string, Record<string, string>>

type MasterDataInlineEditableTableProps = {
  tableId: string
  resource: string
  columns: InlineColumn[]
  rows: InlineRow[]
  emptyMessage: string
  allowInlineEdit: boolean
  deleteResource?: string
}

function fieldByName(fields: EditField[], name: string) {
  return fields.find((field) => field.name === name)
}

function valueFor(row: InlineRow, column: InlineColumn, drafts: DraftMap) {
  const fieldName = column.fieldName
  if (!fieldName) return row.cells[column.id] ?? '-'
  return drafts[row.id]?.[fieldName] ?? fieldByName(row.fields, fieldName)?.value ?? row.cells[column.id] ?? ''
}

function displayValue(value: string) {
  return value.trim() ? value : '-'
}

function editableClassName(changed: boolean) {
  return `min-w-32 rounded-md border px-2 py-1 text-sm text-white outline-none ${
    changed ? 'border-amber-300/70 bg-amber-400/10' : 'border-blue-300/30 bg-blue-400/10 focus:border-blue-300'
  }`
}

export default function MasterDataInlineEditableTable({
  tableId,
  resource,
  columns,
  rows,
  emptyMessage,
  allowInlineEdit,
  deleteResource,
}: MasterDataInlineEditableTableProps) {
  const [inlineEdit, setInlineEdit] = useState(false)
  const [drafts, setDrafts] = useState<DraftMap>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const changedRowIds = useMemo(() => Object.keys(drafts).filter((id) => Object.keys(drafts[id] ?? {}).length > 0), [drafts])

  function setValue(row: InlineRow, field: EditField, nextValue: string) {
    setMessage('')
    setError('')
    setDrafts((current) => {
      const nextRowDraft = { ...(current[row.id] ?? {}) }
      if (String(field.value ?? '') === String(nextValue ?? '')) {
        delete nextRowDraft[field.name]
      } else {
        nextRowDraft[field.name] = nextValue
      }

      const next = { ...current }
      if (Object.keys(nextRowDraft).length === 0) {
        delete next[row.id]
      } else {
        next[row.id] = nextRowDraft
      }
      return next
    })
  }

  function cancelInlineEdit() {
    setInlineEdit(false)
    setDrafts({})
    setMessage('')
    setError('')
  }

  function saveChanges() {
    const payloads = changedRowIds.map((id) => ({ id, changes: drafts[id] ?? {} }))
    if (payloads.length === 0) {
      setInlineEdit(false)
      return
    }

    startTransition(async () => {
      setError('')
      setMessage('')
      try {
        for (const payload of payloads) {
          const response = await fetch(`/api/${resource}?id=${encodeURIComponent(payload.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload.changes),
          })
          if (!response.ok) {
            const raw = await response.text()
            try {
              const body = JSON.parse(raw) as { error?: string }
              throw new Error(body.error ?? 'Unable to save row.')
            } catch (parseError) {
              if (parseError instanceof Error && parseError.message !== 'Unable to save row.') throw parseError
              throw new Error(raw || 'Unable to save row.')
            }
          }
        }
        setMessage(`Saved ${payloads.length} row${payloads.length === 1 ? '' : 's'}. Refreshing...`)
        setDrafts({})
        setInlineEdit(false)
        window.location.reload()
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Unable to save changes.')
      }
    })
  }

  function renderCell(row: InlineRow, column: InlineColumn) {
    const field = column.fieldName ? fieldByName(row.fields, column.fieldName) : undefined
    const changed = field ? drafts[row.id]?.[field.name] !== undefined : false
    const currentValue = field ? valueFor(row, column, drafts) : row.cells[column.id] ?? '-'

    if (!inlineEdit || !field || field.type === 'address') {
      const content = displayValue(currentValue)
      if (column.link && row.href) {
        return (
          <MasterDataBodyCell key={column.id} columnId={column.id}>
            <Link href={row.href} className="font-medium hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
              {content}
            </Link>
          </MasterDataBodyCell>
        )
      }
      return <MasterDataMutedCell key={column.id} columnId={column.id}>{content}</MasterDataMutedCell>
    }

    return (
      <MasterDataBodyCell key={column.id} columnId={column.id} style={{ backgroundColor: 'rgba(59,130,246,0.06)' }}>
        {field.type === 'select' ? (
          <div className={`min-w-40 rounded-md border ${changed ? 'border-amber-300/70 bg-amber-400/10' : 'border-blue-300/30 bg-blue-400/10'}`}>
            <SearchableSelect
              selectedValue={currentValue}
              options={field.options ?? []}
              placeholder={field.placeholder ?? '-- Select --'}
              searchPlaceholder="Search options"
              dropdownWidthMode="trigger"
              textClassName="text-sm"
              onSelect={(value) => setValue(row, field, value)}
            />
          </div>
        ) : field.type === 'checkbox' ? (
          <input
            type="checkbox"
            checked={currentValue === 'true'}
            onChange={(event) => setValue(row, field, event.target.checked ? 'true' : 'false')}
            className="h-4 w-4 rounded"
          />
        ) : (
          <input
            type={field.type === 'number' || field.type === 'date' || field.type === 'email' ? field.type : 'text'}
            value={currentValue}
            onChange={(event) => setValue(row, field, event.target.value)}
            className={editableClassName(changed)}
          />
        )}
      </MasterDataBodyCell>
    )
  }

  return (
    <>
      <MasterDataInlineEditPortal
        tableId={tableId}
        allowInlineEdit={allowInlineEdit}
        inlineEdit={inlineEdit}
        changedCount={changedRowIds.length}
        isPending={isPending}
        message={message}
        error={error}
        onStart={() => setInlineEdit(true)}
        onCancel={cancelInlineEdit}
        onSave={saveChanges}
      />
      <table className="min-w-full" id={tableId}>
        <thead>
          <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
            {columns.map((column) => (
              <MasterDataHeaderCell
                key={column.id}
                columnId={column.id}
                style={
                  column.fieldName && inlineEdit
                    ? { ...MASTER_DATA_HEADER_CELL_STYLE, backgroundColor: 'rgba(59,130,246,0.12)' }
                    : undefined
                }
              >
                {column.label}
              </MasterDataHeaderCell>
            ))}
            <MasterDataHeaderCell columnId="actions">Actions</MasterDataHeaderCell>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <MasterDataEmptyStateRow colSpan={columns.length + 1}>{emptyMessage}</MasterDataEmptyStateRow>
          ) : (
            rows.map((row, index) => (
              <tr key={row.id} style={getMasterDataRowStyle(index, rows.length)}>
                {columns.map((column) => renderCell(row, column))}
                <MasterDataBodyCell columnId="actions">
                  <ListRowActions
                    viewHref={row.href}
                    editButton={{ resource, id: row.id, fields: row.fields }}
                    deleteButton={{ resource: deleteResource ?? resource, id: row.id }}
                  />
                </MasterDataBodyCell>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  )
}
