import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateBillPaymentNumber } from '@/lib/bill-payment-number'
import { generateNextJournalNumber } from '@/lib/journal-number'
import { logActivity, logCommunicationActivity, logFieldChangeActivities } from '@/lib/activity'
import { parseMoneyValue } from '@/lib/money'
import { loadCompanyInformationSettings } from '@/lib/company-information-settings-store'
import {
  normalizeBillPaymentApplications,
  roundMoney,
  sumBillPaymentApplications,
  type BillPaymentApplicationInput,
} from '@/lib/bill-payment-applications'

const BILL_PAYMENT_POSTING_STATUSES = new Set(['processed', 'cleared'])

async function loadBillApplicationContext(
  billIds: string[],
  currentPaymentId?: string,
) {
  const bills = await prisma.bill.findMany({
    where: { id: { in: billIds } },
    include: {
      vendor: true,
      paymentApplications: {
        include: {
          billPayment: {
            select: { id: true, status: true },
          },
        },
      },
      billPayments: {
        select: {
          id: true,
          amount: true,
          status: true,
          applications: { select: { id: true } },
        },
      },
    },
  })

  return new Map(
    bills.map((bill) => {
      const appliedViaApplications = bill.paymentApplications.reduce((sum, application) => {
        if (application.billPaymentId === currentPaymentId) return sum
        if ((application.billPayment.status ?? '').toLowerCase() === 'cancelled') return sum
        return sum + Number(application.appliedAmount)
      }, 0)

      const appliedViaLegacyPayments = bill.billPayments.reduce((sum, payment) => {
        if (payment.id === currentPaymentId) return sum
        if ((payment.status ?? '').toLowerCase() === 'cancelled') return sum
        if (payment.applications.length > 0) return sum
        return sum + Number(payment.amount)
      }, 0)

      return [
        bill.id,
        {
          bill,
          openAmount: roundMoney(Number(bill.total) - appliedViaApplications - appliedViaLegacyPayments),
        },
      ]
    }),
  )
}

async function validateBillPaymentApplications(
  vendorId: string | null | undefined,
  paymentAmount: number,
  applications: BillPaymentApplicationInput[],
  currentPaymentId?: string,
  requireFullyApplied = false,
) {
  if (!vendorId) {
    throw new Error('Vendor is required when applying a bill payment')
  }
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error('Payment amount must be greater than zero')
  }
  if (applications.length === 0) {
    throw new Error('At least one bill application is required')
  }

  const contextByBillId = await loadBillApplicationContext(
    applications.map((application) => application.billId),
    currentPaymentId,
  )

  const resolvedBills = applications.map((application) => {
    const context = contextByBillId.get(application.billId)
    if (!context) {
      throw new Error('One or more selected bills could not be found')
    }
    if (context.bill.vendorId !== vendorId) {
      throw new Error('All selected bills must belong to the chosen vendor')
    }
    if (application.appliedAmount > context.openAmount + 0.005) {
      throw new Error(`Applied amount exceeds open balance for bill ${context.bill.number}`)
    }
    return context.bill
  })

  const firstBill = resolvedBills[0]
  const subsidiaryId = firstBill.subsidiaryId ?? null
  const currencyId = firstBill.currencyId ?? null
  const userId = firstBill.userId ?? null

  const mixedPostingContext = resolvedBills.some(
    (bill) =>
      (bill.subsidiaryId ?? null) !== subsidiaryId
      || (bill.currencyId ?? null) !== currencyId
      || (bill.userId ?? null) !== userId,
  )

  if (mixedPostingContext) {
    throw new Error('Applied bills must share the same posting context')
  }

  const totalApplied = roundMoney(sumBillPaymentApplications(applications))
  if (totalApplied > paymentAmount + 0.005) {
    throw new Error('Applied bill amounts cannot exceed the entered payment amount')
  }
  if (requireFullyApplied && roundMoney(paymentAmount - totalApplied) > 0.005) {
    throw new Error('Posted bill payments must be fully applied before they can post to GL')
  }

  return {
    firstBill,
    subsidiaryId,
    currencyId,
    userId,
    totalApplied,
    unappliedAmount: roundMoney(paymentAmount - totalApplied),
  }
}

