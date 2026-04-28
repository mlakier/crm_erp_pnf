import { NextRequest, NextResponse } from 'next/server'
import {
  defaultReceiptDetailCustomization,
  RECEIPT_DETAIL_FIELDS,
  type ReceiptDetailCustomizationConfig,
} from '@/lib/receipt-detail-customization'
import {
  loadReceiptDetailCustomization,
  saveReceiptDetailCustomization,
} from '@/lib/receipt-detail-customization-store'

export async function GET() {
  try {
    const config = await loadReceiptDetailCustomization()
    return NextResponse.json({ config, fields: RECEIPT_DETAIL_FIELDS })
  } catch {
    return NextResponse.json({ error: 'Failed to load receipts detail customization' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const nextConfig = ((body as { config?: unknown }).config ?? defaultReceiptDetailCustomization()) as ReceiptDetailCustomizationConfig
    const saved = await saveReceiptDetailCustomization(nextConfig)
    return NextResponse.json({ config: saved, fields: RECEIPT_DETAIL_FIELDS })
  } catch {
    return NextResponse.json({ error: 'Failed to save receipts detail customization' }, { status: 500 })
  }
}
