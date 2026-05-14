import {
  FINANCIAL_STATEMENT_LABELS,
  type FinancialStatementCustomizationType,
} from '@/lib/financial-statement-customization'
import {
  loadFinancialStatementCustomization,
  saveFinancialStatementCustomization,
} from '@/lib/financial-statement-customization-store'

function parseType(value: string | null): FinancialStatementCustomizationType | null {
  if (value === 'balance_sheet' || value === 'profit_and_loss') return value
  return null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const type = parseType(url.searchParams.get('type'))
  if (!type) return Response.json({ error: 'Invalid financial statement type.' }, { status: 400 })

  const config = await loadFinancialStatementCustomization(type)
  return Response.json({ type, label: FINANCIAL_STATEMENT_LABELS[type], config })
}

export async function POST(request: Request) {
  const body = await request.json()
  const type = parseType(body?.type ?? null)
  if (!type) return Response.json({ error: 'Invalid financial statement type.' }, { status: 400 })

  const config = await saveFinancialStatementCustomization(type, body?.config)
  return Response.json({ type, label: FINANCIAL_STATEMENT_LABELS[type], config })
}
