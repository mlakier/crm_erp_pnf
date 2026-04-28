import { promises as fs } from 'fs'
import path from 'path'
import {
  defaultReceiptDetailCustomization,
  RECEIPT_REFERENCE_SOURCES,
  type ReceiptDetailCustomizationConfig,
} from '@/lib/receipt-detail-customization'
import { mergeTransactionReferenceLayouts } from '@/lib/transaction-reference-layouts'

const STORE_PATH = path.join(process.cwd(), 'config', 'receipt-detail-customization.json')

function cloneDefaults(): ReceiptDetailCustomizationConfig {
  return JSON.parse(JSON.stringify(defaultReceiptDetailCustomization())) as ReceiptDetailCustomizationConfig
}

export async function loadReceiptDetailCustomization(): Promise<ReceiptDetailCustomizationConfig> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    const defaults = cloneDefaults()
    const parsed = JSON.parse(raw) as Partial<ReceiptDetailCustomizationConfig>
    return {
      ...defaults,
      ...parsed,
      referenceLayouts: mergeTransactionReferenceLayouts(parsed.referenceLayouts, defaults.referenceLayouts, RECEIPT_REFERENCE_SOURCES),
    }
  } catch {
    return cloneDefaults()
  }
}

export async function saveReceiptDetailCustomization(nextConfig: ReceiptDetailCustomizationConfig): Promise<ReceiptDetailCustomizationConfig> {
  const defaults = cloneDefaults()
  const normalized = {
    ...defaults,
    ...nextConfig,
    referenceLayouts: mergeTransactionReferenceLayouts(nextConfig.referenceLayouts, defaults.referenceLayouts, RECEIPT_REFERENCE_SOURCES),
  }
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
  return normalized
}
