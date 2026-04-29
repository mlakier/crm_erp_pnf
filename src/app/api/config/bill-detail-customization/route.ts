import { NextRequest, NextResponse } from 'next/server'
import {
  BILL_DETAIL_FIELDS,
  defaultBillDetailCustomization,
  type BillDetailCustomizationConfig,
} from '@/lib/bill-detail-customization'
import { TRANSACTION_GL_IMPACT_COLUMNS } from '@/lib/transaction-gl-impact'
import {
  loadBillDetailCustomization,
  saveBillDetailCustomization,
} from '@/lib/bill-detail-customization-store'

export async function GET() {
  try {
    const config = await loadBillDetailCustomization()
    return NextResponse.json({ config, fields: BILL_DETAIL_FIELDS, glImpactColumns: TRANSACTION_GL_IMPACT_COLUMNS })
  } catch {
    return NextResponse.json({ error: 'Failed to load bills detail customization' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const defaults = defaultBillDetailCustomization()
    const root = ((body as { config?: unknown }).config ?? defaults) as Record<string, unknown>
    const nextConfig = {
      ...root,
      glImpactSettings:
        root.glImpactSettings && typeof root.glImpactSettings === 'object'
          ? (root.glImpactSettings as BillDetailCustomizationConfig['glImpactSettings'])
          : root.secondarySettings && typeof root.secondarySettings === 'object'
            ? (root.secondarySettings as BillDetailCustomizationConfig['glImpactSettings'])
            : defaults.glImpactSettings,
      glImpactColumns:
        root.glImpactColumns && typeof root.glImpactColumns === 'object'
          ? (root.glImpactColumns as BillDetailCustomizationConfig['glImpactColumns'])
          : root.secondaryColumns && typeof root.secondaryColumns === 'object'
            ? (root.secondaryColumns as BillDetailCustomizationConfig['glImpactColumns'])
            : defaults.glImpactColumns,
    } as BillDetailCustomizationConfig
    const saved = await saveBillDetailCustomization(nextConfig)
    return NextResponse.json({ config: saved, fields: BILL_DETAIL_FIELDS, glImpactColumns: TRANSACTION_GL_IMPACT_COLUMNS })
  } catch {
    return NextResponse.json({ error: 'Failed to save bills detail customization' }, { status: 500 })
  }
}
