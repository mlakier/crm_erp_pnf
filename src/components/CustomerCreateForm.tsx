'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isFieldRequired } from '@/lib/form-requirements'
import { useListOptions } from '@/lib/list-options-client'
import { isValidEmail } from '@/lib/validation'
import AddressModal, { parseAddress } from '@/components/AddressModal'
import {
  defaultCustomerFormCustomization,
  CUSTOMER_FORM_FIELDS,
  type CustomerFormCustomizationConfig,
  type CustomerFormFieldKey,
} from '@/lib/customer-form-customization'

type CustomerFormCustomizationResponse = {
  config?: CustomerFormCustomizationConfig
}

export default function CustomerCreateForm({
  ownerUserId,
  subsidiaries,
  currencies,
  onSuccess,
  onCancel,
}: {
  ownerUserId: string
  subsidiaries: Array<{ id: string; subsidiaryId: string; name: string }>
  currencies: Array<{ id: string; currencyId: string; name: string }>
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [industry, setIndustry] = useState('')
  const [primarySubsidiaryId, setPrimarySubsidiaryId] = useState('')
  const [primaryCurrencyId, setPrimaryCurrencyId] = useState('')
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [contactFirstName, setContactFirstName] = useState('')
  const [contactLastName, setContactLastName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactPosition, setContactPosition] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [runtimeRequirements, setRuntimeRequirements] = useState<Record<string, boolean> | null>(null)
  const [layoutConfig, setLayoutConfig] = useState<CustomerFormCustomizationConfig>(() => defaultCustomerFormCustomization())
  const router = useRouter()
  const industryOptions = useListOptions('customer', 'industry')

  useEffect(() => {
    let mounted = true
    async function loadRequirements() {
      try {
        const [requirementsResponse, layoutResponse] = await Promise.all([
          fetch('/api/config/form-requirements', { cache: 'no-store' }),
          fetch('/api/config/customer-form-customization', { cache: 'no-store' }),
        ])
        const requirementsBody = await requirementsResponse.json()
        const layoutBody = (await layoutResponse.json()) as CustomerFormCustomizationResponse
        if (!mounted) return
        if (requirementsResponse.ok) setRuntimeRequirements(requirementsBody?.config?.customerCreate ?? null)
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
    return isFieldRequired('customerCreate', field)
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
        fields: CUSTOMER_FORM_FIELDS
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

  function getFieldPlacementStyle(fieldId: CustomerFormFieldKey): React.CSSProperties {
    const config = layoutConfig.fields[fieldId]
    return {
      gridColumnStart: Math.min(formColumns, Math.max(1, config?.column ?? 1)),
      gridRowStart: Math.max(1, (config?.order ?? 0) + 1),
    }
  }

  function renderField(fieldId: CustomerFormFieldKey) {
    switch (fieldId) {
      case 'customerId':
        return (
          <FieldInput label={requiredLabel('Customer ID', req('customerId'))}>
            <input value="Generated automatically" readOnly disabled className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white opacity-80" style={{ borderColor: 'var(--border-muted)' }} />
          </FieldInput>
        )
      case 'name':
        return (
          <FieldInput label={requiredLabel('Name', req('name'))}>
            <input value={name} onChange={(e) => setName(e.target.value)} required={req('name')} className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }} />
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
          <FieldInput label={requiredLabel('Billing Address', req('address'))}>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAddressModalOpen(true)}
                className="rounded-md border px-3 py-2 text-sm font-medium"
                style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
              >
                {address ? 'Edit Address' : 'Enter Address'}
              </button>
              <p className="text-xs" style={{ color: address ? 'var(--text-secondary)' : 'var(--danger)' }}>
                {address ? address : 'No validated address saved yet'}
              </p>
            </div>
          </FieldInput>
        )
      case 'industry':
        return (
          <FieldInput label={requiredLabel('Industry', req('industry'))}>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} required={req('industry')} className="mt-1 block w-full rounded-md border bg-transparent py-2 px-3 text-sm" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="">None</option>
              {industryOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </FieldInput>
        )
      case 'primarySubsidiaryId':
        return (
          <FieldInput label={requiredLabel('Primary Subsidiary', req('primarySubsidiaryId'))}>
            <select value={primarySubsidiaryId} onChange={(e) => setPrimarySubsidiaryId(e.target.value)} required={req('primarySubsidiaryId')} className="mt-1 block w-full rounded-md border bg-transparent py-2 px-3 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)', backgroundColor: 'var(--card)' }}>
              <option value="" style={{ backgroundColor: 'var(--card-elevated)', color: 'var(--text-muted)' }}>None</option>
              {subsidiaries.map((subsidiary) => (
                <option key={subsidiary.id} value={subsidiary.id} style={{ backgroundColor: 'var(--card-elevated)', color: '#ffffff' }}>
                  {subsidiary.subsidiaryId} - {subsidiary.name}
                </option>
              ))}
            </select>
          </FieldInput>
        )
      case 'primaryCurrencyId':
        return (
          <FieldInput label={requiredLabel('Primary Currency', req('primaryCurrencyId'))}>
            <select value={primaryCurrencyId} onChange={(e) => setPrimaryCurrencyId(e.target.value)} required={req('primaryCurrencyId')} className="mt-1 block w-full rounded-md border bg-transparent py-2 px-3 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)', backgroundColor: 'var(--card)' }}>
              <option value="" style={{ backgroundColor: 'var(--card-elevated)', color: 'var(--text-muted)' }}>None</option>
              {currencies.map((currency) => (
                <option key={currency.id} value={currency.id} style={{ backgroundColor: 'var(--card-elevated)', color: '#ffffff' }}>
                  {currency.currencyId} - {currency.name}
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

    if (email.trim() && !isValidEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (contactEmail.trim() && !isValidEmail(contactEmail)) {
      setError('Please enter a valid contact email address')
      return
    }

    if (req('address') && !address.trim()) {
      setError('Address is required. Click Address and save a validated address.')
      return
    }

    if (
      req('primaryContact') &&
      (req('contactFirstName') && !contactFirstName.trim())
    ) {
      setError('Primary contact first name is required')
      return
    }

    if (
      req('primaryContact') &&
      (req('contactLastName') && !contactLastName.trim())
    ) {
      setError('Primary contact last name is required')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          address,
          industry,
          primarySubsidiaryId,
          primaryCurrencyId,
          inactive: false,
          userId: ownerUserId,
          contacts: [
            {
              firstName: contactFirstName,
              lastName: contactLastName,
              email: contactEmail,
              phone: contactPhone,
              position: contactPosition,
            },
          ],
        }),
      })

      const body = await response.json()

      if (!response.ok) {
        setError(body.error || 'Unable to create customer')
        setSaving(false)
        return
      }

      setName('')
      setEmail('')
      setPhone('')
      setAddress('')
      setIndustry('')
      setPrimarySubsidiaryId('')
      setPrimaryCurrencyId('')
      setContactFirstName('')
      setContactLastName('')
      setContactEmail('')
      setContactPhone('')
      setContactPosition('')
      setSaving(false)
      onSuccess?.()
      router.refresh()
    } catch {
      setError('Unable to create customer')
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

        <div className="rounded-md border p-4" style={{ borderColor: 'var(--border-muted)' }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Primary Contact {req('primaryContact') ? '(Required)' : '(Optional)'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{requiredLabel('First name', req('contactFirstName'))}</label>
              <input
                value={contactFirstName}
                onChange={(e) => setContactFirstName(e.target.value)}
                required={req('contactFirstName')}
                className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{requiredLabel('Last name', req('contactLastName'))}</label>
              <input
                value={contactLastName}
                onChange={(e) => setContactLastName(e.target.value)}
                required={req('contactLastName')}
                className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Contact email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Contact phone</label>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Position</label>
            <input
              value={contactPosition}
              onChange={(e) => setContactPosition(e.target.value)}
              className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </div>
        </div>

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
            {saving ? 'Saving...' : 'Create Customer'}
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
