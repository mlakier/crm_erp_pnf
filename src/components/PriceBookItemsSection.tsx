'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import SearchableSelect from '@/components/SearchableSelect'

type SelectOption = { value: string; label: string }

type PriceBookItemRow = {
  id: string
  priceBookItemId: string | null
  itemId: string
  itemLabel: string
  unitPrice: string
  currencyId: string
  currencyLabel: string
  uom: string
  minimumQuantity: string
  maximumQuantity: string
  effectiveStartDate: string
  effectiveEndDate: string
  status: string
  priceSource: string
  marginFloorPct: string
}

type DraftLine = {
  itemId: string
  unitPrice: string
  currencyId: string
  uom: string
  minimumQuantity: string
  maximumQuantity: string
  effectiveStartDate: string
  effectiveEndDate: string
  status: string
  priceSource: string
  marginFloorPct: string
}

const blankLine = (currencyId: string): DraftLine => ({
  itemId: '',
  unitPrice: '',
  currencyId,
  uom: '',
  minimumQuantity: '1',
  maximumQuantity: '',
  effectiveStartDate: '',
  effectiveEndDate: '',
  status: 'active',
  priceSource: 'manual',
  marginFloorPct: '',
})

function toPayload(priceBookId: string, row: DraftLine) {
  return {
    priceBookId,
    itemId: row.itemId,
    unitPrice: row.unitPrice,
    currencyId: row.currencyId,
    uom: row.uom,
    minimumQuantity: row.minimumQuantity,
    maximumQuantity: row.maximumQuantity,
    effectiveStartDate: row.effectiveStartDate,
    effectiveEndDate: row.effectiveEndDate,
    status: row.status,
    priceSource: row.priceSource,
    marginFloorPct: row.marginFloorPct,
  }
}

