import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateInvoiceReceiptNumber } from '@/lib/invoice-receipt-number'
import { parseMoneyValue } from '@/lib/money'
import { generateNextJournalNumber } from '@/lib/journal-number'
import { generateCustomerRefundNumber } from '@/lib/customer-refund-number'
import { logActivity } from '@/lib/activity'
import { loadCompanyInformationSettings } from '@/lib/company-information-settings-store'
import { loadListValues } from '@/lib/load-list-values'
import {
  normalizeInvoiceReceiptApplications,
  roundMoney,
  sumInvoiceReceiptApplications,
  type InvoiceReceiptApplicationInput,
} from '@/lib/invoice-receipt-applications'

const INVOICE_RECEIPT_POSTING_STATUSES = new Set(['posted'])
const AUTO_CUSTOMER_REFUND_NOTE = 'Auto-created from invoice receipt overpayment.'

async function loadInvoiceReceiptStatusValues() {
  const values = await loadListValues('INV-RECEIPT-STATUS')
  return values.map((value) => value.toLowerCase())
}

function normalizeInvoiceReceiptStatus(value: unknown, allowedStatuses: string[], fallback: string) {
  const normalized = typeof value === 'string' ? value.toLowerCase() : fallback
  return allowedStatuses.includes(normalized) ? normalized : fallback
}

function normalizeOverpaymentHandling(value: unknown) {
  return value === 'apply_to_future_invoices' || value === 'refund_pending'
    ? value
    : null
}

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

async function loadInvoiceApplicationContext(invoiceIds: string[], currentReceiptId?: string) {
  const invoices = await prisma.invoice.findMany({
    where: { id: { in: invoiceIds } },
    include: {
      customer: true,
      cashReceiptApplications: {
        include: {
          cashReceipt: {
            select: { id: true },
          },
        },
      },
      cashReceipts: {
        select: {
          id: true,
          amount: true,
          applications: { select: { id: true } },
        },
      },
    },
  })

  return new Map(
    invoices.map((invoice) => {
      const appliedViaApplications = invoice.cashReceiptApplications.reduce((sum, application) => {
        if (application.cashReceiptId === currentReceiptId) return sum
        return sum + Number(application.appliedAmount)
      }, 0)

      const appliedViaLegacyReceipts = invoice.cashReceipts.reduce((sum, receipt) => {
        if (receipt.id === currentReceiptId) return sum
        if (receipt.applications.length > 0) return sum
        return sum + Number(receipt.amount)
      }, 0)

      return [
        invoice.id,
        {
          invoice,
          openAmount: roundMoney(Number(invoice.total) - appliedViaApplications - appliedViaLegacyReceipts),
        },
      ]
    }),
  )
}

async function validateInvoiceReceiptApplications(
  applications: InvoiceReceiptApplicationInput[],
  receiptAmount: number,
  currentReceiptId?: string,
  requireFullyApplied = false,
  overpaymentHandling?: string | null,
) {
  if (!Number.isFinite(receiptAmount) || receiptAmount <= 0) {
    throw new Error('Receipt amount must be greater than zero')
  }
  if (applications.length === 0) {
    if (requireFullyApplied) {
      throw new Error('At least one invoice application is required before posting')
    }
    return {
      firstInvoice: null,
      customerId: null,
      subsidiaryId: null,
      currencyId: null,
      userId: null,
      totalApplied: 0,
    }
  }

  const contextByInvoiceId = await loadInvoiceApplicationContext(
    applications.map((application) => application.invoiceId),
    currentReceiptId,
  )

  const resolvedInvoices = applications.map((application) => {
    const context = contextByInvoiceId.get(application.invoiceId)
    if (!context) {
      throw new Error('One or more selected invoices could not be found')
    }
    if (application.appliedAmount > context.openAmount + 0.005) {
      throw new Error(`Applied amount exceeds open balance for invoice ${context.invoice.number}`)
    }
    return context.invoice
  })

  const firstInvoice = resolvedInvoices[0]
  const customerId = firstInvoice.customerId
  const subsidiaryId = firstInvoice.subsidiaryId ?? null
  const currencyId = firstInvoice.currencyId ?? null
  const userId = firstInvoice.userId ?? null

  const mixedPostingContext = resolvedInvoices.some(
    (invoice) =>
      invoice.customerId !== customerId ||
      (invoice.subsidiaryId ?? null) !== subsidiaryId ||
      (invoice.currencyId ?? null) !== currencyId ||
      (invoice.userId ?? null) !== userId,
  )

  if (mixedPostingContext) {
    throw new Error('Applied invoices must belong to the same customer and posting context')
  }

  const totalApplied = roundMoney(sumInvoiceReceiptApplications(applications))
  if (totalApplied > receiptAmount + 0.005) {
    throw new Error('Applied invoice amounts cannot exceed the entered receipt amount')
  }
  if (requireFullyApplied && roundMoney(receiptAmount - totalApplied) > 0.005 && !overpaymentHandling) {
    throw new Error('Choose how to handle the overpayment before posting this receipt')
  }

  return {
    firstInvoice,
    customerId,
    subsidiaryId,
    currencyId,
    userId,
    totalApplied,
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
      applications: {
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
      },
    },
  })
  if (!receipt) return
  if (!INVOICE_RECEIPT_POSTING_STATUSES.has(receipt.status.toLowerCase())) return

  const appliedInvoices = receipt.applications.length > 0
    ? receipt.applications.map((application) => application.invoice)
    : receipt.invoice
      ? [receipt.invoice]
      : []
  const firstInvoice = appliedInvoices[0] ?? null

  const amount = Number(receipt.amount)
  if (!Number.isFinite(amount) || amount <= 0 || !firstInvoice) return

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
      subsidiaryId: firstInvoice.subsidiaryId,
      currencyId: firstInvoice.currencyId,
      userId: firstInvoice.userId,
      lineItems: {
        create: [
          {
            displayOrder: 0,
            description: `${receipt.number ?? receipt.id} cash receipt`,
            memo: receipt.reference ?? null,
            debit: amount,
            credit: 0,
            accountId: bankAccountId,
            subsidiaryId: firstInvoice.subsidiaryId,
            customerId: firstInvoice.customerId,
          },
          {
            displayOrder: 1,
            description: `${receipt.number ?? receipt.id} AR application`,
            memo: receipt.reference ?? null,
            debit: 0,
            credit: amount,
            accountId: arAccountId,
            subsidiaryId: firstInvoice.subsidiaryId,
            customerId: firstInvoice.customerId,
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
    userId: firstInvoice.userId,
  })
}

