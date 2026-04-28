'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseMoneyValue } from '@/lib/money'

export default function BillCreateForm({
  vendors,
  initialValues,
  submitLabel = 'Create Bill',
  redirectToDetail = false,
  cancelHref,
  onSuccess,
  onCancel,
}: {
  vendors: Array<{ id: string; name: string }>
  initialValues?: {
    vendorId?: string
    total?: string
    date?: string
    dueDate?: string
    status?: string
    notes?: string
  }
  submitLabel?: string
  redirectToDetail?: boolean
  cancelHref?: string
  onSuccess?: (id?: string) => void
  onCancel?: () => void
}) {
  const [vendorId, setVendorId] = useState(initialValues?.vendorId ?? vendors[0]?.id ?? '')
  const [total, setTotal] = useState(initialValues?.total ?? '')
  const [date, setDate] = useState(initialValues?.date ?? new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? '')
  const [status, setStatus] = useState(initialValues?.status ?? 'received')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function handleCancel() {
    if (onCancel) {
      onCancel()
      return
    }
    if (cancelHref) {
      router.push(cancelHref)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendorId,
          total: parseMoneyValue(total),
          date,
          dueDate: dueDate || null,
          status,
          notes,
        }),
      })

      const body = (await response.json().catch(() => ({}))) as { error?: string; id?: string }
      if (!response.ok) {
        setError(body.error || 'Unable to create bill')
        setSaving(false)
        return
      }

      if (redirectToDetail && body.id) {
        router.push(`/bills/${body.id}`)
        return
      }

      setTotal('')
      setDate(new Date().toISOString().split('T')[0])
      setDueDate('')
      setStatus('received')
      setNotes('')
      setSaving(false)
      router.refresh()
      onSuccess?.(body.id)
    } catch {
      setError('Unable to create bill')
      setSaving(false)
    }
  }

  return (
    <section>
      <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Bill # is generated automatically when the record is created.
      </p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Vendor
          </label>
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className="mt-1 block w-full rounded-md border bg-transparent py-2 px-3 text-sm text-white"
            style={{ borderColor: 'var(--border-muted)' }}
          >
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Total
            </label>
            <input
              type="number"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full rounded-md border bg-transparent py-2 px-3 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            >
              <option value="received">Received</option>
              <option value="pending approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="void">Void</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Bill Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block min-h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
            style={{ borderColor: 'var(--border-muted)' }}
          />
        </div>
        {error ? (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-3">
          {onCancel || cancelHref ? (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border px-4 py-2 text-sm font-medium"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed"
            style={{ backgroundColor: saving ? '#64748b' : 'var(--accent-primary-strong)' }}
          >
            {saving ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </section>
  )
}
