import { NextResponse } from 'next/server'
import { INTEGRATIONS, isIntegrationConfigured, type IntegrationWorkflowCapability } from '@/lib/integrations-catalog'
import { loadIntegrationSettings } from '@/lib/integration-settings-store'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const capability = searchParams.get('capability') as IntegrationWorkflowCapability | null
  const settings = await loadIntegrationSettings()

  const integrations = INTEGRATIONS
    .filter((integration) => {
      if (!capability) return true
      return integration.workflowCapabilities?.includes(capability) ?? false
    })
    .map((integration) => {
      const configured =
        integration.key === 'google-address-validation'
          ? Boolean(settings.googleAddressValidation.apiKey.trim()) && settings.googleAddressValidation.enabled
          : isIntegrationConfigured(integration, settings.integrations[integration.key])

      return {
        key: integration.key,
        label: integration.label,
        provider: integration.provider,
        configured,
      }
    })

  return NextResponse.json({ integrations })
}
