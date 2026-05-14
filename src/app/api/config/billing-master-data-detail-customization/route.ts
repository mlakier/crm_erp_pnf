import { NextRequest, NextResponse } from 'next/server'
import { getBillingMasterDataConfig, type BillingMasterDataKey } from '@/lib/billing-subscription-master-data'
import {
  loadBillingMasterDataDetailCustomization,
  saveBillingMasterDataDetailCustomization,
} from '@/lib/billing-master-data-detail-customization-store'

function parseEntityKey(request: NextRequest): BillingMasterDataKey | null {
  const entityKey = request.nextUrl.searchParams.get('entityKey') as BillingMasterDataKey | null
  if (!entityKey) return null
  return getBillingMasterDataConfig(entityKey) ? entityKey : null
}

export async function GET(request: NextRequest) {
  const entityKey = parseEntityKey(request)
  if (!entityKey) {
    return NextResponse.json({ error: 'Valid entityKey is required' }, { status: 400 })
  }

  const config = await loadBillingMasterDataDetailCustomization(entityKey)
  return NextResponse.json({ config })
}

export async function POST(request: NextRequest) {
  const entityKey = parseEntityKey(request)
  if (!entityKey) {
    return NextResponse.json({ error: 'Valid entityKey is required' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const saved = await saveBillingMasterDataDetailCustomization(entityKey, body?.config ?? {})
    return NextResponse.json({ config: saved })
  } catch {
    return NextResponse.json({ error: 'Failed to save billing master data detail customization' }, { status: 500 })
  }
}
