'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchableSelect from '@/components/SearchableSelect'

type Option = { value: string; label: string }

export default function BillPaymentCreateForm({
  bills,
  methodOptions,
  statusOptions,
  initialValues,
  submitLabel = 'Create Bill Payment',
  redirectToDetail = false,
  cancelHref,
  onSuccess,
  onCancel,
}: {
  bills: { id: string; label: string }[]
  methodOptions: Option[]
  statusOptions: Option[]
  initialValues?: {
    billId?: string
    amount?: string
    date?: string
    method?: string
    status?: string
    reference?: string
    notes?: string
  }
  submitLabel?: string
  redirectToDetail?: boolean
  cancelHref?: string
  onSuccess?: (id?: string) => void
  onCancel?: () => void
}) {
  const router = useRouter()
  const [billId, setBillId] = useState(initialValues?.billId ?? bills[0]?.id ?? '')
  const [amount, setAmount] = useState(initialValues?.amount ?? '')
  const [date, setDate] = useState(initialValues?.date ?? new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState(initialValues?.method ?? methodOptions[0]?.value ?? '')
  const [status, setStatus] = useState(initialValues?.status ?? statusOptions[0]?.value ?? '')
  const [reference, setReference] = useState(initialValues?.reference ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleCancel() {
    if (onCancel) {
      onCancel()
      return
    }
    if (cancelHref) {
      router.push(cancelHref)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/bill-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, amount, date, method, status, reference: reference || null, notes: notes || null }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string; id?: string }
      setSaving(false)
      if (!res.ok) {
        setError(body.error ?? 'Error creating bill payment')
        return
      }
      if (redirectToDetail && body.id) {
        router.push(`/bill-payments/${body.id}`)
        return
      }
      router.refresh()
      onSuccess?.(body.id)
    } catch {
      setSaving(false)
      setError('Error creating bill payment')
    }
  }

  const inputStyle = { borderColor: 'var(--border-muted)' }
  const inputClass = 'w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Bill
        </label>
        <SearchableSelect
          selectedValue={billId}
          options={bills.map((bill) => ({ value: bill.id, label: bill.label }))}
          placeholder="Select bill"
          searchPlaceholder="Search bill"
          onSelect={setBillId}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Amount
        </label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
          style={inputStyle}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Date
        </label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} style={inputStyle} required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Method
        </label>
        <SearchableSelect
          selectedValue={method}
          options={methodOptions}
          placeholder="Select method"
          searchPlaceholder="Search method"
          onSelect={setMethod}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Status
        </label>
        <SearchableSelect
          selectedValue={status}
          options={statusOptions}
          placeholder="Select status"
          searchPlaceholder="Search status"
          onSelect={setStatus}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Reference
        </label>
        <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} style={inputStyle} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Notes
        </label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} style={inputStyle} rows={2} />
      </div>
      {error ? (
        <p className="text-sm" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}
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
          {saving ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