export default function PriceBookItemsSection({
  priceBookId,
  defaultCurrencyId,
  rows,
  itemOptions,
  currencyOptions,
  statusOptions,
  priceSourceOptions,
  editable,
}: {
  priceBookId: string
  defaultCurrencyId: string
  rows: PriceBookItemRow[]
  itemOptions: SelectOption[]
  currencyOptions: SelectOption[]
  statusOptions: SelectOption[]
  priceSourceOptions: SelectOption[]
  editable: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState<DraftLine>(() => blankLine(defaultCurrencyId))
  const [editingRows, setEditingRows] = useState<Record<string, DraftLine>>({})
  const [message, setMessage] = useState<string | null>(null)

  const itemUomById = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of itemOptions) {
      const match = option.label.match(/\(([^()]+)\)$/)
      if (match?.[1]) map.set(option.value, match[1])
    }
    return map
  }, [itemOptions])

  function setDraftValue(key: keyof DraftLine, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === 'itemId' && !current.uom ? { uom: itemUomById.get(value) ?? current.uom } : {}),
    }))
  }

  function setEditingValue(id: string, key: keyof DraftLine, value: string) {
    setEditingRows((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: value,
      },
    }))
  }

  async function submitNewLine() {
    setMessage(null)
    const response = await fetch('/api/price-book-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(priceBookId, draft)),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setMessage(body.error ?? 'Unable to add price book item.')
      return
    }
    setDraft(blankLine(defaultCurrencyId))
    startTransition(() => router.refresh())
  }

  async function saveExistingLine(id: string) {
    const row = editingRows[id]
    if (!row) return
    setMessage(null)
    const response = await fetch(`/api/price-book-items?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(priceBookId, row)),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setMessage(body.error ?? 'Unable to update price book item.')
      return
    }
    setEditingRows((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    startTransition(() => router.refresh())
  }

  async function deleteLine(id: string) {
    setMessage(null)
    const response = await fetch(`/api/price-book-items?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setMessage(body.error ?? 'Unable to delete price book item.')
      return
    }
    startTransition(() => router.refresh())
  }

  function editRow(row: PriceBookItemRow) {
    setEditingRows((current) => ({
      ...current,
      [row.id]: {
        itemId: row.itemId,
        unitPrice: row.unitPrice,
        currencyId: row.currencyId,
        uom: row.uom,
        minimumQuantity: row.minimumQuantity,
        maximumQuantity: row.maximumQuantity,
        effectiveStartDate: row.effectiveStartDate,
        effectiveEndDate: row.effectiveEndDate,
        status: row.status,
        priceSource: row.priceSource,
        marginFloorPct: row.marginFloorPct,
      },
    }))
  }

  const renderSelect = (value: string, onChange: (value: string) => void, options: SelectOption[], emptyLabel = '-- Select --') => (
    <SearchableSelect
      selectedValue={value}
      onSelect={onChange}
      options={options}
      placeholder={emptyLabel}
      searchPlaceholder="Search options"
      dropdownWidthMode="trigger"
      textClassName="text-xs"
    />
  )

  const renderInput = (value: string, onChange: (value: string) => void, type = 'text') => (
    <input className="w-full rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--surface-2)' }} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
  )

  return (
    <section className="mb-8 rounded-xl border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--surface-1)' }}>
      <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Price Book Items</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Item-level prices, quantity breaks, effective dates, and source controls for this price book.</p>
          </div>
          <span className="rounded-full px-3 py-1 text-xs" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>{rows.length} lines</span>
        </div>
      </div>

      <div className="overflow-x-auto p-5">
        <table className="min-w-[1180px] w-full text-left text-xs">
          <thead style={{ color: 'var(--text-muted)' }}>
            <tr>
              <th className="px-2 py-2">Item</th>
              <th className="px-2 py-2">Unit Price</th>
              <th className="px-2 py-2">Currency</th>
              <th className="px-2 py-2">UOM</th>
              <th className="px-2 py-2">Min Qty</th>
              <th className="px-2 py-2">Max Qty</th>
              <th className="px-2 py-2">Effective From</th>
              <th className="px-2 py-2">Effective To</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Source</th>
              <th className="px-2 py-2">Margin Floor %</th>
              {editable ? <th className="px-2 py-2">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-2 py-5 text-center" colSpan={editable ? 12 : 11} style={{ color: 'var(--text-muted)' }}>No item prices have been added yet.</td>
              </tr>
            ) : rows.map((row) => {
              const edit = editingRows[row.id]
              return (
                <tr key={row.id} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="px-2 py-2">{edit ? renderSelect(edit.itemId, (value) => setEditingValue(row.id, 'itemId', value), itemOptions) : row.itemLabel}</td>
                  <td className="px-2 py-2">{edit ? renderInput(edit.unitPrice, (value) => setEditingValue(row.id, 'unitPrice', value), 'number') : row.unitPrice}</td>
                  <td className="px-2 py-2">{edit ? renderSelect(edit.currencyId, (value) => setEditingValue(row.id, 'currencyId', value), currencyOptions, 'Price book currency') : row.currencyLabel}</td>
                  <td className="px-2 py-2">{edit ? renderInput(edit.uom, (value) => setEditingValue(row.id, 'uom', value)) : row.uom || '-'}</td>
                  <td className="px-2 py-2">{edit ? renderInput(edit.minimumQuantity, (value) => setEditingValue(row.id, 'minimumQuantity', value), 'number') : row.minimumQuantity || '-'}</td>
                  <td className="px-2 py-2">{edit ? renderInput(edit.maximumQuantity, (value) => setEditingValue(row.id, 'maximumQuantity', value), 'number') : row.maximumQuantity || '-'}</td>
                  <td className="px-2 py-2">{edit ? renderInput(edit.effectiveStartDate, (value) => setEditingValue(row.id, 'effectiveStartDate', value), 'date') : row.effectiveStartDate || '-'}</td>
                  <td className="px-2 py-2">{edit ? renderInput(edit.effectiveEndDate, (value) => setEditingValue(row.id, 'effectiveEndDate', value), 'date') : row.effectiveEndDate || '-'}</td>
                  <td className="px-2 py-2">{edit ? renderSelect(edit.status, (value) => setEditingValue(row.id, 'status', value), statusOptions) : row.status}</td>
                  <td className="px-2 py-2">{edit ? renderSelect(edit.priceSource, (value) => setEditingValue(row.id, 'priceSource', value), priceSourceOptions) : row.priceSource}</td>
                  <td className="px-2 py-2">{edit ? renderInput(edit.marginFloorPct, (value) => setEditingValue(row.id, 'marginFloorPct', value), 'number') : row.marginFloorPct || '-'}</td>
                  {editable ? (
                    <td className="px-2 py-2">
                      {edit ? (
                        <div className="flex gap-2">
                          <button className="rounded-md px-2 py-1 text-xs" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }} disabled={isPending} type="button" onClick={() => void saveExistingLine(row.id)}>Save</button>
                          <button className="rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--border-subtle)' }} type="button" onClick={() => setEditingRows((current) => {
                            const next = { ...current }
                            delete next[row.id]
                            return next
                          })}>Cancel</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button className="rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--border-subtle)' }} type="button" onClick={() => editRow(row)}>Edit</button>
                          <button className="rounded-md px-2 py-1 text-xs" style={{ backgroundColor: 'var(--danger)', color: 'white' }} disabled={isPending} type="button" onClick={() => void deleteLine(row.id)}>Delete</button>
                        </div>
                      )}
                    </td>
                  ) : null}
                </tr>
              )
            })}
            {editable ? (
              <tr className="border-t" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--surface-2)' }}>
                <td className="px-2 py-2">{renderSelect(draft.itemId, (value) => setDraftValue('itemId', value), itemOptions)}</td>
                <td className="px-2 py-2">{renderInput(draft.unitPrice, (value) => setDraftValue('unitPrice', value), 'number')}</td>
                <td className="px-2 py-2">{renderSelect(draft.currencyId, (value) => setDraftValue('currencyId', value), currencyOptions, 'Price book currency')}</td>
                <td className="px-2 py-2">{renderInput(draft.uom, (value) => setDraftValue('uom', value))}</td>
                <td className="px-2 py-2">{renderInput(draft.minimumQuantity, (value) => setDraftValue('minimumQuantity', value), 'number')}</td>
                <td className="px-2 py-2">{renderInput(draft.maximumQuantity, (value) => setDraftValue('maximumQuantity', value), 'number')}</td>
                <td className="px-2 py-2">{renderInput(draft.effectiveStartDate, (value) => setDraftValue('effectiveStartDate', value), 'date')}</td>
                <td className="px-2 py-2">{renderInput(draft.effectiveEndDate, (value) => setDraftValue('effectiveEndDate', value), 'date')}</td>
                <td className="px-2 py-2">{renderSelect(draft.status, (value) => setDraftValue('status', value), statusOptions)}</td>
                <td className="px-2 py-2">{renderSelect(draft.priceSource, (value) => setDraftValue('priceSource', value), priceSourceOptions)}</td>
                <td className="px-2 py-2">{renderInput(draft.marginFloorPct, (value) => setDraftValue('marginFloorPct', value), 'number')}</td>
                <td className="px-2 py-2">
                  <button className="rounded-md px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }} disabled={isPending} type="button" onClick={() => void submitNewLine()}>
                    Add Price
                  </button>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {message ? <div className="mx-5 mb-5 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>{message}</div> : null}
    </section>
  )
}
