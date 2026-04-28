import { NextRequest, NextResponse } from 'next/server'
import {
  defaultPurchaseOrderDetailCustomization,
  PURCHASE_ORDER_DETAIL_FIELDS,
  PURCHASE_ORDER_LINE_COLUMNS,
  PURCHASE_ORDER_STAT_CARDS,
  type PurchaseOrderDetailCustomizationConfig,
} from '@/lib/purchase-order-detail-customization'
import {
  loadPurchaseOrderDetailCustomization,
  savePurchaseOrderDetailCustomization,
} from '@/lib/purchase-order-detail-customization-store'

function sanitizeInput(input: unknown): PurchaseOrderDetailCustomizationConfig {
  const defaults = defaultPurchaseOrderDetailCustomization()
  if (!input || typeof input !== 'object') return defaults

  return {
    ...defaults,
    ...(input as Partial<PurchaseOrderDetailCustomizationConfig>),
  }
}

export async function GET() {
  try {
    const config = await loadPurchaseOrderDetailCustomization()
    return NextResponse.json({
      config,
      fields: PURCHASE_ORDER_DETAIL_FIELDS,
      lineColumns: PURCHASE_ORDER_LINE_COLUMNS,
      statCards: PURCHASE_ORDER_STAT_CARDS,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to load purchase order detail customization' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const inputConfig = (body as { config?: unknown })?.config
    const sanitized = sanitizeInput(inputConfig)
    const saved = await savePurchaseOrderDetailCustomization(sanitized)

    return NextResponse.json({
      config: saved,
      fields: PURCHASE_ORDER_DETAIL_FIELDS,
      lineColumns: PURCHASE_ORDER_LINE_COLUMNS,
      statCards: PURCHASE_ORDER_STAT_CARDS,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to save purchase order detail customization' },
      { status: 500 },
    )
  }
}