async function unpostInvoiceReceiptJournal(cashReceiptId: string) {
  await prisma.journalEntry.deleteMany({
    where: { sourceType: 'invoice-receipt', sourceId: cashReceiptId },
  })
}

async function syncInvoiceReceiptRefundHandoff(cashReceiptId: string, status: string) {
  const receipt = await prisma.cashReceipt.findUnique({
    where: { id: cashReceiptId },
    include: {
      invoice: {
        select: {
          customerId: true,
          subsidiaryId: true,
          currencyId: true,
          userId: true,
        },
      },
      applications: {
        select: {
          appliedAmount: true,
        },
      },
      customerRefunds: {
        select: {
          id: true,
          number: true,
          amount: true,
          status: true,
          notes: true,
        },
        orderBy: [{ createdAt: 'asc' }],
      },
    },
  })
  if (!receipt?.invoice) return

  const autoDraftRefund =
    receipt.customerRefunds.find(
      (refund) =>
        refund.notes === AUTO_CUSTOMER_REFUND_NOTE && (refund.status ?? '').toLowerCase() === 'draft',
    ) ?? null

  const appliedAmount = roundMoney(
    receipt.applications.reduce((sum, application) => sum + Number(application.appliedAmount), 0),
  )
  const otherCommittedRefundAmount = roundMoney(
    receipt.customerRefunds.reduce((sum, refund) => {
      if (autoDraftRefund && refund.id === autoDraftRefund.id) return sum
      if ((refund.status ?? '').toLowerCase() === 'void') return sum
      return sum + Number(refund.amount)
    }, 0),
  )

  const shouldCreateRefund =
    INVOICE_RECEIPT_POSTING_STATUSES.has(status.toLowerCase()) &&
    (receipt.overpaymentHandling ?? '').toLowerCase() === 'refund_pending'
  const refundAmount = shouldCreateRefund
    ? roundMoney(Number(receipt.amount) - appliedAmount - otherCommittedRefundAmount)
    : 0

  if (refundAmount > 0.005) {
    const refundData = {
      customerId: receipt.invoice.customerId,
      cashReceiptId: receipt.id,
      bankAccountId: receipt.bankAccountId ?? null,
      amount: refundAmount,
      date: receipt.date,
      method: receipt.method,
      reference: receipt.reference || `Auto refund for ${receipt.number ?? receipt.id}`,
      notes: AUTO_CUSTOMER_REFUND_NOTE,
      status: 'draft',
      subsidiaryId: receipt.invoice.subsidiaryId ?? null,
      currencyId: receipt.invoice.currencyId ?? null,
      userId: receipt.invoice.userId ?? null,
    }

    if (autoDraftRefund) {
      await prisma.customerRefund.update({
        where: { id: autoDraftRefund.id },
        data: refundData,
      })
      return
    }

    const number = await generateCustomerRefundNumber()
    await prisma.customerRefund.create({
      data: {
        number,
        ...refundData,
      },
    })
    return
  }

  if (autoDraftRefund) {
    await prisma.customerRefund.delete({
      where: { id: autoDraftRefund.id },
    })
  }
}

