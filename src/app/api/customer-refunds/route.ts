import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseMoneyValue } from '@/lib/money'
import { loadListValues } from '@/lib/load-list-values'
import { generateCustomerRefundNumber } from '@/lib/customer-refund-number'
import { loadCompanyInformationSettings } from '@/lib/company-information-settings-store'
import { generateNextJournalNumber } from '@/lib/journal-number'
import { logActivity, logCommunicationActivity } from '@/lib/activity'

const CUSTOMER_REFUND_POSTING_STATUSES = new Set(['processed'])

async function loadCustomerRefundStatusValues() {
  const values = await loadListValues('CUSTOMER-REFUND-STATUS')
  return values.map((value) => value.toLowerCase())
}

function normalizeCustomerRefundStatus(value: unknown, allowedStatuses: string[], fallback: string) {
  const normalized = typeof value === 'string' ? value.toLowerCase() : fallback
  return allowedStatuses.includes(normalized) ? normalized : fallback
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

async function computeReceiptOverpayment(receiptId: string, excludingRefundId?: string) {
  const receipt = await prisma.cashReceipt.findUnique({
    where: { id: receiptId },
    include: {
      invoice: {
        include: {
          customer: true,
        },
      },
      applications: true,
      customerRefunds: {
        select: { id: true, amount: true, status: true },
      },
    },
  })
  if (!receipt) {
    throw new Error('Selected invoice receipt could not be found')
  }

  const appliedAmount = roundMoney(receipt.applications.reduce((sum, application) => sum + Number(application.appliedAmount), 0))
  const refundedAmount = roundMoney(
    receipt.customerRefunds.reduce((sum, refund) => {
      if (excludingRefundId && refund.id === excludingRefundId) return sum
      if ((refund.status ?? '').toLowerCase() === 'void') return sum
      return sum + Number(refund.amount)
    }, 0),
  )
  const availableAmount = roundMoney(Number(receipt.amount) - appliedAmount - refundedAmount)

  return {
    receipt,
    availableAmount,
  }
}

async function findCustomerRefundPostingAccounts(bankAccountId: string | null | undefined) {
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

async function postCustomerRefundJournal(refundId: string) {
  const existingJournal = await prisma.journalEntry.findFirst({
    where: { sourceType: 'customer-refund', sourceId: refundId },
    select: { id: true },
  })
  if (existingJournal) return

  const refund = await prisma.customerRefund.findUnique({
    where: { id: refundId },
    include: {
      customer: true,
      cashReceipt: {
        include: {
          invoice: true,
        },
      },
    },
  })
  if (!refund || !CUSTOMER_REFUND_POSTING_STATUSES.has(refund.status.toLowerCase())) return

  const amount = Number(refund.amount)
  if (!Number.isFinite(amount) || amount <= 0) return

  const { arAccountId, bankAccountId } = await findCustomerRefundPostingAccounts(refund.bankAccountId)
  if (!arAccountId || !bankAccountId) return

  const journalNumber = await generateNextJournalNumber()
  await prisma.journalEntry.create({
    data: {
      number: journalNumber,
      date: refund.date,
      description: `Customer refund ${refund.number}`,
      journalType: 'standard',
      status: 'approved',
      total: amount,
      sourceType: 'customer-refund',
      sourceId: refund.id,
      subsidiaryId: refund.subsidiaryId,
      currencyId: refund.currencyId,
      userId: refund.userId,
      lineItems: {
        create: [
          {
            displayOrder: 0,
            description: `${refund.number} customer refund`,
            memo: refund.reference ?? null,
            debit: amount,
            credit: 0,
            accountId: arAccountId,
            subsidiaryId: refund.subsidiaryId,
            customerId: refund.customerId,
          },
          {
            displayOrder: 1,
            description: `${refund.number} cash disbursement`,
            memo: refund.reference ?? null,
            debit: 0,
            credit: amount,
            accountId: bankAccountId,
            subsidiaryId: refund.subsidiaryId,
            customerId: refund.customerId,
          },
        ],
      },
    },
  })

  await logActivity({
    entityType: 'customer-refund',
    entityId: refund.id,
    action: 'post',
    summary: `Posted customer refund ${refund.number} to GL`,
    userId: refund.userId ?? undefined,
  })
}

async function unpostCustomerRefundJournal(refundId: string) {
  await prisma.journalEntry.deleteMany({
    where: { sourceType: 'customer-refund', sourceId: refundId },
  })
}

async function syncCustomerRefundPosting(refundId: string, status: string) {
  if (CUSTOMER_REFUND_POSTING_STATUSES.has(status.toLowerCase())) {
    await postCustomerRefundJournal(refundId)
    return
  }
  await unpostCustomerRefundJournal(refundId)
}

async function validateCustomerRefund({
  customerId,
  cashReceiptId,
  amount,
  currentRefundId,
}: {
  customerId: string
  cashReceiptId?: string | null
  amount: number
  currentRefundId?: string
}) {
  if (!customerId) throw new Error('Customer is required')
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Refund amount must be greater than zero')

  if (!cashReceiptId) {
    return {
      subsidiaryId: null as string | null,
      currencyId: null as string | null,
      userId: null as string | null,
    }
  }

  const { receipt, availableAmount } = await computeReceiptOverpayment(cashReceiptId, currentRefundId)
  if (receipt.invoice.customerId !== customerId) {
    throw new Error('Selected overpayment source does not belong to the chosen customer')
  }
  if ((receipt.overpaymentHandling ?? '').toLowerCase() !== 'refund_pending') {
    throw new Error('Selected invoice receipt is not marked for refund')
  }
  if (availableAmount <= 0) {
    throw new Error('Selected invoice receipt does not have refundable overpayment available')
  }
  if (amount > availableAmount + 0.005) {
    throw new Error(`Refund amount exceeds available refundable balance of ${availableAmount.toFixed(2)}`)
  }

  return {
    subsidiaryId: receipt.invoice.subsidiaryId ?? null,
    currencyId: receipt.invoice.currencyId ?? null,
    userId: receipt.invoice.userId ?? null,
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (id) {
    const row = await prisma.customerRefund.findUnique({
      where: { id },
      include: {
        customer: true,
        cashReceipt: {
          include: {
            invoice: { include: { customer: true } },
          },
        },
        bankAccount: true,
      },
    })
    return row ? NextResponse.json(row) : NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const rows = await prisma.customerRefund.findMany({
    include: {
      customer: true,
      cashReceipt: { include: { invoice: true } },
      bankAccount: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action')
    const body = await req.json()
    if (action === 'send-email') {
      const {
        customerRefundId,
        userId,
        to,
        from,
        subject,
        preview,
        attachPdf,
      } = body as {
        customerRefundId?: string
        userId?: string | null
        to?: string
        from?: string
        subject?: string
        preview?: string
        attachPdf?: boolean
      }

      if (!customerRefundId || !to?.trim() || !subject?.trim()) {
        return NextResponse.json({ error: 'Missing required email fields' }, { status: 400 })
      }

      const refund = await prisma.customerRefund.findUnique({
        where: { id: customerRefundId },
        select: { id: true },
      })

      if (!refund) {
        return NextResponse.json({ error: 'Customer refund not found' }, { status: 404 })
      }

      await logCommunicationActivity({
        entityType: 'customer-refund',
        entityId: customerRefundId,
        userId: userId ?? null,
        context: 'UI',
        channel: 'Email',
        direction: 'Outbound',
        subject: subject.trim(),
        from: from?.trim() || '-',
        to: to.trim(),
        status: attachPdf ? 'Prepared (PDF)' : 'Prepared',
        preview: (preview?.trim() || '-').slice(0, 500),
      })

      return NextResponse.json({ ok: true })
    }

    const statusValues = await loadCustomerRefundStatusValues()
    const normalizedStatus = normalizeCustomerRefundStatus(body.status, statusValues, 'draft')
    const amount = parseMoneyValue(body.amount)
    const validation = await validateCustomerRefund({
      customerId: body.customerId,
      cashReceiptId: body.cashReceiptId || null,
      amount,
    })
    const number = await generateCustomerRefundNumber()

    const row = await prisma.customerRefund.create({
      data: {
        number,
        customerId: body.customerId,
        cashReceiptId: body.cashReceiptId || null,
        bankAccountId: body.bankAccountId || null,
        amount,
        date: new Date(body.date),
        method: body.method,
        reference: body.reference || null,
        notes: body.notes || null,
        status: normalizedStatus,
        subsidiaryId: validation.subsidiaryId,
        currencyId: validation.currencyId,
        userId: validation.userId,
      },
    })

    await syncCustomerRefundPosting(row.id, normalizedStatus)
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create customer refund'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await req.json()
    const before = await prisma.customerRefund.findUnique({ where: { id } })
    if (!before) return NextResponse.json({ error: 'Customer refund not found' }, { status: 404 })

    const statusValues = await loadCustomerRefundStatusValues()
    const normalizedStatus = normalizeCustomerRefundStatus(body.status, statusValues, before.status.toLowerCase())
    const amount = body.amount !== undefined ? parseMoneyValue(body.amount) : Number(before.amount)
    const customerId = body.customerId ?? before.customerId
    const cashReceiptId = body.cashReceiptId !== undefined ? body.cashReceiptId || null : before.cashReceiptId

    const validation = await validateCustomerRefund({
      customerId,
      cashReceiptId,
      amount,
      currentRefundId: before.id,
    })

    const row = await prisma.customerRefund.update({
      where: { id },
      data: {
        ...(body.customerId !== undefined ? { customerId } : {}),
        ...(body.cashReceiptId !== undefined ? { cashReceiptId } : {}),
        ...(body.bankAccountId !== undefined ? { bankAccountId: body.bankAccountId || null } : {}),
        ...(body.amount !== undefined ? { amount } : {}),
        ...(body.date ? { date: new Date(body.date) } : {}),
        ...(body.method !== undefined ? { method: body.method } : {}),
        ...(body.reference !== undefined ? { reference: body.reference || null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
        ...(body.status !== undefined ? { status: normalizedStatus } : {}),
        subsidiaryId: validation.subsidiaryId,
        currencyId: validation.currencyId,
        userId: validation.userId,
      },
    })

    await syncCustomerRefundPosting(row.id, normalizedStatus)
    await logActivity({
      entityType: 'customer-refund',
      entityId: row.id,
      action: 'update',
      summary: `Updated customer refund ${row.number}`,
      userId: row.userId ?? undefined,
    })
    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update customer refund'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await unpostCustomerRefundJournal(id)
  await prisma.customerRefund.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
