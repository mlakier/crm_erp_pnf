import Link from 'next/link'
import { INTEGRATIONS, isIntegrationConfigured } from '@/lib/integrations-catalog'
import { loadIntegrationSettings } from '@/lib/integration-settings-store'

export default async function IntegrationsPage() {
  const settings = await loadIntegrationSettings()

  function isConfigured(key: string): boolean {
    if (key === 'google-address-validation') {
      return Boolean(settings.googleAddressValidation.apiKey.trim()) && settings.googleAddressValidation.enabled
    }
    const integration = INTEGRATIONS.find((i) => i.key === key)
    if (!integration) return false
    return isIntegrationConfigured(integration, settings.integrations[key])
  }

  const configuredCount = INTEGRATIONS.filter((i) => isConfigured(i.key)).length

  return (
    <div className="min-h-full px-8 py-8">
      <div className="max-w-6xl">
        <h1 className="text-xl font-semibold text-white">Manage Integrations</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Configure, test, and expand third-party integrations used by the platform.
        </p>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard label="Available Integrations" value={String(INTEGRATIONS.length)} />
          <SummaryCard label="Configured" value={String(configuredCount)} accent="success" />
          <SummaryCard label="Ready For Expansion" value="Catalog-driven layout" accent="info" />
        </section>

        <section className="mt-6 rounded-2xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Integration Catalog</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                This grid is designed to grow as additional integrations are added over time.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {INTEGRATIONS.map((integration) => {
              const configured = isConfigured(integration.key)

              return (
                <Link
                  key={integration.key}
                  href={integration.href}
                  className="rounded-2xl border p-6 transition hover:border-white/25"
                  style={{ backgroundColor: 'var(--card-elevated)', borderColor: 'var(--border-muted)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        {integration.provider}
                      </p>
                      <h3 className="mt-3 text-lg font-semibold text-white">{integration.label}</h3>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                      style={configured
                        ? { backgroundColor: 'rgba(34,197,94,0.16)', color: '#86efac' }
                        : { backgroundColor: 'rgba(245,158,11,0.16)', color: '#fcd34d' }}
                    >
                      {configured ? 'Configured' : 'Setup Needed'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {integration.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: 'var(--accent-primary-strong)' }}>
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
                  <p className="mt-5 text-sm font-medium" style={{ color: 'var(--accent-primary-strong)' }}>
                    Open integration →
                  </p>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'success' | 'info'
}) {
  const color = accent === 'success' ? '#86efac' : accent === 'info' ? 'var(--accent-primary-strong)' : 'var(--text-muted)'
  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
      <p className="text-sm font-medium" style={{ color }}>{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}