'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchableSelect from '@/components/SearchableSelect'
import type { SelectOption } from '@/lib/list-source'

export default function LeadConvertOpportunityForm({
  leadId,
  defaultName,
  defaultStage,
  items,
  stageOptions,
}: {
  leadId: string
  defaultName: string
  defaultStage: string
  items: Array<{ id: string; name: string; listPrice: number; itemId: string | null }>
  stageOptions: SelectOption[]
}) {
  const router = useRouter()
  const [name, setName] = useState(defaultName)
  const [amount, setAmount] = useState('')
  const [stage, setStage] = useState(defaultStage)
  const [closeDate, setCloseDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lineItems, setLineItems] = useState<Array<{
    itemId: string
    description: string
    quantity: string
    unitPrice: string
    notes: string
  }>>([])

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { itemId: '', description: '', quantity: '1', unitPrice: '', notes: '' }])
  }

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  const updateLineItem = (index: number, field: 'itemId' | 'description' | 'quantity' | 'unitPrice' | 'notes', value: string) => {
    setLineItems((prev) => prev.map((line, currentIndex) => {
      if (currentIndex !== index) return line
      if (field === 'itemId') {
        const item = items.find((candidate) => candidate.id === value)
        return {
          ...line,
          itemId: value,
          description: line.description || item?.name || '',
          unitPrice: item ? String(item.listPrice ?? 0) : line.unitPrice,
        }
      }
      return { ...line, [field]: value }
    }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/leads/convert?id=${encodeURIComponent(leadId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          amount,
          stage,
          closeDate: closeDate || null,
          lineItems: lineItems
            .filter((line) => line.description.trim().length > 0)
            .map((line) => ({
              itemId: line.itemId || null,
              description: line.description.trim(),
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              notes: line.notes || null,
            })),
        }),
      })

      const body = await response.json()
      if (!response.ok) {
        setError(body?.error || 'Unable to convert lead')
        setSaving(false)
        return
      }

      if (body?.opportunityId) {
        router.push(`/opportunities/${body.opportunityId}`)
        router.refresh()
        return
      }

      router.push('/opportunities')
      router.refresh()
    } catch {
      setError('Unable to convert lead')
      setSaving(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Complete this opportunity setup to convert the lead.
      </p>

      <div>
        <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Opportunity name</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
          style={{ borderColor: 'var(--border-muted)' }}
        />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Amount</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Leave blank if unknown"
            className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
            style={{ borderColor: 'var(--border-muted)' }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Stage</label>
          <div className="mt-1">
            <SearchableSelect
              selectedValue={stage}
              options={stageOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              placeholder="Select stage"
              onSelect={setStage}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Close date</label>
        <input
          type="date"
          value={closeDate}
          onChange={(event) => setCloseDate(event.target.value)}
          className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
          style={{ borderColor: 'var(--border-muted)' }}
        />
      </div>

      <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border-muted)' }}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-white">Opportunity line items</p>
          <button
            type="button"
            onClick={addLineItem}
            className="rounded-md border px-3 py-1.5 text-xs"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
          >
            + Add line
          </button>
        </div>

        {lineItems.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            No lines yet. Add items so sales reps can quote directly from this opportunity.
          </p>
        ) : (
          <div className="space-y-3 overflow-x-auto">
            <div
              className="hidden min-w-[1100px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide lg:grid"
              style={{ color: 'var(--text-muted)', gridTemplateColumns: '1.3fr 1.6fr 0.7fr 0.9fr 1.2fr auto' }}
            >
              <span>Item</span>
              <span>Desc</span>
              <span>Qty</span>
              <span>Price</span>
              <span>Notes</span>
              <span className="text-right">Action</span>
            </div>
            {lineItems.map((line, index) => (
              <div key={`${index}-${line.itemId}`} className="rounded-md border p-3" style={{ borderColor: 'var(--border-muted)' }}>
                <div
                  className="grid gap-2 lg:min-w-[1100px]"
                  style={{ gridTemplateColumns: '1.3fr 1.6fr 0.7fr 0.9fr 1.2fr auto' }}
                >
                  <div>
                    <label className="mb-1 block text-[11px] font-medium lg:hidden" style={{ color: 'var(--text-secondary)' }}>Item</label>
                    <div className="mt-1">
                      <SearchableSelect
                        selectedValue={line.itemId}
                        options={items.map((item) => ({
                          value: item.id,
                          label: item.itemId ? `${item.itemId} - ${item.name}` : item.name,
                        }))}
                        placeholder="Select item"
                        onSelect={(value) => updateLineItem(index, 'itemId', value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium lg:hidden" style={{ color: 'var(--text-secondary)' }}>Desc</label>
                    <input
                      value={line.description}
                      onChange={(event) => updateLineItem(index, 'description', event.target.value)}
                      className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                      style={{ borderColor: 'var(--border-muted)' }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium lg:hidden" style={{ color: 'var(--text-secondary)' }}>Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(event) => updateLineItem(index, 'quantity', event.target.value)}
                      className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                      style={{ borderColor: 'var(--border-muted)' }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium lg:hidden" style={{ color: 'var(--text-secondary)' }}>Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(event) => updateLineItem(index, 'unitPrice', event.target.value)}
                      className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                      style={{ borderColor: 'var(--border-muted)' }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium lg:hidden" style={{ color: 'var(--text-secondary)' }}>Notes</label>
                    <input
                      value={line.notes}
                      onChange={(event) => updateLineItem(index, 'notes', event.target.value)}
                      className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                      style={{ borderColor: 'var(--border-muted)' }}
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="text-xs"
                      style={{ color: 'var(--danger)' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error ? <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: 'var(--accent-primary-strong)' }}
      >
        {saving ? 'Converting...' : 'Convert Lead'}
      </button>
    </form>
  )
}
