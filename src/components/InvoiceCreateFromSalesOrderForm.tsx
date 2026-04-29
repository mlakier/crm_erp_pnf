'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchableSelect from '@/components/SearchableSelect'

type SalesOrderOption = {
  id: string
  label: string
}

export default function InvoiceCreateFromSalesOrderForm({
  salesOrders,
  formId,
  showInlineActions = true,
  onSuccess,
  onCancel,
}: {
  salesOrders: SalesOrderOption[]
  formId?: string
  showInlineActions?: boolean
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const [salesOrderId, setSalesOrderId] = useState(salesOrders[0]?.id ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesOrderId }),
      })

      const body = await response.json()
      if (!response.ok) {
        setError(body?.error || 'Unable to create invoice')
        setSaving(false)
        return
      }

      setSaving(false)
      onSuccess?.()
      if (body?.id) {
        router.push(`/invoices/${body.id}`)
        return
      }
      router.refresh()
    } catch {
      setError('Unable to create invoice')
      setSaving(false)
    }
  }

  return (
    <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Sales Order</label>
        <div className="mt-1">
          <SearchableSelect
            selectedValue={salesOrderId}
            options={salesOrders.map((salesOrder) => ({
              value: salesOrder.id,
              label: salesOrder.label,
            }))}
            placeholder={salesOrders.length === 0 ? 'No eligible sales orders' : 'Select sales order'}
            onSelect={setSalesOrderId}
          />
        </div>
      </div>

      {error ? <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p> : null}

      {showInlineActions ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border px-4 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || salesOrders.length === 0}
            className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}
          >
            {saving ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      ) : null}
    </form>
  )
}
