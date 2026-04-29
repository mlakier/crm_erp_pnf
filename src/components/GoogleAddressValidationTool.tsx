'use client'

import { FormEvent, useEffect, useState } from 'react'
import {
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY_CODE,
  getCountryConfig,
} from '@/lib/address-country-config'
import SearchableSelect from '@/components/SearchableSelect'

type IntegrationConfigResponse = {
  apiKey?: string
  enabled?: boolean
  error?: string
}

type ValidationResponse = {
  valid: boolean
  error?: string
  source?: string
  formattedAddress?: string
  components?: {
    street1: string
    street2: string
    street3: string
    city: string
    stateProvince: string
    postalCode: string
    country: string
  }
}

const INITIAL_FORM = {
  street1: '',
  street2: '',
  street3: '',
  city: '',
  stateProvince: '',
  postalCode: '',
  country: DEFAULT_COUNTRY_CODE,
}

export default function GoogleAddressValidationTool() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [apiKey, setApiKey] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [configLoading, setConfigLoading] = useState(true)
  const [configSaving, setConfigSaving] = useState(false)
  const [configMessage, setConfigMessage] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ValidationResponse | null>(null)
  const countryConfig = getCountryConfig(form.country)

  useEffect(() => {
    let mounted = true

    async function loadConfig() {
      try {
        const response = await fetch('/api/integrations/google-address-validation', { cache: 'no-store' })
        const body = (await response.json()) as IntegrationConfigResponse
        if (!response.ok || !mounted) return
        setApiKey(body.apiKey ?? '')
        setEnabled(body.enabled ?? true)
      } catch {
        if (mounted) setConfigMessage('Unable to load saved integration settings')
      } finally {
        if (mounted) setConfigLoading(false)
      }
    }

    loadConfig()
    return () => {
      mounted = false
    }
  }, [])

  async function saveConfiguration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setConfigSaving(true)
    setConfigMessage('')

    try {
      const response = await fetch('/api/integrations/google-address-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), enabled }),
      })

      const body = (await response.json()) as IntegrationConfigResponse
      if (!response.ok) {
        setConfigMessage(body.error ?? 'Failed to save integration settings')
        return
      }

      setApiKey(body.apiKey ?? '')
      setEnabled(body.enabled ?? true)
      setConfigMessage('Google Address Validation settings saved')
    } catch {
      setConfigMessage('Failed to save integration settings')
    } finally {
      setConfigSaving(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/address/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const body = (await response.json()) as ValidationResponse
      setResult(body)
    } catch {
      setResult({ valid: false, error: 'Request failed while validating address' })
    } finally {
      setLoading(false)
    }
  }

  function updateField(name: keyof typeof INITIAL_FORM, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleCountryChange(value: string) {
    setForm((prev) => ({
      ...prev,
      country: value,
      stateProvince: '',
      postalCode: '',
    }))
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <h2 className="text-base font-semibold text-white">Integration Setup</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Enter the credentials needed to activate this integration. These values are stored in the local app config on the server.
        </p>

        <form onSubmit={saveConfiguration} className="mt-6 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Google Maps API Key</label>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={configLoading ? 'Loading saved key...' : 'AIza...'}
                disabled={configLoading}
                className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white disabled:opacity-60"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowApiKey((prev) => !prev)}
              className="rounded-md border px-3 py-2 text-sm font-medium"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
            >
              {showApiKey ? 'Hide Key' : 'Show Key'}
            </button>
          </div>

          <div className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--border-muted)' }}>
            <p className="font-medium text-white">Required to initiate the integration</p>
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
              Enable the Address Validation API for your Google Cloud project and paste a server key with access to that API.
            </p>
          </div>

          <label className="flex items-center gap-2 rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={configLoading}
              className="h-4 w-4 rounded"
            />
            <span>Enable Google address validation</span>
          </label>

          {configMessage ? (
            <p className="text-sm" style={{ color: configMessage.includes('saved') ? '#86efac' : 'var(--danger)' }}>
              {configMessage}
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={configSaving || configLoading}
              className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent-primary-strong)' }}
            >
              {configSaving ? 'Saving...' : 'Save Integration Settings'}
            </button>
          </div>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <section className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <h2 className="text-base font-semibold text-white">Validate Address</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          After configuration, send a structured address to the Google-backed validation endpoint and review the normalized output.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!enabled ? (
            <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
              Address validation is currently disabled in Integration Setup. Turn it on and save settings to run validation.
            </p>
          ) : null}
          <div>
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Country *</label>
            <div className="mt-1">
              <SearchableSelect
                selectedValue={form.country}
                options={COUNTRY_OPTIONS.map((option) => ({
                  value: option.code,
                  label: option.label,
                }))}
                placeholder="Select country"
                onSelect={handleCountryChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Street Address 1 *</label>
            <input
              value={form.street1}
              onChange={(e) => updateField('street1', e.target.value)}
              required
              className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Street Address 2</label>
              <input
                value={form.street2}
                onChange={(e) => updateField('street2', e.target.value)}
                className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Street Address 3</label>
              <input
                value={form.street3}
                onChange={(e) => updateField('street3', e.target.value)}
                className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>City *</label>
              <input
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                required
                className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {countryConfig.stateLabel}{countryConfig.stateRequired ? ' *' : ''}
              </label>
              <input
                value={form.stateProvince}
                onChange={(e) => updateField('stateProvince', e.target.value)}
                required={countryConfig.stateRequired}
                className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {countryConfig.postalLabel}{countryConfig.postalRequired ? ' *' : ''}
              </label>
              <input
                value={form.postalCode}
                onChange={(e) => updateField('postalCode', e.target.value)}
                required={countryConfig.postalRequired}
                placeholder={countryConfig.postalPlaceholder}
                className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Validation Notes</label>
              <input
                value={countryConfig.stateRequired || countryConfig.postalRequired ? 'Country-specific validation enabled' : 'Optional region and postal code'}
                readOnly
                className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !enabled}
              className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent-primary-strong)' }}
            >
              {loading ? 'Validating...' : enabled ? 'Validate with Google' : 'Validation Disabled'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <h2 className="text-base font-semibold text-white">Result</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Review the API response, normalized output, and the component values returned from Google.
        </p>

        {!result ? (
          <div className="mt-6 rounded-xl border border-dashed p-5 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}>
            No validation result yet.
          </div>
        ) : result.valid ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(34,197,94,0.28)', backgroundColor: 'rgba(34,197,94,0.08)' }}>
              <p className="text-sm font-semibold" style={{ color: '#86efac' }}>Validation succeeded</p>
              <p className="mt-2 text-sm text-white">{result.formattedAddress}</p>
            </div>

            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Normalized Components</p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <ResultField label="Street 1" value={result.components?.street1} />
                <ResultField label="Street 2" value={result.components?.street2} />
                <ResultField label="Street 3" value={result.components?.street3} />
                <ResultField label="City" value={result.components?.city} />
                <ResultField label="State / Province" value={result.components?.stateProvince} />
                <ResultField label="Postal Code" value={result.components?.postalCode} />
                <ResultField label="Country" value={result.components?.country} />
                <ResultField label="Source" value={result.source} />
              </dl>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border p-4" style={{ borderColor: 'rgba(239,68,68,0.28)', backgroundColor: 'rgba(239,68,68,0.08)' }}>
            <p className="text-sm font-semibold" style={{ color: '#fca5a5' }}>Validation failed</p>
            <p className="mt-2 text-sm text-white">{result.error ?? 'Unknown validation error'}</p>
          </div>
        )}
      </section>
      </div>
    </div>
  )
}

function ResultField({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{value || '—'}</dd>
    </div>
  )
}
