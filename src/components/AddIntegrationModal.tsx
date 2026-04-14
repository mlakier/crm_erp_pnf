'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { INTEGRATIONS, type IntegrationDefinition } from '@/lib/integrations-catalog'

type Props = {
  configuredKeys: string[]
}

export default function AddIntegrationModal({ configuredKeys }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const available = INTEGRATIONS.filter((i) => !configuredKeys.includes(i.key))
  const all = INTEGRATIONS

  function handleSelect(integration: IntegrationDefinition) {
    setOpen(false)
    router.push(integration.href)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ backgroundColor: 'var(--accent-primary)' }}
      >
        + Add Integration
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border p-6 shadow-2xl"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Add an Integration</h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Select an integration to configure. You will be taken to its setup page where you can enter credentials and test the connection.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-sm transition hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Integration list */}
            <div className="mt-5 space-y-3">
              {all.map((integration) => {
                const configured = configuredKeys.includes(integration.key)
                return (
                  <button
                    key={integration.key}
                    onClick={() => handleSelect(integration)}
                    className="w-full rounded-xl border p-4 text-left transition hover:border-white/25"
                    style={{
                      backgroundColor: 'var(--card-elevated)',
                      borderColor: configured ? 'rgba(34,197,94,0.35)' : 'var(--border-muted)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p
                          className="text-xs font-semibold uppercase tracking-wide"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {integration.provider}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">{integration.label}</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {integration.summary}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                        style={configured
                          ? { backgroundColor: 'rgba(34,197,94,0.16)', color: '#86efac' }
                          : { backgroundColor: 'rgba(245,158,11,0.16)', color: '#fcd34d' }}
                      >
                        {configured ? 'Configured' : 'Setup Needed'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                        style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: 'var(--accent-primary-strong)' }}
                      >
                        {integration.category}
                      </span>
                      {integration.setupFields.map((field) => (
                        <span
                          key={`${integration.key}-${field}`}
                          className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                          style={{ backgroundColor: 'rgba(148,163,184,0.14)', color: 'var(--text-secondary)' }}
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs font-medium" style={{ color: 'var(--accent-primary-strong)' }}>
                      {configured ? 'View / edit configuration →' : 'Open setup →'}
                    </p>
                  </button>
                )
              })}
            </div>

            {available.length === 0 && (
              <p className="mt-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                All available integrations are already configured.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
