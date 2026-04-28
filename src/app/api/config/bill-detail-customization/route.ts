import { NextRequest, NextResponse } from 'next/server'
import {
  BILL_DETAIL_FIELDS,
  defaultBillDetailCustomization,
  type BillDetailCustomizationConfig,
} from '@/lib/bill-detail-customization'
import {
  loadBillDetailCustomization,
  saveBillDetailCustomization,
} from '@/lib/bill-detail-customization-store'

export async function GET() {
  try {
    const config = await loadBillDetailCustomization()
    return NextResponse.json({ config, fields: BILL_DETAIL_FIELDS })
  } catch {
    return NextResponse.json({ error: 'Failed to load bills detail customization' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const nextConfig = ((body as { config?: unknown }).config ??
      defaultBillDetailCustomization()) as BillDetailCustomizationConfig
    const saved = await saveBillDetailCustomization(nextConfig)
    return NextResponse.json({ config: saved, fields: BILL_DETAIL_FIELDS })
  } catch {
    return NextResponse.json({ error: 'Failed to save bills detail customization' }, { status: 500 })
  }
}
