import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateNextBankReconciliationId } from '@/lib/banking-number'
import { buildBankReconciliationSummary } from '@/lib/bank-reconciliation-summary'

function text(value: unknown) {
  return String(value ?? '').trim()
}

function parseDate(value: unknown) {
  const date = new Date(text(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function parseOptionalAmount(value: unknown) {
  const normalized = text(value).replace(/,/g, '')
  if (!normalized) return null
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}

function endOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999)
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999)
}

function startOfPreviousMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() - 1, 1)
}

function endOfPreviousMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 0, 23, 59, 59, 999)
}

async function validateReconciliationSequence(bankAccountId: string, glAccountId: string, periodEndDate: Date) {
  const periodStart = startOfMonth(periodEndDate)
  const previousMonthStart = startOfPreviousMonth(periodEndDate)
  const previousMonthEnd = endOfPreviousMonth(periodEndDate)

  const [historicalBankActivity, historicalGlActivity] = await Promise.all([
    prisma.bankFeedTransaction.findFirst({
      where: {
        bankAccountId,
        transactionDate: { lt: periodStart },
      },
      orderBy: { transactionDate: 'asc' },
      select: { transactionDate: true },
    }),
    prisma.journalEntryLineItem.findFirst({
      where: {
        accountId: glAccountId,
        journalEntry: {
          date: { lt: periodStart },
          status: { in: ['approved', 'posted'] },
        },
      },
      orderBy: { journalEntry: { date: 'asc' } },
      select: { journalEntry: { select: { date: true } } },
    }),
  ])

  if (!historicalBankActivity && !historicalGlActivity) return null

  const priorMonthReconciliation = await prisma.bankReconciliation.findFirst({
    where: {
      bankAccountId,
      periodEndDate: { gte: previousMonthStart, lte: previousMonthEnd },
      status: 'reconciled',
    },
    select: { reconciliationId: true },
  })

  if (priorMonthReconciliation) return null

  const earliestHistoricalDate = [
    historicalBankActivity?.transactionDate,
    historicalGlActivity?.journalEntry.date,
  ]
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => a.getTime() - b.getTime())[0]

  return `Cannot create this reconciliation yet. ${earliestHistoricalDate?.toLocaleDateString('en-US') ?? 'Prior'} activity exists before this period, so the prior month must be reconciled first.`
}

