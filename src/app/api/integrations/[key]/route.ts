import { NextRequest, NextResponse } from 'next/server'
import { getIntegrationByKey } from '@/lib/integrations-catalog'
import {
  loadIntegrationCredentials,
  saveIntegrationCredentials,
} from '@/lib/integration-settings-store'

type Params = { params: Promise<{ key: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { key } = await params
  const integration = getIntegrationByKey(key)
  if (!integration || !integration.credentials) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  try {
    const credentials = await loadIntegrationCredentials(key)
    // Return values with secret fields masked — client only needs to know if a value is set
    const safe: Record<string, string | boolean> = {}
    for (const field of integration.credentials) {
      safe[field.key] = credentials[field.key] ?? ''
    }
    return NextResponse.json(safe)
  } catch {
    return NextResponse.json({ error: 'Failed to load integration settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { key } = await params
  const integration = getIntegrationByKey(key)
  if (!integration || !integration.credentials) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  try {
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Only accept fields declared in the integration's credentials definition
    const allowedKeys = new Set(integration.credentials.map((f) => f.key))
    const sanitized: Record<string, string> = {}
    for (const field of integration.credentials) {
      if (!allowedKeys.has(field.key)) continue
      const value = (body as Record<string, unknown>)[field.key]
      sanitized[field.key] = typeof value === 'string' ? value.trim() : ''
    }

    const saved = await saveIntegrationCredentials(key, sanitized)
    return NextResponse.json(saved)
  } catch {
    return NextResponse.json({ error: 'Failed to save integration settings' }, { status: 500 })
  }
}
