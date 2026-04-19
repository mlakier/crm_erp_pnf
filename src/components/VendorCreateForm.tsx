'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isFieldRequired } from '@/lib/form-requirements'
import { isValidEmail } from '@/lib/validation'
import AddressModal, { parseAddress } from '@/components/AddressModal'
import {
  defaultVendorFormCustomization,
  VENDOR_FORM_FIELDS,
  type VendorFormCustomizationConfig,
  type VendorFormFieldKey,
} from '@/lib/vendor-form-customization'

type VendorFormCustomizationResponse = {
  config?: VendorFormCustomizationConfig
}

export default function VendorCreateForm({
  subsidiaries,
  currencies,
  onSuccess,
  onCancel,
}: {
  subsidiaries: Array<{ id: string; subsidiaryId: string; name: string }>
  currencies: Array<{ id: string; currencyId: string; name: string }>
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [taxId, setTaxId] = useState('')
  const [primarySubsidiaryId, setPrimarySubsidiaryId] = useState('')
  const [primaryCurrencyId, setPrimaryCurrencyId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [runtimeRequirements, setRuntimeRequirements] = useState<Record<string, boolean> | null>(null)
  const [layoutConfig, setLayoutConfig] = useState<VendorFormCustomizationConfig>(() => defaultVendorFormCustomization())
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    async function loadRequirements() {
      try {
        const [requirementsResponse, layoutResponse] = await Promise.all([
          fetch('/api/config/form-requirements', { cache: 'no-store' }),
          fetch('/api/config/vendor-form-customization', { cache: 'no-store' }),
        ])
        const requirementsBody = await requirementsResponse.json()
        const layoutBody = (await layoutResponse.json()) as VendorFormCustomizationResponse
        if (!mounted) return
        if (requirementsResponse.ok) setRuntimeRequirements(requirementsBody?.config?.vendorCreate ?? null)
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
    return isFieldRequired('vendorCreate', field)
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
        fields: VENDOR_FORM_FIELDS
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

  function getFieldPlacementStyle(fieldId: VendorFormFieldKey): React.CSSProperties {
    const config = layoutConfig.fields[fieldId]
    return {
      gridColumnStart: Math.min(formColumns, Math.max(1, config?.column ?? 1)),
      gridRowStart: Math.max(1, (config?.order ?? 0) + 1),
    }
  }

  function renderField(fieldId: VendorFormFieldKey) {
    switch (fieldId) {
      case 'vendorNumber':
        return (
          <FieldInput label={requiredLabel('Vendor ID', req('vendorNumber'))}>
            <input value="Generated automatically" readOnly disabled className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white opacity-80" style={{ borderColor: 'var(--border-muted)' }} />
          </FieldInput>
        )
      case 'name':
        return (
          <FieldInput label={requiredLabel('Vendor name', req('name'))}>
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
              <p className="text-xs" style={{ color: address ? 'var(--text-secondary)' : 'var(--danger)' }}>
                {address ? address : 'No validated address saved yet'}
              </p>
            </div>
          </FieldInput>
        )
      case 'taxId':
        return (
          <FieldInput label={requiredLabel('Tax ID', req('taxId'))}>
            <input value={taxId} onChange={(e) => setTaxId(e.target.value)} required={req('taxId')} className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }} />
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
            <select value={String(false)} disabled className="mt-1 block w-full rounded-md border bg-transparent py-2 px-3 text-sm opacity-80" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)', backgroundColor: 'var(--card)' }}>
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

    if (req('address') && !address.trim()) {
      setError('Address is required. Click Address and save a validated address.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, phone, address, taxId, primarySubsidiaryId, primaryCurrencyId, inactive: false }),
      })

      const body = await response.json()
      if (!response.ok) {
        setError(body.error || 'Unable to create vendor')
        setSaving(false)
        return
      }

      setName('')
      setEmail('')
      setPhone('')
      setAddress('')
      setTaxId('')
      setPrimarySubsidiaryId('')
      setPrimaryCurrencyId('')
      setSaving(false)
      onSuccess?.()
      router.refresh()
    } catch {
      setError('Unable to create vendor')
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
            {saving ? 'Saving...' : 'Create Vendor'}
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
