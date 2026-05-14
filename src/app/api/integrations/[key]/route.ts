import { NextRequest, NextResponse } from 'next/server'
import { getIntegrationByKey, type CredentialField } from '@/lib/integrations-catalog'
import {
  loadIntegrationCredentials,
  saveIntegrationCredentials,
} from '@/lib/integration-settings-store'

type Params = { params: Promise<{ key: string }> }

function safeCredentialsResponse(
  fields: CredentialField[],
  credentials: Record<string, string>,
) {
  const safe: Record<string, string | boolean> = {}
  for (const field of fields) {
    if (field.type === 'password') {
      safe[field.key] = ''
      safe[`${field.key}Configured`] = Boolean(credentials[field.key]?.trim())
    } else {
      safe[field.key] = credentials[field.key] ?? ''
    }
  }
  return safe
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { key } = await params
  const integration = getIntegrationByKey(key)
  if (!integration || !integration.credentials) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  try {
    const credentials = await loadIntegrationCredentials(key)
    return NextResponse.json(safeCredentialsResponse(integration.credentials, credentials))
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

    const existing = await loadIntegrationCredentials(key)

    // Only accept fields declared in the integration's credentials definition.
    // Blank password fields preserve the existing secret so admins can update
    // non-secret settings without re-pasting credentials.
    const allowedKeys = new Set(integration.credentials.map((f) => f.key))
    const sanitized: Record<string, string> = {}
    for (const field of integration.credentials) {
      if (!allowedKeys.has(field.key)) continue
      const value = (body as Record<string, unknown>)[field.key]
      const nextValue = typeof value === 'string' ? value.trim() : ''
      sanitized[field.key] = field.type === 'password' && !nextValue
        ? existing[field.key] ?? ''
        : nextValue
    }

    const saved = await saveIntegrationCredentials(key, sanitized)
    return NextResponse.json(safeCredentialsResponse(integration.credentials, saved))
  } catch {
    return NextResponse.json({ error: 'Failed to save integration settings' }, { status: 500 })
  }
}
