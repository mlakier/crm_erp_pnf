'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AddressModal, { parseAddress } from '@/components/AddressModal'
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY_CODE } from '@/lib/address-country-config'
import { isFieldRequired } from '@/lib/form-requirements'
import {
  defaultSubsidiaryFormCustomization,
  SUBSIDIARY_FORM_FIELDS,
  type SubsidiaryFormCustomizationConfig,
  type SubsidiaryFormFieldKey,
} from '@/lib/subsidiary-form-customization'

type SubsidiaryFormCustomizationResponse = {
  config?: SubsidiaryFormCustomizationConfig
}

export default function EntityCreateForm({
  currencies,
  glAccounts,
  parentEntities,
  initialSubsidiaryId,
  onSuccess,
  onCancel,
}: {
  currencies: Array<{ id: string; currencyId: string; name: string }>
  glAccounts: Array<{ id: string; accountId: string; name: string }>
  parentEntities?: Array<{ id: string; subsidiaryId: string; name: string }>
  initialSubsidiaryId: string
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const router = useRouter()
  const [currencyOptions, setCurrencyOptions] = useState(currencies)
  const [layoutConfig, setLayoutConfig] = useState<SubsidiaryFormCustomizationConfig>(() => defaultSubsidiaryFormCustomization())
  const [runtimeRequirements, setRuntimeRequirements] = useState<Record<string, boolean> | null>(null)

  const [name, setName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [entityType, setEntityType] = useState('')
  const [country, setCountry] = useState(DEFAULT_COUNTRY_CODE)
  const [taxId, setTaxId] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [address, setAddress] = useState('')
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [defaultCurrencyId, setDefaultCurrencyId] = useState('')
  const [functionalCurrencyId, setFunctionalCurrencyId] = useState('')
  const [reportingCurrencyId, setReportingCurrencyId] = useState('')
  const [parentEntityId, setParentEntityId] = useState('')
  const [consolidationMethod, setConsolidationMethod] = useState('')
  const [ownershipPercent, setOwnershipPercent] = useState('')
  const [retainedEarningsAccountId, setRetainedEarningsAccountId] = useState('')
  const [ctaAccountId, setCtaAccountId] = useState('')
  const [intercompanyClearingAccountId, setIntercompanyClearingAccountId] = useState('')
  const [dueToAccountId, setDueToAccountId] = useState('')
  const [dueFromAccountId, setDueFromAccountId] = useState('')
  const [inactive, setInactive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCurrencyOptions(currencies)
  }, [currencies])

  useEffect(() => {
    let mounted = true
    async function loadConfig() {
      try {
        const [requirementsResponse, layoutResponse] = await Promise.all([
          fetch('/api/config/form-requirements', { cache: 'no-store' }),
          fetch('/api/config/subsidiary-form-customization', { cache: 'no-store' }),
        ])
        const requirementsBody = await requirementsResponse.json()
        const layoutBody = (await layoutResponse.json()) as SubsidiaryFormCustomizationResponse
        if (!mounted) return
        if (requirementsResponse.ok) setRuntimeRequirements(requirementsBody?.config?.subsidiaryCreate ?? null)
        if (layoutResponse.ok && layoutBody.config) setLayoutConfig(layoutBody.config)
      } catch {
        // Keep defaults.
      }
    }
    loadConfig()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadCurrencies() {
      if (currencies.length > 0) return
      try {
        const response = await fetch('/api/currencies', { cache: 'no-store' })
        const body = await response.json()
        if (!response.ok || !Array.isArray(body) || !mounted) return
        setCurrencyOptions(
          body
            .filter((item: unknown): item is { id: string; currencyId: string; name: string } => {
              if (!item || typeof item !== 'object') return false
              const row = item as { id?: unknown; currencyId?: unknown; name?: unknown }
              return typeof row.id === 'string' && typeof row.currencyId === 'string' && typeof row.name === 'string'
            })
            .sort((a, b) => a.currencyId.localeCompare(b.currencyId))
        )
      } catch {
        // Keep form usable even if the fetch fails.
      }
    }
    loadCurrencies()
    return () => {
      mounted = false
    }
  }, [currencies])

  function req(field: string): boolean {
    if (runtimeRequirements && Object.prototype.hasOwnProperty.call(runtimeRequirements, field)) {
      return Boolean(runtimeRequirements[field])
    }
    return isFieldRequired('subsidiaryCreate', field)
  }

  function requiredLabel(text: string, required: boolean) {
    if (!required) return <>{text}</>
    return <>{text} <span style={{ color: 'var(--danger)' }}>*</span></>
  }

  const groupedVisibleFields = useMemo(() => {
    return layoutConfig.sections
      .map((section) => ({
        section,
        fields: SUBSIDIARY_FORM_FIELDS
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

  function getFieldPlacementStyle(fieldId: SubsidiaryFormFieldKey): React.CSSProperties {
    const config = layoutConfig.fields[fieldId]
    return {
      gridColumnStart: Math.min(formColumns, Math.max(1, config?.column ?? 1)),
      gridRowStart: Math.max(1, (config?.order ?? 0) + 1),
    }
  }

  const hasCurrencies = currencyOptions.length > 0

  function renderField(fieldId: SubsidiaryFormFieldKey) {
    switch (fieldId) {
      case 'subsidiaryId':
        return (
          <FieldInput label={requiredLabel('Subsidiary ID', req('subsidiaryId'))}>
            <input value={initialSubsidiaryId} readOnly disabled className={`${inputClass} opacity-80`} style={inputStyle} />
          </FieldInput>
        )
      case 'name':
        return <FieldInput label={requiredLabel('Name', req('name'))}><input value={name} onChange={(e) => setName(e.target.value)} required={req('name')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'legalName':
        return <FieldInput label={requiredLabel('Legal Name', req('legalName'))}><input value={legalName} onChange={(e) => setLegalName(e.target.value)} required={req('legalName')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'entityType':
        return <FieldInput label={requiredLabel('Type', req('entityType'))}><input value={entityType} onChange={(e) => setEntityType(e.target.value)} required={req('entityType')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'country':
        return (
          <FieldInput label={requiredLabel('Country', req('country'))}>
            <select value={country} onChange={(e) => setCountry(e.target.value)} required={req('country')} className={selectClass} style={selectStyle}>
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code} style={optionStyle}>{option.label}</option>
              ))}
            </select>
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
                {address || 'No address saved yet'}
              </p>
            </div>
          </FieldInput>
        )
      case 'taxId':
        return <FieldInput label={requiredLabel('Tax ID', req('taxId'))}><input value={taxId} onChange={(e) => setTaxId(e.target.value)} required={req('taxId')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'registrationNumber':
        return <FieldInput label={requiredLabel('Registration Number', req('registrationNumber'))}><input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} required={req('registrationNumber')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'parentEntityId':
        return (
          <FieldInput label={requiredLabel('Parent Subsidiary', req('parentEntityId'))}>
            <select value={parentEntityId} onChange={(e) => setParentEntityId(e.target.value)} required={req('parentEntityId')} className={selectClass} style={selectStyle}>
              <option value="" style={optionStyle}>None</option>
              {(parentEntities ?? []).map((entity) => (
                <option key={entity.id} value={entity.id} style={optionStyle}>{entity.subsidiaryId} - {entity.name}</option>
              ))}
            </select>
          </FieldInput>
        )
      case 'defaultCurrencyId':
        return (
          <FieldInput label={requiredLabel('Primary Currency', req('defaultCurrencyId'))}>
            <select value={defaultCurrencyId} onChange={(e) => setDefaultCurrencyId(e.target.value)} required={req('defaultCurrencyId')} disabled={!hasCurrencies} className={selectClass} style={selectStyle}>
              <option value="" style={optionStyle}>{hasCurrencies ? 'None' : 'No currencies available'}</option>
              {currencyOptions.map((currency) => (
                <option key={currency.id} value={currency.id} style={optionStyle}>{currency.currencyId} - {currency.name}</option>
              ))}
            </select>
          </FieldInput>
        )
      case 'functionalCurrencyId':
        return (
          <FieldInput label={requiredLabel('Functional Currency', req('functionalCurrencyId'))}>
            <select value={functionalCurrencyId} onChange={(e) => setFunctionalCurrencyId(e.target.value)} required={req('functionalCurrencyId')} className={selectClass} style={selectStyle}>
              <option value="" style={optionStyle}>None</option>
              {currencyOptions.map((currency) => (
                <option key={currency.id} value={currency.id} style={optionStyle}>{currency.currencyId} - {currency.name}</option>
              ))}
            </select>
          </FieldInput>
        )
      case 'reportingCurrencyId':
        return (
          <FieldInput label={requiredLabel('Reporting Currency', req('reportingCurrencyId'))}>
            <select value={reportingCurrencyId} onChange={(e) => setReportingCurrencyId(e.target.value)} required={req('reportingCurrencyId')} className={selectClass} style={selectStyle}>
              <option value="" style={optionStyle}>None</option>
              {currencyOptions.map((currency) => (
                <option key={currency.id} value={currency.id} style={optionStyle}>{currency.currencyId} - {currency.name}</option>
              ))}
            </select>
          </FieldInput>
        )
      case 'consolidationMethod':
        return <FieldInput label={requiredLabel('Consolidation Method', req('consolidationMethod'))}><input value={consolidationMethod} onChange={(e) => setConsolidationMethod(e.target.value)} required={req('consolidationMethod')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'ownershipPercent':
        return <FieldInput label={requiredLabel('Ownership Percent', req('ownershipPercent'))}><input type="number" step="0.01" value={ownershipPercent} onChange={(e) => setOwnershipPercent(e.target.value)} required={req('ownershipPercent')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'retainedEarningsAccountId':
        return <GlSelect label={requiredLabel('Retained Earnings Account', req('retainedEarningsAccountId'))} value={retainedEarningsAccountId} onChange={setRetainedEarningsAccountId} glAccounts={glAccounts} required={req('retainedEarningsAccountId')} />
      case 'ctaAccountId':
        return <GlSelect label={requiredLabel('CTA Account', req('ctaAccountId'))} value={ctaAccountId} onChange={setCtaAccountId} glAccounts={glAccounts} required={req('ctaAccountId')} />
      case 'intercompanyClearingAccountId':
        return <GlSelect label={requiredLabel('Intercompany Clearing Account', req('intercompanyClearingAccountId'))} value={intercompanyClearingAccountId} onChange={setIntercompanyClearingAccountId} glAccounts={glAccounts} required={req('intercompanyClearingAccountId')} />
      case 'dueToAccountId':
        return <GlSelect label={requiredLabel('Due To Account', req('dueToAccountId'))} value={dueToAccountId} onChange={setDueToAccountId} glAccounts={glAccounts} required={req('dueToAccountId')} />
      case 'dueFromAccountId':
        return <GlSelect label={requiredLabel('Due From Account', req('dueFromAccountId'))} value={dueFromAccountId} onChange={setDueFromAccountId} glAccounts={glAccounts} required={req('dueFromAccountId')} />
      case 'inactive':
        return (
          <FieldInput label={requiredLabel('Inactive', req('inactive'))}>
            <select value={inactive ? 'true' : 'false'} onChange={(e) => setInactive(e.target.value === 'true')} className={selectClass} style={selectStyle}>
              <option value="false" style={optionStyle}>No</option>
              <option value="true" style={optionStyle}>Yes</option>
            </select>
          </FieldInput>
        )
      default:
        return null
    }
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const missing: string[] = []
      const requiredFields = [
        ['name', name],
        ['legalName', legalName],
        ['entityType', entityType],
        ['country', country],
        ['address', address],
        ['taxId', taxId],
        ['registrationNumber', registrationNumber],
        ['parentEntityId', parentEntityId],
        ['defaultCurrencyId', defaultCurrencyId],
        ['functionalCurrencyId', functionalCurrencyId],
        ['reportingCurrencyId', reportingCurrencyId],
        ['consolidationMethod', consolidationMethod],
        ['ownershipPercent', ownershipPercent],
        ['retainedEarningsAccountId', retainedEarningsAccountId],
        ['ctaAccountId', ctaAccountId],
        ['intercompanyClearingAccountId', intercompanyClearingAccountId],
        ['dueToAccountId', dueToAccountId],
        ['dueFromAccountId', dueFromAccountId],
      ] as const

      for (const [fieldName, fieldValue] of requiredFields) {
        if (req(fieldName) && !String(fieldValue ?? '').trim()) missing.push(fieldName)
      }
      if (missing.length > 0) throw new Error(`Missing required fields: ${missing.join(', ')}`)

      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          legalName,
          entityType,
          country,
          taxId,
          registrationNumber,
          address,
          defaultCurrencyId,
          functionalCurrencyId,
          reportingCurrencyId,
          parentEntityId,
          consolidationMethod,
          ownershipPercent,
          retainedEarningsAccountId,
          ctaAccountId,
          intercompanyClearingAccountId,
          dueToAccountId,
          dueFromAccountId,
          inactive,
        }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.error ?? 'Create failed')
      router.refresh()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={submitForm}>
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
        onSave={(formattedAddress) => {
          setAddress(formattedAddress)
          setCountry(parseAddress(formattedAddress).country)
          setAddressModalOpen(false)
        }}
        initialFields={{ ...parseAddress(address), country }}
      />

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>Cancel</button>
        <button type="submit" disabled={saving} className="rounded-md px-3 py-2 text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>{saving ? 'Saving...' : 'Create Subsidiary'}</button>
      </div>
    </form>
  )
}

function FieldInput({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function GlSelect({
  label,
  value,
  onChange,
  glAccounts,
  required,
}: {
  label: React.ReactNode
  value: string
  onChange: (value: string) => void
  glAccounts: Array<{ id: string; accountId: string; name: string }>
  required?: boolean
}) {
  return (
    <FieldInput label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} required={required} className={selectClass} style={selectStyle}>
        <option value="" style={optionStyle}>None</option>
        {glAccounts.map((account) => (
          <option key={account.id} value={account.id} style={optionStyle}>{account.accountId} - {account.name}</option>
        ))}
      </select>
    </FieldInput>
  )
}

const inputClass = 'w-full rounded-md border px-3 py-2 text-white bg-transparent'
const inputStyle = { borderColor: 'var(--border-muted)' } as const
const selectClass = 'w-full rounded-md border px-3 py-2'
const selectStyle = { borderColor: 'var(--border-muted)', color: 'var(--text-secondary)', backgroundColor: 'var(--card)' } as const
const optionStyle = { color: 'var(--text-secondary)', backgroundColor: 'var(--card)' } as const
