import { NextRequest, NextResponse } from 'next/server'
import {
  CUSTOMER_REFUND_DETAIL_FIELDS,
  CUSTOMER_REFUND_STAT_CARDS,
  defaultCustomerRefundDetailCustomization,
  type CustomerRefundDetailCustomizationConfig,
} from '@/lib/customer-refund-detail-customization'
import { TRANSACTION_GL_IMPACT_COLUMNS } from '@/lib/transaction-gl-impact'
import {
  loadCustomerRefundDetailCustomization,
  saveCustomerRefundDetailCustomization,
} from '@/lib/customer-refund-detail-customization-store'

export async function GET() {
  try {
    const config = await loadCustomerRefundDetailCustomization()
    return NextResponse.json({
      config,
      fields: CUSTOMER_REFUND_DETAIL_FIELDS,
      glImpactColumns: TRANSACTION_GL_IMPACT_COLUMNS,
      statCards: CUSTOMER_REFUND_STAT_CARDS,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load customer refunds detail customization' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = ((body as { config?: unknown }).config ?? defaultCustomerRefundDetailCustomization()) as Record<string, unknown>
    const defaults = defaultCustomerRefundDetailCustomization()
    const nextConfig = {
      ...defaults,
      ...(input as Partial<CustomerRefundDetailCustomizationConfig>),
      glImpactSettings:
        input.glImpactSettings && typeof input.glImpactSettings === 'object'
          ? (input.glImpactSettings as CustomerRefundDetailCustomizationConfig['glImpactSettings'])
          : input.secondarySettings && typeof input.secondarySettings === 'object'
            ? (input.secondarySettings as CustomerRefundDetailCustomizationConfig['glImpactSettings'])
            : defaults.glImpactSettings,
      glImpactColumns:
        input.glImpactColumns && typeof input.glImpactColumns === 'object'
          ? (input.glImpactColumns as CustomerRefundDetailCustomizationConfig['glImpactColumns'])
          : input.secondaryColumns && typeof input.secondaryColumns === 'object'
            ? (input.secondaryColumns as CustomerRefundDetailCustomizationConfig['glImpactColumns'])
            : defaults.glImpactColumns,
    } as CustomerRefundDetailCustomizationConfig
    const saved = await saveCustomerRefundDetailCustomization(nextConfig)
    return NextResponse.json({
      config: saved,
      fields: CUSTOMER_REFUND_DETAIL_FIELDS,
      glImpactColumns: TRANSACTION_GL_IMPACT_COLUMNS,
      statCards: CUSTOMER_REFUND_STAT_CARDS,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to save customer refunds detail customization' }, { status: 500 })
  }
}
