import { NextRequest, NextResponse } from 'next/server'
import {
  defaultReceiptDetailCustomization,
  RECEIPT_DETAIL_FIELDS,
  type ReceiptDetailCustomizationConfig,
} from '@/lib/receipt-detail-customization'
import { TRANSACTION_GL_IMPACT_COLUMNS } from '@/lib/transaction-gl-impact'
import {
  loadReceiptDetailCustomization,
  saveReceiptDetailCustomization,
} from '@/lib/receipt-detail-customization-store'

export async function GET() {
  try {
    const config = await loadReceiptDetailCustomization()
    return NextResponse.json({ config, fields: RECEIPT_DETAIL_FIELDS, glImpactColumns: TRANSACTION_GL_IMPACT_COLUMNS })
  } catch {
    return NextResponse.json({ error: 'Failed to load receipts detail customization' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const defaults = defaultReceiptDetailCustomization()
    const root = ((body as { config?: unknown }).config ?? defaults) as Record<string, unknown>
    const nextConfig = {
      ...root,
      glImpactSettings:
        root.glImpactSettings && typeof root.glImpactSettings === 'object'
          ? (root.glImpactSettings as ReceiptDetailCustomizationConfig['glImpactSettings'])
          : root.secondarySettings && typeof root.secondarySettings === 'object'
            ? (root.secondarySettings as ReceiptDetailCustomizationConfig['glImpactSettings'])
            : defaults.glImpactSettings,
      glImpactColumns:
        root.glImpactColumns && typeof root.glImpactColumns === 'object'
          ? (root.glImpactColumns as ReceiptDetailCustomizationConfig['glImpactColumns'])
          : root.secondaryColumns && typeof root.secondaryColumns === 'object'
            ? (root.secondaryColumns as ReceiptDetailCustomizationConfig['glImpactColumns'])
            : defaults.glImpactColumns,
    } as ReceiptDetailCustomizationConfig
    const saved = await saveReceiptDetailCustomization(nextConfig)
    return NextResponse.json({ config: saved, fields: RECEIPT_DETAIL_FIELDS, glImpactColumns: TRANSACTION_GL_IMPACT_COLUMNS })
  } catch {
    return NextResponse.json({ error: 'Failed to save receipts detail customization' }, { status: 500 })
  }
}
