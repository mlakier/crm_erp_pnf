import { prisma } from '@/lib/prisma'

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function endOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999)
}

function asNumber(value: unknown) {
  return Number(value ?? 0)
}

function signedLineAmount(line: { debit: unknown; credit: unknown }) {
  return asNumber(line.debit) - asNumber(line.credit)
}

export async function buildBankReconciliationSummary(bankAccountId: string, periodEndDate: Date) {
  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
    include: { currency: true, glAccount: true, subsidiary: true },
  })
  if (!bankAccount) throw new Error('Bank account not found.')

  const periodStartDate = startOfMonth(periodEndDate)
  const periodEnd = endOfDay(periodEndDate)

  const [statement, periodTransactions, priorTransactions, unmatchedTransactions, periodJournalLines, priorJournalLines] = await Promise.all([
    prisma.bankStatement.findFirst({
      where: {
        bankAccountId,
        periodEndDate: { lte: periodEnd },
      },
      orderBy: { periodEndDate: 'desc' },
    }),
    prisma.bankFeedTransaction.findMany({
      where: {
        bankAccountId,
        transactionDate: { gte: periodStartDate, lte: periodEnd },
      },
      select: {
        id: true,
        bankTransactionId: true,
        amount: true,
        status: true,
        transactionDate: true,
        postedDate: true,
        description: true,
        counterparty: true,
        matchedRecordType: true,
        matchedRecordId: true,
      },
      orderBy: { transactionDate: 'asc' },
    }),
    prisma.bankFeedTransaction.findMany({
      where: {
        bankAccountId,
        transactionDate: { lt: periodStartDate },
      },
      select: {
        amount: true,
      },
    }),
    prisma.bankFeedTransaction.findMany({
      where: {
        bankAccountId,
        transactionDate: { lte: periodEnd },
        status: { in: ['unmatched', 'suggested'] },
      },
      select: {
        id: true,
        bankTransactionId: true,
        transactionDate: true,
        amount: true,
        status: true,
        description: true,
      },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      take: 25,
    }),
    prisma.journalEntryLineItem.findMany({
      where: {
        accountId: bankAccount.glAccountId,
        journalEntry: {
          date: { gte: periodStartDate, lte: periodEnd },
          status: { in: ['approved', 'posted'] },
        },
      },
      select: {
        id: true,
        displayOrder: true,
        description: true,
        debit: true,
        credit: true,
        journalEntry: {
          select: {
            id: true,
            number: true,
            date: true,
            status: true,
            sourceType: true,
            sourceId: true,
          },
        },
      },
      orderBy: [{ journalEntry: { date: 'asc' } }, { displayOrder: 'asc' }],
    }),
    prisma.journalEntryLineItem.findMany({
      where: {
        accountId: bankAccount.glAccountId,
        journalEntry: {
          date: { lt: periodStartDate },
          status: { in: ['approved', 'posted'] },
        },
      },
      select: {
        debit: true,
        credit: true,
      },
    }),
  ])

  const periodActivityAmount = periodTransactions.reduce((sum, transaction) => sum + asNumber(transaction.amount), 0)
  const priorBankActivityAmount = priorTransactions.reduce((sum, transaction) => sum + asNumber(transaction.amount), 0)
  const matchedCount = periodTransactions.filter((transaction) => transaction.status === 'matched').length
  const unmatchedCount = periodTransactions.filter((transaction) => transaction.status === 'unmatched' || transaction.status === 'suggested').length
  const glActivityAmount = periodJournalLines.reduce((sum, line) => sum + signedLineAmount(line), 0)
  const glOpeningBalance = priorJournalLines.reduce((sum, line) => sum + signedLineAmount(line), 0)
  const bankOpeningBalance = statement ? asNumber(statement.openingBalance) : priorBankActivityAmount
  const bankStatementBalance = statement ? asNumber(statement.closingBalance) : bankOpeningBalance + periodActivityAmount
  const glBalance = glOpeningBalance + glActivityAmount

  return {
    bankAccount,
    periodStartDate,
    periodEndDate,
    statementId: statement?.id ?? null,
    statementBalanceSource: statement ? 'statement' : 'activity_estimate',
    bankOpeningBalance,
    bankStatementBalance,
    bankActivityAmount: periodActivityAmount,
    glOpeningBalance,
    glActivityAmount,
    glBalance,
    difference: bankStatementBalance - glBalance,
    periodActivityAmount,
    periodTransactionCount: periodTransactions.length,
    matchedCount,
    unmatchedCount,
    unmatchedTransactions,
    bankActivityLines: periodTransactions,
    glActivityLines: periodJournalLines,
  }
}
