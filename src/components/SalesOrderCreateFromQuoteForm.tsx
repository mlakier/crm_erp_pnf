'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchableSelect from '@/components/SearchableSelect'

type QuoteOption = {
  id: string
  label: string
}

export default function SalesOrderCreateFromQuoteForm({
  quotes,
  formId,
  fullPage,
  duplicateFrom,
  onSuccess,
  onCancel,
}: {
  quotes: QuoteOption[]
  formId?: string
  fullPage?: boolean
  duplicateFrom?: string
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const [quoteId, setQuoteId] = useState(quotes[0]?.id ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const payload = duplicateFrom ? { duplicateFrom } : { quoteId }
      const response = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const body = await response.json()
      if (!response.ok) {
        setError(body?.error || 'Unable to create sales order')
        setSaving(false)
        return
      }

      if (fullPage) {
        router.push(`/sales-orders/${body.id}`)
        return
      }

      setSaving(false)
      onSuccess?.()
      router.refresh()
    } catch {
      setError('Unable to create sales order')
      setSaving(false)
    }
  }

  return (
    <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Quote</label>
        {duplicateFrom ? (
          <div
            className="mt-1 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
          >
            This sales order will be created by duplicating the source sales order.
          </div>
        ) : (
          <div className="mt-1">
            <SearchableSelect
              selectedValue={quoteId}
              options={quotes.map((quote) => ({
                value: quote.id,
                label: quote.label,
              }))}
              placeholder={quotes.length === 0 ? 'No eligible quotes' : 'Select quote'}
              onSelect={setQuoteId}
            />
          </div>
        )}
      </div>

      {error ? <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p> : null}

      <div className="grid grid-cols-2 gap-3">
        {fullPage ? (
          <button
            type="button"
            onClick={() => router.push('/sales-orders')}
            className="rounded-md border px-4 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border px-4 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving || (!duplicateFrom && quotes.length === 0)}
          className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
          style={{ backgroundColor: '#7fd0cf', color: '#0f172a' }}
        >
          {saving ? 'Creating...' : duplicateFrom ? 'Duplicate Sales Order' : 'Create Sales Order'}
        </button>
      </div>
    </form>
  )
}
