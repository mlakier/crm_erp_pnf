import { NextRequest, NextResponse } from 'next/server'
import {
  defaultBillPaymentDetailCustomization,
  BILL_PAYMENT_DETAIL_FIELDS,
  type BillPaymentDetailCustomizationConfig,
} from '@/lib/bill-payment-detail-customization'
import {
  loadBillPaymentDetailCustomization,
  saveBillPaymentDetailCustomization,
} from '@/lib/bill-payment-detail-customization-store'

export async function GET() {
  try {
    const config = await loadBillPaymentDetailCustomization()
    return NextResponse.json({ config, fields: BILL_PAYMENT_DETAIL_FIELDS })
  } catch {
    return NextResponse.json({ error: 'Failed to load bill-payments detail customization' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const nextConfig = ((body as { config?: unknown }).config ?? defaultBillPaymentDetailCustomization()) as BillPaymentDetailCustomizationConfig
    const saved = await saveBillPaymentDetailCustomization(nextConfig)
    return NextResponse.json({ config: saved, fields: BILL_PAYMENT_DETAIL_FIELDS })
  } catch {
    return NextResponse.json({ error: 'Failed to save bill-payments detail customization' }, { status: 500 })
  }
}
