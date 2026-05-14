import { prisma } from '@/lib/prisma'
import BankMatchingWorkbenchClient, { type BankMatchCandidate, type BankMatchTransaction } from '@/components/BankMatchingWorkbenchClient'
import { isBankFeeTransaction, suggestBankMatch, type BankMatchSuggestionCandidate } from '@/lib/bank-match-suggestions'
import { loadCompanySetupSettings } from '@/lib/company-setup-settings-store'

export const dynamic = 'force-dynamic'

function amountText(amount: unknown, currencyCode: string) {
  return `${currencyCode} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString('en-US') : '-'
}

function isoDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

function buildAliases(...values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => {
          const text = String(value ?? '').trim()
          if (!text) return []
          const compact = text.replace(/[^a-zA-Z0-9]/g, '')
          const withoutSuffix = text.replace(/\b(inc|inc\.|corp|corporation|ltd|limited|llc|gmbh|s\.l\.|sl)\b/gi, '').trim()
          return [text, compact, withoutSuffix].filter(Boolean)
        }),
    ),
  )
}

function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function compactSearch(value: string) {
  return normalizeSearch(value).replace(/\s/g, '')
}

function digitTokens(value: string) {
  return Array.from(new Set(String(value).match(/\d{3,}/g) ?? []))
}

function matchesKeywordRule(text: string, keywords: string) {
  const normalizedText = normalizeSearch(text)
  return keywords
    .split(',')
    .map((entry) => normalizeSearch(entry))
    .filter(Boolean)
    .some((keyword) => normalizedText.includes(keyword))
}

function isTransferText(text: string) {
  const normalizedText = normalizeSearch(text)
  return ['bank transfer', 'book transfer', 'account transfer', 'transfer', 'xfer', 'wire transfer', 'internal transfer']
    .some((phrase) => normalizedText.includes(normalizeSearch(phrase)))
}

function includesAnyPhrase(text: string, phrases: string[]) {
  const normalizedText = normalizeSearch(text)
  return phrases.some((phrase) => normalizedText.includes(normalizeSearch(phrase)))
}

function bankActivityReason(input: {
  amount: number
  text: string
  bankFee: boolean
  settings: Awaited<ReturnType<typeof loadCompanySetupSettings>>
}) {
  if (isTransferText(input.text)) return 'bank transfer | select the other bank account'
  if (input.amount > 0 && includesAnyPhrase(input.text, ['deposit', 'remote deposit', 'lockbox', 'cash deposit', 'check deposit', 'branch deposit'])) {
    return 'bank deposit | post deposit or match to an existing receipt/deposit'
  }
  if (matchesKeywordRule(input.text, input.settings.merchantFeeKeywords)) return 'merchant fee | code to merchant fee expense'
  if (input.bankFee) return 'bank fee | code to selected GL account'
  if (input.amount > 0 && matchesKeywordRule(input.text, input.settings.interestIncomeKeywords)) return 'interest income | code to configured interest income account'
  if (input.amount > 0 && matchesKeywordRule(input.text, input.settings.miscBankIncomeKeywords)) return 'misc deposit | code to configured misc income account'
  if (input.amount < 0 && includesAnyPhrase(input.text, ['check', 'cheque', 'chk', 'check paid', 'paid check'])) {
    return 'manual check | match to an issued check or payment'
  }
  return ''
}

type TransferBankAccountHint = {
  id: string
  glAccountId: string
  name: string
  bankName: string
  maskedAccountNumber: string
  glAccountNumber: string
  currencyCode: string
}

type TransferFeedHint = {
  id: string
  transactionDate: Date
  description: string
  counterparty: string
  externalId: string
  amount: number
  currencyCode: string
  bankAccountId: string
}

function daysBetween(left: Date, right: Date) {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.abs(Math.round((left.getTime() - right.getTime()) / msPerDay))
}

function scoreBankAccountEvidence(text: string, account: TransferBankAccountHint) {
  const compactTextValue = compactSearch(text)
  const textDigits = digitTokens(text)
  const accountText = `${account.name} ${account.bankName} ${account.maskedAccountNumber} ${account.glAccountNumber}`
  const accountCompact = compactSearch(accountText)
  const accountDigits = digitTokens(accountText)
  let score = 0

  if (account.maskedAccountNumber && textDigits.includes(account.maskedAccountNumber)) score += 70
  if (account.glAccountNumber && textDigits.includes(account.glAccountNumber)) score += 45
  for (const digits of accountDigits) {
    if (digits.length >= 3 && textDigits.includes(digits)) score += digits.length >= 4 ? 35 : 15
  }
  if (account.name && compactTextValue.includes(compactSearch(account.name))) score += 45
  if (account.bankName && compactTextValue.includes(compactSearch(account.bankName))) score += 12
  if (accountCompact && compactTextValue.includes(accountCompact)) score += 25

  return score
}

function findTransferSuggestion(
  transaction: TransferFeedHint,
  bankAccounts: TransferBankAccountHint[],
  feedLines: TransferFeedHint[],
) {
  const currentText = `${transaction.description} ${transaction.counterparty} ${transaction.externalId}`
  const currentAccount = bankAccounts.find((account) => account.id === transaction.bankAccountId) ?? null
  const possibleAccounts = bankAccounts.filter((account) => account.id !== transaction.bankAccountId && account.currencyCode === transaction.currencyCode)

  const pairedFeedLine = feedLines
    .filter((line) => (
      line.id !== transaction.id
      && line.bankAccountId !== transaction.bankAccountId
      && line.currencyCode === transaction.currencyCode
      && Math.sign(line.amount) !== Math.sign(transaction.amount)
      && Math.abs(Math.abs(line.amount) - Math.abs(transaction.amount)) < 0.01
      && daysBetween(line.transactionDate, transaction.transactionDate) <= 3
    ))
    .map((line) => {
      const otherAccount = possibleAccounts.find((account) => account.id === line.bankAccountId) ?? null
      if (!otherAccount) return null
      const pairedText = `${line.description} ${line.counterparty} ${line.externalId}`
      const evidenceScore = scoreBankAccountEvidence(currentText, otherAccount)
        + (currentAccount ? scoreBankAccountEvidence(pairedText, currentAccount) : 0)
        + (isTransferText(pairedText) ? 10 : 0)
      return { line, account: otherAccount, score: 85 + Math.min(15, evidenceScore) }
    })
    .filter(Boolean)
    .sort((left, right) => (right?.score ?? 0) - (left?.score ?? 0))[0]

  if (pairedFeedLine) {
    return {
      glAccountId: pairedFeedLine.account.glAccountId,
      pairTransactionId: pairedFeedLine.line.id,
      pairBankAccountName: pairedFeedLine.account.name,
      confidence: pairedFeedLine.score,
      reason: `bank transfer | paired opposite bank line: ${pairedFeedLine.account.name}, exact amount, same currency/date`,
    }
  }

  const inferredAccount = possibleAccounts
    .map((account) => ({
      account,
      score: scoreBankAccountEvidence(currentText, account),
    }))
    .filter((entry) => entry.score >= 45)
    .sort((left, right) => right.score - left.score)[0]

  if (!inferredAccount) return null

  return {
    glAccountId: inferredAccount.account.glAccountId,
    pairTransactionId: '',
    pairBankAccountName: '',
    confidence: Math.min(90, 55 + inferredAccount.score),
    reason: `bank transfer | other bank inferred from memo: ${inferredAccount.account.name}`,
  }
}

export default async function BankMatchingPage({
  searchParams,
}: {
  searchParams?: Promise<{ bankAccountId?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const [transactions, bankAccounts, glAccounts, invoices, bills, cashReceipts, billPayments, bankChecks, bankDeposits, journals, historicalMatches, companySetupSettings] = await Promise.all([
    prisma.bankFeedTransaction.findMany({
      where: { status: { in: ['unmatched', 'suggested'] } },
      include: { bankAccount: { include: { glAccount: true } }, currency: true },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    }),
    prisma.bankAccount.findMany({
      include: { currency: true, glAccount: true, _count: { select: { feedTransactions: true } } },
      orderBy: { bankAccountId: 'asc' },
    }),
    prisma.chartOfAccounts.findMany({
      where: { active: true, isPosting: true },
      select: {
        id: true,
        accountNumber: true,
        name: true,
        accountType: true,
        financialStatementCategory: true,
        category: true,
        accountRole: true,
        bankAccountRequired: true,
        clearingAccount: true,
      },
      orderBy: { accountNumber: 'asc' },
    }),
    prisma.invoice.findMany({
      include: {
        currency: true,
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
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    }),
    prisma.bill.findMany({
      include: {
        currency: true,
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
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    }),
    prisma.cashReceipt.findMany({
      include: { currency: true, bankAccount: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    }),
    prisma.billPayment.findMany({
      include: { currency: true, bankAccount: { include: { linkedBankAccount: true } }, vendor: true },
      where: { status: { not: 'cancelled' } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    }),
    prisma.bankCheck.findMany({
      include: {
        bankAccount: { include: { glAccount: true } },
        currency: true,
        vendor: true,
        billPayment: true,
      },
      where: { status: { in: ['issued', 'processed', 'printed', 'released'] } },
      orderBy: [{ checkDate: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    }),
    prisma.bankDeposit.findMany({
      include: { bankAccount: { include: { glAccount: true } }, currency: true, subsidiary: true },
      where: { status: { in: ['posted', 'matched'] } },
      orderBy: [{ depositDate: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    }),
    prisma.journalEntry.findMany({
      include: { currency: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    }),
    prisma.bankFeedTransaction.findMany({
      where: {
        status: 'matched',
        matchedRecordType: { not: null },
        matchedRecordId: { not: null },
      },
      select: {
        matchedRecordType: true,
        matchedRecordId: true,
      },
      take: 1000,
    }),
    loadCompanySetupSettings(),
  ])

  const historicalMatchCountByCandidate = new Map<string, number>()
  const alreadyMatchedCandidateKeys = new Set<string>()
  for (const match of historicalMatches) {
    if (!match.matchedRecordType || !match.matchedRecordId) continue
    const key = `${match.matchedRecordType}:${match.matchedRecordId}`
    alreadyMatchedCandidateKeys.add(key)
    historicalMatchCountByCandidate.set(key, (historicalMatchCountByCandidate.get(key) ?? 0) + 1)
  }

  const candidates: BankMatchCandidate[] = [
    ...invoices.flatMap((invoice) => {
      const appliedViaApplications = invoice.cashReceiptApplications.reduce((sum, application) => sum + Number(application.appliedAmount), 0)
      const appliedViaLegacyReceipts = invoice.cashReceipts.reduce((sum, receipt) => {
        if (receipt.applications.length > 0) return sum
        return sum + Number(receipt.amount)
      }, 0)
      const openAmount = Math.max(0, Number(invoice.total) - appliedViaApplications - appliedViaLegacyReceipts)
      if (openAmount <= 0) return []
      return [{
        id: invoice.id,
        type: 'invoice',
        label: `${invoice.number} | ${invoice.customer.name} | ${amountText(openAmount, invoice.currency.code)} open`,
        searchText: `${invoice.number} ${invoice.customer.customerId ?? ''} ${invoice.customer.name} ${invoice.total} ${openAmount}`,
        counterparty: invoice.customer.name,
        amount: Number(invoice.total),
        openAmount,
        date: isoDate(invoice.createdAt) ?? '',
        dueDate: isoDate(invoice.dueDate),
        currencyCode: invoice.currency.code,
        expectedDirection: 'inflow' as const,
        subsidiaryId: invoice.subsidiaryId,
        aliases: buildAliases(invoice.customer.name, invoice.customer.customerId, invoice.number),
        toleranceAmount: 5,
        tolerancePercent: 0.01,
        historicalMatchCount: historicalMatchCountByCandidate.get(`invoice:${invoice.id}`) ?? 0,
        href: `/invoices/${invoice.id}`,
      }]
    }),
    ...bills.flatMap((bill) => {
      const appliedViaApplications = bill.paymentApplications.reduce((sum, application) => {
        if ((application.billPayment.status ?? '').toLowerCase() === 'cancelled') return sum
        return sum + Number(application.appliedAmount)
      }, 0)
      const appliedViaLegacyPayments = bill.billPayments.reduce((sum, payment) => {
        if ((payment.status ?? '').toLowerCase() === 'cancelled') return sum
        if (payment.applications.length > 0) return sum
        return sum + Number(payment.amount)
      }, 0)
      const openAmount = Math.max(0, Number(bill.total) - appliedViaApplications - appliedViaLegacyPayments)
      if (openAmount <= 0) return []
      return [{
        id: bill.id,
        type: 'bill',
      label: `${bill.number} | ${bill.vendor.name} | ${amountText(openAmount, bill.currency.code)} open`,
      searchText: `${bill.number} ${bill.vendor.vendorNumber ?? ''} ${bill.vendor.name} ${bill.vendorBillNumber ?? ''} ${bill.total} ${openAmount}`,
      counterparty: bill.vendor.name,
        amount: Number(bill.total),
        openAmount,
        date: isoDate(bill.date) ?? '',
        dueDate: isoDate(bill.dueDate),
        currencyCode: bill.currency.code,
        expectedDirection: 'outflow' as const,
        subsidiaryId: bill.subsidiaryId,
        aliases: buildAliases(bill.vendor.name, bill.vendor.vendorNumber, bill.number, bill.vendorBillNumber),
        toleranceAmount: 5,
        tolerancePercent: 0.01,
        historicalMatchCount: historicalMatchCountByCandidate.get(`bill:${bill.id}`) ?? 0,
        href: `/bills/${bill.id}`,
      }]
    }),
    ...cashReceipts.filter((receipt) => !alreadyMatchedCandidateKeys.has(`cash_receipt:${receipt.id}`)).map((receipt) => ({
      id: receipt.id,
      type: 'cash_receipt',
      label: `${receipt.number ?? 'Cash Receipt'} | ${formatDate(receipt.date)} | ${amountText(receipt.amount, receipt.currency.code)}`,
      searchText: `${receipt.number ?? ''} ${receipt.reference ?? ''} ${receipt.method ?? ''} ${receipt.amount}`,
      amount: Number(receipt.amount),
      date: isoDate(receipt.date) ?? '',
      currencyCode: receipt.currency.code,
      expectedDirection: 'inflow' as const,
      glAccountId: receipt.bankAccountId,
      historicalMatchCount: historicalMatchCountByCandidate.get(`cash_receipt:${receipt.id}`) ?? 0,
      href: `/invoice-receipts/${receipt.id}`,
    })),
    ...bankDeposits.filter((deposit) => !alreadyMatchedCandidateKeys.has(`bank_deposit:${deposit.id}`)).map((deposit) => ({
      id: deposit.id,
      type: 'bank_deposit',
      label: `${deposit.depositNumber} | ${formatDate(deposit.depositDate)} | ${amountText(deposit.amount, deposit.currency.code)}`,
      searchText: `${deposit.depositNumber} ${deposit.memo ?? ''} ${deposit.amount} ${deposit.bankAccount.name}`,
      amount: Number(deposit.amount),
      date: isoDate(deposit.depositDate) ?? '',
      currencyCode: deposit.currency.code,
      expectedDirection: 'inflow' as const,
      bankAccountId: deposit.bankAccountId,
      glAccountId: deposit.bankAccount.glAccountId,
      subsidiaryId: deposit.subsidiaryId,
      aliases: buildAliases(deposit.depositNumber, deposit.memo, deposit.bankAccount.name),
      historicalMatchCount: historicalMatchCountByCandidate.get(`bank_deposit:${deposit.id}`) ?? 0,
      href: `/bank-deposits/${deposit.id}`,
    })),
    ...billPayments.filter((payment) => !alreadyMatchedCandidateKeys.has(`bill_payment:${payment.id}`)).map((payment) => ({
      id: payment.id,
      type: 'bill_payment',
      label: `${payment.number} | ${formatDate(payment.date)} | ${amountText(payment.amount, payment.currency.code)}`,
      searchText: `${payment.number} ${payment.reference ?? ''} ${payment.method ?? ''} ${payment.vendor?.name ?? ''} ${payment.amount}`,
      counterparty: payment.vendor?.name ?? null,
      amount: Number(payment.amount),
      date: isoDate(payment.date) ?? '',
      currencyCode: payment.currency.code,
      expectedDirection: 'outflow' as const,
      glAccountId: payment.bankAccountId,
      bankAccountId: payment.bankAccount?.linkedBankAccount?.id ?? null,
      subsidiaryId: payment.subsidiaryId,
      aliases: buildAliases(payment.vendor?.name, payment.vendor?.vendorNumber, payment.number),
      historicalMatchCount: historicalMatchCountByCandidate.get(`bill_payment:${payment.id}`) ?? 0,
      href: `/bill-payments/${payment.id}`,
    })),
    ...bankChecks.filter((check) => !alreadyMatchedCandidateKeys.has(`bank_check:${check.id}`)).map((check) => ({
      id: check.id,
      type: 'bank_check',
      label: `${check.checkTransactionNumber} | Check ${check.checkNumber} | ${check.payeeName} | ${amountText(check.amount, check.currency.code)}`,
      searchText: `${check.checkTransactionNumber} ${check.checkNumber} ${check.payeeName} ${check.memo ?? ''} ${check.vendor?.name ?? ''} ${check.vendor?.vendorNumber ?? ''} ${check.billPayment?.number ?? ''} ${check.amount}`,
      counterparty: check.vendor?.name ?? check.payeeName,
      amount: Number(check.amount),
      date: isoDate(check.checkDate) ?? '',
      currencyCode: check.currency.code,
      expectedDirection: 'outflow' as const,
      bankAccountId: check.bankAccountId,
      glAccountId: check.bankAccount.glAccountId,
      subsidiaryId: check.subsidiaryId,
      aliases: buildAliases(check.payeeName, check.vendor?.name, check.vendor?.vendorNumber, check.checkNumber, check.checkTransactionNumber, check.billPayment?.number),
      historicalMatchCount: historicalMatchCountByCandidate.get(`bank_check:${check.id}`) ?? 0,
      href: `/bank-checks/${check.id}`,
    })),
    ...journals.map((journal) => ({
      id: journal.id,
      type: 'journal_entry',
      label: `Journal / Bank Coding | ${formatDate(journal.date)} | ${amountText(journal.total, journal.currency.code)}`,
      searchText: `${journal.number} ${journal.description ?? ''} ${journal.total}`,
      amount: Number(journal.total),
      date: isoDate(journal.date) ?? '',
      currencyCode: journal.currency.code,
      expectedDirection: 'neutral' as const,
      historicalMatchCount: historicalMatchCountByCandidate.get(`journal_entry:${journal.id}`) ?? 0,
      href: `/journals/${journal.id}`,
    })),
  ]
  const suggestionCandidates: BankMatchSuggestionCandidate[] = candidates.map((candidate) => ({
    id: candidate.id,
    type: candidate.type,
    amount: candidate.amount,
    openAmount: candidate.openAmount,
    currencyCode: candidate.currencyCode,
    date: new Date(candidate.date),
    dueDate: candidate.dueDate ? new Date(candidate.dueDate) : null,
    label: candidate.label,
    reference: candidate.searchText,
    description: candidate.searchText,
    counterparty: candidate.counterparty,
    expectedDirection: candidate.expectedDirection,
    bankAccountId: candidate.bankAccountId,
    glAccountId: candidate.glAccountId,
    subsidiaryId: candidate.subsidiaryId,
    aliases: candidate.aliases,
    toleranceAmount: candidate.toleranceAmount,
    tolerancePercent: candidate.tolerancePercent,
    historicalMatchCount: candidate.historicalMatchCount,
  }))
  const transferBankAccountHints: TransferBankAccountHint[] = bankAccounts.map((account) => ({
    id: account.id,
    glAccountId: account.glAccountId,
    name: account.name,
    bankName: account.bankName,
    maskedAccountNumber: account.maskedAccountNumber ?? '',
    glAccountNumber: account.glAccount.accountNumber,
    currencyCode: account.currency.code,
  }))
  const transferFeedHints: TransferFeedHint[] = transactions.map((transaction) => ({
    id: transaction.id,
    transactionDate: transaction.transactionDate,
    description: transaction.description,
    counterparty: transaction.counterparty ?? '',
    externalId: transaction.externalId ?? '',
    amount: Number(transaction.amount),
    currencyCode: transaction.currency.code,
    bankAccountId: transaction.bankAccountId,
  }))
  const transactionRows: BankMatchTransaction[] = transactions.map((transaction) => {
    const bankActivityText = `${transaction.description} ${transaction.counterparty ?? ''}`
    const bankFee = matchesKeywordRule(bankActivityText, companySetupSettings.bankFeeKeywords)
      || matchesKeywordRule(bankActivityText, companySetupSettings.merchantFeeKeywords)
      || isBankFeeTransaction({
        description: transaction.description,
        counterparty: transaction.counterparty,
      })
    const activityReason = bankActivityReason({
      amount: Number(transaction.amount),
      text: bankActivityText,
      bankFee,
      settings: companySetupSettings,
    })
    const isBankOriginatedActivity = Boolean(
      bankFee
      || isTransferText(bankActivityText)
      || matchesKeywordRule(bankActivityText, companySetupSettings.merchantFeeKeywords)
      || matchesKeywordRule(bankActivityText, companySetupSettings.interestIncomeKeywords)
      || matchesKeywordRule(bankActivityText, companySetupSettings.miscBankIncomeKeywords),
    )
    const suggestion = suggestBankMatch(
      {
        amount: Number(transaction.amount),
        currencyCode: transaction.currency.code,
        date: transaction.transactionDate,
        description: transaction.description,
        counterparty: transaction.counterparty,
        externalId: transaction.externalId,
        direction: transaction.direction,
        bankAccountId: transaction.bankAccountId,
        glAccountId: transaction.bankAccount.glAccount.id,
        subsidiaryId: transaction.bankAccount.subsidiaryId,
      },
      suggestionCandidates,
    )
    const usableSuggestion = suggestion?.candidateType === 'journal_entry' && !isBankOriginatedActivity
      ? null
      : suggestion
    const transferSuggestion = isTransferText(bankActivityText)
      ? findTransferSuggestion(
          {
            id: transaction.id,
            transactionDate: transaction.transactionDate,
            description: transaction.description,
            counterparty: transaction.counterparty ?? '',
            externalId: transaction.externalId ?? '',
            amount: Number(transaction.amount),
            currencyCode: transaction.currency.code,
            bankAccountId: transaction.bankAccountId,
          },
          transferBankAccountHints,
          transferFeedHints,
        )
      : null
    return {
      id: transaction.id,
      date: formatDate(transaction.transactionDate),
      dateIso: isoDate(transaction.transactionDate) ?? '',
      bankAccountName: transaction.bankAccount.name,
      bankAccountId: transaction.bankAccount.id,
      glAccountId: transaction.bankAccount.glAccount.id,
      glAccountNumber: transaction.bankAccount.glAccount.accountNumber,
      subsidiaryId: transaction.bankAccount.subsidiaryId,
      description: transaction.description,
      counterparty: transaction.counterparty ?? '',
      externalId: transaction.externalId ?? '',
      amount: Number(transaction.amount),
      currencyCode: transaction.currency.code,
      direction: transaction.direction,
      status: transferSuggestion || usableSuggestion || activityReason ? 'suggested' : transaction.status,
      suggestedMatchReason: transferSuggestion
        ? transferSuggestion.reason
        : usableSuggestion
        ? `${usableSuggestion.candidateType.replaceAll('_', ' ')} | ${usableSuggestion.reason}`
        : activityReason || (transaction.suggestedMatchReason ?? ''),
      matchConfidence: transferSuggestion?.confidence ?? usableSuggestion?.confidence ?? (transaction.matchConfidence ? Number(transaction.matchConfidence) : null),
      suggestedRecordType: transferSuggestion ? '' : usableSuggestion?.candidateType ?? '',
      suggestedRecordId: transferSuggestion ? '' : usableSuggestion?.candidateId ?? '',
      suggestedGlAccountId: transferSuggestion?.glAccountId ?? '',
      transferPairTransactionId: transferSuggestion?.pairTransactionId ?? '',
      transferPairBankAccountName: transferSuggestion?.pairBankAccountName ?? '',
    }
  })

  const bankAccountByGlAccountId = new Map(bankAccounts.map((account) => [account.glAccountId, account]))
  const glAccountOptions = glAccounts.map((account) => {
    const linkedBankAccount = bankAccountByGlAccountId.get(account.id)
    return {
    id: account.id,
    label: `${account.accountNumber} - ${account.name}`,
    searchText: `${account.accountNumber} ${account.name} ${account.accountType} ${account.financialStatementCategory ?? ''} ${account.category ?? ''} ${account.accountRole ?? ''} ${linkedBankAccount?.name ?? ''} ${linkedBankAccount?.maskedAccountNumber ?? ''}`,
    accountType: account.accountType,
    category: account.category,
    accountRole: account.accountRole,
    bankAccountId: linkedBankAccount?.id ?? null,
    bankAccountName: linkedBankAccount?.name ?? null,
    bankAccountMaskedNumber: linkedBankAccount?.maskedAccountNumber ?? null,
    isBankAccount:
      Boolean(linkedBankAccount)
      || Boolean(account.bankAccountRequired)
      || account.accountRole === 'Bank Account'
      || account.category === 'Bank Account'
      || account.financialStatementCategory === 'Cash and Cash Equivalents',
    isTransferClearing:
      Boolean(account.clearingAccount)
      || account.name.toLowerCase().includes('transfer clearing')
      || account.name.toLowerCase().includes('bank transfer clearing'),
    isBankFeeDefault:
      account.accountNumber === '6700'
      || account.name.toLowerCase().includes('bank fee')
      || account.name.toLowerCase().includes('bank charge'),
    }
  })

  return (
    <div className="min-h-full px-5 py-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>Treasury</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Bank Cash Inbox</h1>
          <p className="mt-1 max-w-4xl text-xs" style={{ color: 'var(--text-secondary)' }}>
            Resolve imported bank activity by matching real ERP cash records first, then route controlled exceptions like fees, interest, transfers, and unidentified cash.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border px-3 py-1" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
            {transactions.length} unmatched/suggested
          </span>
          <span className="rounded-full border px-3 py-1" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
            {bankAccounts.length} bank accounts
          </span>
          <span className="rounded-full border px-3 py-1" style={{ borderColor: '#60a5fa', color: '#bfdbfe' }}>
            rules now, AI-ready next
          </span>
        </div>
      </div>

      <BankMatchingWorkbenchClient
        transactions={transactionRows}
        candidates={candidates}
        glAccounts={glAccountOptions}
        initialFilterValues={{
          bankAccountId: params.bankAccountId ?? 'all',
        }}
        bankActivityDefaults={{
        bankFeeExpenseAccountId: companySetupSettings.defaultBankFeeExpenseAccountId,
        merchantFeeExpenseAccountId: companySetupSettings.defaultMerchantFeeExpenseAccountId,
        interestIncomeAccountId: companySetupSettings.defaultInterestIncomeAccountId,
        miscBankIncomeAccountId: companySetupSettings.defaultMiscBankIncomeAccountId,
        }}
        bankActivityRules={{
          bankFeeKeywords: companySetupSettings.bankFeeKeywords,
          merchantFeeKeywords: companySetupSettings.merchantFeeKeywords,
          interestIncomeKeywords: companySetupSettings.interestIncomeKeywords,
          miscBankIncomeKeywords: companySetupSettings.miscBankIncomeKeywords,
        }}
      />
    </div>
  )
}
