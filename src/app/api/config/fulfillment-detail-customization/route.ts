import { NextRequest, NextResponse } from 'next/server'
import {
  defaultFulfillmentDetailCustomization,
  FULFILLMENT_DETAIL_FIELDS,
  FULFILLMENT_LINE_COLUMNS,
  type FulfillmentDetailCustomizationConfig,
} from '@/lib/fulfillment-detail-customization'
import { TRANSACTION_GL_IMPACT_COLUMNS } from '@/lib/transaction-gl-impact'
import {
  loadFulfillmentDetailCustomization,
  saveFulfillmentDetailCustomization,
} from '@/lib/fulfillment-detail-customization-store'

export async function GET() {
  try {
    const config = await loadFulfillmentDetailCustomization()
    return NextResponse.json({ config, fields: FULFILLMENT_DETAIL_FIELDS, lineColumns: FULFILLMENT_LINE_COLUMNS, glImpactColumns: TRANSACTION_GL_IMPACT_COLUMNS })
  } catch {
    return NextResponse.json({ error: 'Failed to load fulfillment detail customization' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = ((body as { config?: unknown }).config ?? defaultFulfillmentDetailCustomization()) as Record<string, unknown>
    const defaults = defaultFulfillmentDetailCustomization()
    const nextConfig = {
      ...defaults,
      ...(input as Partial<FulfillmentDetailCustomizationConfig>),
      glImpactSettings:
        input.glImpactSettings && typeof input.glImpactSettings === 'object'
          ? (input.glImpactSettings as FulfillmentDetailCustomizationConfig['glImpactSettings'])
          : input.secondarySettings && typeof input.secondarySettings === 'object'
            ? (input.secondarySettings as FulfillmentDetailCustomizationConfig['glImpactSettings'])
            : defaults.glImpactSettings,
      glImpactColumns:
        input.glImpactColumns && typeof input.glImpactColumns === 'object'
          ? (input.glImpactColumns as FulfillmentDetailCustomizationConfig['glImpactColumns'])
          : input.secondaryColumns && typeof input.secondaryColumns === 'object'
            ? (input.secondaryColumns as FulfillmentDetailCustomizationConfig['glImpactColumns'])
            : defaults.glImpactColumns,
    } as FulfillmentDetailCustomizationConfig
    const saved = await saveFulfillmentDetailCustomization(nextConfig)
    return NextResponse.json({ config: saved, fields: FULFILLMENT_DETAIL_FIELDS, lineColumns: FULFILLMENT_LINE_COLUMNS, glImpactColumns: TRANSACTION_GL_IMPACT_COLUMNS })
  } catch {
    return NextResponse.json({ error: 'Failed to save fulfillment detail customization' }, { status: 500 })
  }
}
