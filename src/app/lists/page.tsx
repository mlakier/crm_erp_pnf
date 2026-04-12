'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  getDefaultListValues,
  LIST_LABELS,
  ListOrderMode,
  LIST_PAGE_LABELS,
  ListOptionsConfig,
  ListPageKey,
  sanitizeListOrderMode,
} from '@/lib/list-options'

type ListSelection = {
  key: string
  kind: 'base' | 'custom'
  page: ListPageKey
  list: string
  label: string
  pageLabels: string[]
  customListId?: string
}

type CustomListSummary = {
  id: string
  key: string
  label: string
  pages: ListPageKey[]
}

function getBaseListSelections(): ListSelection[] {
  const selections: ListSelection[] = []

  for (const page of Object.keys(LIST_LABELS) as ListPageKey[]) {
    for (const list of Object.keys(LIST_LABELS[page])) {
      const label = LIST_LABELS[page][list as keyof typeof LIST_LABELS[typeof page]]
      selections.push({
        key: `${page}:${list}`,
        kind: 'base',
        page,
        list,
        label,
        pageLabels: [LIST_PAGE_LABELS[page]],
      })
    }
  }

  return selections
}

function parseCustomLists(payload: unknown): CustomListSummary[] {
  if (!Array.isArray(payload)) return []

  const results: CustomListSummary[] = []
  payload.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return

    const input = entry as { id?: unknown; key?: unknown; label?: unknown; pages?: unknown; page?: unknown }
    const id = String(input.id ?? '').trim()
    const label = String(input.label ?? '').trim()

    if (!id || !label) return
    const pagesRaw = Array.isArray(input.pages) ? input.pages : []
    const pages = pagesRaw
      .map((value) => String(value ?? '').trim())
      .filter((value): value is ListPageKey => (
        value === 'customer' || value === 'item' || value === 'lead' || value === 'opportunity'
      ))

    results.push({
      id,
      key: String(input.key ?? `custom:${id}`),
      label,
      pages,
    })
  })

  return results
}

function getCustomSelections(customLists: CustomListSummary[]): ListSelection[] {
  return customLists.map((entry) => ({
    key: entry.key,
    kind: 'custom',
    page: entry.pages[0] ?? 'customer',
    list: '__custom__',
    label: entry.label,
    pageLabels: entry.pages.map((page) => LIST_PAGE_LABELS[page]),
    customListId: entry.id,
  }))
}

type EditableListRow = {
  id?: string
  value: string
  sortOrder: number
}

function defaultRows(page: ListPageKey, list: string): EditableListRow[] {
  return getDefaultListValues(page, list as keyof ListOptionsConfig[typeof page] & string).map((value, sortOrder) => ({
    value,
    sortOrder,
  }))
}

function parseRows(payload: unknown): EditableListRow[] {
  if (!Array.isArray(payload)) return []

  const rows: EditableListRow[] = []

  payload.forEach((row, index) => {
    if (!row || typeof row !== 'object') return

    const input = row as { id?: unknown; value?: unknown; sortOrder?: unknown }
    const value = String(input.value ?? '').trim()
    if (!value) return

    const id = input.id === undefined || input.id === null ? undefined : String(input.id)
    const sortOrder = typeof input.sortOrder === 'number' ? input.sortOrder : index

    rows.push({ id, value, sortOrder })
  })

  return rows
}

function rowsToPayload(rows: EditableListRow[]) {
  return rows.map((row, sortOrder) => ({ id: row.id, value: row.value, sortOrder }))
}