async function findBillPaymentPostingAccounts(bankAccountId: string | null | undefined) {
  const companySettings = await loadCompanyInformationSettings()

  const apAccount =
    (companySettings.defaultApAccountId
      ? await prisma.chartOfAccounts.findFirst({
          where: {
            id: companySettings.defaultApAccountId,
            active: true,
            isPosting: true,
            accountType: 'Liability',
          },
          select: { id: true },
        })
      : null)
    ?? await prisma.chartOfAccounts.findFirst({
      where: {
        active: true,
        isPosting: true,
        accountType: 'Liability',
        OR: [
          { name: { contains: 'Accounts Payable', mode: 'insensitive' } },
          { accountId: '2000' },
        ],
      },
      select: { id: true },
    })
    ?? await prisma.chartOfAccounts.findFirst({
      where: {
        active: true,
        isPosting: true,
        accountType: 'Liability',
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
    apAccountId: apAccount?.id ?? null,
    bankAccountId: bankAccount?.id ?? null,
  }
}

async function postBillPaymentJournal(billPaymentId: string) {
  const existingJournal = await prisma.journalEntry.findFirst({
    where: { sourceType: 'bill-payment', sourceId: billPaymentId },
    select: { id: true },
  })
  if (existingJournal) return

  const payment = await prisma.billPayment.findUnique({
    where: { id: billPaymentId },
    include: {
      vendor: true,
      bill: {
        select: {
          id: true,
          number: true,
          vendorId: true,
          userId: true,
          subsidiaryId: true,
          currencyId: true,
        },
      },
      applications: {
        include: {
          bill: {
            select: {
              id: true,
              number: true,
              vendorId: true,
              userId: true,
              subsidiaryId: true,
              currencyId: true,
            },
          },
        },
      },
    },
  })

  if (!payment || !BILL_PAYMENT_POSTING_STATUSES.has(payment.status.toLowerCase())) return

  const appliedBills = payment.applications.length > 0
    ? payment.applications.map((application) => application.bill)
    : payment.bill
      ? [payment.bill]
      : []
  const firstBill = appliedBills[0] ?? null

  const amount = payment.applications.length > 0
    ? roundMoney(payment.applications.reduce((sum, application) => sum + Number(application.appliedAmount), 0))
    : Number(payment.amount)
  if (!Number.isFinite(amount) || amount <= 0) return

  const { apAccountId, bankAccountId } = await findBillPaymentPostingAccounts(payment.bankAccountId)
  if (!apAccountId || !bankAccountId || !firstBill) return

  const journalNumber = await generateNextJournalNumber()

  await prisma.journalEntry.create({
    data: {
      number: journalNumber,
      date: payment.date,
      description: `Bill payment ${payment.number}`,
      journalType: 'standard',
      status: 'approved',
      total: amount,
      sourceType: 'bill-payment',
      sourceId: payment.id,
      subsidiaryId: firstBill.subsidiaryId,
      currencyId: firstBill.currencyId,
      userId: firstBill.userId,
      lineItems: {
        create: [
          {
            displayOrder: 0,
            description: `${payment.number} AP settlement`,
            memo: payment.notes ?? null,
            debit: amount,
            credit: 0,
            accountId: apAccountId,
            subsidiaryId: firstBill.subsidiaryId,
            vendorId: payment.vendorId ?? firstBill.vendorId,
          },
          {
            displayOrder: 1,
            description: `${payment.number} cash disbursement`,
            memo: payment.reference ?? payment.notes ?? null,
            debit: 0,
            credit: amount,
            accountId: bankAccountId,
            subsidiaryId: firstBill.subsidiaryId,
            vendorId: payment.vendorId ?? firstBill.vendorId,
          },
        ],
      },
    },
    })

  await logActivity({
    entityType: 'bill-payment',
    entityId: payment.id,
    action: 'post',
    summary: `Posted bill payment ${payment.number} to GL`,
    userId: firstBill.userId,
  })
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (id) {
    const row = await prisma.billPayment.findUnique({
      where: { id },
      include: {
        vendor: true,
        bankAccount: true,
        bill: { include: { vendor: true } },
        applications: {
          include: {
            bill: {
              include: { vendor: true },
            },
          },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    })
    return row ? NextResponse.json(row) : NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const rows = await prisma.billPayment.findMany({
    include: {
      vendor: true,
      bill: { include: { vendor: true } },
      applications: { include: { bill: true } },
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
        billPaymentId,
        userId,
        to,
        from,
        subject,
        preview,
        attachPdf,
      } = body as {
        billPaymentId?: string
        userId?: string | null
        to?: string
        from?: string
        subject?: string
        preview?: string
        attachPdf?: boolean
      }

      if (!billPaymentId || !to?.trim() || !subject?.trim()) {
        return NextResponse.json({ error: 'Missing required email fields' }, { status: 400 })
      }

      const payment = await prisma.billPayment.findUnique({
        where: { id: billPaymentId },
        select: { id: true },
      })

      if (!payment) {
        return NextResponse.json({ error: 'Bill payment not found' }, { status: 404 })
      }

      await logCommunicationActivity({
        entityType: 'bill-payment',
        entityId: billPaymentId,
        userId: userId ?? null,
        context: 'UI',
        channel: 'Email',
        direction: 'Outbound',
        subject: subject.trim(),
        from: from?.trim() || '-',
        to: to.trim(),
        status: attachPdf ? 'Prepared (PDF)' : 'Prepared',
        preview: preview?.trim() || '',
      })

      return NextResponse.json({ success: true })
    }
    const number = await generateBillPaymentNumber()
    const applications = normalizeBillPaymentApplications(body.applications)
    if (body.amount !== undefined) body.amount = parseMoneyValue(body.amount)
    if (body.date) body.date = new Date(body.date)
    const normalizedStatus = typeof body.status === 'string' ? body.status.toLowerCase() : 'pending'
    const legacyBillId = typeof body.billId === 'string' && body.billId.trim() ? body.billId.trim() : null
    const legacyVendorId = legacyBillId
      ? (
          await prisma.bill.findUnique({
            where: { id: legacyBillId },
            select: { vendorId: true },
          })
        )?.vendorId ?? null
      : null
    const resolvedVendorId = typeof body.vendorId === 'string' && body.vendorId.trim()
      ? body.vendorId.trim()
      : legacyVendorId

    if (applications.length === 0) {
      return NextResponse.json({ error: 'At least one bill application is required' }, { status: 400 })
    }

    await validateBillPaymentApplications(
      resolvedVendorId,
      body.amount ?? 0,
      applications,
      undefined,
      BILL_PAYMENT_POSTING_STATUSES.has(normalizedStatus),
    )

    const row = await prisma.billPayment.create({
      data: {
        number,
        date: body.date,
        method: body.method ?? null,
        reference: body.reference ?? null,
        status: body.status ?? 'pending',
        notes: body.notes ?? null,
        bankAccountId: body.bankAccountId ?? null,
        vendorId: resolvedVendorId,
        billId: applications[0]?.billId ?? legacyBillId,
        amount: body.amount ?? 0,
        applications: {
          create: applications.map((application) => ({
            billId: application.billId,
            appliedAmount: application.appliedAmount,
          })),
        },
      },
    })
    if (BILL_PAYMENT_POSTING_STATUSES.has((row.status ?? '').toLowerCase())) {
      await postBillPaymentJournal(row.id)
    }
    await logActivity({
      entityType: 'bill-payment',
      entityId: row.id,
      action: 'create',
      summary: `Created bill payment ${row.number}`,
    })
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create bill payment'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const body = await req.json()
    const before = await prisma.billPayment.findUnique({
      where: { id },
      include: {
        applications: {
          select: {
            billId: true,
            appliedAmount: true,
          },
        },
      },
    })
    if (!before) return NextResponse.json({ error: 'Bill payment not found' }, { status: 404 })
    const applications = normalizeBillPaymentApplications(body.applications)
    if (body.amount !== undefined) body.amount = parseMoneyValue(body.amount)
    if (body.date) body.date = new Date(body.date)
    const normalizedStatus = typeof body.status === 'string' ? body.status.toLowerCase() : before.status.toLowerCase()
    const resolvedVendorId = typeof body.vendorId === 'string' && body.vendorId.trim()
      ? body.vendorId.trim()
      : before.vendorId

    if (body.applications !== undefined && applications.length === 0) {
      return NextResponse.json({ error: 'At least one bill application is required' }, { status: 400 })
    }

    await validateBillPaymentApplications(
      resolvedVendorId,
      body.amount ?? Number(before.amount),
      applications.length > 0
        ? applications
        : before.applications.length > 0
          ? before.applications.map((application) => ({
              billId: application.billId,
              appliedAmount: Number(application.appliedAmount),
            }))
          : before.billId
            ? [{ billId: before.billId, appliedAmount: Number(before.amount) }]
            : [],
      before.id,
      BILL_PAYMENT_POSTING_STATUSES.has(normalizedStatus),
    )

    const row = await prisma.billPayment.update({
      where: { id },
      data: {
        ...(body.date !== undefined ? { date: body.date } : {}),
        ...(body.method !== undefined ? { method: body.method ?? null } : {}),
        ...(body.reference !== undefined ? { reference: body.reference ?? null } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
        ...(body.bankAccountId !== undefined ? { bankAccountId: body.bankAccountId ?? null } : {}),
        ...(body.vendorId !== undefined ? { vendorId: body.vendorId ?? null } : {}),
        ...(body.billId !== undefined || applications.length > 0
          ? { billId: applications[0]?.billId ?? (typeof body.billId === 'string' && body.billId.trim() ? body.billId.trim() : null) }
          : {}),
        ...(body.amount !== undefined ? { amount: body.amount } : {}),
        ...(body.applications !== undefined
          ? {
              applications: {
                deleteMany: {},
                create: applications.map((application) => ({
                  billId: application.billId,
                  appliedAmount: application.appliedAmount,
                })),
              },
            }
        : {}),
      },
    })

    const changes = [
      body.vendorId !== undefined && (before.vendorId ?? '') !== (row.vendorId ?? '')
        ? { fieldName: 'Vendor', oldValue: before.vendorId ?? '-', newValue: row.vendorId ?? '-' }
        : null,
      body.billId !== undefined && before.billId !== row.billId
        ? { fieldName: 'Bill', oldValue: before.billId, newValue: row.billId }
        : null,
      body.amount !== undefined && String(before.amount) !== String(row.amount)
        ? { fieldName: 'Amount', oldValue: String(before.amount), newValue: String(row.amount) }
        : null,
      body.date !== undefined && before.date.toISOString() !== row.date.toISOString()
        ? { fieldName: 'Date', oldValue: before.date.toISOString().slice(0, 10), newValue: row.date.toISOString().slice(0, 10) }
        : null,
      body.method !== undefined && (before.method ?? '') !== (row.method ?? '')
        ? { fieldName: 'Method', oldValue: before.method ?? '-', newValue: row.method ?? '-' }
        : null,
      body.bankAccountId !== undefined && (before.bankAccountId ?? '') !== (row.bankAccountId ?? '')
        ? { fieldName: 'Bank Account', oldValue: before.bankAccountId ?? '-', newValue: row.bankAccountId ?? '-' }
        : null,
      body.reference !== undefined && (before.reference ?? '') !== (row.reference ?? '')
        ? { fieldName: 'Reference', oldValue: before.reference ?? '-', newValue: row.reference ?? '-' }
        : null,
      body.status !== undefined && before.status !== row.status
        ? { fieldName: 'Status', oldValue: before.status, newValue: row.status }
        : null,
      body.notes !== undefined && (before.notes ?? '') !== (row.notes ?? '')
        ? { fieldName: 'Notes', oldValue: before.notes ?? '-', newValue: row.notes ?? '-' }
        : null,
    ].filter((change): change is { fieldName: string; oldValue: string; newValue: string } => Boolean(change))

    await logFieldChangeActivities({
      entityType: 'bill-payment',
      entityId: row.id,
      context: 'Bill Payment Details',
      changes,
    })
    await logActivity({
      entityType: 'bill-payment',
      entityId: row.id,
      action: 'update',
      summary: `Updated bill payment ${row.number}`,
    })
    if (BILL_PAYMENT_POSTING_STATUSES.has((row.status ?? '').toLowerCase())) {
      await postBillPaymentJournal(row.id)
    }
    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update bill payment'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const existing = await prisma.billPayment.findUnique({
      where: { id },
      select: { id: true, number: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Bill payment not found' }, { status: 404 })
    }

    const row = await prisma.billPayment.delete({ where: { id } })
    await logActivity({
      entityType: 'bill-payment',
      entityId: row.id,
      action: 'delete',
      summary: `Deleted bill payment ${row.number}`,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'Transaction has the following child records:\n\nUnable to delete because dependent records exist.' },
      { status: 409 },
    )
  }
}
