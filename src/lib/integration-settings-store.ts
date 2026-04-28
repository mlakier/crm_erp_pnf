import { promises as fs } from 'fs'
import path from 'path'

export type IntegrationSettings = {
  googleAddressValidation: {
    apiKey: string
    enabled: boolean
  }
  /** Generic credential store for catalog integrations with a `credentials` field */
  integrations: Record<string, Record<string, string>>
}

const STORE_PATH = path.join(process.cwd(), 'config', 'integration-settings.json')

const DEFAULT_SETTINGS: IntegrationSettings = {
  googleAddressValidation: {
    apiKey: '',
    enabled: true,
  },
  integrations: {
    docusign: {
      integrationKey: 'cc049669-d6d2-43b8-a241-bd7699194083',
    },
  },
}

function sanitize(input: unknown): IntegrationSettings {
  if (!input || typeof input !== 'object') return DEFAULT_SETTINGS

  const root = input as Record<string, unknown>
  const googleAddressValidation = root.googleAddressValidation
  const googleRoot = googleAddressValidation && typeof googleAddressValidation === 'object'
    ? googleAddressValidation as Record<string, unknown>
    : {}

  // Sanitize the generic integrations map
  const rawIntegrations = root.integrations
  const integrationsMap: Record<string, Record<string, string>> = {}
  if (rawIntegrations && typeof rawIntegrations === 'object') {
    for (const [key, value] of Object.entries(rawIntegrations as Record<string, unknown>)) {
      if (value && typeof value === 'object') {
        const cleaned: Record<string, string> = {}
        for (const [field, fieldValue] of Object.entries(value as Record<string, unknown>)) {
          if (typeof fieldValue === 'string') {
            cleaned[field] = fieldValue
          }
        }
        integrationsMap[key] = cleaned
      }
    }
  }

  return {
    googleAddressValidation: {
      apiKey: typeof googleRoot.apiKey === 'string' ? googleRoot.apiKey : '',
      enabled: typeof googleRoot.enabled === 'boolean' ? googleRoot.enabled : true,
    },
    integrations: {
      ...DEFAULT_SETTINGS.integrations,
      ...integrationsMap,
    },
  }
}

export async function loadIntegrationSettings(): Promise<IntegrationSettings> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    return sanitize(JSON.parse(raw))
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function saveIntegrationSettings(input: unknown): Promise<IntegrationSettings> {
  const settings = sanitize(input)
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
  return settings
}

/** Load credentials for a specific integration key */
export async function loadIntegrationCredentials(key: string): Promise<Record<string, string>> {
  const settings = await loadIntegrationSettings()
  return settings.integrations[key] ?? {}
}

/** Save credentials for a specific integration key (merges with existing) */
export async function saveIntegrationCredentials(
  key: string,
  credentials: Record<string, string>,
): Promise<Record<string, string>> {
  const settings = await loadIntegrationSettings()
  const updated = await saveIntegrationSettings({
    ...settings,
    integrations: {
      ...settings.integrations,
      [key]: credentials,
    },
  })
  return updated.integrations[key] ?? {}
}
