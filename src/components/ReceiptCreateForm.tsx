'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type PO = { id: string; label: string }

export default function ReceiptCreateForm({ purchaseOrders, onSuccess, onCancel }: { purchaseOrders: PO[]; onSuccess?: () => void; onCancel?: () => void }) {
  const router = useRouter()
  const [purchaseOrderId, setPurchaseOrderId] = useState(purchaseOrders[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseOrderId, quantity, date, notes, userId: '' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Create failed')
      router.refresh()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submitForm} className="space-y-4">
      {error && <div className="rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-300">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Purchase Order *</label>
          <select required value={purchaseOrderId} onChange={e => setPurchaseOrderId(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }}>
            <option value="">— Select —</option>
            {purchaseOrders.map(po => <option key={po.id} value={po.id}>{po.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Quantity *</label>
          <input required type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Date *</label>
          <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }} />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }} />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>Cancel</button>
        <button type="submit" disabled={saving} className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>{saving ? 'Creating…' : 'Create Receipt'}</button>
      </div>
    </form>
  )
}
