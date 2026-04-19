'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isFieldRequired } from '@/lib/form-requirements'
import {
  defaultCurrencyFormCustomization,
  CURRENCY_FORM_FIELDS,
  type CurrencyFormCustomizationConfig,
  type CurrencyFormFieldKey,
} from '@/lib/currency-form-customization'

type CurrencyFormCustomizationResponse = {
  config?: CurrencyFormCustomizationConfig
}

export default function CurrencyCreateForm({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) {
  const router = useRouter()
  const [currencyId, setCurrencyId] = useState('')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [decimals, setDecimals] = useState('2')
  const [isBase, setIsBase] = useState(false)
  const [inactive, setInactive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runtimeRequirements, setRuntimeRequirements] = useState<Record<string, boolean> | null>(null)
  const [layoutConfig, setLayoutConfig] = useState<CurrencyFormCustomizationConfig>(() => defaultCurrencyFormCustomization())

  useEffect(() => {
    let mounted = true

    async function loadConfig() {
      try {
        const [requirementsResponse, layoutResponse] = await Promise.all([
          fetch('/api/config/form-requirements', { cache: 'no-store' }),
          fetch('/api/config/currency-form-customization', { cache: 'no-store' }),
        ])

        const requirementsBody = await requirementsResponse.json()
        const layoutBody = (await layoutResponse.json()) as CurrencyFormCustomizationResponse

        if (!mounted) return

        if (requirementsResponse.ok) {
          setRuntimeRequirements(requirementsBody?.config?.currencyCreate ?? null)
        }

        if (layoutResponse.ok && layoutBody.config) {
          setLayoutConfig(layoutBody.config)
        }
      } catch {
        // Keep static defaults when config APIs are unavailable.
      }
    }

    loadConfig()
    return () => {
      mounted = false
    }
  }, [])

  function req(field: string): boolean {
    if (runtimeRequirements && Object.prototype.hasOwnProperty.call(runtimeRequirements, field)) {
      return Boolean(runtimeRequirements[field])
    }
    return isFieldRequired('currencyCreate', field)
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
        fields: CURRENCY_FORM_FIELDS
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

  function getFieldPlacementStyle(fieldId: CurrencyFormFieldKey): React.CSSProperties {
    const config = layoutConfig.fields[fieldId]
    return {
      gridColumnStart: Math.min(formColumns, Math.max(1, config?.column ?? 1)),
      gridRowStart: Math.max(1, (config?.order ?? 0) + 1),
    }
  }

  function renderField(fieldId: CurrencyFormFieldKey) {
    switch (fieldId) {
      case 'currencyId':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Currency Id', req('currencyId'))}</span>
            <input value={currencyId} onChange={(e) => setCurrencyId(e.target.value.toUpperCase())} required={req('currencyId')} className="w-full rounded-md border px-3 py-2 text-white bg-transparent" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'name':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Name', req('name'))}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required={req('name')} className="w-full rounded-md border px-3 py-2 text-white bg-transparent" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'symbol':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Symbol', req('symbol'))}</span>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} required={req('symbol')} className="w-full rounded-md border px-3 py-2 text-white bg-transparent" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'decimals':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Decimal Places', req('decimals'))}</span>
            <input type="number" min={0} value={decimals} onChange={(e) => setDecimals(e.target.value)} required={req('decimals')} className="w-full rounded-md border px-3 py-2 text-white bg-transparent" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'isBase':
        return (
          <label key={fieldId} className="flex items-center gap-2 pt-7 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={isBase} onChange={(e) => setIsBase(e.target.checked)} className="h-4 w-4 rounded" />
            <span>{requiredLabel('Base Currency', req('isBase'))}</span>
          </label>
        )
      case 'inactive':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Inactive', req('inactive'))}</span>
            <select value={inactive ? 'true' : 'false'} onChange={(e) => setInactive(e.target.value === 'true')} className="w-full rounded-md border px-3 py-2 text-white bg-transparent" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>
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
        ['currencyId', currencyId],
        ['name', name],
        ['symbol', symbol],
        ['decimals', decimals],
      ] as const

      for (const [fieldName, fieldValue] of requiredFields) {
        if (req(fieldName) && !String(fieldValue ?? '').trim()) {
          missing.push(fieldName)
        }
      }

      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`)
      }

      const response = await fetch('/api/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currencyId,
          name,
          symbol,
          decimals: Number(decimals),
          isBase,
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
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">{section}</h3>
          </div>
          <div className="grid gap-4" style={getSectionGridStyle()}>
            {fields.map((field) => (
              <div key={field.id} style={getFieldPlacementStyle(field.id)}>
                {renderField(field.id)}
              </div>
            ))}
          </div>
        </section>
      ))}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>Cancel</button>
        <button type="submit" disabled={saving} className="rounded-md px-3 py-2 text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>{saving ? 'Saving...' : 'Create Currency'}</button>
      </div>
    </form>
  )
}
