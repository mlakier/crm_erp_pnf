import fs from 'fs/promises'
import path from 'path'

import {
  normalizeFinancialStatementCustomization,
  type FinancialStatementCustomizationConfig,
  type FinancialStatementCustomizationOutline,
  type FinancialStatementCustomizationType,
} from '@/lib/financial-statement-customization'

type CustomizationStore = Partial<Record<FinancialStatementCustomizationType, FinancialStatementCustomizationConfig>>

const STORE_PATH = path.join(process.cwd(), 'config', 'financial-statement-customization.json')

async function readStore(): Promise<CustomizationStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    return JSON.parse(raw) as CustomizationStore
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

async function writeStore(store: CustomizationStore) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
}

export async function loadFinancialStatementCustomization(
  type: FinancialStatementCustomizationType,
  runtimeOutlineOrLabels: FinancialStatementCustomizationOutline | string[] = [],
) {
  const store = await readStore()
  return normalizeFinancialStatementCustomization(type, store[type], runtimeOutlineOrLabels)
}

export async function saveFinancialStatementCustomization(
  type: FinancialStatementCustomizationType,
  config: FinancialStatementCustomizationConfig,
) {
  const store = await readStore()
  const normalized = normalizeFinancialStatementCustomization(type, config)
  store[type] = normalized
  await writeStore(store)
  return normalized
}
