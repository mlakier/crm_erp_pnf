import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateInvoiceReceiptNumber } from '@/lib/invoice-receipt-number'
import { parseMoneyValue } from '@/lib/money'
import { generateNextJournalNumber } from '@/lib/journal-number'
import { logActivity } from '@/lib/activity'
import { loadCompanyInformationSettings } from '@/lib/company-information-settings-store'

async function findInvoiceReceiptPostingAccounts(bankAccountId: string | null | undefined) {
  const companySettings = await loadCompanyInformationSettings()

  const arAccount =
    (companySettings.defaultArAccountId
      ? await prisma.chartOfAccounts.findFirst({
          where: {
            id: companySettings.defaultArAccountId,
            active: true,
            isPosting: true,
            accountType: 'Asset',
          },
          select: { id: true },
        })
      : null)
    ?? await prisma.chartOfAccounts.findFirst({
      where: {
        active: true,
        isPosting: true,
        accountType: 'Asset',
        OR: [
          { name: { contains: 'Accounts Receivable', mode: 'insensitive' } },
          { accountId: '1100' },
        ],
      },
      select: { id: true },
    })
    ?? await prisma.chartOfAccounts.findFirst({
      where: {
        active: true,
        isPosting: true,
        accountType: 'Asset',
      },
      select: { id: true },
    })

  const bankAccount =
    (bankAccountId
      ? await prisma.chartOfAccounts.findFirst({
          where: {
            id: bankAccountId,
            active: true,
            isPosting: true,
            accountType: 'Asset',
          },
          select: { id: true },
        })
      : null)
    ?? await prisma.chartOfAccounts.findFirst({
      where: {
        active: true,
        isPosting: true,
        accountType: 'Asset',
        OR: [
          { name: { contains: 'Cash', mode: 'insensitive' } },
          { name: { contains: 'Bank', mode: 'insensitive' } },
          { accountId: { in: ['1000', '1010'] } },
        ],
      },
      select: { id: true },
    })

  return {
    arAccountId: arAccount?.id ?? null,
    bankAccountId: bankAccount?.id ?? null,
  }
}

async function postInvoiceReceiptJournal(cashReceiptId: string) {
  const existingJournal = await prisma.journalEntry.findFirst({
    where: { sourceType: 'invoice-receipt', sourceId: cashReceiptId },
    select: { id: true },
  })
  if (existingJournal) return

  const receipt = await prisma.cashReceipt.findUnique({
    where: { id: cashReceiptId },
    include: {
      invoice: {
        select: {
          id: true,
          number: true,
          customerId: true,
          userId: true,
          subsidiaryId: true,
          currencyId: true,
        },
      },
    },
  })
  if (!receipt) return

  const amount = Number(receipt.amount)
  if (!Number.isFinite(amount) || amount <= 0) return

  const { arAccountId, bankAccountId } = await findInvoiceReceiptPostingAccounts(receipt.bankAccountId)
  if (!arAccountId || !bankAccountId) return

  const journalNumber = await generateNextJournalNumber()

  await prisma.journalEntry.create({
    data: {
      number: journalNumber,
      date: receipt.date,
      description: `Invoice receipt ${receipt.number ?? receipt.id}`,
      journalType: 'standard',
      status: 'approved',
      total: amount,
      sourceType: 'invoice-receipt',
      sourceId: receipt.id,
      subsidiaryId: receipt.invoice.subsidiaryId,
      currencyId: receipt.invoice.currencyId,
      userId: receipt.invoice.userId,
      lineItems: {
        create: [
          {
            displayOrder: 0,
            description: `${receipt.number ?? receipt.id} cash receipt`,
            memo: receipt.reference ?? null,
            debit: amount,
            credit: 0,
            accountId: bankAccountId,
            subsidiaryId: receipt.invoice.subsidiaryId,
            customerId: receipt.invoice.customerId,
          },
          {
            displayOrder: 1,
            description: `${receipt.number ?? receipt.id} AR application`,
            memo: receipt.reference ?? null,
            debit: 0,
            credit: amount,
            accountId: arAccountId,
            subsidiaryId: receipt.invoice.subsidiaryId,
            customerId: receipt.invoice.customerId,
          },
        ],
      },
    },
  })

  await logActivity({
    entityType: 'invoice-receipt',
    entityId: receipt.id,
    action: 'post',
    summary: `Posted invoice receipt ${receipt.number ?? receipt.id} to GL`,
    userId: receipt.invoice.userId,
  })
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (id) {
    const row = await prisma.cashReceipt.findUnique({ where: { id }, include: { invoice: { include: { customer: true } } } })
    return row ? NextResponse.json(row) : NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const rows = await prisma.cashReceipt.findMany({ include: { invoice: { include: { customer: true } } }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { invoiceId, amount, date, method, reference } = body
  if (!invoiceId || !amount || !date || !method) return NextResponse.json({ error: 'invoiceId, amount, date, method required' }, { status: 400 })
  const number = await generateInvoiceReceiptNumber()
  const row = await prisma.cashReceipt.create({ data: { number, invoiceId, bankAccountId: body.bankAccountId || null, amount: parseMoneyValue(amount), date: new Date(date), method, reference: reference || null } })
  await postInvoiceReceiptJournal(row.id)
  return NextResponse.json(row, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const body = await req.json()
  if (body.amount !== undefined) body.amount = parseMoneyValue(body.amount)
  if (body.date) body.date = new Date(body.date)
  const row = await prisma.cashReceipt.update({ where: { id }, data: body })
  await postInvoiceReceiptJournal(row.id)
  return NextResponse.json(row)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.cashReceipt.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
