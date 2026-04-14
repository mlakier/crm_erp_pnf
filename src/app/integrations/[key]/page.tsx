import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getIntegrationByKey, isIntegrationConfigured } from '@/lib/integrations-catalog'
import { loadIntegrationCredentials } from '@/lib/integration-settings-store'
import IntegrationOverviewCard from '@/components/IntegrationOverviewCard'
import IntegrationsSidebar from '@/components/IntegrationsSidebar'
import GenericIntegrationSetupForm from '@/components/GenericIntegrationSetupForm'

type Props = { params: Promise<{ key: string }> }

export default async function GenericIntegrationPage({ params }: Props) {
  const { key } = await params
  const integration = getIntegrationByKey(key)

  // If no integration found, or if it has a dedicated page (no credentials field), 404
  if (!integration || !integration.credentials) {
    notFound()
  }

  const saved = await loadIntegrationCredentials(key)
  const configured = isIntegrationConfigured(integration, saved)

  return (
    <div className="min-h-full px-8 py-8">
      <div className="max-w-7xl">
        <Link href="/integrations" className="text-sm hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
          ← Back to Manage Integrations
        </Link>

        <div className="mt-4 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          {/* Sidebar */}
          <div className="space-y-6 xl:sticky xl:top-8 xl:self-start">
            <IntegrationsSidebar activeHref={integration.href} />
            <section className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Status
              </p>
              <p className="mt-3 text-sm text-white">
                {configured ? 'Configured' : 'Awaiting setup'}
              </p>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {integration.statusLabel}
              </p>
            </section>
          </div>

          {/* Main content */}
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {integration.provider}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white">{integration.label}</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {integration.summary}
              </p>
            </div>

            <IntegrationOverviewCard
              provider={integration.provider}
              setupFields={integration.setupFields}
              statusText={configured ? 'Configured and ready' : 'Setup required before this integration is active'}
            />

            <GenericIntegrationSetupForm
              integrationKey={key}
              credentials={integration.credentials}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
