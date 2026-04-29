import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createFieldChangeSummary, logActivity, logCommunicationActivity } from '@/lib/activity'
import { generateNextBillNumber } from '@/lib/bill-number'
import { calcLineTotal, parseMoneyValue, sumMoney } from '@/lib/money'
import { resolveVendorTransactionSnapshot } from '@/lib/transaction-snapshot-defaults'
import { generateNextJournalNumber } from '@/lib/journal-number'
import { loadCompanyInformationSettings } from '@/lib/company-information-settings-store'

const INCLUDE = {
  vendor: true,
  purchaseOrder: true,
  subsidiary: true,
  currency: true,
  lineItems: {
    include: { item: true },
    orderBy: [{ createdAt: 'asc' }],
  },
} satisfies Prisma.BillInclude

async function findBillPostingAccounts(lineItemIds: string[]) {
  const companySettings = await loadCompanyInformationSettings()
  const items = lineItemIds.length
    ? await prisma.item.findMany({
        where: { id: { in: lineItemIds } },
        select: { id: true, cogsExpenseAccountId: true },
      })
    : []

  const expenseAccountIds = Array.from(
    new Set(items.map((item) => item.cogsExpenseAccountId).filter(Boolean)),
  ) as string[]

  let apAccount = companySettings.defaultApAccountId
    ? await prisma.chartOfAccounts.findFirst({
        where: {
          id: companySettings.defaultApAccountId,
          active: true,
          isPosting: true,
        },
        select: { id: true },
      })
    : null

  if (!apAccount) {
    apAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        active: true,
        isPosting: true,
        accountType: { contains: 'liability', mode: 'insensitive' },
        OR: [
          { name: { contains: 'accounts payable', mode: 'insensitive' } },
          { name: { contains: 'a/p', mode: 'insensitive' } },
          { accountId: { contains: 'accounts payable', mode: 'insensitive' } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  if (!apAccount) {
    apAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        active: true,
        isPosting: true,
        accountType: { contains: 'liability', mode: 'insensitive' },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  return {
    apAccountId: apAccount?.id ?? null,
    expenseAccountIds,
  }
}

async function postBillApprovalJournal(billId: string) {
  const existingJournal = await prisma.journalEntry.findFirst({
    where: { sourceId: billId },
    select: { id: true },
  })
  if (existingJournal) return

  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: INCLUDE,
  })
  if (!bill) return

  const { apAccountId, expenseAccountIds } = await findBillPostingAccounts(
    bill.lineItems.map((line) => line.itemId).filter(Boolean) as string[],
  )

  if (!apAccountId || expenseAccountIds.length === 0) return

  const fallbackExpenseAccountId = expenseAccountIds[0]
  const totalDebit = sumMoney(
    bill.lineItems.map((line) => {
      const quantity = Number(line.quantity ?? 0)
      const unitPrice = Number(line.unitPrice ?? 0)
      return calcLineTotal(quantity, unitPrice)
    }),
  )

  if (totalDebit <= 0) return

  const lineCreates = bill.lineItems.map((line, index) => ({
    displayOrder: index,
    description: line.description || bill.number,
    memo: line.notes ?? null,
    debit: calcLineTotal(Number(line.quantity ?? 0), Number(line.unitPrice ?? 0)),
    credit: 0,
    accountId: line.item?.cogsExpenseAccountId ?? fallbackExpenseAccountId,
    subsidiaryId: bill.subsidiaryId,
    vendorId: bill.vendorId,
    itemId: line.itemId,
  }))

  lineCreates.push({
    displayOrder: lineCreates.length,
    description: `${bill.number} accounts payable`,
    memo: bill.notes ?? null,
    debit: 0,
    credit: totalDebit,
    accountId: apAccountId,
    subsidiaryId: bill.subsidiaryId,
    vendorId: bill.vendorId,
    itemId: null,
  })

  const journalNumber = await generateNextJournalNumber()

  await prisma.journalEntry.create({
    data: {
      number: journalNumber,
      date: bill.date,
      description: `Bill posting for ${bill.number}`,
      journalType: 'standard',
      status: 'approved',
      total: totalDebit,
      sourceType: 'bill',
      sourceId: bill.id,
      subsidiaryId: bill.subsidiaryId,
      currencyId: bill.currencyId,
      userId: bill.userId,
      lineItems: {
        create: lineCreates,
      },
    },
  })

  await logActivity({
    entityType: 'bill',
    entityId: bill.id,
    action: 'post',
    summary: `Posted bill ${bill.number} to GL`,
    userId: bill.userId,
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const bill = await prisma.bill.findUnique({
        where: { id },
        include: INCLUDE,
      })

      if (!bill) {
        return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
      }

      return NextResponse.json(bill)
    }

    const bills = await prisma.bill.findMany({
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(bills)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const body = await request.json()
    if (searchParams.get('action') === 'send-email') {
      const {
        billId,
        userId,
        to,
        from,
        subject,
        preview,
        attachPdf,
      } = body as {
        billId?: string
        userId?: string | null
        to?: string
        from?: string
        subject?: string
        preview?: string
        attachPdf?: boolean
      }

      if (!billId || !to?.trim() || !subject?.trim()) {
        return NextResponse.json({ error: 'Missing required email fields' }, { status: 400 })
      }

      const bill = await prisma.bill.findUnique({ where: { id: billId }, select: { id: true } })
      if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

      await logCommunicationActivity({
        entityType: 'bill',
        entityId: billId,
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

    const { vendorId, purchaseOrderId, total, date, dueDate, status, notes, subsidiaryId, currencyId, userId, lineItems } = body

    if (!vendorId || total === undefined || !date) {
      return NextResponse.json({ error: 'vendorId, total, and bill date are required' }, { status: 400 })
    }

    const number = await generateNextBillNumber()
    const nextStatus = status || 'received'
    const snapshot = await resolveVendorTransactionSnapshot(vendorId, {
      subsidiaryId,
      currencyId,
    })

    const normalizedLineItems = Array.isArray(lineItems)
      ? lineItems
          .map((line: {
            itemId?: string | null
            description?: string | null
            quantity?: number
            unitPrice?: number
            notes?: string | null
            displayOrder?: number
          }) => {
            const quantity = Math.max(1, Number(line.quantity) || 1)
            const unitPrice = Math.max(0, Number(line.unitPrice) || 0)
            const nextDescription = line.description?.trim() || ''
            return {
              itemId: line.itemId || null,
              description: nextDescription,
              quantity,
              unitPrice,
              lineTotal: calcLineTotal(quantity, unitPrice),
              notes: line.notes?.trim() || null,
            }
          })
          .filter((line: { itemId: string | null; description: string }) => line.itemId || line.description)
      : []

    const computedTotal = normalizedLineItems.length
      ? sumMoney(normalizedLineItems.map((line: { lineTotal: number }) => line.lineTotal))
      : parseMoneyValue(total)

    const bill = await prisma.bill.create({
      data: {
        number,
        vendorId,
        purchaseOrderId: purchaseOrderId || null,
        total: computedTotal,
        date: new Date(date),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: nextStatus,
        notes: notes || null,
        subsidiaryId: snapshot.subsidiaryId,
        currencyId: snapshot.currencyId,
        userId: userId || null,
        lineItems: normalizedLineItems.length
          ? {
              create: normalizedLineItems.map((line: {
                itemId: string | null
                description: string
                quantity: number
                unitPrice: number
                lineTotal: number
                notes: string | null
              }) => ({
                itemId: line.itemId,
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.lineTotal,
                notes: line.notes,
              })),
            }
          : undefined,
      },
      include: INCLUDE,
    })

    await logActivity({
      entityType: 'bill',
      entityId: bill.id,
      action: 'create',
      summary: `Created bill ${bill.number}`,
    })

    return NextResponse.json(bill, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing bill id' }, { status: 400 })
    }

    const body = await request.json()
    const { vendorId, purchaseOrderId, total, date, dueDate, status, notes, subsidiaryId, currencyId } = body

    const before = await prisma.bill.findUnique({ where: { id } })
    if (!before) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    if (vendorId !== undefined && !String(vendorId ?? '').trim()) {
      return NextResponse.json({ error: 'vendorId cannot be empty' }, { status: 400 })
    }

    if (date !== undefined && !String(date ?? '').trim()) {
      return NextResponse.json({ error: 'date cannot be empty' }, { status: 400 })
    }

    const bill = await prisma.bill.update({
      where: { id },
      data: {
        ...(vendorId !== undefined ? { vendorId: String(vendorId).trim() } : {}),
        ...(purchaseOrderId !== undefined ? { purchaseOrderId: purchaseOrderId ? String(purchaseOrderId).trim() : null } : {}),
        ...(total !== undefined ? { total: parseMoneyValue(total) } : {}),
        ...(date !== undefined ? { date: new Date(String(date)) } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(status !== undefined ? { status: status || 'received' } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
        ...(subsidiaryId !== undefined ? { subsidiaryId: subsidiaryId || null } : {}),
        ...(currencyId !== undefined ? { currencyId: currencyId || null } : {}),
      },
      include: INCLUDE,
    })

    if (before.status !== 'approved' && bill.status === 'approved') {
      await postBillApprovalJournal(bill.id)
    }

    await logActivity({
      entityType: 'bill',
      entityId: bill.id,
      action: 'update',
      summary: `Updated bill ${bill.number}`,
    })

    const changes = [
      ['Vendor', before.vendorId ?? '', bill.vendorId ?? ''],
      ['Purchase Order', before.purchaseOrderId ?? '', bill.purchaseOrderId ?? ''],
      ['Total', String(before.total ?? ''), String(bill.total ?? '')],
      ['Bill Date', before.date ? before.date.toISOString().slice(0, 10) : '', bill.date ? bill.date.toISOString().slice(0, 10) : ''],
      ['Due Date', before.dueDate ? before.dueDate.toISOString().slice(0, 10) : '', bill.dueDate ? bill.dueDate.toISOString().slice(0, 10) : ''],
      ['Status', before.status ?? '', bill.status ?? ''],
      ['Notes', before.notes ?? '', bill.notes ?? ''],
      ['Subsidiary', before.subsidiaryId ?? '', bill.subsidiaryId ?? ''],
      ['Currency', before.currencyId ?? '', bill.currencyId ?? ''],
    ]
      .filter(([, oldValue, newValue]) => oldValue !== newValue)
      .map(([fieldName, oldValue, newValue]) => ({
        entityType: 'bill',
        entityId: bill.id,
        action: 'update',
        summary: createFieldChangeSummary({
          context: 'Header',
          fieldName,
          oldValue,
          newValue,
        }),
        userId: bill.userId,
      }))

    if (changes.length) {
      await prisma.activity.createMany({ data: changes })
    }

    return NextResponse.json(bill)
  } catch {
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing bill id' }, { status: 400 })
    }

    const existing = await prisma.bill.findUnique({ where: { id } })
    await prisma.bill.delete({ where: { id } })

    await logActivity({
      entityType: 'bill',
      entityId: id,
      action: 'delete',
      summary: `Deleted bill ${existing?.number ?? id}`,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 })
  }
}
