'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchableSelect from '@/components/SearchableSelect'

type Vendor = { id: string; name: string }
type Department = { id: string; name: string; departmentId: string }
type Subsidiary = { id: string; subsidiaryId: string; name: string }
type Currency = { id: string; currencyId: string; code?: string; name: string }

export default function RequisitionCreateForm({
  userId,
  vendors,
  departments,
  entities,
  currencies,
  formId,
  fullPage,
  showFooterActions = true,
  redirectBasePath,
  onSuccess,
  onCancel,
}: {
  userId: string
  vendors: Vendor[]
  departments: Department[]
  entities: Subsidiary[]
  currencies: Currency[]
  formId?: string
  fullPage?: boolean
  showFooterActions?: boolean
  redirectBasePath?: string
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [neededByDate, setNeededByDate] = useState('')
  const [notes, setNotes] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [subsidiaryId, setSubsidiaryId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const response = await fetch('/api/purchase-requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || null,
          description: description || null,
          priority,
          neededByDate: neededByDate || null,
          notes: notes || null,
          vendorId: vendorId || null,
          departmentId: departmentId || null,
          subsidiaryId: subsidiaryId || null,
          currencyId: currencyId || null,
          userId,
        }),
      })

      const body = await response.json()
      if (!response.ok) {
        setError(body.error || 'Unable to create requisition')
        setSaving(false)
        return
      }

      if ((fullPage || redirectBasePath) && body?.id) {
        router.push(`${redirectBasePath ?? '/purchase-requisitions'}/${body.id}`)
        router.refresh()
        return
      }

      router.refresh()
      onSuccess?.()
    } catch {
      setError('Unable to create requisition')
      setSaving(false)
    }
  }

  const inputClassName =
    'mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white focus:outline-none'
  const labelClassName = 'block text-sm font-medium'

  return (
    <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Requisition number is generated automatically.
      </p>

      <div>
        <label className={labelClassName} style={{ color: 'var(--text-secondary)' }}>
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Brief description of what is needed"
          className={inputClassName}
          style={{ borderColor: 'var(--border-muted)' }}
        />
      </div>

      <div>
        <label className={labelClassName} style={{ color: 'var(--text-secondary)' }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className={inputClassName}
          style={{ borderColor: 'var(--border-muted)', resize: 'vertical' }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} style={{ color: 'var(--text-secondary)' }}>
            Priority
          </label>
          <div className="mt-1">
            <SearchableSelect
              selectedValue={priority}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
              placeholder="Select priority"
              onSelect={(value) => setPriority(value || 'medium')}
            />
          </div>
        </div>
        <div>
          <label className={labelClassName} style={{ color: 'var(--text-secondary)' }}>
            Needed by date
          </label>
          <input
            type="date"
            value={neededByDate}
            onChange={(event) => setNeededByDate(event.target.value)}
            className={inputClassName}
            style={{ borderColor: 'var(--border-muted)' }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} style={{ color: 'var(--text-secondary)' }}>
            Department
          </label>
          <div className="mt-1">
            <SearchableSelect
              selectedValue={departmentId}
              options={departments.map((department) => ({
                value: department.id,
                label: `${department.departmentId} - ${department.name}`,
              }))}
              placeholder="- Select department -"
              onSelect={setDepartmentId}
            />
          </div>
        </div>
        <div>
          <label className={labelClassName} style={{ color: 'var(--text-secondary)' }}>
            Preferred vendor
          </label>
          <div className="mt-1">
            <SearchableSelect
              selectedValue={vendorId}
              options={vendors.map((vendor) => ({
                value: vendor.id,
                label: vendor.name,
              }))}
              placeholder="- Select vendor -"
              onSelect={setVendorId}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} style={{ color: 'var(--text-secondary)' }}>
            Subsidiary
          </label>
          <div className="mt-1">
            <SearchableSelect
              selectedValue={subsidiaryId}
              options={entities.map((entity) => ({
                value: entity.id,
                label: `${entity.subsidiaryId} - ${entity.name}`,
              }))}
              placeholder="- Select subsidiary -"
              onSelect={setSubsidiaryId}
            />
          </div>
        </div>
        <div>
          <label className={labelClassName} style={{ color: 'var(--text-secondary)' }}>
            Currency
          </label>
          <div className="mt-1">
            <SearchableSelect
              selectedValue={currencyId}
              options={currencies.map((currency) => ({
                value: currency.id,
                label: `${currency.code ?? currency.currencyId} - ${currency.name}`,
              }))}
              placeholder="- Select currency -"
              onSelect={setCurrencyId}
            />
          </div>
        </div>
      </div>

      <div>
        <label className={labelClassName} style={{ color: 'var(--text-secondary)' }}>
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          className={inputClassName}
          style={{ borderColor: 'var(--border-muted)', resize: 'vertical' }}
        />
      </div>

      {error ? (
        <p className="text-xs" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}

      {showFooterActions ? (
        <div className="flex justify-end gap-2 pt-2">
          {fullPage ? (
            <button
              type="button"
              onClick={() => router.push('/purchase-requisitions')}
              className="rounded-md border px-3 py-1.5 text-sm font-medium"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border px-3 py-1.5 text-sm font-medium"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-md px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent-primary-strong)' }}
          >
            {saving ? 'Creating...' : 'Create requisition'}
          </button>
        </div>
      ) : null}
    </form>
  )
}