export async function GET() {
  const data = await prisma.bankReconciliation.findMany({
    include: { bankAccount: { include: { glAccount: true, currency: true } }, subsidiary: true },
    orderBy: [{ periodEndDate: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const bankAccountId = text(body?.bankAccountId)
    const bankAccount = bankAccountId
      ? await prisma.bankAccount.findUnique({ where: { id: bankAccountId }, include: { subsidiary: true } })
      : null
    const periodEndDate = parseDate(body?.periodEndDate)
    const autoCalculate = body?.autoCalculate !== false
    const enteredStatementBalance = parseOptionalAmount(body?.bankStatementBalance)
    if (!bankAccount || !periodEndDate) {
      return NextResponse.json({ error: 'Bank account and period end date are required.' }, { status: 400 })
    }

    const existingSamePeriod = await prisma.bankReconciliation.findFirst({
      where: {
        bankAccountId,
        periodEndDate: { gte: startOfMonth(periodEndDate), lte: endOfMonth(periodEndDate) },
      },
      select: { id: true, reconciliationId: true },
    })
    if (existingSamePeriod) {
      return NextResponse.json(
        {
          error: `A reconciliation already exists for this account and period: ${existingSamePeriod.reconciliationId}. Open that workpaper instead.`,
          reconciliationId: existingSamePeriod.reconciliationId,
          id: existingSamePeriod.id,
        },
        { status: 400 },
      )
    }

    const existingOpenReconciliation = await prisma.bankReconciliation.findFirst({
      where: {
        bankAccountId,
        status: 'open',
      },
      orderBy: [{ periodEndDate: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, reconciliationId: true, periodEndDate: true },
    })
    if (existingOpenReconciliation) {
      return NextResponse.json(
        {
          error: `Close or delete open reconciliation ${existingOpenReconciliation.reconciliationId} before creating another workpaper for this bank account.`,
          reconciliationId: existingOpenReconciliation.reconciliationId,
          id: existingOpenReconciliation.id,
        },
        { status: 400 },
      )
    }

    const sequenceError = await validateReconciliationSequence(bankAccountId, bankAccount.glAccountId, periodEndDate)
    if (sequenceError) {
      return NextResponse.json({ error: sequenceError }, { status: 400 })
    }

    const summary = autoCalculate
      ? await buildBankReconciliationSummary(bankAccountId, periodEndDate)
      : null
    const bankStatementBalance = enteredStatementBalance ?? summary?.bankStatementBalance ?? 0
    const glBalance = summary?.glBalance ?? Number(body?.glBalance ?? 0)
    const statementBalanceSource = enteredStatementBalance != null
      ? 'entered statement balance'
      : summary?.statementBalanceSource === 'statement'
        ? 'bank statement'
        : 'bank activity estimate'

    const created = await prisma.$transaction(async (tx) => {
      if (enteredStatementBalance != null) {
        const existingStatement = await tx.bankStatement.findFirst({
          where: {
            bankAccountId,
            periodEndDate: { gte: startOfMonth(periodEndDate), lte: endOfDay(periodEndDate) },
          },
          orderBy: { createdAt: 'desc' },
        })
        const statementData = {
          statementDate: periodEndDate,
          periodStartDate: startOfMonth(periodEndDate),
          periodEndDate,
          openingBalance: summary?.bankOpeningBalance ?? 0,
          closingBalance: enteredStatementBalance,
          source: 'manual_entry',
        }
        if (existingStatement) {
          await tx.bankStatement.update({
            where: { id: existingStatement.id },
            data: statementData,
          })
        } else {
          await tx.bankStatement.create({
            data: {
              statementId: `STMT-${Date.now()}`,
              bankAccountId,
              ...statementData,
              status: 'imported',
            },
          })
        }
      }

      return tx.bankReconciliation.create({
        data: {
          reconciliationId: text(body?.reconciliationId) || await generateNextBankReconciliationId(),
          bankAccountId,
          subsidiaryId: bankAccount.subsidiaryId,
          periodEndDate,
          bankStatementBalance,
          glBalance,
          difference: bankStatementBalance - glBalance,
          status: text(body?.status || 'open'),
          aiReviewStatus: text(body?.aiReviewStatus || (summary?.unmatchedCount ? 'needs_review' : 'ready_for_review')),
          reviewerNotes: text(body?.reviewerNotes)
            || (summary
              ? `Auto-calculated from ${statementBalanceSource}; ${summary.unmatchedCount} unmatched/suggested bank lines through period end.`
              : null),
        },
      })
    })
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unable to create bank reconciliation.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const id = text(body?.id)
    const reconciliationId = text(body?.reconciliationId)
    const existing = id
      ? await prisma.bankReconciliation.findUnique({ where: { id }, include: { bankAccount: true } })
      : reconciliationId
        ? await prisma.bankReconciliation.findUnique({ where: { reconciliationId }, include: { bankAccount: true } })
        : null

    if (!existing) {
      return NextResponse.json({ error: 'Bank reconciliation not found.' }, { status: 404 })
    }

    const hasStatementBalance = body?.bankStatementBalance !== undefined
    const enteredStatementBalance = parseOptionalAmount(body?.bankStatementBalance)
    const summary = body?.autoCalculate
      ? await buildBankReconciliationSummary(existing.bankAccountId, existing.periodEndDate)
      : null
    const bankStatementBalance = hasStatementBalance
      ? enteredStatementBalance ?? 0
      : Number(existing.bankStatementBalance)
    const glBalance = summary?.glBalance ?? Number(existing.glBalance)
    const difference = bankStatementBalance - glBalance
    const requestedStatus = text(body?.status)

    if (requestedStatus === 'reconciled' && summary?.unmatchedCount) {
      return NextResponse.json(
        { error: 'All bank lines through the period must be matched before the reconciliation can be closed.' },
        { status: 400 },
      )
    }

    if (requestedStatus === 'reconciled' && Math.abs(difference) >= 0.01) {
      return NextResponse.json(
        { error: 'Difference must be zero before the reconciliation can be closed.' },
        { status: 400 },
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (hasStatementBalance && enteredStatementBalance != null) {
        const existingStatement = await tx.bankStatement.findFirst({
          where: {
            bankAccountId: existing.bankAccountId,
            periodEndDate: { gte: startOfMonth(existing.periodEndDate), lte: endOfDay(existing.periodEndDate) },
          },
          orderBy: { createdAt: 'desc' },
        })
        const statementData = {
          statementDate: existing.periodEndDate,
          periodStartDate: startOfMonth(existing.periodEndDate),
          periodEndDate: existing.periodEndDate,
          openingBalance: summary?.bankOpeningBalance ?? 0,
          closingBalance: enteredStatementBalance,
          source: 'manual_entry',
        }
        if (existingStatement) {
          await tx.bankStatement.update({ where: { id: existingStatement.id }, data: statementData })
        } else {
          await tx.bankStatement.create({
            data: {
              statementId: `STMT-${Date.now()}`,
              bankAccountId: existing.bankAccountId,
              ...statementData,
              status: 'imported',
            },
          })
        }
      }

      return tx.bankReconciliation.update({
        where: { id: existing.id },
        data: {
          bankStatementBalance,
          glBalance,
          difference,
          status: requestedStatus || existing.status,
          aiReviewStatus: text(body?.aiReviewStatus)
            || (Math.abs(difference) < 0.01 ? 'ready_for_review' : 'needs_review'),
          reviewerNotes: text(body?.reviewerNotes)
            || (summary
              ? `Recalculated from bank activity; ${summary.unmatchedCount} unmatched/suggested bank lines through period end.`
              : existing.reviewerNotes),
        },
      })
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unable to update bank reconciliation.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const id = text(body?.id)
    const reconciliationId = text(body?.reconciliationId)
    const existing = id
      ? await prisma.bankReconciliation.findUnique({ where: { id } })
      : reconciliationId
        ? await prisma.bankReconciliation.findUnique({ where: { reconciliationId } })
        : null

    if (!existing) {
      return NextResponse.json({ error: 'Bank reconciliation not found.' }, { status: 404 })
    }

    await prisma.bankReconciliation.delete({ where: { id: existing.id } })
    return NextResponse.json({ deleted: true, reconciliationId: existing.reconciliationId })
  } catch {
    return NextResponse.json({ error: 'Unable to delete bank reconciliation.' }, { status: 500 })
  }
}
