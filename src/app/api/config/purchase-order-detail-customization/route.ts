import { NextRequest, NextResponse } from 'next/server'
import {
  defaultPurchaseOrderDetailCustomization,
  PURCHASE_ORDER_DETAIL_FIELDS,
  PURCHASE_ORDER_LINE_COLUMNS,
  PURCHASE_ORDER_STAT_CARDS,
  type PurchaseOrderDetailCustomizationConfig,
} from '@/lib/purchase-order-detail-customization'
import { TRANSACTION_GL_IMPACT_COLUMNS } from '@/lib/transaction-gl-impact'
import {
  loadPurchaseOrderDetailCustomization,
  savePurchaseOrderDetailCustomization,
} from '@/lib/purchase-order-detail-customization-store'

function sanitizeInput(input: unknown): PurchaseOrderDetailCustomizationConfig {
  const defaults = defaultPurchaseOrderDetailCustomization()
  if (!input || typeof input !== 'object') return defaults
  const root = input as Record<string, unknown>

  return {
    ...defaults,
    ...(input as Partial<PurchaseOrderDetailCustomizationConfig>),
    glImpactSettings:
      root.glImpactSettings && typeof root.glImpactSettings === 'object'
        ? (root.glImpactSettings as PurchaseOrderDetailCustomizationConfig['glImpactSettings'])
        : root.secondarySettings && typeof root.secondarySettings === 'object'
          ? (root.secondarySettings as PurchaseOrderDetailCustomizationConfig['glImpactSettings'])
          : defaults.glImpactSettings,
    glImpactColumns:
      root.glImpactColumns && typeof root.glImpactColumns === 'object'
        ? (root.glImpactColumns as PurchaseOrderDetailCustomizationConfig['glImpactColumns'])
        : root.secondaryColumns && typeof root.secondaryColumns === 'object'
          ? (root.secondaryColumns as PurchaseOrderDetailCustomizationConfig['glImpactColumns'])
          : defaults.glImpactColumns,
  }
}

export async function GET() {
  try {
    const config = await loadPurchaseOrderDetailCustomization()
    return NextResponse.json({
      config,
      fields: PURCHASE_ORDER_DETAIL_FIELDS,
      lineColumns: PURCHASE_ORDER_LINE_COLUMNS,
      glImpactColumns: TRANSACTION_GL_IMPACT_COLUMNS,
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
      glImpactColumns: TRANSACTION_GL_IMPACT_COLUMNS,
      statCards: PURCHASE_ORDER_STAT_CARDS,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to save purchase order detail customization' },
      { status: 500 },
    )
  }
}
