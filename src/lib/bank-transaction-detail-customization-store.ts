import fs from 'node:fs/promises'
import path from 'node:path'
import {
  defaultBankTransactionDetailCustomization,
  getBankTransactionDetailFields,
  type BankTransactionDetailCustomizationConfig,
  type BankTransactionDetailType,
} from '@/lib/bank-transaction-detail-customization'

function storePath(type: BankTransactionDetailType) {
  return path.join(process.cwd(), 'config', `bank-${type}-detail-customization.json`)
}

function normalizeType(value: string | null | undefined): BankTransactionDetailType {
  if (value === 'transfer' || value === 'check') return value
  return 'deposit'
}

function mergeWithDefaults(
  type: BankTransactionDetailType,
  overrides: Partial<BankTransactionDetailCustomizationConfig>,
): BankTransactionDetailCustomizationConfig {
  const defaults = defaultBankTransactionDetailCustomization(type)
  const allowedFields = new Set(getBankTransactionDetailFields(type).map((field) => field.id))
  const merged = {
    ...defaults,
    ...overrides,
    sectionRows: { ...defaults.sectionRows, ...(overrides.sectionRows ?? {}) },
    fields: { ...defaults.fields, ...(overrides.fields ?? {}) },
    glImpactSettings: { ...defaults.glImpactSettings, ...(overrides.glImpactSettings ?? {}) },
    glImpactColumns: { ...defaults.glImpactColumns, ...(overrides.glImpactColumns ?? {}) },
  }

  merged.fields = Object.fromEntries(
    Object.entries(merged.fields).filter(([fieldId]) => allowedFields.has(fieldId)),
  )

  return merged
}

export function parseBankTransactionDetailType(value: string | null | undefined) {
  return normalizeType(value)
}

export async function loadBankTransactionDetailCustomization(
  type: BankTransactionDetailType,
): Promise<BankTransactionDetailCustomizationConfig> {
  try {
    const raw = await fs.readFile(storePath(type), 'utf8')
    return mergeWithDefaults(type, JSON.parse(raw) as Partial<BankTransactionDetailCustomizationConfig>)
  } catch {
    return defaultBankTransactionDetailCustomization(type)
  }
}

export async function saveBankTransactionDetailCustomization(
  type: BankTransactionDetailType,
  nextConfig: BankTransactionDetailCustomizationConfig,
): Promise<BankTransactionDetailCustomizationConfig> {
  const normalized = mergeWithDefaults(type, nextConfig)
  await fs.mkdir(path.dirname(storePath(type)), { recursive: true })
  await fs.writeFile(storePath(type), `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
  return normalized
}

