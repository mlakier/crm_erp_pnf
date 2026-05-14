import { NextResponse } from 'next/server'
import {
  loadBankTransactionDetailCustomization,
  parseBankTransactionDetailType,
  saveBankTransactionDetailCustomization,
} from '@/lib/bank-transaction-detail-customization-store'
import type { BankTransactionDetailCustomizationConfig } from '@/lib/bank-transaction-detail-customization'

export async function GET(request: Request) {
  const type = parseBankTransactionDetailType(new URL(request.url).searchParams.get('type'))
  const config = await loadBankTransactionDetailCustomization(type)
  return NextResponse.json(config)
}

export async function POST(request: Request) {
  try {
    const type = parseBankTransactionDetailType(new URL(request.url).searchParams.get('type'))
    const body = (await request.json().catch(() => ({}))) as { config?: BankTransactionDetailCustomizationConfig }
    if (!body.config) {
      return NextResponse.json({ error: 'Missing customization config.' }, { status: 400 })
    }

    const saved = await saveBankTransactionDetailCustomization(type, body.config)
    return NextResponse.json(saved)
  } catch {
    return NextResponse.json({ error: 'Unable to save bank transaction customization.' }, { status: 500 })
  }
}

