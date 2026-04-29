'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchableSelect from '@/components/SearchableSelect'

type PO = { id: string; label: string }

export default function ReceiptCreateForm({
  purchaseOrders,
  userId = '',
  initialValues,
  submitLabel = 'Create Receipt',
  redirectToDetail = false,
  cancelHref,
  onSuccess,
  onCancel,
}: {
  purchaseOrders: PO[]
  userId?: string
  initialValues?: {
    purchaseOrderId?: string
    quantity?: number
    date?: string
    notes?: string
  }
  submitLabel?: string
  redirectToDetail?: boolean
  cancelHref?: string
  onSuccess?: (id?: string) => void
  onCancel?: () => void
}) {
  const router = useRouter()
  const [purchaseOrderId, setPurchaseOrderId] = useState(initialValues?.purchaseOrderId ?? purchaseOrders[0]?.id ?? '')
  const [quantity, setQuantity] = useState(initialValues?.quantity ?? 1)
  const [date, setDate] = useState(initialValues?.date ?? new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleCancel() {
    if (onCancel) {
      onCancel()
      return
    }
    if (cancelHref) {
      router.push(cancelHref)
    }
  }

  async function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseOrderId, quantity, date, notes, userId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Create failed')
      if (redirectToDetail && json?.id) {
        router.push(`/receipts/${json.id}`)
        return
      }
      router.refresh()
      onSuccess?.(json?.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submitForm} className="space-y-4">
      {error ? <div className="rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-300">{error}</div> : null}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Purchase Order *
          </label>
          <SearchableSelect
            selectedValue={purchaseOrderId}
            options={purchaseOrders.map((po) => ({
              value: po.id,
              label: po.label,
            }))}
            placeholder="- Select -"
            onSelect={setPurchaseOrderId}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Quantity *
          </label>
          <input
            required
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
            style={{ borderColor: 'var(--border-muted)' }}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Date *
          </label>
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
            style={{ borderColor: 'var(--border-muted)' }}
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
            style={{ borderColor: 'var(--border-muted)' }}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        {onCancel || cancelHref ? (
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md border px-4 py-2 text-sm"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--accent-primary-strong)' }}
        >
          {saving ? 'Creating...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
