import { promises as fs } from 'fs'
import path from 'path'
import {
  mergeBillingMasterDataDetailCustomization,
  type BillingMasterDataDetailCustomizationConfig,
} from '@/lib/billing-master-data-detail-customization'
import {
  getBillingMasterDataConfig,
  type BillingMasterDataKey,
} from '@/lib/billing-subscription-master-data'

const STORE_PATH = path.join(process.cwd(), 'config', 'billing-master-data-detail-customization.json')

type StoreShape = Partial<Record<BillingMasterDataKey, Partial<BillingMasterDataDetailCustomizationConfig>>>

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as StoreShape : {}
  } catch {
    return {}
  }
}

export async function loadBillingMasterDataDetailCustomization(
  entityKey: BillingMasterDataKey,
): Promise<BillingMasterDataDetailCustomizationConfig> {
  const config = getBillingMasterDataConfig(entityKey)
  const store = await readStore()
  return mergeBillingMasterDataDetailCustomization(config, store[entityKey])
}

export async function saveBillingMasterDataDetailCustomization(
  entityKey: BillingMasterDataKey,
  nextConfig: Partial<BillingMasterDataDetailCustomizationConfig>,
): Promise<BillingMasterDataDetailCustomizationConfig> {
  const config = getBillingMasterDataConfig(entityKey)
  const store = await readStore()
  const merged = mergeBillingMasterDataDetailCustomization(config, nextConfig)
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(
    STORE_PATH,
    `${JSON.stringify({ ...store, [entityKey]: merged }, null, 2)}\n`,
    'utf8',
  )
  return merged
}
