import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateNextPaymentRunId } from '@/lib/banking-number'
import { roundMoney } from '@/lib/bill-payment-applications'

function text(value: unknown) {
  return String(value ?? '').trim()
}

function parseDate(value: unknown) {
  const raw = text(value)
  if (!raw) return new Date()
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

async function billOpenAmount(billId: string) {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: {
      paymentApplications: {
        include: {
          billPayment: { select: { status: true } },
        },
      },
      billPayments: {
        select: {
          amount: true,
          status: true,
          applications: { select: { id: true } },
        },
      },
    },
  })
  if (!bill) return null

  const appliedViaApplications = bill.paymentApplications.reduce((sum, application) => {
    if ((application.billPayment.status ?? '').toLowerCase() === 'cancelled') return sum
    return sum + Number(application.appliedAmount)
  }, 0)
  const appliedViaLegacyPayments = bill.billPayments.reduce((sum, payment) => {
    if ((payment.status ?? '').toLowerCase() === 'cancelled') return sum
    if (payment.applications.length > 0) return sum
    return sum + Number(payment.amount)
  }, 0)

  return {
    bill,
    openAmount: roundMoney(Number(bill.total) - appliedViaApplications - appliedViaLegacyPayments),
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  const include = {
    bankAccount: { include: { glAccount: true } },
    currency: true,
    subsidiary: true,
    lines: {
      include: {
        vendor: true,
        bill: true,
        billPayment: true,
      },
      orderBy: { createdAt: 'asc' as const },
    },
  }

  if (id) {
    const run = await prisma.paymentRun.findUnique({ where: { id }, include })
    return run ? NextResponse.json(run) : NextResponse.json({ error: 'Payment run not found' }, { status: 404 })
  }

  const runs = await prisma.paymentRun.findMany({
    include,
    orderBy: [{ paymentDate: 'desc' }, { paymentRunNumber: 'desc' }],
    take: 200,
  })
  return NextResponse.json(runs)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const billIds: string[] = Array.isArray(body?.billIds)
      ? Array.from(new Set(body.billIds.map((value: unknown) => text(value)).filter(Boolean))) as string[]
      : []
    const paymentDate = parseDate(body?.paymentDate)
    const paymentMethod = text(body?.paymentMethod || 'ach').toLowerCase()
    const bankAccountId = text(body?.bankAccountId)
    const release = body?.release !== false

    if (billIds.length === 0) {
      return NextResponse.json({ error: 'At least one bill is required for a payment run.' }, { status: 400 })
    }
    if (!bankAccountId) {
      return NextResponse.json({ error: 'Bank account is required for a payment run release.' }, { status: 400 })
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      include: { glAccount: true },
    })
    if (!bankAccount) {
      return NextResponse.json({ error: 'Bank account was not found.' }, { status: 400 })
    }

    const contexts = await Promise.all(billIds.map((billId) => billOpenAmount(billId)))
    if (contexts.some((context) => !context)) {
      return NextResponse.json({ error: 'One or more bills could not be found.' }, { status: 400 })
    }
    const openBills = contexts.filter((context): context is NonNullable<typeof context> => Boolean(context && context.openAmount > 0))
    if (openBills.length === 0) {
      return NextResponse.json({ error: 'Selected bills do not have open balances.' }, { status: 400 })
    }

    const firstBill = openBills[0].bill
    const mixedContext = openBills.some(({ bill }) => bill.subsidiaryId !== firstBill.subsidiaryId || bill.currencyId !== firstBill.currencyId)
    if (mixedContext) {
      return NextResponse.json({ error: 'A payment run release must use bills with the same subsidiary and currency.' }, { status: 400 })
    }
    if (bankAccount.subsidiaryId !== firstBill.subsidiaryId || bankAccount.currencyId !== firstBill.currencyId) {
      return NextResponse.json({ error: 'Bank account subsidiary and currency must match the selected bills.' }, { status: 400 })
    }

    const run = await prisma.paymentRun.create({
      data: {
        paymentRunNumber: await generateNextPaymentRunId(),
        status: release ? 'released' : 'draft',
        runDate: new Date(),
        paymentDate,
        dueDateCutoff: body?.dueDateCutoff ? parseDate(body.dueDateCutoff) : null,
        paymentMethod,
        memo: text(body?.memo) || null,
        bankAccountId: bankAccount.id,
        subsidiaryId: firstBill.subsidiaryId,
        currencyId: firstBill.currencyId,
        lines: {
          create: openBills.map(({ bill, openAmount }) => ({
            billId: bill.id,
            vendorId: bill.vendorId,
            amount: openAmount,
            status: release ? 'released' : 'proposed',
          })),
        },
      },
      include: { lines: true },
    })

    if (release) {
      const origin = new URL(request.url).origin
      for (const line of run.lines) {
        const response = await fetch(`${origin}/api/bill-payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorId: line.vendorId,
            billId: line.billId,
            bankAccountId: bankAccount.glAccountId,
            amount: Number(line.amount),
            date: paymentDate.toISOString().slice(0, 10),
            method: paymentMethod,
            status: 'processed',
            notes: `Released from payment run ${run.paymentRunNumber}`,
            applications: [{ billId: line.billId, appliedAmount: Number(line.amount) }],
          }),
        })
        const created = await response.json()
        if (!response.ok) {
          throw new Error(created?.error ?? 'Unable to create bill payment from payment run.')
        }
        await prisma.paymentRunLine.update({
          where: { id: line.id },
          data: { billPaymentId: created.id, status: 'paid' },
        })
      }
    }

    const reloaded = await prisma.paymentRun.findUnique({
      where: { id: run.id },
      include: {
        bankAccount: true,
        currency: true,
        subsidiary: true,
        lines: {
          include: { bill: true, vendor: true, billPayment: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json(reloaded, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create payment run.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
