'use client'

import { useEffect, useState } from 'react'

type ListSummary = {
  key: string
  label: string
  whereUsed: string[]
  displayOrder: string
}

type EditableListRow = {
  id?: string
  value: string
  sortOrder: number
}

type DisplayOrder = 'list' | 'alpha'

export default function ListsPage() {
  const [lists, setLists] = useState<ListSummary[]>([])
  const [rowsByKey, setRowsByKey] = useState<Record<string, EditableListRow[]>>({})
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [rows, setRows] = useState<EditableListRow[]>([])
  const [newValue, setNewValue] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [displayOrder, setDisplayOrder] = useState<DisplayOrder>('list')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const [showNewListForm, setShowNewListForm] = useState(false)
  const [newListKey, setNewListKey] = useState('')
  const [newListLabel, setNewListLabel] = useState('')
  const [newListWhereUsed, setNewListWhereUsed] = useState('')
  const [creatingList, setCreatingList] = useState(false)


  const selectedList = lists.find((l) => l.key === selectedKey)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch('/api/config/lists', { cache: 'no-store' })
        const body = await res.json()
        if (!res.ok || !mounted) return
        const fetchedLists: ListSummary[] = body.lists ?? []
        setLists(fetchedLists)
        setRowsByKey(body.rowsByKey ?? {})
        if (fetchedLists.length > 0) {
          setSelectedKey((prev) => prev || fetchedLists[0].key)
        }
      } catch {}
    }
    load()
    return () => { mounted = false }
  }, [])

  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setDragOverIndex(index)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  async function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      handleDragEnd()
      return
    }
    const updated = [...rows]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(targetIndex, 0, moved)
    const reordered = updated.map((r, i) => ({ ...r, sortOrder: i }))
    setRows(reordered)
    handleDragEnd()
    await persistRows(reordered, 'Order updated')
  }


  async function createList() {
    const key = newListKey.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')
    const label = newListLabel.trim()
    if (!key || !label) { setError('Key and Display Name are required'); return }
    setCreatingList(true)
    setError('')
    try {
      const res = await fetch('/api/config/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-list',
          key,
          label,
          whereUsed: newListWhereUsed.trim() ? newListWhereUsed.split(',').map((s) => s.trim()).filter(Boolean) : [],
        }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body?.error || 'Unable to create list'); setCreatingList(false); return }
      setLists(body.lists ?? [])
      setRowsByKey(body.rowsByKey ?? {})
      setSelectedKey(key)
      setNewListKey('')
      setNewListLabel('')
      setNewListWhereUsed('')
      setShowNewListForm(false)
      setSuccess('List created')
    } catch {
      setError('Unable to create list')
    }
    setCreatingList(false)
  }

  useEffect(() => {
    setEditingIndex(null)
    setEditDraft('')
    setError('')
    setSuccess('')
    const raw = rowsByKey[selectedKey] ? [...rowsByKey[selectedKey]] : []
    setRows(raw)
    const list = lists.find((l) => l.key === selectedKey)
    setDisplayOrder((list?.displayOrder === 'alpha' ? 'alpha' : 'list') as DisplayOrder)
  }, [selectedKey, rowsByKey, lists])

  const displayRows = displayOrder === 'alpha'
    ? [...rows].sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }))
    : rows

  async function persistRows(nextRows: EditableListRow[], msg: string) {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/config/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: selectedKey,
          rows: nextRows.map((r, i) => ({ id: r.id, value: r.value, sortOrder: i })),
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body?.error || 'Unable to save')
        setSaving(false)
        return false
      }
      setLists(body.lists ?? [])
      setRowsByKey(body.rowsByKey ?? {})
      setSuccess(msg)
      setSaving(false)
      return true
    } catch {
      setError('Unable to save')
      setSaving(false)
      return false
    }
  }

  async function saveDisplayOrder(order: DisplayOrder) {
    setDisplayOrder(order)
    try {
      const res = await fetch('/api/config/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: selectedKey, displayOrder: order }),
      })
      const body = await res.json()
      if (res.ok) {
        setLists(body.lists ?? [])
        setRowsByKey(body.rowsByKey ?? {})
      }
    } catch {}
  }

  async function addValue() {
    const trimmed = newValue.trim()
    if (!trimmed) return
    if (rows.some((r) => r.value === trimmed)) { setNewValue(''); return }
    const nextRows = [...rows, { value: trimmed, sortOrder: rows.length }]
    const ok = await persistRows(nextRows, 'Value added')
    if (ok) setNewValue('')
  }

  function startEdit(index: number) {
    setEditingIndex(index)
    setEditDraft(displayRows[index]?.value ?? '')
  }

  function cancelEdit() {
    setEditingIndex(null)
    setEditDraft('')
  }

  async function saveRow(index: number) {
    const trimmed = editDraft.trim()
    if (!trimmed) { setError('Value cannot be empty'); return }
    const targetRow = displayRows[index]
    if (rows.some((r) => r !== targetRow && r.value === trimmed)) { setError('Duplicate'); return }
    const nextRows = rows.map((r) => r === targetRow ? { ...r, value: trimmed } : r)
    const ok = await persistRows(nextRows, 'Value saved')
    if (ok) { setEditingIndex(null); setEditDraft('') }
  }

  async function removeValue(index: number) {
    const targetRow = displayRows[index]
    const nextRows = rows.filter((r) => r !== targetRow).map((r, i) => ({ ...r, sortOrder: i }))
    await persistRows(nextRows, 'Value removed')
    if (editingIndex === index) { setEditingIndex(null); setEditDraft('') }
  }

  return (
    <div className="min-h-full px-8 py-8">
      <div className="max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Master Data Lists</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage dropdown values used across create forms.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewListForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--accent-primary-strong)' }}
        >
          <span className="text-base leading-none">+</span> New List
        </button>
      </div>

      {showNewListForm && (
        <div className="mb-4 rounded-2xl border px-6 py-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <h2 className="mb-3 text-sm font-semibold text-white">Create New List</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>Key</span>
              <input
                value={newListKey}
                onChange={(e) => setNewListKey(e.target.value)}
                placeholder="e.g. MY-STATUS"
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white uppercase"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </label>
            <label className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>Display Name</span>
              <input
                value={newListLabel}
                onChange={(e) => setNewListLabel(e.target.value)}
                placeholder="e.g. My Status"
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </label>
            <label className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>Where Used <span className="text-xs opacity-60">(optional, comma-separated)</span></span>
              <input
                value={newListWhereUsed}
                onChange={(e) => setNewListWhereUsed(e.target.value)}
                placeholder="e.g. Customers, Vendors"
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={createList}
              disabled={creatingList}
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent-primary-strong)' }}
            >
              {creatingList ? 'Creating...' : 'Create List'}
            </button>
            <button
              type="button"
              onClick={() => { setShowNewListForm(false); setNewListKey(''); setNewListLabel(''); setNewListWhereUsed('') }}
              className="rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--border-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="grid gap-3 md:grid-cols-[320px_1fr] md:items-end">
            <label className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>List</span>
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              >
                {lists.map((l) => (
                  <option key={l.key} value={l.key}>{l.label}</option>
                ))}
              </select>
            </label>
            {/* List Key removed per cleanup */}
          </div>
        </div>

        <div className="px-6 py-4">
          {/* Where Used */}
          {selectedList && selectedList.whereUsed.length > 0 ? (
            <div className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-medium">Where Used:</span>{' '}
              <span className="text-white">{selectedList.whereUsed.join(', ')}</span>
            </div>
          ) : null}

          {/* Display Order */}
          <div className="mb-4 flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-medium">Display Order:</span>
            <button
              type="button"
              onClick={() => saveDisplayOrder('alpha')}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={
                displayOrder === 'alpha'
                  ? { backgroundColor: 'var(--accent-primary-strong)', color: '#fff' }
                  : { backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-muted)' }
              }
            >
              Alphabetical
            </button>
            <button
              type="button"
              onClick={() => saveDisplayOrder('list')}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={
                displayOrder === 'list'
                  ? { backgroundColor: 'var(--accent-primary-strong)', color: '#fff' }
                  : { backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-muted)' }
              }
            >
              List Order
            </button>
          </div>

          {/* Add Value */}
          <div className="mb-4 rounded-xl border px-4 py-4" style={{ borderColor: 'var(--border-muted)' }}>
            <div className="grid grid-cols-[220px_1fr_auto] gap-2 items-center">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Add Value</span>
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addValue() }}
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
                placeholder="Type value and click Add"
              />
              <button
                type="button"
                onClick={addValue}
                disabled={saving}
                className="rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent-primary-strong)' }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            <div className="grid grid-cols-[24px_220px_1fr_auto] gap-2 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              <span></span>
              <span>List ID</span>
              <span>Value</span>
              <span className="text-right">Actions</span>
            </div>
            {displayRows.map((row, index) => {
              const isDragging = dragIndex === index
              const isDragOver = dragOverIndex === index && dragIndex !== index
              const canDrag = displayOrder === 'list'
              return (
              <div
                key={row.id ?? index}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className="grid grid-cols-[24px_220px_1fr_auto] gap-2 rounded-md transition-colors"
                style={{
                  opacity: isDragging ? 0.5 : 1,
                  borderTop: isDragOver ? '2px solid var(--accent-primary-strong)' : '2px solid transparent',
                }}
              >
                <span
                  draggable={canDrag}
                  onDragStart={() => handleDragStart(index)}
                  className="flex items-center justify-center text-xs select-none"
                  style={{ color: canDrag ? 'var(--text-muted)' : 'transparent', cursor: canDrag ? 'grab' : 'default' }}
                  aria-hidden
                >⠇</span>
                <input
                  value={row.id ?? 'Auto-generated on save'}
                  readOnly
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-xs"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
                />
                <input
                  value={editingIndex === index ? editDraft : row.value}
                  onChange={(e) => setEditDraft(e.target.value)}
                  disabled={editingIndex !== index}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border-muted)' }}
                />
                <div className="flex items-center gap-2">
                  {editingIndex === index ? (
                    <>
                      <button type="button" onClick={() => saveRow(index)} disabled={saving} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">Save</button>
                      <button type="button" onClick={cancelEdit} className="rounded-md px-3 py-2 text-sm font-medium text-white" style={{ backgroundColor: 'var(--border-muted)' }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEdit(index)} className="rounded-md px-3 py-2 text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>Edit</button>
                      <button type="button" onClick={() => removeValue(index)} disabled={saving} className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">Remove</button>
                    </>
                  )}
                </div>
              </div>
              )
            })}
          </div>

          {error ? <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>{error}</p> : null}
          {success ? <p className="mt-3 text-sm text-emerald-300">{success}</p> : null}
        </div>
      </section>
      </div>
    </div>
  )
}
