import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateNextBankAccountId } from '@/lib/banking-number'

function text(value: unknown) {
  return String(value ?? '').trim()
}

function nullableText(value: unknown) {
  const trimmed = text(value)
  return trimmed || null
}

function parseDate(value: unknown) {
  const trimmed = text(value)
  if (!trimmed) return null
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const where = id ? { id } : {}
  const data = await prisma.bankAccount.findMany({
    where,
    include: {
      subsidiary: true,
      currency: true,
      glAccount: true,
      connection: true,
      _count: { select: { feedTransactions: true, statements: true, reconciliations: true } },
    },
    orderBy: [{ active: 'desc' }, { bankAccountId: 'asc' }],
  })
  return NextResponse.json(id ? data[0] ?? null : data)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = text(body?.name)
    const bankName = text(body?.bankName)
    const accountType = text(body?.accountType || 'checking')
    const subsidiaryId = text(body?.subsidiaryId)
    const currencyId = text(body?.currencyId)
    const glAccountId = text(body?.glAccountId)

    if (!name || !bankName || !subsidiaryId || !currencyId || !glAccountId) {
      return NextResponse.json({ error: 'Name, bank name, subsidiary, currency, and linked GL account are required.' }, { status: 400 })
    }

    const glAccount = await prisma.chartOfAccounts.findUnique({ where: { id: glAccountId } })
    if (!glAccount) return NextResponse.json({ error: 'Linked GL account was not found.' }, { status: 400 })
    if (!glAccount.bankAccountRequired) {
      return NextResponse.json({ error: 'Linked GL account must be a bank/cash account category.' }, { status: 400 })
    }

    const created = await prisma.bankAccount.create({
      data: {
        bankAccountId: text(body?.bankAccountId) || await generateNextBankAccountId(),
        name,
        bankName,
        accountType,
        maskedAccountNumber: nullableText(body?.maskedAccountNumber),
        statementSource: text(body?.statementSource || 'manual_import'),
        paymentFileFormat: nullableText(body?.paymentFileFormat),
        checkNumberPrefix: nullableText(body?.checkNumberPrefix),
        nextCheckNumber: body?.nextCheckNumber ? Number(body.nextCheckNumber) : null,
        reconciliationStartDate: parseDate(body?.reconciliationStartDate),
        active: text(body?.inactive).toLowerCase() === 'true' ? false : true,
        subsidiaryId,
        currencyId,
        glAccountId,
        connectionId: nullableText(body?.connectionId),
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create bank account.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const body = await request.json()
    const inactive = body?.inactive !== undefined ? text(body.inactive).toLowerCase() === 'true' : undefined
    const updated = await prisma.bankAccount.update({
      where: { id },
      data: {
        bankAccountId: body?.bankAccountId !== undefined ? text(body.bankAccountId) : undefined,
        name: body?.name !== undefined ? text(body.name) : undefined,
        bankName: body?.bankName !== undefined ? text(body.bankName) : undefined,
        accountType: body?.accountType !== undefined ? text(body.accountType) : undefined,
        maskedAccountNumber: body?.maskedAccountNumber !== undefined ? nullableText(body.maskedAccountNumber) : undefined,
        statementSource: body?.statementSource !== undefined ? text(body.statementSource) : undefined,
        paymentFileFormat: body?.paymentFileFormat !== undefined ? nullableText(body.paymentFileFormat) : undefined,
        checkNumberPrefix: body?.checkNumberPrefix !== undefined ? nullableText(body.checkNumberPrefix) : undefined,
        nextCheckNumber: body?.nextCheckNumber !== undefined ? (body.nextCheckNumber ? Number(body.nextCheckNumber) : null) : undefined,
        reconciliationStartDate: body?.reconciliationStartDate !== undefined ? parseDate(body.reconciliationStartDate) : undefined,
        active: inactive !== undefined ? !inactive : undefined,
        subsidiaryId: body?.subsidiaryId !== undefined ? text(body.subsidiaryId) : undefined,
        currencyId: body?.currencyId !== undefined ? text(body.currencyId) : undefined,
        glAccountId: body?.glAccountId !== undefined ? text(body.glAccountId) : undefined,
        connectionId: body?.connectionId !== undefined ? nullableText(body.connectionId) : undefined,
      },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unable to update bank account.' }, { status: 500 })
  }
}