export default function ListsPage() {
  const baseSelections = useMemo(() => getBaseListSelections(), [])
  const [customLists, setCustomLists] = useState<CustomListSummary[]>([])
  const listSelections = useMemo(
    () => [...baseSelections, ...getCustomSelections(customLists)],
    [baseSelections, customLists]
  )
  const [selectedListKey, setSelectedListKey] = useState<string>(() => baseSelections[0]?.key ?? 'customer:industry')
  const selectedList = useMemo(
    () => listSelections.find((entry) => entry.key === selectedListKey) ?? listSelections[0],
    [listSelections, selectedListKey]
  )

  const page: ListPageKey = selectedList?.page ?? 'customer'
  const list = selectedList?.kind === 'base' ? selectedList.list : ''
  const customListId = selectedList?.kind === 'custom' ? selectedList.customListId : undefined
  const isCustomList = selectedList?.kind === 'custom'

  const [rows, setRows] = useState<EditableListRow[]>(() => defaultRows(page, list || 'industry'))
  const [newValue, setNewValue] = useState('')
  const [orderMode, setOrderMode] = useState<ListOrderMode>('table')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createListName, setCreateListName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setEditingIndex(null)
    setEditDraft('')
    setOrderMode('table')
    setError('')
    setSuccess('')
    setRows(isCustomList ? [] : defaultRows(page, list || 'industry'))
  }, [isCustomList, page, list])

  useEffect(() => {
    let mounted = true
    async function loadConfig() {
      try {
        const response = await fetch('/api/config/lists', { cache: 'no-store' })
        const body = await response.json()
        if (!response.ok || !mounted) return

        setCustomLists(parseCustomLists(body?.customLists))

        if (isCustomList && customListId) {
          const incomingOrderMode = sanitizeListOrderMode(body?.customOrderConfig?.[customListId], 'table')
          setOrderMode(incomingOrderMode)

          const incomingRows = parseRows(body?.customRows?.[customListId])
          setRows(incomingRows)
          return
        }

        const incomingOrderMode = sanitizeListOrderMode(body?.orderConfig?.[page]?.[list], 'table')
        setOrderMode(incomingOrderMode)

        const incomingRows = parseRows(body?.rows?.[page]?.[list])
        if (incomingRows.length > 0) {
          setRows(incomingRows)
          return
        }

        const configured = body?.config?.[page]?.[list]
        if (Array.isArray(configured) && configured.length > 0) {
          setRows(
            configured.map((value: unknown, sortOrder: number) => ({
              value: String(value),
              sortOrder,
            }))
          )
          return
        }

        setRows(isCustomList ? [] : defaultRows(page, list || 'industry'))
      } catch {
        setRows(isCustomList ? [] : defaultRows(page, list || 'industry'))
      }
    }

    loadConfig()
    return () => {
      mounted = false
    }
  }, [customListId, isCustomList, page, list])

  const persistValues = async (nextRows: EditableListRow[], nextOrderMode: ListOrderMode, successMessage: string) => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/config/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isCustomList && customListId
            ? {
                customListId,
                values: nextRows.map((row) => row.value),
                rows: rowsToPayload(nextRows),
                orderMode: nextOrderMode,
              }
            : {
                page,
                list,
                values: nextRows.map((row) => row.value),
                rows: rowsToPayload(nextRows),
                orderMode: nextOrderMode,
              }
        ),
      })

      const body = await response.json()
      if (!response.ok) {
        setError(body?.error || 'Unable to save list values')
        setSaving(false)
        return false
      }

      setCustomLists(parseCustomLists(body?.customLists))

      if (isCustomList && customListId) {
        const savedRows = parseRows(body?.customRows?.[customListId])
        setRows(savedRows.length > 0 ? savedRows : nextRows)

        const savedOrderMode = sanitizeListOrderMode(body?.customOrderConfig?.[customListId], nextOrderMode)
        setOrderMode(savedOrderMode)

        setSuccess(successMessage)
        setSaving(false)
        return true
      }

      const savedRows = parseRows(body?.rows?.[page]?.[list])
      if (savedRows.length > 0) {
        setRows(savedRows)
      } else {
        setRows(nextRows)
      }

      const savedOrderMode = sanitizeListOrderMode(body?.orderConfig?.[page]?.[list], nextOrderMode)
      setOrderMode(savedOrderMode)

      setSuccess(successMessage)
      setSaving(false)
      return true
    } catch {
      setError('Unable to save list values')
      setSaving(false)
      return false
    }
  }

  const addValue = async () => {
    const next = newValue.trim()
    if (!next) return
    if (rows.some((row) => row.value === next)) {
      setNewValue('')
      return
    }

    const nextRows = [...rows, { value: next, sortOrder: rows.length }]
    const didSave = await persistValues(nextRows, orderMode, 'Value added')
    if (!didSave) return

    setNewValue('')
  }

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditDraft(rows[index]?.value ?? '')
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditDraft('')
  }

  const saveRow = async (index: number) => {
    const next = editDraft.trim()
    if (!next) {
      setError('List values cannot be empty')
      return
    }

    const duplicate = rows.some((row, i) => i !== index && row.value === next)
    if (duplicate) {
      setError('Duplicate values are not allowed')
      return
    }

    const nextRows = rows.map((row, i) =>
      i === index
        ? {
            ...row,
            value: next,
          }
        : row
    )
    const didSave = await persistValues(nextRows, orderMode, 'Value saved')
    if (!didSave) return

    setEditingIndex(null)
    setEditDraft('')
  }

  const removeValue = async (index: number) => {
    const nextRows = rows
      .filter((_, i) => i !== index)
      .map((row, sortOrder) => ({ ...row, sortOrder }))
    const didSave = await persistValues(nextRows, orderMode, 'Value removed')
    if (!didSave) return

    if (editingIndex === index) {
      setEditingIndex(null)
      setEditDraft('')
    }
  }

  const saveValues = async () => {
    await persistValues(rows, orderMode, 'List values saved')
  }

  const saveOrderMode = async (nextOrderMode: ListOrderMode) => {
    setOrderMode(nextOrderMode)
    await persistValues(rows, nextOrderMode, 'Display order saved')
  }

  const startCreateList = () => {
    setCreateListName('')
    setShowCreateForm(true)
    setError('')
    setSuccess('')
  }

  const cancelCreateList = () => {
    setShowCreateForm(false)
    setCreateListName('')
  }

  const createNewList = async () => {
    const listName = createListName.trim()
    if (!listName) {
      setError('List name is required')
      setSuccess('')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/config/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-custom-list',
          label: listName.trim(),
        }),
      })

      const body = await response.json()
      if (!response.ok) {
        setError(body?.error || 'Unable to create list')
        setSaving(false)
        return
      }

      const parsedCustomLists = parseCustomLists(body?.customLists)
      setCustomLists(parsedCustomLists)

      const created = parsedCustomLists.find(
        (entry) => entry.label.toLowerCase() === listName.toLowerCase()
      )

      if (created) {
        setSelectedListKey(created.key)
      }

      setRows([])
      setOrderMode('table')
      setSuccess('List created')
      setShowCreateForm(false)
      setCreateListName('')
      setSaving(false)
    } catch {
      setError('Unable to create list')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Master Data Lists</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage dropdown values used across create forms.
          </p>
        </div>
        <button
          type="button"
          onClick={showCreateForm ? cancelCreateList : startCreateList}
          className="rounded-md px-3 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--accent-primary-strong)' }}
        >
          {showCreateForm ? 'Cancel' : 'Create New List'}
        </button>
      </div>

      {showCreateForm ? (
        <section
          className="mb-6 rounded-2xl border px-4 py-4"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
        >
          <p className="mb-3 text-sm font-semibold text-white">Create New List</p>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>List Name</span>
              <input
                value={createListName}
                onChange={(event) => setCreateListName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void createNewList()
                  }
                }}
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
                placeholder="Enter list name"
              />
            </label>

            <button
              type="button"
              onClick={() => void createNewList()}
              disabled={saving}
              className="rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent-primary-strong)' }}
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="grid gap-3 md:grid-cols-[320px_1fr]">
            <label className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>List</span>
              <select
                value={selectedListKey}
                onChange={(event) => setSelectedListKey(event.target.value)}
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              >
                {listSelections.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="px-6 py-4">
          {selectedList ? (
            <div className="mb-4 rounded-xl border px-4 py-3" style={{ borderColor: 'var(--border-muted)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Where Used:</p>
              <p className="mt-1 text-sm text-white">
                {selectedList.pageLabels.length > 0 ? selectedList.pageLabels.join(', ') : 'Not assigned'}
              </p>
            </div>
          ) : null}

          {selectedList ? (
            <div className="mb-4 rounded-xl border px-4 py-4" style={{ borderColor: 'var(--border-muted)' }}>
              <p className="text-sm font-semibold text-white mb-3">List Options:</p>
              <div className="flex items-center gap-4">
                <span className="text-sm shrink-0" style={{ color: 'var(--text-secondary)' }}>Display Order</span>
                <select
                  value={orderMode}
                  onChange={(event) => saveOrderMode(event.target.value as ListOrderMode)}
                  className="rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  <option value="alpha">Alphabetical (A-Z)</option>
                  <option value="table">List table order</option>
                </select>
              </div>
            </div>
          ) : null}

          <div className="mb-4 rounded-xl border px-4 py-4" style={{ borderColor: 'var(--border-muted)' }}>
            <div className="grid grid-cols-[220px_1fr_auto] gap-2 items-center">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Add Value</span>
              <input
                value={newValue}
                onChange={(event) => setNewValue(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') addValue() }}
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
                placeholder="Type value and click Add"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addValue}
                  className="rounded-md px-3 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: 'var(--accent-primary-strong)' }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[220px_1fr_auto] gap-2 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              <span>List ID</span>
              <span>Value</span>
              <span className="text-right">Actions</span>
            </div>
            {rows.map((row, index) => (
              <div key={row.id ?? index} className="grid grid-cols-[220px_1fr_auto] gap-2">
                <input
                  value={row.id ?? 'Auto-generated on save'}
                  readOnly
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-xs"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
                />
                <input
                  value={editingIndex === index ? editDraft : row.value}
                  onChange={(event) => setEditDraft(event.target.value)}
                  disabled={editingIndex !== index}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border-muted)' }}
                />
                <div className="flex items-center gap-2">
                  {editingIndex === index ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveRow(index)}
                        disabled={saving}
                        className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-md border px-3 py-2 text-sm font-medium text-white"
                        style={{ borderColor: 'var(--border-muted)' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(index)}
                      className="rounded-md px-3 py-2 text-sm font-medium text-white"
                      style={{ backgroundColor: 'var(--accent-primary-strong)' }}
                    >
                      Edit
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => removeValue(index)}
                    disabled={saving}
                    className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error ? <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>{error}</p> : null}
          {success ? <p className="mt-3 text-sm text-emerald-300">{success}</p> : null}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={saveValues}
              disabled={saving}
              className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent-primary-strong)' }}
            >
              {saving ? 'Saving...' : 'Save List'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
