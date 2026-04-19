'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isFieldRequired } from '@/lib/form-requirements'
import { isValidEmail } from '@/lib/validation'
import AddressModal, { parseAddress } from '@/components/AddressModal'
import {
  defaultContactFormCustomization,
  CONTACT_FORM_FIELDS,
  type ContactFormCustomizationConfig,
  type ContactFormFieldKey,
} from '@/lib/contact-form-customization'

type ContactFormCustomizationResponse = {
  config?: ContactFormCustomizationConfig
}

export default function ContactCreateForm({
  userId,
  customers,
  onSuccess,
  onCancel,
}: {
  userId: string
  customers: Array<{ id: string; name: string }>
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [position, setPosition] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [runtimeRequirements, setRuntimeRequirements] = useState<Record<string, boolean> | null>(null)
  const [layoutConfig, setLayoutConfig] = useState<ContactFormCustomizationConfig>(() => defaultContactFormCustomization())
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    async function loadRequirements() {
      try {
        const [requirementsResponse, layoutResponse] = await Promise.all([
          fetch('/api/config/form-requirements', { cache: 'no-store' }),
          fetch('/api/config/contact-form-customization', { cache: 'no-store' }),
        ])
        const requirementsBody = await requirementsResponse.json()
        const layoutBody = (await layoutResponse.json()) as ContactFormCustomizationResponse
        if (!mounted) return
        if (requirementsResponse.ok) setRuntimeRequirements(requirementsBody?.config?.contactCreate ?? null)
        if (layoutResponse.ok && layoutBody.config) setLayoutConfig(layoutBody.config)
      } catch {
        // Keep static defaults when config API is unavailable.
      }
    }
    loadRequirements()
    return () => {
      mounted = false
    }
  }, [])

  function req(field: string): boolean {
    if (runtimeRequirements && Object.prototype.hasOwnProperty.call(runtimeRequirements, field)) {
      return Boolean(runtimeRequirements[field])
    }
    return isFieldRequired('contactCreate', field)
  }

  function requiredLabel(text: string, required: boolean) {
    if (!required) return <>{text}</>
    return (
      <>
        {text} <span style={{ color: 'var(--danger)' }}>*</span>
      </>
    )
  }

  const groupedVisibleFields = useMemo(() => {
    return layoutConfig.sections
      .map((section) => ({
        section,
        fields: CONTACT_FORM_FIELDS
          .filter((field) => {
            const config = layoutConfig.fields[field.id]
            return config?.visible !== false && config?.section === section
          })
          .sort((a, b) => {
            const left = layoutConfig.fields[a.id]
            const right = layoutConfig.fields[b.id]
            if ((left?.column ?? 1) !== (right?.column ?? 1)) return (left?.column ?? 1) - (right?.column ?? 1)
            return (left?.order ?? 0) - (right?.order ?? 0)
          }),
      }))
      .filter((group) => group.fields.length > 0)
  }, [layoutConfig])

  const formColumns = Math.min(4, Math.max(1, layoutConfig.formColumns || 2))

  function getSectionGridStyle(): React.CSSProperties {
    return { gridTemplateColumns: `repeat(${formColumns}, minmax(0, 1fr))` }
  }

  function getFieldPlacementStyle(fieldId: ContactFormFieldKey): React.CSSProperties {
    const config = layoutConfig.fields[fieldId]
    return {
      gridColumnStart: Math.min(formColumns, Math.max(1, config?.column ?? 1)),
      gridRowStart: Math.max(1, (config?.order ?? 0) + 1),
    }
  }

  function renderField(fieldId: ContactFormFieldKey) {
    switch (fieldId) {
      case 'contactNumber':
        return (
          <FieldInput label={requiredLabel('Contact ID', req('contactNumber'))}>
            <input value="Generated automatically" readOnly disabled className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white opacity-80" style={{ borderColor: 'var(--border-muted)' }} />
          </FieldInput>
        )
      case 'firstName':
        return (
          <FieldInput label={requiredLabel('First name', req('firstName'))}>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required={req('firstName')} className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </FieldInput>
        )
      case 'lastName':
        return (
          <FieldInput label={requiredLabel('Last name', req('lastName'))}>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} required={req('lastName')} className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </FieldInput>
        )
      case 'email':
        return (
          <FieldInput label={requiredLabel('Email', req('email'))}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required={req('email')} className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </FieldInput>
        )
      case 'phone':
        return (
          <FieldInput label={requiredLabel('Phone', req('phone'))}>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required={req('phone')} className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </FieldInput>
        )
      case 'address':
        return (
          <FieldInput label={requiredLabel('Address', req('address'))}>
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
          </FieldInput>
        )
      case 'position':
        return (
          <FieldInput label={requiredLabel('Position', req('position'))}>
            <input value={position} onChange={(e) => setPosition(e.target.value)} required={req('position')} className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </FieldInput>
        )
      case 'customerId':
        return (
          <FieldInput label={requiredLabel('Customer', req('customerId'))}>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required={req('customerId')} className="mt-1 block w-full rounded-md border bg-transparent py-2 px-3 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)', backgroundColor: 'var(--card)' }}>
              <option value="" style={{ backgroundColor: 'var(--card-elevated)', color: 'var(--text-muted)' }}>
                None
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id} style={{ backgroundColor: 'var(--card-elevated)', color: '#ffffff' }}>
                  {customer.name}
                </option>
              ))}
            </select>
          </FieldInput>
        )
      case 'inactive':
        return (
          <FieldInput label={requiredLabel('Inactive', req('inactive'))}>
            <select value="false" disabled className="mt-1 block w-full rounded-md border bg-transparent py-2 px-3 text-sm opacity-80" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)', backgroundColor: 'var(--card)' }}>
              <option value="false">No</option>
            </select>
          </FieldInput>
        )
      default:
        return null
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (email.trim() && !isValidEmail(email)) {
        setError('Please enter a valid email address')
        setSaving(false)
        return
      }

      if (req('customerId') && !customerId) {
        setError('Please select a customer')
        setSaving(false)
        return
      }

      if (req('address') && !address.trim()) {
        setError('Address is required')
        setSaving(false)
        return
      }

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          address,
          position,
          customerId,
          userId,
          inactive: false,
        }),
      })

      const body = await response.json()
      if (!response.ok) {
        setError(body.error || 'Unable to create contact')
        setSaving(false)
        return
      }

      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setAddress('')
      setPosition('')
      setCustomerId('')
      setAddressModalOpen(false)
      setSaving(false)
      onSuccess?.()
      router.refresh()
    } catch {
      setError('Unable to create contact')
      setSaving(false)
    }
  }

  return (
    <section className="rounded-lg p-2">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {groupedVisibleFields.map(({ section, fields }) => (
          <section key={section} className="rounded-lg border p-4" style={{ borderColor: 'var(--border-muted)' }}>
            <div className="mb-4"><h3 className="text-sm font-semibold text-white">{section}</h3></div>
            <div className="grid gap-4" style={getSectionGridStyle()}>
              {fields.map((field) => <div key={field.id} style={getFieldPlacementStyle(field.id)}>{renderField(field.id)}</div>)}
            </div>
          </section>
        ))}
        <AddressModal
          open={addressModalOpen}
          onClose={() => setAddressModalOpen(false)}
          onSave={(formatted) => {
            setAddress(formatted)
            setAddressModalOpen(false)
          }}
          initialFields={parseAddress(address)}
          zIndex={130}
        />
        {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
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
            disabled={saving}
            className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: '#7fd0cf', color: '#0f172a' }}
          >
            {saving ? 'Saving...' : 'Create Contact'}
          </button>
        </div>
      </form>
    </section>
  )
}

function FieldInput({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
      <span>{label}</span>
      {children}
    </label>
  )
}
