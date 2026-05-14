import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'

export async function GET() {
  const headers = [
    'transactionDate (required)',
    'description (required)',
    'amount (required)',
    'currency',
    'counterparty',
    'reference',
    'postedDate',
    'direction',
  ]
  const worksheet = XLSX.utils.aoa_to_sheet([
    headers,
    ['2026-01-31', 'Example bank transaction', '100.00', 'USD', 'Example Counterparty', 'BANK-REF-001', '2026-01-31', 'inflow'],
  ])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bank Activity')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="bank_activity_template.xlsx"',
    },
  })
}
