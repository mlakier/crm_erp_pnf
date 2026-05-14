'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import SearchableSelect from '@/components/SearchableSelect'
import { BANK_CONNECTION_CATEGORY_OPTIONS, BANK_CONNECTION_PROVIDER_OPTIONS } from '@/lib/banking-connection-options'

export default function NewBankConnectionForm() {
  const router = useRouter()
  const [connectionCategory, setConnectionCategory] = useState('bank_feed')
  const [provider, setProvider] = useState('manual')
  const [status, setStatus] = useState('not_connected')
  const [health, setHealth] = useState('not_configured')
  const [syncFrequency, setSyncFrequency] = useState('daily')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries())
    const response = await fetch('/api/bank-connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      setError(result?.error ?? 'Unable to create bank connection.')
      setSaving(false)
      return
    }
    router.push('/bank-connections')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/bank-connections" className="text-sm hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
            ← Back to Bank Connections
          </Link>
          <h1 className="mt-4 text-3xl font-semibold text-white">New Bank Connection</h1>
          <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--text-secondary)' }}>
            Capture the connection category, provider, and institution shell now. Real OAuth/API credentials should live in integration settings, not on the GL account.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/bank-connections" className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#fff' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Institution Name *</span>
            <input name="institutionName" required className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-white" style={{ backgroundColor: 'var(--input)', borderColor: 'var(--border-muted)' }} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Connection Category *</span>
            <input type="hidden" name="connectionCategory" value={connectionCategory} />
            <div className="mt-2">
              <SearchableSelect
                selectedValue={connectionCategory}
                onSelect={setConnectionCategory}
                options={BANK_CONNECTION_CATEGORY_OPTIONS}
                placeholder="Select connection category"
                searchPlaceholder="Search category"
                dropdownWidthMode="trigger"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Provider *</span>
            <input type="hidden" name="provider" value={provider} />
            <div className="mt-2">
              <SearchableSelect
                selectedValue={provider}
                onSelect={setProvider}
                options={BANK_CONNECTION_PROVIDER_OPTIONS}
                placeholder="Select provider"
                searchPlaceholder="Search provider"
                dropdownWidthMode="trigger"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Status</span>
            <input type="hidden" name="status" value={status} />
            <div className="mt-2">
              <SearchableSelect
                selectedValue={status}
                onSelect={setStatus}
                options={[
                  { value: 'not_connected', label: 'Not Connected' },
                  { value: 'connected', label: 'Connected' },
                  { value: 'reauth_required', label: 'Reauth Required' },
                  { value: 'disabled', label: 'Disabled' },
                ]}
                placeholder="Select status"
                searchPlaceholder="Search status"
                dropdownWidthMode="trigger"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Health</span>
            <input type="hidden" name="health" value={health} />
            <div className="mt-2">
              <SearchableSelect
                selectedValue={health}
                onSelect={setHealth}
                options={[
                  { value: 'not_configured', label: 'Not Configured' },
                  { value: 'healthy', label: 'Healthy' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'error', label: 'Error' },
                ]}
                placeholder="Select health"
                searchPlaceholder="Search health"
                dropdownWidthMode="trigger"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Sync Frequency</span>
            <input type="hidden" name="syncFrequency" value={syncFrequency} />
            <div className="mt-2">
              <SearchableSelect
                selectedValue={syncFrequency}
                onSelect={setSyncFrequency}
                options={[
                  { value: 'manual', label: 'Manual' },
                  { value: 'hourly', label: 'Hourly' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'business_daily', label: 'Business Daily' },
                ]}
                placeholder="Select sync frequency"
                searchPlaceholder="Search frequency"
                dropdownWidthMode="trigger"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Consent Expires</span>
            <input name="consentExpiresAt" type="date" className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-white" style={{ backgroundColor: 'var(--input)', borderColor: 'var(--border-muted)' }} />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Notes</span>
            <textarea name="notes" rows={4} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-white" style={{ backgroundColor: 'var(--input)', borderColor: 'var(--border-muted)' }} />
          </label>
        </div>
        {error ? <div className="mt-5 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#f87171', color: '#fecaca' }}>{error}</div> : null}
      </div>
    </form>
  )
}