async function syncInvoiceReceiptPosting(cashReceiptId: string, status: string) {
  if (INVOICE_RECEIPT_POSTING_STATUSES.has(status.toLowerCase())) {
    await postInvoiceReceiptJournal(cashReceiptId)
  } else {
    await unpostInvoiceReceiptJournal(cashReceiptId)
  }
  await syncInvoiceReceiptRefundHandoff(cashReceiptId, status)
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (id) {
    const row = await prisma.cashReceipt.findUnique({
      where: { id },
      include: {
        bankAccount: true,
        invoice: { include: { customer: true } },
        applications: {
          include: {
            invoice: {
              include: { customer: true },
            },
          },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    })
    return row ? NextResponse.json(row) : NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const rows = await prisma.cashReceipt.findMany({
    include: {
      bankAccount: true,
      invoice: { include: { customer: true } },
      applications: { include: { invoice: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { invoiceId, amount, date, method, reference } = body
    if (!invoiceId || !amount || !date || !method) {
      return NextResponse.json({ error: 'invoiceId, amount, date, method required' }, { status: 400 })
    }

    const statusValues = await loadInvoiceReceiptStatusValues()
    const normalizedStatus = normalizeInvoiceReceiptStatus(body.status, statusValues, 'draft')
    const overpaymentHandling = normalizeOverpaymentHandling(body.overpaymentHandling)
    const applications = normalizeInvoiceReceiptApplications(body.applications)
    const normalizedAmount = parseMoneyValue(amount)
    const hasApplicationsPayload = body.applications !== undefined
    const fallbackApplications =
      hasApplicationsPayload
        ? applications
        : applications.length > 0
          ? applications
          : [{ invoiceId, appliedAmount: normalizedAmount }]

    await validateInvoiceReceiptApplications(
      fallbackApplications,
      normalizedAmount,
      undefined,
      INVOICE_RECEIPT_POSTING_STATUSES.has(normalizedStatus),
      overpaymentHandling,
    )

    const number = await generateInvoiceReceiptNumber()
    const row = await prisma.cashReceipt.create({
      data: {
        number,
        status: normalizedStatus,
        overpaymentHandling,
        invoiceId: fallbackApplications[0]?.invoiceId ?? invoiceId,
        bankAccountId: body.bankAccountId || null,
        amount: normalizedAmount,
        date: new Date(date),
        method,
        reference: reference || null,
        applications: {
          create: fallbackApplications.map((application) => ({
            invoiceId: application.invoiceId,
            appliedAmount: application.appliedAmount,
          })),
        },
      },
    })
    await syncInvoiceReceiptPosting(row.id, normalizedStatus)
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create invoice receipt'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const body = await req.json()
    const statusValues = await loadInvoiceReceiptStatusValues()
    const before = await prisma.cashReceipt.findUnique({
      where: { id },
      include: {
        applications: {
          select: {
            invoiceId: true,
            appliedAmount: true,
          },
        },
      },
    })
    if (!before) return NextResponse.json({ error: 'Invoice receipt not found' }, { status: 404 })

    const applications = normalizeInvoiceReceiptApplications(body.applications)
    const normalizedAmount = body.amount !== undefined ? parseMoneyValue(body.amount) : Number(before.amount)
    const normalizedStatus = normalizeInvoiceReceiptStatus(body.status, statusValues, before.status.toLowerCase())
    const overpaymentHandling =
      body.overpaymentHandling !== undefined
        ? normalizeOverpaymentHandling(body.overpaymentHandling)
        : before.overpaymentHandling ?? null
    const hasApplicationsPayload = body.applications !== undefined
    const fallbackApplications =
      hasApplicationsPayload
        ? applications
        : applications.length > 0
          ? applications
          : before.applications.length > 0
            ? before.applications.map((application) => ({
                invoiceId: application.invoiceId,
                appliedAmount: Number(application.appliedAmount),
              }))
            : [{ invoiceId: body.invoiceId ?? before.invoiceId, appliedAmount: normalizedAmount }]

    await validateInvoiceReceiptApplications(
      fallbackApplications,
      normalizedAmount,
      before.id,
      INVOICE_RECEIPT_POSTING_STATUSES.has(normalizedStatus),
      overpaymentHandling,
    )

    const row = await prisma.cashReceipt.update({
      where: { id },
      data: {
        ...(body.invoiceId !== undefined || applications.length > 0
          ? { invoiceId: fallbackApplications[0]?.invoiceId ?? body.invoiceId ?? before.invoiceId }
          : {}),
        ...(body.bankAccountId !== undefined ? { bankAccountId: body.bankAccountId || null } : {}),
        ...(body.status !== undefined ? { status: normalizedStatus } : {}),
        ...(body.overpaymentHandling !== undefined ? { overpaymentHandling } : {}),
        ...(body.amount !== undefined ? { amount: normalizedAmount } : {}),
        ...(body.date ? { date: new Date(body.date) } : {}),
        ...(body.method !== undefined ? { method: body.method } : {}),
        ...(body.reference !== undefined ? { reference: body.reference || null } : {}),
        ...(body.applications !== undefined
          ? {
              applications: {
                deleteMany: {},
                create: fallbackApplications.map((application) => ({
                  invoiceId: application.invoiceId,
                  appliedAmount: application.appliedAmount,
                })),
              },
            }
          : {}),
      },
    })
    await syncInvoiceReceiptPosting(row.id, normalizedStatus)
    await logActivity({
      entityType: 'invoice-receipt',
      entityId: row.id,
      action: 'update',
      summary: `Updated invoice receipt ${row.number ?? row.id}`,
    })
    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update invoice receipt'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await unpostInvoiceReceiptJournal(id)
  await prisma.cashReceipt.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
