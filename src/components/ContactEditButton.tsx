'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { isValidEmail } from '@/lib/validation'
import AddressModal, { parseAddress } from '@/components/AddressModal'

type ContactEditValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  position: string
  customerId: string
  inactive: boolean
}

export default function ContactEditButton({
  contactId,
  values,
  customers,
}: {
  contactId: string
  values: ContactEditValues
  customers: Array<{ id: string; name: string }>
}) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dismissPrompt, setDismissPrompt] = useState('')
  const [formValues, setFormValues] = useState<ContactEditValues>(values)
  const [address, setAddress] = useState(values.address)
  const [addressModalOpen, setAddressModalOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function resetFromProps() {
    setFormValues(values)
    setAddress(values.address)
    setAddressModalOpen(false)
    setError('')
    setDismissPrompt('')
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    if (formValues.email.trim() && !isValidEmail(formValues.email)) {
      setError('Please enter a valid email address')
      setSaving(false)
      return
    }

    if (!formValues.firstName.trim() || !formValues.lastName.trim()) {
      setError('First and last name are required')
      setSaving(false)
      return
    }

    try {
      const response = await fetch(`/api/contacts?id=${encodeURIComponent(contactId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formValues, address }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.error ?? 'Failed to update contact')
      setOpen(false)
      setDismissPrompt('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contact')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetFromProps()
          setOpen(true)
        }}
        className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
        style={{ backgroundColor: 'var(--accent-primary-strong)' }}
      >
        Edit
      </button>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setDismissPrompt('Use Save changes to keep updates or Cancel to discard.')
            }
          }}
        >
          <div
            className="relative w-full max-w-3xl rounded-xl border p-6 shadow-xl"
            style={{ backgroundColor: 'var(--card-elevated)', borderColor: 'var(--border-muted)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-4 text-base font-semibold text-white">Edit Contact</h3>
            {dismissPrompt ? <p className="mb-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{dismissPrompt}</p> : null}

            <form onSubmit={submitForm} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>First Name *</span>
                  <input
                    required
                    value={formValues.firstName}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-white bg-transparent"
                    style={{ borderColor: 'var(--border-muted)' }}
                  />
                </label>
                <label className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>Last Name *</span>
                  <input
                    required
                    value={formValues.lastName}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-white bg-transparent"
                    style={{ borderColor: 'var(--border-muted)' }}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>Email</span>
                  <input
                    type="email"
                    value={formValues.email}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-white bg-transparent"
                    style={{ borderColor: 'var(--border-muted)' }}
                  />
                </label>
                <label className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>Phone</span>
                  <input
                    value={formValues.phone}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-white bg-transparent"
                    style={{ borderColor: 'var(--border-muted)' }}
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Address</label>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAddressModalOpen(true)}
                    className="rounded-md border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                  >
                    {address ? 'Edit Address' : 'Enter Address'}
                  </button>
                  <p className="text-xs" style={{ color: address ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {address ? address : 'No address saved yet'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>Position</span>
                  <input
                    value={formValues.position}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, position: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-white bg-transparent"
                    style={{ borderColor: 'var(--border-muted)' }}
                  />
                </label>
                <label className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>Customer</span>
                  <select
                    value={formValues.customerId}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, customerId: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-white bg-transparent"
                    style={{ borderColor: 'var(--border-muted)' }}
                  >
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`contact-inactive-${contactId}`}
                  checked={formValues.inactive}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, inactive: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor={`contact-inactive-${contactId}`} className="text-sm text-white">Inactive</label>
              </div>

              {error ? <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDismissPrompt('')
                    setOpen(false)
                  }}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--accent-primary-strong)' }}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>

            <AddressModal
              open={addressModalOpen}
              onClose={() => setAddressModalOpen(false)}
              onSave={(formatted) => {
                setAddress(formatted)
                setFormValues((prev) => ({ ...prev, address: formatted }))
                setAddressModalOpen(false)
              }}
              initialFields={parseAddress(address)}
              zIndex={130}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
