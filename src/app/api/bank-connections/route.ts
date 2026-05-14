import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateNextBankConnectionId } from '@/lib/banking-number'

function text(value: unknown) {
  return String(value ?? '').trim()
}

function nullableDate(value: unknown) {
  const raw = text(value)
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET() {
  const data = await prisma.bankConnection.findMany({
    include: { _count: { select: { bankAccounts: true, feedTransactions: true } } },
    orderBy: [{ active: 'desc' }, { institutionName: 'asc' }],
  })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const provider = text(body?.provider)
    const connectionCategory = text(body?.connectionCategory || 'bank_feed')
    const institutionName = text(body?.institutionName)
    if (!provider || !institutionName) {
      return NextResponse.json({ error: 'Provider and institution name are required.' }, { status: 400 })
    }
    const created = await prisma.bankConnection.create({
      data: {
        connectionId: text(body?.connectionId) || await generateNextBankConnectionId(),
        connectionCategory,
        provider,
        institutionName,
        status: text(body?.status || 'not_connected'),
        health: text(body?.health || 'not_configured'),
        syncFrequency: text(body?.syncFrequency || 'daily'),
        consentExpiresAt: nullableDate(body?.consentExpiresAt),
        notes: text(body?.notes) || null,
        active: text(body?.inactive).toLowerCase() === 'true' ? false : true,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unable to create bank connection.' }, { status: 500 })
  }
}
