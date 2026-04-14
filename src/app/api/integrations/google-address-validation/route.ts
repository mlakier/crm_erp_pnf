import { NextRequest, NextResponse } from 'next/server'
import {
  loadIntegrationSettings,
  saveIntegrationSettings,
} from '@/lib/integration-settings-store'

export async function GET() {
  try {
    const settings = await loadIntegrationSettings()
    return NextResponse.json(settings.googleAddressValidation)
  } catch {
    return NextResponse.json({ error: 'Failed to load integration settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const current = await loadIntegrationSettings()
    const saved = await saveIntegrationSettings({
      ...current,
      googleAddressValidation: {
        apiKey: typeof body?.apiKey === 'string' ? body.apiKey : '',
        enabled: typeof body?.enabled === 'boolean' ? body.enabled : current.googleAddressValidation.enabled,
      },
    })
    return NextResponse.json(saved.googleAddressValidation)
  } catch {
    return NextResponse.json({ error: 'Failed to save integration settings' }, { status: 500 })
  }
}