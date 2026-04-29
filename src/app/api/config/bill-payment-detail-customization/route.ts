import { NextRequest, NextResponse } from 'next/server'
import {
  defaultBillPaymentDetailCustomization,
  BILL_PAYMENT_DETAIL_FIELDS,
  type BillPaymentDetailCustomizationConfig,
} from '@/lib/bill-payment-detail-customization'
import { TRANSACTION_GL_IMPACT_COLUMNS } from '@/lib/transaction-gl-impact'
import {
  loadBillPaymentDetailCustomization,
  saveBillPaymentDetailCustomization,
} from '@/lib/bill-payment-detail-customization-store'

export async function GET() {
  try {
    const config = await loadBillPaymentDetailCustomization()
    return NextResponse.json({ config, fields: BILL_PAYMENT_DETAIL_FIELDS, glImpactColumns: TRANSACTION_GL_IMPACT_COLUMNS })
  } catch {
    return NextResponse.json({ error: 'Failed to load bill-payments detail customization' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const defaults = defaultBillPaymentDetailCustomization()
    const root = ((body as { config?: unknown }).config ?? defaults) as Record<string, unknown>
    const nextConfig = {
      ...root,
      glImpactSettings:
        root.glImpactSettings && typeof root.glImpactSettings === 'object'
          ? (root.glImpactSettings as BillPaymentDetailCustomizationConfig['glImpactSettings'])
          : root.secondarySettings && typeof root.secondarySettings === 'object'
            ? (root.secondarySettings as BillPaymentDetailCustomizationConfig['glImpactSettings'])
            : defaults.glImpactSettings,
      glImpactColumns:
        root.glImpactColumns && typeof root.glImpactColumns === 'object'
          ? (root.glImpactColumns as BillPaymentDetailCustomizationConfig['glImpactColumns'])
          : root.secondaryColumns && typeof root.secondaryColumns === 'object'
            ? (root.secondaryColumns as BillPaymentDetailCustomizationConfig['glImpactColumns'])
            : defaults.glImpactColumns,
    } as BillPaymentDetailCustomizationConfig
    const saved = await saveBillPaymentDetailCustomization(nextConfig)
    return NextResponse.json({ config: saved, fields: BILL_PAYMENT_DETAIL_FIELDS, glImpactColumns: TRANSACTION_GL_IMPACT_COLUMNS })
  } catch {
    return NextResponse.json({ error: 'Failed to save bill-payments detail customization' }, { status: 500 })
  }
}
