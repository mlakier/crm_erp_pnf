import Link from 'next/link'
import GoogleAddressValidationTool from '@/components/GoogleAddressValidationTool'
import IntegrationOverviewCard from '@/components/IntegrationOverviewCard'
import IntegrationsSidebar from '@/components/IntegrationsSidebar'
import { getIntegrationByHref } from '@/lib/integrations-catalog'
import { loadIntegrationSettings } from '@/lib/integration-settings-store'

export default async function GoogleAddressValidationPage() {
  const integration = getIntegrationByHref('/integrations/google-address-validation')
  const settings = await loadIntegrationSettings()
  const configured = Boolean(settings.googleAddressValidation.apiKey.trim()) && settings.googleAddressValidation.enabled

  return (
    <div className="min-h-full px-8 py-8">
      <div className="max-w-7xl">
        <Link href="/integrations" className="text-sm hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
          ← Back to Manage Integrations
        </Link>

        <div className="mt-4 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-6 xl:sticky xl:top-8 xl:self-start">
            <IntegrationsSidebar activeHref="/integrations/google-address-validation" />
            <section className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Lifecycle
              </p>
              <p className="mt-3 text-sm text-white">{configured ? 'Configured & Enabled' : 'Awaiting setup'}</p>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                This detail layout is reusable for future integrations added to the catalog.
              </p>
            </section>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {integration?.provider ?? 'Integration'}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white">{integration?.label ?? 'Google Address Validation'}</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Save the credentials needed to initiate this integration, then test address validation directly from the same screen.
              </p>
            </div>

            <IntegrationOverviewCard
              provider={integration?.provider ?? 'Google'}
              setupFields={integration?.setupFields ?? ['Google Maps API key']}
              statusText={configured ? 'Configured and ready to test' : 'Setup required before requests can be sent'}
            />

            <GoogleAddressValidationTool />
          </div>
        </div>
      </div>
    </div>
  )
}