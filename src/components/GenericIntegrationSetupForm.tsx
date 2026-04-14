'use client'

import { FormEvent, useEffect, useState } from 'react'
import type { CredentialField } from '@/lib/integrations-catalog'

type Props = {
  integrationKey: string
  credentials: CredentialField[]
}

export default function GenericIntegrationSetupForm({ integrationKey, credentials }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(credentials.map((f) => [f.key, ''])),
  )
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch(`/api/integrations/${integrationKey}`, { cache: 'no-store' })
        if (!res.ok || !mounted) return
        const body = await res.json() as Record<string, string>
        if (mounted) {
          setValues((prev) => {
            const next = { ...prev }
            for (const key of Object.keys(prev)) {
              next[key] = typeof body[key] === 'string' ? body[key] : ''
            }
            return next
          })
        }
      } catch {
        // leave defaults
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [integrationKey])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(`/api/integrations/${integrationKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const body = await res.json() as Record<string, string> & { error?: string }
      if (!res.ok) {
        setMessageType('error')
        setMessage(body.error ?? 'Failed to save settings')
        return
      }
      setMessageType('success')
      setMessage('Integration settings saved successfully')
    } catch {
      setMessageType('error')
      setMessage('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function toggleVisible(key: string) {
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) {
    return (
      <section className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading saved settings…</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Credentials
      </p>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Enter your integration credentials below. Values are stored locally in the config directory.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {credentials.map((field) => {
          const isPassword = field.type === 'password'
          const inputType = isPassword
            ? visibleFields[field.key] ? 'text' : 'password'
            : field.type
          return (
            <div key={field.key}>
              <label className="block text-sm font-medium text-white" htmlFor={`field-${field.key}`}>
                {field.label}
                {field.required && <span className="ml-1 text-red-400">*</span>}
              </label>
              <div className="relative mt-1.5">
                <input
                  id={`field-${field.key}`}
                  type={inputType}
                  autoComplete="off"
                  placeholder={field.placeholder ?? ''}
                  value={values[field.key] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm text-white placeholder:opacity-40 focus:outline-none focus:ring-1"
                  style={{
                    borderColor: 'var(--border-muted)',
                    // @ts-expect-error CSS custom property
                    '--tw-ring-color': 'var(--accent-primary)',
                  }}
                  required={field.required}
                />
                {isPassword && (
                  <button
                    type="button"
                    onClick={() => toggleVisible(field.key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {visibleFields[field.key] ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
              {field.hint && (
                <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {field.hint}
                </p>
              )}
            </div>
          )
        })}

        {message && (
          <p
            className="rounded-lg border px-4 py-2.5 text-sm"
            style={messageType === 'success'
              ? { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)', color: '#86efac' }
              : { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}
          >
            {message}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            {saving ? 'Saving…' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </section>
  )
}
