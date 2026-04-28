import { promises as fs } from 'fs'
import path from 'path'
import {
  defaultBillPaymentDetailCustomization,
  BILL_PAYMENT_REFERENCE_SOURCES,
  type BillPaymentDetailCustomizationConfig,
} from '@/lib/bill-payment-detail-customization'
import { mergeTransactionReferenceLayouts } from '@/lib/transaction-reference-layouts'

const STORE_PATH = path.join(process.cwd(), 'config', 'bill-payment-detail-customization.json')

function cloneDefaults(): BillPaymentDetailCustomizationConfig {
  return JSON.parse(JSON.stringify(defaultBillPaymentDetailCustomization())) as BillPaymentDetailCustomizationConfig
}

export async function loadBillPaymentDetailCustomization(): Promise<BillPaymentDetailCustomizationConfig> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    const defaults = cloneDefaults()
    const parsed = JSON.parse(raw) as Partial<BillPaymentDetailCustomizationConfig>
    return {
      ...defaults,
      ...parsed,
      referenceLayouts: mergeTransactionReferenceLayouts(parsed.referenceLayouts, defaults.referenceLayouts, BILL_PAYMENT_REFERENCE_SOURCES),
    }
  } catch {
    return cloneDefaults()
  }
}

export async function saveBillPaymentDetailCustomization(nextConfig: BillPaymentDetailCustomizationConfig): Promise<BillPaymentDetailCustomizationConfig> {
  const defaults = cloneDefaults()
  const normalized = {
    ...defaults,
    ...nextConfig,
    referenceLayouts: mergeTransactionReferenceLayouts(nextConfig.referenceLayouts, defaults.referenceLayouts, BILL_PAYMENT_REFERENCE_SOURCES),
  }
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
  return normalized
}
