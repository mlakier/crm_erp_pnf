'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SearchableSelect from '@/components/SearchableSelect'
import { isBankFeeTransaction, scoreBankMatchCandidate } from '@/lib/bank-match-suggestions'

export type BankMatchTransaction = {
  id: string
  date: string
  dateIso: string
  bankAccountName: string
  bankAccountId: string
  glAccountId: string
  glAccountNumber: string
  subsidiaryId: string
  description: string
  counterparty: string
  externalId: string
  amount: number
  currencyCode: string
  direction: string
  status: string
  suggestedMatchReason: string
  matchConfidence: number | null
  suggestedRecordType: string
  suggestedRecordId: string
  suggestedGlAccountId?: string
  transferPairTransactionId?: string
  transferPairBankAccountName?: string
}

export type BankMatchCandidate = {
  id: string
  type: string
  label: string
  searchText: string
  counterparty?: string | null
  amount: number
  openAmount?: number | null
  date: string
  dueDate?: string | null
  currencyCode: string
  expectedDirection?: 'inflow' | 'outflow' | 'neutral'
  bankAccountId?: string | null
  glAccountId?: string | null
  subsidiaryId?: string | null
  aliases?: string[]
  toleranceAmount?: number | null
  tolerancePercent?: number | null
  historicalMatchCount?: number
  href: string
}

export type BankMatchGlAccountOption = {
  id: string
  label: string
  searchText: string
  accountType: string
  category?: string | null
  accountRole?: string | null
  bankAccountId?: string | null
  bankAccountName?: string | null
  bankAccountMaskedNumber?: string | null
  isBankAccount: boolean
  isTransferClearing: boolean
  isBankFeeDefault: boolean
}

export type BankActivityDefaultAccounts = {
  bankFeeExpenseAccountId: string
  merchantFeeExpenseAccountId: string
  interestIncomeAccountId: string
  miscBankIncomeAccountId: string
}

export type BankActivityRules = {
  bankFeeKeywords: string
  merchantFeeKeywords: string
  interestIncomeKeywords: string
  miscBankIncomeKeywords: string
}

type BankActionMode = 'post_from_bank' | 'match_existing' | 'post_journal' | 'deposit_batch' | 'post_unapplied_cash' | 'create_bill'
type BankExceptionStatus = 'clean' | 'needs_review' | 'needs_application' | 'missing_source_document' | 'missing_cash_record' | 'wrong_direction' | 'amount_mismatch' | 'currency_mismatch' | 'possible_duplicate'

type ActivityClassification = {
  code: 'bank_fee' | 'interest_income' | 'merchant_fee' | 'misc_deposit' | 'deposit' | 'transfer' | 'manual_check' | 'subledger_settlement'
  label: string
  recommendedMode: BankActionMode
}

type BankFilters = {
  bankAccountId: string
  glAccountId: string
  direction: string
  currencyCode: string
  action: string
  exception: string
  counterparty: string
  dateFrom: string
  dateTo: string
  amountMin: string
  amountMax: string
}

type PostedResult = {
  title: string
  message: string
  href?: string
  recordNumber?: string
  glLines: PreviewLine[]
}

type PreviewLine = {
  line: number
  account: string
  debit: number
  credit: number
  note: string
}

type PreviewFact = {
  label: string
  value: string
  title?: string
}

type DecoratedTransaction = BankMatchTransaction & {
  classification: ActivityClassification
  recommendedActionLabel: string
  exceptionStatus: BankExceptionStatus
  exceptionLabel: string
}

const exceptionLabels: Record<BankExceptionStatus, string> = {
  clean: 'Clean',
  needs_review: 'Needs review',
  needs_application: 'Needs application',
  missing_source_document: 'Missing record',
  missing_cash_record: 'No cash record',
  wrong_direction: 'Wrong direction',
  amount_mismatch: 'Amount mismatch',
  currency_mismatch: 'Currency mismatch',
  possible_duplicate: 'Possible duplicate',
}

const initialFilters: BankFilters = {
  bankAccountId: 'all',
  glAccountId: 'all',
  direction: 'all',
  currencyCode: 'all',
  action: 'all',
  exception: 'all',
  counterparty: '',
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: '',
}

function amountText(amount: number, currencyCode: string) {
  return `${currencyCode} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function recordTypeLabel(type: string) {
  switch (type) {
    case 'cash_receipt':
      return 'Invoice Receipt'
    case 'bill_payment':
      return 'Bill Payment'
    case 'bank_check':
      return 'Check'
    case 'bank_deposit':
      return 'Bank Deposit'
    case 'journal_entry':
      return 'Journal / Bank Coding'
    case 'invoice':
      return 'Invoice'
    case 'bill':
      return 'Bill'
    default:
      return type
  }
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

function transferEvidenceText(transaction?: Pick<BankMatchTransaction, 'description' | 'counterparty' | 'externalId' | 'bankAccountName'> | null) {
  return `${transaction?.description ?? ''} ${transaction?.counterparty ?? ''} ${transaction?.externalId ?? ''} ${transaction?.bankAccountName ?? ''}`
}

function parseKeywords(value: string) {
  return value
    .split(',')
    .map((entry) => normalizeSearch(entry))
    .filter(Boolean)
}

function matchesKeywordRule(text: string, keywords: string) {
  const normalizedText = normalizeSearch(text)
  return parseKeywords(keywords).some((keyword) => normalizedText.includes(keyword))
}

function matchesAnyPhrase(text: string, phrases: string[]) {
  const normalizedText = normalizeSearch(text)
  return phrases.some((phrase) => normalizedText.includes(normalizeSearch(phrase)))
}

function parseDateValue(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function sameDayOrLater(left: Date, right: Date) {
  const l = new Date(left.getFullYear(), left.getMonth(), left.getDate()).getTime()
  const r = new Date(right.getFullYear(), right.getMonth(), right.getDate()).getTime()
  return l >= r
}

function classifyBankActivity(transaction: BankMatchTransaction | null, rules: BankActivityRules): ActivityClassification {
  if (!transaction) {
    return { code: 'subledger_settlement', label: 'No bank line selected', recommendedMode: 'post_from_bank' }
  }
  const text = normalizeSearch(`${transaction.description} ${transaction.counterparty}`)
  if (matchesAnyPhrase(text, ['bank transfer', 'book transfer', 'account transfer', 'transfer', 'xfer', 'wire transfer', 'internal transfer'])) {
    return { code: 'transfer', label: 'Bank transfer', recommendedMode: 'post_journal' }
  }
  if (transaction.amount < 0 && matchesAnyPhrase(text, ['check', 'cheque', 'chk', 'check paid', 'paid check'])) {
    return { code: 'manual_check', label: 'Manual check clearing', recommendedMode: 'match_existing' }
  }
  if (transaction.amount > 0 && matchesAnyPhrase(text, ['deposit', 'remote deposit', 'lockbox', 'cash deposit', 'check deposit', 'branch deposit'])) {
    return { code: 'deposit', label: 'Bank deposit batch', recommendedMode: 'deposit_batch' }
  }
  if (matchesKeywordRule(text, rules.merchantFeeKeywords)) {
    return { code: 'merchant_fee', label: 'Merchant or processor fee', recommendedMode: 'post_journal' }
  }
  if (matchesKeywordRule(text, rules.bankFeeKeywords) || isBankFeeTransaction(transaction)) {
    return { code: 'bank_fee', label: 'Bank fee / service charge', recommendedMode: 'post_journal' }
  }
  if (transaction.amount > 0 && matchesKeywordRule(text, rules.interestIncomeKeywords)) {
    return { code: 'interest_income', label: 'Interest income', recommendedMode: 'post_journal' }
  }
  if (transaction.amount > 0 && matchesKeywordRule(text, rules.miscBankIncomeKeywords)) {
    return { code: 'misc_deposit', label: 'Miscellaneous deposit', recommendedMode: 'post_journal' }
  }
  return { code: 'subledger_settlement', label: transaction.amount >= 0 ? 'Customer receipt candidate' : 'Vendor payment/check candidate', recommendedMode: 'match_existing' }
}

function findDefaultGlAccountId(
  glAccounts: BankMatchGlAccountOption[],
  classification: ActivityClassification,
  bankActivityDefaults: BankActivityDefaultAccounts,
  sourceGlAccountId?: string | null,
  transaction?: Pick<BankMatchTransaction, 'description' | 'counterparty' | 'externalId' | 'bankAccountName' | 'suggestedGlAccountId'> | null,
) {
  if (classification.code === 'transfer') {
    const transferOptions = codingAccountOptions(glAccounts, classification, sourceGlAccountId)
    if (transaction?.suggestedGlAccountId && transferOptions.some((account) => account.id === transaction.suggestedGlAccountId)) {
      return transaction.suggestedGlAccountId
    }
    const evidenceText = transferEvidenceText(transaction)
    const evidenceCompact = compactSearch(evidenceText)
    const evidenceDigits = digitTokens(evidenceText)
    const scored = transferOptions
      .filter((account) => account.isBankAccount)
      .map((account) => {
        const accountText = `${account.bankAccountName ?? ''} ${account.bankAccountMaskedNumber ?? ''} ${account.label} ${account.searchText}`
        const accountCompact = compactSearch(accountText)
        const accountDigits = digitTokens(accountText)
        let score = 0
        if (account.bankAccountName && evidenceCompact.includes(compactSearch(account.bankAccountName))) score += 80
        for (const digits of accountDigits) {
          if (digits.length >= 3 && evidenceDigits.includes(digits)) score += digits.length >= 4 ? 60 : 30
        }
        if (accountCompact && evidenceCompact.includes(accountCompact)) score += 25
        return { account, score }
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
    return scored[0]?.account.id
      ?? transferOptions.find((account) => account.isBankAccount)?.id
      ?? glAccounts.find((account) => account.id !== sourceGlAccountId && account.isTransferClearing)?.id
      ?? ''
  }
  if (classification.code === 'bank_fee' || classification.code === 'merchant_fee') {
    const configuredAccountId = classification.code === 'merchant_fee'
      ? bankActivityDefaults.merchantFeeExpenseAccountId || bankActivityDefaults.bankFeeExpenseAccountId
      : bankActivityDefaults.bankFeeExpenseAccountId
    if (configuredAccountId && glAccounts.some((account) => account.id === configuredAccountId)) return configuredAccountId
    return ''
  }
  if (classification.code === 'interest_income') {
    if (bankActivityDefaults.interestIncomeAccountId && glAccounts.some((account) => account.id === bankActivityDefaults.interestIncomeAccountId)) {
      return bankActivityDefaults.interestIncomeAccountId
    }
    return ''
  }
  if (classification.code === 'misc_deposit') {
    if (bankActivityDefaults.miscBankIncomeAccountId && glAccounts.some((account) => account.id === bankActivityDefaults.miscBankIncomeAccountId)) {
      return bankActivityDefaults.miscBankIncomeAccountId
    }
    return ''
  }
  return glAccounts.find((account) => account.isBankFeeDefault)?.id
    ?? glAccounts.find((account) => account.accountType === 'Expense')?.id
    ?? glAccounts[0]?.id
    ?? ''
}

function findUnappliedCashAccountId(glAccounts: BankMatchGlAccountOption[]) {
  const account12130 = glAccounts.find((account) => {
    const text = normalizeSearch(`${account.label} ${account.searchText}`)
    return text.includes('12130')
  })
  if (account12130) return account12130.id

  const scored = glAccounts
    .map((account) => {
      const text = normalizeSearch(`${account.label} ${account.searchText} ${account.accountType} ${account.category ?? ''} ${account.accountRole ?? ''}`)
      let score = 0
      if (text.includes('unapplied cash')) score += 100
      if (text.includes('customer deposit')) score += 90
      if (text.includes('contract liability')) score += 70
      if (text.includes('deferred revenue')) score += 55
      if (text.includes('accounts receivable')) score += 30
      if (text.includes('liability')) score += 20
      return { account, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
  return scored[0]?.account.id ?? ''
}

function codingAccountOptions(
  glAccounts: BankMatchGlAccountOption[],
  classification: ActivityClassification,
  sourceGlAccountId?: string | null,
) {
  if (classification.code !== 'transfer') return glAccounts
  return glAccounts.filter((account) => account.id !== sourceGlAccountId && (account.isBankAccount || account.isTransferClearing))
}

function recommendedActionLabel(transaction: BankMatchTransaction, classification: ActivityClassification) {
  if (classification.code === 'deposit') return 'Apply deposit'
  if (classification.code === 'transfer') return transaction.transferPairTransactionId ? 'Pair transfer' : 'Review transfer'
  if (classification.code === 'manual_check') return 'Match check'
  if (classification.recommendedMode === 'post_journal') return 'Code to GL'
  if (
    classification.code === 'subledger_settlement'
    && transaction.amount < 0
    && (!transaction.suggestedRecordId || transaction.suggestedRecordType === 'bill')
  ) return 'Pay selected bill'
  return transaction.amount >= 0 ? 'Find customer receipt' : 'Match payment/check'
}

function journalActionLabel(classification: ActivityClassification) {
  if (classification.code === 'deposit') return 'Post Deposit'
  if (classification.code === 'transfer') return 'Post Transfer'
  if (classification.code === 'bank_fee') return 'Post Bank Fee'
  if (classification.code === 'merchant_fee') return 'Post Merchant Fee'
  if (classification.code === 'interest_income') return 'Post Interest Income'
  return 'Post Bank Journal'
}

function unappliedCashActionLabel() {
  return 'Post Unapplied Cash'
}

function createBillHref(transaction: BankMatchTransaction | null) {
  if (!transaction) return '/bills/new'
  return `/bills/new?bankFeedTransactionId=${encodeURIComponent(transaction.id)}`
}

function journalOffsetLabel(classification: ActivityClassification) {
  if (classification.code === 'transfer') return 'To / From Bank Account'
  if (classification.code === 'deposit') return 'Deposit Offset Account'
  if (classification.code === 'bank_fee') return 'Bank Fee Expense Account'
  if (classification.code === 'merchant_fee') return 'Merchant Fee Expense Account'
  if (classification.code === 'interest_income') return 'Interest Income Account'
  return 'GL Account'
}

function defaultTypeForMode(transaction: BankMatchTransaction | null, mode: BankActionMode) {
  if (mode === 'deposit_batch') return 'invoice'
  if (mode === 'post_journal' || mode === 'post_unapplied_cash') return 'journal_entry'
  if (mode === 'match_existing') return (transaction?.amount ?? 0) >= 0 ? 'cash_receipt' : 'bill_payment'
  return (transaction?.amount ?? 0) >= 0 ? 'invoice' : 'bill'
}

function compactEvidence(input: {
  transaction: DecoratedTransaction | null
  candidate: BankMatchCandidate | null
  classification: ActivityClassification
  workflowMode: BankActionMode
  glAccountLabel: string | null
}) {
  const { transaction, candidate, classification, workflowMode, glAccountLabel } = input
  if (!transaction) return []

  const evidence: string[] = []
  if (transaction.matchConfidence != null && transaction.matchConfidence >= 75) {
    evidence.push(`${transaction.matchConfidence}% confidence`)
  }
  if (candidate) {
    evidence.push(candidate.label)
    if (candidate.currencyCode === transaction.currencyCode) evidence.push('Currency matches')
    const variance = amountVariance(transaction, candidate)
    if (variance <= 0.01) evidence.push('Amount matches')
  } else if (classification.code === 'deposit') {
    evidence.push('Select posted receipts or open invoices to build a deposit batch')
  } else if (classification.code === 'transfer' && transaction.transferPairTransactionId) {
    evidence.push(`Paired bank line found on ${transaction.transferPairBankAccountName}`)
  } else if (workflowMode === 'post_journal' && glAccountLabel) {
    evidence.push(glAccountLabel)
  }
  if (transaction.exceptionStatus !== 'clean') evidence.push(transaction.exceptionLabel)
  return Array.from(new Set(evidence)).slice(0, 4)
}

function shortSuggestionText(transaction: DecoratedTransaction) {
  if (transaction.exceptionStatus === 'needs_application') {
    return transaction.classification.code === 'deposit'
      ? 'Select receipts or open invoices to make up this deposit'
      : 'Select customer and open invoice(s) to apply cash'
  }
  if (transaction.exceptionStatus === 'missing_cash_record') {
    return 'No issued payment/check found; create payment only as an exception'
  }
  if (transaction.exceptionStatus !== 'clean' && (transaction.matchConfidence ?? 0) < 75) {
    return transaction.classification.code === 'deposit' ? 'Needs cash application' : 'Needs review'
  }
  if (transaction.classification.code === 'transfer' && transaction.transferPairBankAccountName) {
    return `Pair with ${transaction.transferPairBankAccountName}`
  }
  if (!transaction.suggestedMatchReason) return 'No confident match'
  return transaction.suggestedMatchReason
    .replace(/^bank transfer \| /i, '')
    .replace(/^bank deposit \| /i, '')
    .replace(/^invoice \| /i, '')
    .replace(/^bill \| /i, '')
}

function handlingGuidance(transaction: DecoratedTransaction | null) {
  if (!transaction) return ''
  if (transaction.classification.code === 'deposit') {
    return 'Use Build / Match Deposit when receipts or open invoices add up to the bank amount. If they do not, use Post Unapplied Cash so the deposit is parked for later cash application instead of being forced into the wrong invoice.'
  }
  if (transaction.amount >= 0 && transaction.exceptionStatus === 'needs_application') {
    return 'This looks like customer cash, but there is no confident receipt or invoice yet. Choose Apply to Invoice, pick the customer if needed, then check the open invoice(s) that equal the bank amount.'
  }
  if (transaction.amount < 0 && transaction.exceptionStatus === 'missing_cash_record') {
    return 'This looks like vendor cash out, but there is no existing bill payment or check to match. Normal flow is payment run/check first, then bank match. If it was paid outside the app, use Pay Selected Bill as the catch-up exception.'
  }
  if (transaction.classification.code === 'transfer') {
    return 'Pair this with the opposite bank line when present, or select the other bank account to post a bank-to-bank transfer.'
  }
  return ''
}

function actionOptionsFor(
  transaction: DecoratedTransaction | null,
  hasExistingCashRecordToMatch = false,
): Array<{ mode: BankActionMode, label: string, helper: string }> {
  if (!transaction) return []
  const classification = transaction.classification

  if (classification.code === 'deposit') {
    return [
      { mode: 'deposit_batch', label: 'Build / Match Deposit', helper: 'Use for check batches, lockbox, or multiple receipts in one bank deposit.' },
      { mode: 'post_unapplied_cash', label: 'Post Unapplied Cash', helper: 'Use when the deposit cannot yet be tied to invoices; parks cash for later application.' },
      { mode: 'match_existing', label: 'Match Existing Receipt/Deposit', helper: 'Use when the ERP receipt or deposit already exists.' },
      { mode: 'post_from_bank', label: 'Apply to Invoice', helper: 'Exception path for creating the receipt from an open invoice.' },
    ]
  }

  if (classification.code === 'transfer') {
    return [
      { mode: 'post_journal', label: transaction.transferPairTransactionId ? 'Pair Transfer Lines' : 'Create Transfer', helper: 'Bank-to-bank movement only; posts GL bank to GL bank.' },
      { mode: 'match_existing', label: 'Match Existing Transfer', helper: 'Use when the transfer record already exists.' },
    ]
  }

  if (classification.code === 'bank_fee' || classification.code === 'merchant_fee' || classification.code === 'interest_income' || classification.code === 'misc_deposit') {
    return [
      { mode: 'post_journal', label: journalActionLabel(classification), helper: 'Bank-originated activity; use company setup default account or override.' },
      { mode: 'match_existing', label: 'Match Existing Journal', helper: 'Use when this fee/income journal was already posted.' },
    ]
  }

  if (transaction.amount >= 0) {
    return [
      { mode: 'match_existing', label: 'Match Customer Receipt', helper: 'Best path when the receipt or deposit was already posted.' },
      { mode: 'post_from_bank', label: 'Apply to Invoice', helper: 'Creates the customer receipt from the selected open invoice.' },
      { mode: 'deposit_batch', label: 'Build Deposit Batch', helper: 'Use when one bank deposit represents multiple customer receipts.' },
      { mode: 'post_unapplied_cash', label: 'Post Unapplied Cash', helper: 'Use when the customer or invoice is not known yet.' },
    ]
  }

  if (transaction.exceptionStatus === 'missing_cash_record') {
    const actions: Array<{ mode: BankActionMode, label: string, helper: string }> = [
      { mode: 'post_from_bank', label: 'Pay Selected Bill', helper: 'Catch-up path when bank cash already happened but no ERP payment/check exists.' },
      { mode: 'post_journal', label: 'Post Controlled Exception', helper: 'Use only for non-AP bank-originated outflows.' },
    ]
    if (transaction.suggestedRecordType !== 'bill') {
      actions.splice(1, 0, {
        mode: 'create_bill',
        label: 'Create Bill',
        helper: 'Use when this bank outflow belongs to a vendor bill that was never entered.',
      })
    }
    if (hasExistingCashRecordToMatch) {
      actions.splice(1, 0, {
        mode: 'match_existing',
        label: classification.code === 'manual_check' ? 'Match Check' : 'Match Vendor Payment',
        helper: 'Use if the payment/check exists but was not suggested.',
      })
    }
    return actions
  }

  return [
    { mode: 'match_existing', label: classification.code === 'manual_check' ? 'Match Check' : 'Match Vendor Payment', helper: 'Normal path for payments created by payment run, bill payment, or check.' },
    { mode: 'post_from_bank', label: 'Pay Selected Bill', helper: 'Exception path only; normal AP cash should come from payment run/check.' },
    { mode: 'post_journal', label: 'Post Controlled Exception', helper: 'Use only for non-AP bank-originated outflows.' },
  ]
}

function journalMatchAllowed(classification: ActivityClassification) {
  return classification.code === 'bank_fee'
    || classification.code === 'merchant_fee'
    || classification.code === 'interest_income'
    || classification.code === 'misc_deposit'
    || classification.code === 'transfer'
}

function selectedRecordTypeOptions(
  transaction: BankMatchTransaction | null,
  workflowMode: BankActionMode,
  classification: ActivityClassification,
) {
  if (workflowMode === 'post_from_bank') {
    return transaction && transaction.amount < 0
      ? [{ value: 'bill', label: 'Open Bill' }]
      : [{ value: 'invoice', label: 'Open Invoice' }]
  }
  if (workflowMode === 'match_existing' && journalMatchAllowed(classification)) {
    return [{ value: 'journal_entry', label: 'Journal / Bank Coding' }]
  }
  if (transaction && transaction.amount < 0) {
    return [
      { value: 'bill_payment', label: 'Bill Payment' },
      { value: 'bank_check', label: 'Check' },
    ]
  }
  return [
    { value: 'cash_receipt', label: 'Invoice Receipt' },
    { value: 'bank_deposit', label: 'Bank Deposit' },
  ]
}

function defaultTypeForRecordOptions(
  transaction: BankMatchTransaction | null,
  mode: BankActionMode,
  classification: ActivityClassification,
) {
  return selectedRecordTypeOptions(transaction, mode, classification)[0]?.value ?? defaultTypeForMode(transaction, mode)
}

function postingDateValue(transaction: BankMatchTransaction) {
  return transaction.dateIso || transaction.date
}

function openAmount(candidate: BankMatchCandidate) {
  return Math.abs(Number(candidate.openAmount ?? candidate.amount))
}

function exactAmountMatch(transaction: BankMatchTransaction | null, candidate: BankMatchCandidate) {
  return Boolean(transaction && Math.abs(Math.abs(transaction.amount) - openAmount(candidate)) <= 0.01)
}

function selectedDirectionMatches(transaction: BankMatchTransaction, candidate: BankMatchCandidate | null) {
  if (!candidate?.expectedDirection || candidate.expectedDirection === 'neutral') return true
  return transaction.amount >= 0 ? candidate.expectedDirection === 'inflow' : candidate.expectedDirection === 'outflow'
}

function amountVariance(transaction: BankMatchTransaction, candidate: BankMatchCandidate | null) {
  if (!candidate) return 0
  const candidateAmount = Math.abs(Number(candidate.openAmount ?? candidate.amount))
  return Math.abs(Math.abs(transaction.amount) - candidateAmount)
}

function isMaterialAmountMismatch(transaction: BankMatchTransaction, candidate: BankMatchCandidate | null) {
  if (!candidate) return false
  const variance = amountVariance(transaction, candidate)
  const tolerance = Math.max(Number(candidate.toleranceAmount ?? 0), Math.abs(transaction.amount) * Number(candidate.tolerancePercent ?? 0))
  return variance > Math.max(0.01, tolerance)
}

function buildDuplicateKeys(transactions: BankMatchTransaction[]) {
  const counts = new Map<string, number>()
  for (const transaction of transactions) {
    const key = `${transaction.externalId || normalizeSearch(transaction.description)}|${transaction.date}|${transaction.amount}|${transaction.currencyCode}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

function getExceptionStatus(
  transaction: BankMatchTransaction,
  candidateById: Map<string, BankMatchCandidate>,
  duplicateCounts: Map<string, number>,
  bankActivityRules: BankActivityRules,
): BankExceptionStatus {
  const classification = classifyBankActivity(transaction, bankActivityRules)
  const suggestedCandidate = candidateById.get(transaction.suggestedRecordId) ?? null
  const duplicateKey = `${transaction.externalId || normalizeSearch(transaction.description)}|${transaction.date}|${transaction.amount}|${transaction.currencyCode}`

  if ((duplicateCounts.get(duplicateKey) ?? 0) > 1) return 'possible_duplicate'
  if (classification.code === 'transfer') {
    if (transaction.transferPairTransactionId && transaction.suggestedGlAccountId) return 'clean'
    if ((transaction.matchConfidence ?? 0) >= 80 && transaction.suggestedGlAccountId) return 'clean'
    return 'needs_review'
  }
  if (suggestedCandidate && suggestedCandidate.currencyCode && suggestedCandidate.currencyCode !== transaction.currencyCode) return 'currency_mismatch'
  if (suggestedCandidate && !selectedDirectionMatches(transaction, suggestedCandidate)) return 'wrong_direction'
  if (suggestedCandidate && isMaterialAmountMismatch(transaction, suggestedCandidate)) return 'amount_mismatch'
  if (classification.code === 'manual_check' && !transaction.suggestedRecordId) return 'missing_source_document'
  if (classification.code === 'deposit' && !transaction.suggestedRecordId) return 'needs_application'
  if (classification.code === 'subledger_settlement' && transaction.amount >= 0 && !transaction.suggestedRecordId) return 'needs_application'
  if (classification.code === 'subledger_settlement' && transaction.amount < 0 && suggestedCandidate?.type === 'bill') return 'missing_cash_record'
  if (classification.code === 'subledger_settlement' && transaction.amount < 0 && !transaction.suggestedRecordId) return 'missing_cash_record'
  if (classification.recommendedMode !== 'post_journal' && !transaction.suggestedRecordId) return 'missing_source_document'
  if ((transaction.matchConfidence ?? 100) < 80 || classification.code === 'misc_deposit') return 'needs_review'
  return 'clean'
}

function filterTransaction(transaction: DecoratedTransaction, filters: BankFilters) {
  if (filters.bankAccountId !== 'all' && transaction.bankAccountId !== filters.bankAccountId) return false
  if (filters.glAccountId !== 'all' && transaction.glAccountId !== filters.glAccountId) return false
  if (filters.direction !== 'all' && (transaction.amount >= 0 ? 'inflow' : 'outflow') !== filters.direction) return false
  if (filters.currencyCode !== 'all' && transaction.currencyCode !== filters.currencyCode) return false
  if (filters.action !== 'all' && transaction.recommendedActionLabel !== filters.action) return false
  if (filters.exception !== 'all' && transaction.exceptionStatus !== filters.exception) return false
  if (filters.counterparty && !normalizeSearch(`${transaction.counterparty} ${transaction.description}`).includes(normalizeSearch(filters.counterparty))) return false

  const transactionDate = parseDateValue(transaction.date)
  if (filters.dateFrom && transactionDate) {
    const from = parseDateValue(filters.dateFrom)
    if (from && !sameDayOrLater(transactionDate, from)) return false
  }
  if (filters.dateTo && transactionDate) {
    const to = parseDateValue(filters.dateTo)
    if (to && !sameDayOrLater(to, transactionDate)) return false
  }

  const min = Number(filters.amountMin)
  if (filters.amountMin && Number.isFinite(min) && Math.abs(transaction.amount) < min) return false
  const max = Number(filters.amountMax)
  if (filters.amountMax && Number.isFinite(max) && Math.abs(transaction.amount) > max) return false
  return true
}

export default function BankMatchingWorkbenchClient({
  transactions,
  candidates,
  glAccounts,
  bankActivityDefaults,
  bankActivityRules,
  initialFilterValues,
}: {
  transactions: BankMatchTransaction[]
  candidates: BankMatchCandidate[]
  glAccounts: BankMatchGlAccountOption[]
  bankActivityDefaults: BankActivityDefaultAccounts
  bankActivityRules: BankActivityRules
  initialFilterValues?: Partial<BankFilters>
}) {
  const router = useRouter()
  const [filters, setFilters] = useState<BankFilters>({ ...initialFilters, ...initialFilterValues })
  const [selectedTransactionId, setSelectedTransactionId] = useState(transactions[0]?.id ?? '')
  const firstTransaction = transactions[0]
  const firstClassification = classifyBankActivity(firstTransaction ?? null, bankActivityRules)
  const firstShouldCatchUpVendorPayment = (
    firstClassification.code === 'subledger_settlement'
    && (firstTransaction?.amount ?? 0) < 0
    && (!firstTransaction?.suggestedRecordId || firstTransaction.suggestedRecordType === 'bill')
  )
  const firstWorkflowMode: BankActionMode = firstShouldCatchUpVendorPayment ? 'post_from_bank' : firstClassification.recommendedMode
  const firstType = defaultTypeForRecordOptions(firstTransaction ?? null, firstWorkflowMode, firstClassification)
  const firstSuggestedTypeAllowed = firstTransaction?.suggestedRecordType === firstType
  const [selectedType, setSelectedType] = useState(firstSuggestedTypeAllowed ? firstTransaction?.suggestedRecordType ?? firstType : firstType)
  const [selectedCandidateId, setSelectedCandidateId] = useState(firstSuggestedTypeAllowed ? firstTransaction?.suggestedRecordId || '' : '')
  const [workflowMode, setWorkflowMode] = useState<BankActionMode>(firstWorkflowMode)
  const [selectedGlAccountId, setSelectedGlAccountId] = useState(findDefaultGlAccountId(glAccounts, firstClassification, bankActivityDefaults, firstTransaction?.glAccountId, firstTransaction))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [lastResult, setLastResult] = useState<PostedResult | null>(null)
  const [selectedDepositCandidateIds, setSelectedDepositCandidateIds] = useState<string[]>([])
  const [selectedReceiptCustomer, setSelectedReceiptCustomer] = useState('')
  const [selectedReceiptInvoiceIds, setSelectedReceiptInvoiceIds] = useState<string[]>(firstTransaction?.suggestedRecordType === 'invoice' ? [firstTransaction.suggestedRecordId].filter(Boolean) : [])

  const candidateById = useMemo(() => new Map(candidates.map((candidate) => [candidate.id, candidate])), [candidates])
  const duplicateCounts = useMemo(() => buildDuplicateKeys(transactions), [transactions])
  const decoratedTransactions = useMemo<DecoratedTransaction[]>(() => transactions.map((transaction) => {
    const classification = classifyBankActivity(transaction, bankActivityRules)
    const exceptionStatus = getExceptionStatus(transaction, candidateById, duplicateCounts, bankActivityRules)
    return {
      ...transaction,
      classification,
      recommendedActionLabel: recommendedActionLabel(transaction, classification),
      exceptionStatus,
      exceptionLabel: exceptionLabels[exceptionStatus],
    }
  }), [bankActivityRules, candidateById, duplicateCounts, transactions])
  const visibleTransactions = useMemo(() => decoratedTransactions.filter((transaction) => filterTransaction(transaction, filters)), [decoratedTransactions, filters])

  const selectedTransaction = decoratedTransactions.find((transaction) => transaction.id === selectedTransactionId) ?? null
  const selectedClassification = classifyBankActivity(selectedTransaction, bankActivityRules)
  const selectedTransactionUsesJournal = selectedClassification.recommendedMode === 'post_journal'
  const selectedGlAccount = glAccounts.find((account) => account.id === selectedGlAccountId) ?? null
  const selectedCodingAccountOptions = workflowMode === 'post_unapplied_cash'
    ? glAccounts
    : codingAccountOptions(glAccounts, selectedClassification, selectedTransaction?.glAccountId)
  const selectedCandidateFromAll = candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null

  const typedCandidates = candidates.filter((candidate) => candidate.type === selectedType)
  const filteredCandidates = selectedTransaction
    ? typedCandidates
      .filter((candidate) => !candidate.currencyCode || candidate.currencyCode === selectedTransaction.currencyCode)
      .filter((candidate) => selectedDirectionMatches(selectedTransaction, candidate))
      .map((candidate) => ({
        candidate,
        score: scoreBankMatchCandidate(
          {
            amount: selectedTransaction.amount,
            currencyCode: selectedTransaction.currencyCode,
            date: parseDateValue(postingDateValue(selectedTransaction)) ?? new Date(selectedTransaction.date),
            description: selectedTransaction.description,
            counterparty: selectedTransaction.counterparty,
            externalId: selectedTransaction.externalId,
            direction: selectedTransaction.direction,
            bankAccountId: selectedTransaction.bankAccountId,
            glAccountId: selectedTransaction.glAccountId,
            subsidiaryId: selectedTransaction.subsidiaryId,
          },
          {
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
            expectedDirection: candidate.expectedDirection,
            bankAccountId: candidate.bankAccountId,
            glAccountId: candidate.glAccountId,
            subsidiaryId: candidate.subsidiaryId,
            aliases: candidate.aliases,
            toleranceAmount: candidate.toleranceAmount,
            tolerancePercent: candidate.tolerancePercent,
            historicalMatchCount: candidate.historicalMatchCount,
          },
        ).score,
      }))
      .sort((left, right) => right.score - left.score)
      .map(({ candidate }) => candidate)
      .slice(0, 50)
    : typedCandidates

  const selectedCandidate = filteredCandidates.find((candidate) => candidate.id === selectedCandidateId) ?? selectedCandidateFromAll
  const invoiceCandidatesForReceipt = selectedTransaction
    ? candidates
      .filter((candidate) => candidate.type === 'invoice')
      .filter((candidate) => candidate.currencyCode === selectedTransaction.currencyCode)
      .filter((candidate) => candidate.expectedDirection === 'inflow')
      .map((candidate) => ({
        candidate,
        score: scoreBankMatchCandidate(
          {
            amount: selectedTransaction.amount,
            currencyCode: selectedTransaction.currencyCode,
            date: parseDateValue(postingDateValue(selectedTransaction)) ?? new Date(selectedTransaction.date),
            description: selectedTransaction.description,
            counterparty: selectedTransaction.counterparty,
            externalId: selectedTransaction.externalId,
            direction: selectedTransaction.direction,
            bankAccountId: selectedTransaction.bankAccountId,
            glAccountId: selectedTransaction.glAccountId,
            subsidiaryId: selectedTransaction.subsidiaryId,
          },
          {
            id: candidate.id,
            type: candidate.type,
            amount: candidate.amount,
            openAmount: candidate.openAmount,
            currencyCode: candidate.currencyCode,
            date: new Date(candidate.date),
            dueDate: candidate.dueDate ? new Date(candidate.dueDate) : null,
            label: candidate.label,
            reference: candidate.searchText,
            counterparty: candidate.counterparty,
            description: candidate.searchText,
            expectedDirection: candidate.expectedDirection,
            bankAccountId: candidate.bankAccountId,
            glAccountId: candidate.glAccountId,
            subsidiaryId: candidate.subsidiaryId,
            aliases: candidate.aliases,
            toleranceAmount: candidate.toleranceAmount,
            tolerancePercent: candidate.tolerancePercent,
            historicalMatchCount: candidate.historicalMatchCount,
          },
        ).score,
      }))
      .sort((left, right) => {
        const leftExact = exactAmountMatch(selectedTransaction, left.candidate)
        const rightExact = exactAmountMatch(selectedTransaction, right.candidate)
        if (leftExact !== rightExact) return leftExact ? -1 : 1
        return right.score - left.score
      })
    : []
  const suspectedReceiptInvoice = selectedCandidate?.type === 'invoice'
    ? selectedCandidate
    : invoiceCandidatesForReceipt.find((entry) => exactAmountMatch(selectedTransaction, entry.candidate))?.candidate
      ?? invoiceCandidatesForReceipt[0]?.candidate
      ?? null
  const effectiveReceiptCustomer = selectedReceiptCustomer || suspectedReceiptInvoice?.counterparty || ''
  const receiptCustomerOptions = Array.from(new Set(invoiceCandidatesForReceipt.map((entry) => entry.candidate.counterparty).filter((value): value is string => Boolean(value)))).sort()
  const receiptInvoiceList = invoiceCandidatesForReceipt
    .filter((entry) => !effectiveReceiptCustomer || entry.candidate.counterparty === effectiveReceiptCustomer)
    .map((entry) => entry.candidate)
  const selectedReceiptInvoices = receiptInvoiceList.filter((candidate) => selectedReceiptInvoiceIds.includes(candidate.id))
  const receiptSelectedTotal = selectedReceiptInvoices.reduce((sum, candidate) => sum + openAmount(candidate), 0)
  const receiptVariance = selectedTransaction ? Math.abs(Math.abs(selectedTransaction.amount) - receiptSelectedTotal) : 0
  const depositBatchCandidates = selectedTransaction
    ? candidates
      .filter((candidate) => ['invoice', 'cash_receipt'].includes(candidate.type))
      .filter((candidate) => candidate.currencyCode === selectedTransaction.currencyCode)
      .filter((candidate) => candidate.expectedDirection === 'inflow')
      .sort((left, right) => scoreBankMatchCandidate(
        {
          amount: selectedTransaction.amount,
          currencyCode: selectedTransaction.currencyCode,
          date: parseDateValue(postingDateValue(selectedTransaction)) ?? new Date(selectedTransaction.date),
          description: selectedTransaction.description,
          counterparty: selectedTransaction.counterparty,
          externalId: selectedTransaction.externalId,
          direction: selectedTransaction.direction,
          bankAccountId: selectedTransaction.bankAccountId,
          glAccountId: selectedTransaction.glAccountId,
          subsidiaryId: selectedTransaction.subsidiaryId,
        },
        {
          id: right.id,
          type: right.type,
          amount: right.amount,
          openAmount: right.openAmount,
          currencyCode: right.currencyCode,
          date: new Date(right.date),
          dueDate: right.dueDate ? new Date(right.dueDate) : null,
          label: right.label,
          reference: right.searchText,
          description: right.searchText,
          expectedDirection: right.expectedDirection,
          bankAccountId: right.bankAccountId,
          glAccountId: right.glAccountId,
          subsidiaryId: right.subsidiaryId,
          aliases: right.aliases,
          toleranceAmount: right.toleranceAmount,
          tolerancePercent: right.tolerancePercent,
          historicalMatchCount: right.historicalMatchCount,
        },
      ).score - scoreBankMatchCandidate(
        {
          amount: selectedTransaction.amount,
          currencyCode: selectedTransaction.currencyCode,
          date: parseDateValue(postingDateValue(selectedTransaction)) ?? new Date(selectedTransaction.date),
          description: selectedTransaction.description,
          counterparty: selectedTransaction.counterparty,
          externalId: selectedTransaction.externalId,
          direction: selectedTransaction.direction,
          bankAccountId: selectedTransaction.bankAccountId,
          glAccountId: selectedTransaction.glAccountId,
          subsidiaryId: selectedTransaction.subsidiaryId,
        },
        {
          id: left.id,
          type: left.type,
          amount: left.amount,
          openAmount: left.openAmount,
          currencyCode: left.currencyCode,
          date: new Date(left.date),
          dueDate: left.dueDate ? new Date(left.dueDate) : null,
          label: left.label,
          reference: left.searchText,
          description: left.searchText,
          expectedDirection: left.expectedDirection,
          bankAccountId: left.bankAccountId,
          glAccountId: left.glAccountId,
          subsidiaryId: left.subsidiaryId,
          aliases: left.aliases,
          toleranceAmount: left.toleranceAmount,
          tolerancePercent: left.tolerancePercent,
          historicalMatchCount: left.historicalMatchCount,
        },
      ).score)
    : []
  const selectedDepositCandidates = depositBatchCandidates.filter((candidate) => selectedDepositCandidateIds.includes(candidate.id))
  const selectedDepositTotal = selectedDepositCandidates.reduce((sum, candidate) => sum + Math.abs(Number(candidate.openAmount ?? candidate.amount)), 0)
  const depositVariance = selectedTransaction ? Math.abs(Math.abs(selectedTransaction.amount) - selectedDepositTotal) : 0
  const conciseEvidence = compactEvidence({
    transaction: selectedTransaction,
    candidate: selectedCandidate ?? null,
    classification: selectedClassification,
    workflowMode,
    glAccountLabel: selectedGlAccount?.label ?? null,
  })
  const hasExistingCashRecordToMatch = selectedTransaction
    ? candidates.some((candidate) => (
        (candidate.type === 'bill_payment' || candidate.type === 'bank_check')
        && selectedDirectionMatches(selectedTransaction, candidate)
        && (!candidate.currencyCode || candidate.currencyCode === selectedTransaction.currencyCode)
      ))
    : false
  const resolutionActions = actionOptionsFor(selectedTransaction, hasExistingCashRecordToMatch)
  const selectedResolutionAction = resolutionActions.find((action) => action.mode === workflowMode) ?? resolutionActions[0] ?? null
  const selectedHandlingGuidance = handlingGuidance(selectedTransaction)
  const recordTypeOptions = selectedRecordTypeOptions(selectedTransaction, workflowMode, selectedClassification)
  const bankAccounts = Array.from(new Map(transactions.map((transaction) => [transaction.bankAccountId, transaction.bankAccountName])).entries())
  const bankGlAccounts = Array.from(new Map(transactions.map((transaction) => [transaction.glAccountId, `GL ${transaction.glAccountNumber}`])).entries())
  const currencies = Array.from(new Set(transactions.map((transaction) => transaction.currencyCode))).sort()
  const actions = Array.from(new Set(decoratedTransactions.map((transaction) => transaction.recommendedActionLabel))).sort()
  const exceptionOptions = Array.from(new Set(decoratedTransactions.map((transaction) => transaction.exceptionStatus)))

  function updateFilter<K extends keyof BankFilters>(key: K, value: BankFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function selectTransaction(transaction: BankMatchTransaction) {
    const classification = classifyBankActivity(transaction, bankActivityRules)
    const shouldApplyIncomingInvoice = transaction.amount > 0 && transaction.suggestedRecordType === 'invoice'
    const shouldCatchUpVendorPayment = (
      classification.code === 'subledger_settlement'
      && transaction.amount < 0
      && (!transaction.suggestedRecordId || transaction.suggestedRecordType === 'bill')
    )
    const startingMode = shouldCatchUpVendorPayment ? 'post_from_bank' : classification.recommendedMode
    const validSuggestedTypes = classification.recommendedMode === 'match_existing'
      ? selectedRecordTypeOptions(transaction, classification.recommendedMode, classification).map((option) => option.value)
      : ['invoice', 'bill']
    const defaultType = defaultTypeForRecordOptions(transaction, startingMode, classification)
    const suggestedType = validSuggestedTypes.includes(transaction.suggestedRecordType)
      ? transaction.suggestedRecordType
      : defaultType
    setSelectedTransactionId(transaction.id)
    setSelectedType(shouldApplyIncomingInvoice ? 'invoice' : suggestedType)
    setSelectedCandidateId((shouldApplyIncomingInvoice || suggestedType === transaction.suggestedRecordType) ? transaction.suggestedRecordId : '')
    setSelectedDepositCandidateIds([])
    setSelectedReceiptCustomer('')
    setSelectedReceiptInvoiceIds(shouldApplyIncomingInvoice ? [transaction.suggestedRecordId].filter(Boolean) : [])
    setWorkflowMode(shouldApplyIncomingInvoice ? 'post_from_bank' : startingMode)
    setSelectedGlAccountId(findDefaultGlAccountId(glAccounts, classification, bankActivityDefaults, transaction.glAccountId, transaction))
    setMessage('')
    setLastResult(null)
  }

  function switchWorkflowMode(mode: BankActionMode) {
    setWorkflowMode(mode)
    setSelectedCandidateId('')
    setSelectedDepositCandidateIds([])
    setSelectedReceiptInvoiceIds([])
    setMessage('')
    setLastResult(null)
    if (mode === 'post_from_bank') {
      setSelectedType((selectedTransaction?.amount ?? 0) >= 0 ? 'invoice' : 'bill')
      if ((selectedTransaction?.amount ?? 0) > 0 && suspectedReceiptInvoice) {
        setSelectedCandidateId(suspectedReceiptInvoice.id)
        setSelectedReceiptCustomer(suspectedReceiptInvoice.counterparty ?? '')
        setSelectedReceiptInvoiceIds([suspectedReceiptInvoice.id])
      }
      return
    }
    if (mode === 'deposit_batch') {
      setSelectedType('invoice')
      return
    }
    if (mode === 'post_unapplied_cash') {
      setSelectedType('journal_entry')
      setSelectedGlAccountId(findUnappliedCashAccountId(glAccounts))
      return
    }
    if (mode === 'create_bill') {
      setSelectedType('bill')
      return
    }
    if (mode === 'post_journal') {
      setSelectedType('journal_entry')
      setSelectedGlAccountId(findDefaultGlAccountId(glAccounts, selectedClassification, bankActivityDefaults, selectedTransaction?.glAccountId, selectedTransaction))
      return
    }
    setSelectedType(defaultTypeForRecordOptions(selectedTransaction, mode, selectedClassification))
  }

  function validateSelectedCandidateForPosting() {
    if (!selectedTransaction) return 'Select a bank line.'
    if (selectedTransaction.amount >= 0) {
      if (selectedReceiptInvoices.length === 0) return 'Select one or more open invoices to apply this receipt.'
      if (receiptVariance > 0.01) return `Selected invoices must equal ${amountText(Math.abs(selectedTransaction.amount), selectedTransaction.currencyCode)}. Difference is ${amountText(receiptVariance, selectedTransaction.currencyCode)}.`
      return ''
    }
    if (!selectedCandidate) return 'Select a bank line and an invoice or bill to post against.'
    if (selectedTransaction.status === 'matched') return 'This bank line is already matched.'
    if (selectedTransaction.amount < 0 && selectedCandidate.type !== 'bill') return 'Outgoing bank activity can only post against an open vendor bill.'
    if (!selectedDirectionMatches(selectedTransaction, selectedCandidate)) return 'Selected open document direction does not match the bank activity.'
    if (selectedCandidate.currencyCode && selectedCandidate.currencyCode !== selectedTransaction.currencyCode) return 'Selected open document currency does not match the bank activity.'
    if (Number(selectedCandidate.openAmount ?? selectedCandidate.amount) <= 0) return 'Selected open document has no open amount left to settle.'
    const bankDate = parseDateValue(postingDateValue(selectedTransaction))
    const sourceDate = parseDateValue(selectedCandidate.date)
    if (bankDate && sourceDate && !sameDayOrLater(bankDate, sourceDate)) {
      return 'Bank posting date cannot be earlier than the selected open document date.'
    }
    return ''
  }

  async function saveMatch() {
    setMessage('')
    setLastResult(null)
    if (!selectedTransactionId || !selectedCandidateId || !selectedCandidate) {
      setMessage('Select a bank line and a matching record.')
      return
    }
    if (selectedTransaction && !selectedDirectionMatches(selectedTransaction, selectedCandidate)) {
      setMessage('Selected record direction does not match the bank activity.')
      return
    }
    if (selectedTransaction && selectedCandidate.currencyCode && selectedCandidate.currencyCode !== selectedTransaction.currencyCode) {
      setMessage('Selected record currency does not match the bank activity.')
      return
    }
    setSaving(true)
    const response = await fetch(`/api/bank-feed-transactions?id=${selectedTransactionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'match',
        matchedRecordType: selectedType,
        matchedRecordId: selectedCandidateId,
      }),
    })
    const body = await response.json().catch(() => null)
    setSaving(false)
    if (!response.ok) {
      setMessage(body?.error ?? 'Unable to save match.')
      return
    }
    setLastResult({
      title: 'Bank line matched',
      message: `Linked to ${selectedCandidate.label}.`,
      href: selectedCandidate.href,
      recordNumber: recordTypeLabel(selectedCandidate.type),
      glLines: [],
    })
    setMessage('Match saved.')
    router.refresh()
  }

  async function postFromBankActivity() {
    setMessage('')
    setLastResult(null)
    const validationError = validateSelectedCandidateForPosting()
    if (validationError) {
      setMessage(validationError)
      return
    }
    if (!selectedTransaction) return
    const amount = Math.abs(selectedTransaction.amount)
    const isInflow = selectedTransaction.amount >= 0
    if (!isInflow && !selectedCandidate) return
    const paymentCandidate = selectedCandidate as BankMatchCandidate
    const endpoint = isInflow ? '/api/invoice-receipts' : '/api/bill-payments'
    const payload = isInflow
      ? {
          invoiceId: selectedReceiptInvoices[0].id,
          amount,
          date: postingDateValue(selectedTransaction),
          method: 'ach',
          status: 'posted',
          reference: selectedTransaction.externalId || selectedTransaction.description,
          bankAccountId: selectedTransaction.glAccountId,
          applications: selectedReceiptInvoices.map((invoice) => ({
            invoiceId: invoice.id,
            appliedAmount: openAmount(invoice),
          })),
        }
      : {
          billId: paymentCandidate.id,
          amount,
          date: postingDateValue(selectedTransaction),
          method: 'ach',
          status: 'cleared',
          reference: selectedTransaction.externalId || selectedTransaction.description,
          bankAccountId: selectedTransaction.glAccountId,
          applications: [{ billId: paymentCandidate.id, appliedAmount: amount }],
        }

    setSaving(true)
    const createResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const created = await createResponse.json().catch(() => null)
    if (!createResponse.ok) {
      setSaving(false)
      setMessage(created?.error ?? 'Unable to post from bank activity.')
      return
    }

    const matchResponse = await fetch(`/api/bank-feed-transactions?id=${selectedTransaction.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'match',
        matchedRecordType: isInflow ? 'cash_receipt' : 'bill_payment',
        matchedRecordId: created.id,
        suggestedMatchReason: 'Posted from bank activity',
      }),
    })
    const matchBody = await matchResponse.json().catch(() => null)
    setSaving(false)
    if (!matchResponse.ok) {
      setMessage(matchBody?.error ?? 'Posted document, but could not mark the bank line matched.')
      router.refresh()
      return
    }

    setLastResult({
      title: isInflow ? 'Invoice receipt posted' : 'Vendor payment posted',
      message: `${created?.number ?? 'Document'} posted from ${selectedTransaction.bankAccountName} and matched to the bank line.`,
      href: isInflow ? `/invoice-receipts/${created?.id}` : `/bill-payments/${created?.id}`,
      recordNumber: created?.number,
      glLines: previewLines,
    })
    setMessage(isInflow ? 'Invoice receipt posted from bank activity.' : 'Vendor payment posted from bank activity.')
    router.refresh()
  }

  async function createDepositBatch() {
    setMessage('')
    setLastResult(null)
    if (!selectedTransaction) {
      setMessage('Select a bank deposit line.')
      return
    }
    if (selectedTransaction.status === 'matched') {
      setMessage('This bank line is already matched.')
      return
    }
    if (selectedDepositCandidates.length === 0) {
      setMessage('Select one or more invoices or invoice receipts for this deposit batch.')
      return
    }
    if (depositVariance > 0.01) {
      setMessage(`Selected deposit lines must equal ${amountText(Math.abs(selectedTransaction.amount), selectedTransaction.currencyCode)}. Difference is ${amountText(depositVariance, selectedTransaction.currencyCode)}.`)
      return
    }

    setSaving(true)
    const createdReceiptNumbers: string[] = []
    for (const candidate of selectedDepositCandidates.filter((entry) => entry.type === 'invoice')) {
      const amount = Math.abs(Number(candidate.openAmount ?? candidate.amount))
      const receiptResponse = await fetch('/api/invoice-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: candidate.id,
          amount,
          date: postingDateValue(selectedTransaction),
          method: 'check',
          status: 'posted',
          reference: selectedTransaction.externalId || selectedTransaction.description,
          bankAccountId: selectedTransaction.glAccountId,
          applications: [{ invoiceId: candidate.id, appliedAmount: amount }],
        }),
      })
      const createdReceipt = await receiptResponse.json().catch(() => null)
      if (!receiptResponse.ok) {
        setSaving(false)
        setMessage(createdReceipt?.error ?? `Unable to create receipt for ${candidate.label}.`)
        return
      }
      createdReceiptNumbers.push(createdReceipt?.number ?? candidate.label)
    }

    const existingReceiptLabels = selectedDepositCandidates
      .filter((entry) => entry.type === 'cash_receipt')
      .map((entry) => entry.label)
    const depositResponse = await fetch('/api/bank-deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankFeedTransactionId: selectedTransaction.id,
        bankAccountId: selectedTransaction.bankAccountId,
        subsidiaryId: selectedTransaction.subsidiaryId,
        amount: Math.abs(selectedTransaction.amount),
        depositDate: postingDateValue(selectedTransaction),
        memo: [
          selectedTransaction.description,
          createdReceiptNumbers.length ? `Created receipts: ${createdReceiptNumbers.join(', ')}` : '',
          existingReceiptLabels.length ? `Existing receipts: ${existingReceiptLabels.join(', ')}` : '',
        ].filter(Boolean).join(' | '),
      }),
    })
    const deposit = await depositResponse.json().catch(() => null)
    setSaving(false)
    if (!depositResponse.ok) {
      setMessage(deposit?.error ?? 'Unable to create bank deposit.')
      router.refresh()
      return
    }

    setLastResult({
      title: 'Deposit batch matched',
      message: `${deposit.depositNumber ?? 'Deposit'} matched to ${selectedDepositCandidates.length} selected customer-side line(s).`,
      href: deposit.id ? `/bank-deposits/${deposit.id}` : undefined,
      recordNumber: deposit.depositNumber,
      glLines: [],
    })
    setMessage(`${deposit.depositNumber ?? 'Deposit'} created and matched.`)
    router.refresh()
  }

  async function postJournalFromBankActivity() {
    setMessage('')
    setLastResult(null)
    if (!selectedTransactionId || !selectedGlAccountId) {
      setMessage('Select a bank line and a GL account.')
      return
    }
    if (
      selectedClassification.code === 'transfer'
      && !selectedCodingAccountOptions.some((account) => account.id === selectedGlAccountId)
    ) {
      setMessage('Bank transfers must use another bank GL account or a transfer clearing account.')
      return
    }
    if (selectedTransaction?.status === 'matched') {
      setMessage('This bank line is already matched.')
      return
    }
    if (!selectedTransaction || Math.abs(selectedTransaction.amount) <= 0) {
      setMessage('Bank journal amount must be non-zero.')
      return
    }

    setSaving(true)
    const response = await fetch(`/api/bank-feed-transactions?id=${selectedTransactionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'post_journal',
        offsetAccountId: selectedGlAccountId,
        postingDate: postingDateValue(selectedTransaction),
        bankActivityType: workflowMode === 'post_unapplied_cash' ? 'unapplied_cash' : selectedClassification.code,
        pairedBankFeedTransactionId: selectedClassification.code === 'transfer'
          ? selectedTransaction.transferPairTransactionId
          : undefined,
      }),
    })
    const body = await response.json().catch(() => null)
    setSaving(false)
    if (!response.ok) {
      setMessage(body?.error ?? 'Unable to post bank journal.')
      return
    }
    setLastResult({
      title: `${journalActionLabel(selectedClassification)} posted`,
      message: selectedClassification.code === 'transfer' && selectedTransaction.transferPairTransactionId
        ? `${body?.number ?? 'Transfer'} posted and both bank-feed sides were matched.`
        : `${body?.number ?? 'Journal'} posted and matched to the bank line.`,
      href: body?.href ?? (body?.id ? `/journals/${body.id}` : undefined),
      recordNumber: body?.number,
      glLines: previewLines,
    })
    setMessage(
      selectedClassification.code === 'transfer' && selectedTransaction.transferPairTransactionId
        ? `${body?.number ?? 'Transfer'} posted; both bank-feed sides matched.`
        : `${journalActionLabel(selectedClassification)} ${body?.number ?? ''} posted and matched.`.trim(),
    )
    router.refresh()
  }

  const postingPolicy = workflowMode === 'post_unapplied_cash'
    ? {
        flow: 'LTC',
        status: 'Posted for later application',
        action: 'Creates a posted bank receipt journal to an unapplied cash or customer deposit account. No revenue is recognized; cash can be applied later when the customer/invoice is identified.',
      }
    : workflowMode === 'create_bill'
      ? {
          flow: 'PTP',
          status: 'Setup required',
          action: 'Create the missing vendor bill first, then return to this bank line to pay/match it. This is an exception path when normal AP entry was skipped.',
        }
      : workflowMode === 'post_journal'
    ? {
        flow: 'RTR',
        status: 'Approved',
        action: selectedClassification.code === 'transfer'
          ? 'Creates an approved bank-to-bank transfer. The posting preview shows the underlying GL debit and credit.'
          : selectedClassification.code === 'deposit'
            ? 'Creates an approved deposit journal against the selected deposit offset account.'
            : 'Creates and approves a standard journal from bank activity.',
      }
    : workflowMode === 'post_from_bank' && selectedTransaction && selectedTransaction.amount >= 0
      ? {
          flow: 'LTC',
          status: 'Posted',
          action: 'Creates a posted invoice receipt through the existing receipt API.',
        }
      : workflowMode === 'post_from_bank'
        ? {
            flow: 'PTP',
            status: 'Cleared',
            action: 'Exception catch-up only: creates a cleared vendor payment. Normal AP cash should originate from a bill payment, check, or payment run, then be matched here.',
          }
        : {
        flow: 'Match',
        status: 'No posting',
        action: 'Links the bank line to an existing ERP record without creating GL.',
          }
  const effectivePostingPolicy = workflowMode === 'deposit_batch'
    ? {
        flow: 'LTC',
        status: 'Posted and matched',
        action: 'Creates any missing invoice receipts, creates a bank deposit batch, and matches the bank feed line once selected lines equal the bank amount.',
      }
    : postingPolicy

  const previewAmount = Math.abs(selectedTransaction?.amount ?? 0)
  const selectedBankGlAccount = selectedTransaction
    ? glAccounts.find((account) => account.id === selectedTransaction.glAccountId) ?? null
    : null
  const selectedBankGlAccountLabel = selectedBankGlAccount?.label
    ?? (selectedTransaction ? `GL ${selectedTransaction.glAccountNumber}` : 'Bank GL')
  const previewLines = selectedTransaction
    ? (workflowMode === 'post_journal' || workflowMode === 'post_unapplied_cash')
      ? selectedTransaction.amount < 0
        ? [
            { line: 1, account: selectedGlAccount?.label ?? 'Select GL account', debit: previewAmount, credit: 0, note: selectedClassification.code === 'transfer' ? 'Other bank or transfer clearing side of the bank transfer.' : 'Offset selected for bank fee, merchant fee, or other bank activity.' },
            { line: 2, account: selectedBankGlAccountLabel, debit: 0, credit: previewAmount, note: 'Cash decreases from the selected bank activity.' },
          ]
        : [
            { line: 1, account: selectedBankGlAccountLabel, debit: previewAmount, credit: 0, note: 'Cash increases from the selected bank activity.' },
            { line: 2, account: selectedGlAccount?.label ?? 'Select GL account', debit: 0, credit: previewAmount, note: workflowMode === 'post_unapplied_cash' ? 'Unapplied customer cash or customer deposit liability for later application.' : selectedClassification.code === 'transfer' ? 'Other bank or transfer clearing side of the bank transfer.' : selectedClassification.code === 'deposit' ? 'Deposit clearing, revenue, or other configured deposit offset.' : 'Offset selected for interest income, misc income, or other bank activity.' },
          ]
      : workflowMode === 'post_from_bank' && selectedTransaction.amount >= 0
        ? [
            { line: 1, account: selectedBankGlAccountLabel, debit: previewAmount, credit: 0, note: 'Bank receipt posts to the linked cash account.' },
            { line: 2, account: 'Accounts Receivable from LTC posting settings', debit: 0, credit: previewAmount, note: 'Relieves the selected customer invoice/open AR item.' },
          ]
        : workflowMode === 'post_from_bank'
          ? [
              { line: 1, account: 'Accounts Payable from PTP posting settings', debit: previewAmount, credit: 0, note: 'Relieves the selected vendor bill/open AP item.' },
              { line: 2, account: selectedBankGlAccountLabel, debit: 0, credit: previewAmount, note: 'Bank payment posts to the linked cash account.' },
            ]
          : []
    : []
  const previewFxNotes = selectedTransaction && workflowMode === 'post_from_bank'
    ? [
        'FX layers are calculated by the receipt/payment posting API using configured exchange rates for the bank posting date.',
        'Realized FX is posted only if the selected invoice/bill layer and the bank settlement layer differ.',
        'No clearing document is generated for normal cash settlement; the posted receipt/payment plus bank match is the audit trail.',
      ]
    : selectedTransaction && (workflowMode === 'post_journal' || workflowMode === 'post_unapplied_cash')
      ? selectedClassification.code === 'transfer'
        ? [
            'Bank transfers post in the bank activity currency and use the selected bank posting date.',
            selectedTransaction.transferPairTransactionId
              ? 'A paired bank feed line was found; posting will match both bank-feed sides to one bank transfer.'
              : 'If the other side arrives later as a separate bank feed line, match that line to this transfer rather than posting a second transfer.',
          ]
        : workflowMode === 'post_unapplied_cash'
          ? [
              'Unapplied cash posts to a balance sheet account, not revenue.',
              'Later cash application should reclass from unapplied/customer deposit to AR or the appropriate customer open item.',
            ]
          : selectedClassification.code === 'deposit'
          ? [
              'Deposits post in the bank activity currency and use the selected bank posting date.',
              'If this deposit represents grouped customer receipts already posted elsewhere, use Match Existing instead of creating a new journal.',
            ]
          : [
              'Bank journals post in the bank activity currency and use the selected bank posting date.',
              'No clearing document is generated because this is direct RTR bank activity, not open-item clearing.',
            ]
      : [
          'Matching an existing record does not create GL impact; it only links the bank line to a record already posted.',
        ]
  const selectedBankTransferLabel = selectedGlAccount?.bankAccountName
    ? `${selectedGlAccount.bankAccountName}${selectedGlAccount.bankAccountMaskedNumber ? ` ${selectedGlAccount.bankAccountMaskedNumber}` : ''}`
    : selectedGlAccount?.label
  const previewFacts: PreviewFact[] = selectedTransaction
    ? [
        { label: 'Posting date', value: selectedTransaction.date },
        { label: 'Bank currency', value: selectedTransaction.currencyCode },
        { label: selectedClassification.code === 'transfer' ? 'From / current bank' : 'Bank account', value: selectedTransaction.bankAccountName },
        {
          label: selectedClassification.code === 'transfer'
            ? selectedTransaction.amount < 0 ? 'To bank' : 'From bank'
            : workflowMode === 'post_journal' || workflowMode === 'post_unapplied_cash' ? 'GL coding' : 'Selected record',
          value: selectedClassification.code === 'transfer'
            ? selectedBankTransferLabel ?? 'Select bank account'
            : selectedCandidate?.label ?? ((workflowMode === 'post_journal' || workflowMode === 'post_unapplied_cash') ? selectedGlAccount?.label ?? 'Select GL account' : 'Select record'),
          title: selectedClassification.code === 'transfer' && selectedGlAccount ? selectedGlAccount.label : undefined,
        },
        { label: 'Dimensions', value: workflowMode === 'post_from_bank' ? 'Inherited from source document lines and validated against dimension policy.' : 'Validated against journal dimension policy before posting.' },
      ]
    : []

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="overflow-hidden rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <div className="border-b px-3 py-3" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold text-white">Bank feed lines</span>
            <span>{visibleTransactions.length} of {transactions.length} rows shown</span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-4 xl:grid-cols-10">
            <SearchableSelect
              selectedValue={filters.bankAccountId}
              onSelect={(value) => updateFilter('bankAccountId', value || 'all')}
              options={[{ value: 'all', label: 'All bank accounts' }, ...bankAccounts.map(([id, name]) => ({ value: id, label: name }))]}
              placeholder="All bank accounts"
              searchPlaceholder="Search bank accounts"
              dropdownWidthMode="trigger"
            />
            <SearchableSelect
              selectedValue={filters.glAccountId}
              onSelect={(value) => updateFilter('glAccountId', value || 'all')}
              options={[{ value: 'all', label: 'All GL accounts' }, ...bankGlAccounts.map(([id, label]) => ({ value: id, label }))]}
              placeholder="All GL accounts"
              searchPlaceholder="Search GL accounts"
              dropdownWidthMode="trigger"
            />
            <SearchableSelect
              selectedValue={filters.direction}
              onSelect={(value) => updateFilter('direction', value || 'all')}
              options={[{ value: 'all', label: 'All directions' }, { value: 'inflow', label: 'Inflow' }, { value: 'outflow', label: 'Outflow' }]}
              placeholder="All directions"
              searchPlaceholder="Search directions"
              dropdownWidthMode="trigger"
            />
            <SearchableSelect
              selectedValue={filters.currencyCode}
              onSelect={(value) => updateFilter('currencyCode', value || 'all')}
              options={[{ value: 'all', label: 'All currencies' }, ...currencies.map((currency) => ({ value: currency, label: currency }))]}
              placeholder="All currencies"
              searchPlaceholder="Search currencies"
              dropdownWidthMode="trigger"
            />
            <SearchableSelect
              selectedValue={filters.action}
              onSelect={(value) => updateFilter('action', value || 'all')}
              options={[{ value: 'all', label: 'All actions' }, ...actions.map((action) => ({ value: action, label: action }))]}
              placeholder="All actions"
              searchPlaceholder="Search actions"
              dropdownWidthMode="trigger"
            />
            <SearchableSelect
              selectedValue={filters.exception}
              onSelect={(value) => updateFilter('exception', value || 'all')}
              options={[{ value: 'all', label: 'All statuses' }, ...exceptionOptions.map((exception) => ({ value: exception, label: exceptionLabels[exception] }))]}
              placeholder="All statuses"
              searchPlaceholder="Search statuses"
              dropdownWidthMode="trigger"
            />
            <input
              type="search"
              placeholder="Customer/vendor"
              value={filters.counterparty}
              onChange={(event) => updateFilter('counterparty', event.target.value)}
              className="rounded-md border px-2 py-2 text-xs text-white"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-muted)' }}
            />
            <input type="date" value={filters.dateFrom} onChange={(event) => updateFilter('dateFrom', event.target.value)} className="rounded-md border px-2 py-2 text-xs text-white" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-muted)' }} />
            <input type="number" min="0" placeholder="Min amount" value={filters.amountMin} onChange={(event) => updateFilter('amountMin', event.target.value)} className="rounded-md border px-2 py-2 text-xs text-white" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-muted)' }} />
            <button type="button" onClick={() => setFilters(initialFilters)} className="rounded-md border px-2 py-2 text-xs font-semibold" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
              Reset filters
            </button>
          </div>
        </div>
        <div className="max-h-[calc(100vh-18rem)] overflow-auto">
          <table className="min-w-[1100px] w-full text-xs">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'rgba(15, 23, 42, 0.96)' }}>
              <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
                <th className="w-8 px-3 py-2"></th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Bank / GL</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Counterparty</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Recommended Workflow</th>
                <th className="px-3 py-2">Best Match / Route</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center" style={{ color: 'var(--text-secondary)' }}>
                    No bank feed transactions match the current filters.
                  </td>
                </tr>
              ) : (
                visibleTransactions.map((transaction) => {
                  const selected = transaction.id === selectedTransactionId
                  const clean = transaction.exceptionStatus === 'clean'
                  return (
                    <tr
                      key={transaction.id}
                      onClick={() => selectTransaction(transaction)}
                      className="cursor-pointer border-t transition hover:bg-slate-800/35"
                      style={{ borderColor: 'var(--border-muted)', backgroundColor: selected ? 'rgba(37, 99, 235, 0.16)' : undefined }}
                    >
                      <td className="px-3 py-2">
                        <span
                          className="block h-2.5 w-2.5 rounded-full border"
                          style={{ borderColor: selected ? '#93c5fd' : 'var(--border-muted)', backgroundColor: selected ? '#60a5fa' : 'transparent' }}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{transaction.date}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="font-semibold text-white">{transaction.bankAccountName}</div>
                        <div style={{ color: 'var(--text-muted)' }}>GL {transaction.glAccountNumber}</div>
                      </td>
                      <td className="max-w-[22rem] px-3 py-2 text-white">
                        <div className="truncate" title={transaction.description}>{transaction.description}</div>
                      </td>
                      <td className="max-w-[12rem] px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                        <div className="truncate" title={transaction.counterparty || '-'}>{transaction.counterparty || '-'}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-white">{amountText(transaction.amount, transaction.currencyCode)}</td>
                      <td className="whitespace-nowrap px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{transaction.recommendedActionLabel}</td>
                      <td className="max-w-[18rem] px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                        <div className="truncate" title={transaction.suggestedMatchReason || 'No confident match'}>
                          {shortSuggestionText(transaction)}
                        </div>
                        {transaction.matchConfidence && transaction.matchConfidence >= 75 ? (
                          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {transaction.matchConfidence}% confidence
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex flex-col items-start gap-1">
                          <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ borderColor: '#60a5fa', color: '#bfdbfe' }}>
                            {transaction.status}
                          </span>
                          <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ borderColor: clean ? '#4ade80' : '#f87171', color: clean ? '#86efac' : '#fecaca' }}>
                            {transaction.exceptionLabel}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="rounded-xl border p-4 xl:sticky xl:top-4 xl:self-start" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <h2 className="text-base font-semibold text-white">Resolve Bank Line</h2>
        <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
          Pick what this cash movement clears. The options below change by cash direction and detected activity type.
        </p>

        <div className="mt-4 rounded-lg border p-3" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'rgba(15, 23, 42, 0.28)' }}>
          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Selected bank line</p>
          {selectedTransaction ? (
            <div className="mt-2 space-y-1 text-xs">
              <p className="line-clamp-2 font-semibold text-white">{selectedTransaction.description}</p>
              <p style={{ color: 'var(--text-secondary)' }}>{selectedTransaction.date} | {amountText(selectedTransaction.amount, selectedTransaction.currencyCode)}</p>
              <p className="font-semibold" style={{ color: selectedTransaction.exceptionStatus === 'clean' ? '#86efac' : '#fecaca' }}>{selectedTransaction.exceptionLabel}</p>
            </div>
          ) : (
            <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>No bank line selected.</p>
          )}
        </div>

        <div className="mt-3 rounded-lg border p-3" style={{ borderColor: selectedTransaction?.exceptionStatus === 'clean' ? '#4ade80' : '#fbbf24', backgroundColor: selectedTransaction?.exceptionStatus === 'clean' ? 'rgba(34, 197, 94, 0.07)' : 'rgba(251, 191, 36, 0.07)' }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: selectedTransaction?.exceptionStatus === 'clean' ? '#86efac' : '#fde68a' }}>
              Recommended next step
            </p>
            {selectedTransaction?.matchConfidence != null ? (
              <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: '#60a5fa', color: '#bfdbfe' }}>
                {selectedTransaction.matchConfidence}% confidence
              </span>
            ) : null}
          </div>
          {selectedTransaction ? (
            <>
              <p className="mt-2 text-sm font-semibold text-white">{selectedResolutionAction?.label ?? selectedTransaction.recommendedActionLabel}</p>
              <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>{selectedClassification.label}</p>
              {conciseEvidence.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {conciseEvidence.map((detail) => (
                    <span key={detail} className="rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
                      {detail}
                    </span>
                  ))}
                </div>
              ) : null}
              {selectedHandlingGuidance ? (
                <p className="mt-3 rounded-md border px-2 py-2 text-xs leading-5" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)', backgroundColor: 'rgba(15, 23, 42, 0.24)' }}>
                  {selectedHandlingGuidance}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Select a bank line to see the next action.
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-2 text-xs">
          {resolutionActions.map((action) => (
            <button
              key={`${action.mode}-${action.label}`}
              type="button"
              onClick={() => switchWorkflowMode(action.mode)}
              className="rounded-lg border px-3 py-2 text-left font-semibold"
              style={{
                borderColor: workflowMode === action.mode ? '#93c5fd' : 'var(--border-muted)',
                color: workflowMode === action.mode ? '#bfdbfe' : 'var(--text-secondary)',
                backgroundColor: workflowMode === action.mode ? 'rgba(37, 99, 235, 0.16)' : 'transparent',
              }}
            >
              <span className="block text-white">{action.label}</span>
              <span className="mt-0.5 block text-[11px] font-normal" style={{ color: workflowMode === action.mode ? '#bfdbfe' : 'var(--text-muted)' }}>{action.helper}</span>
            </button>
          ))}
        </div>

        {selectedTransaction ? (
          <div className="mt-3 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: selectedTransactionUsesJournal ? '#fbbf24' : 'var(--border-muted)', color: selectedTransactionUsesJournal ? '#fde68a' : 'var(--text-secondary)', backgroundColor: selectedTransactionUsesJournal ? 'rgba(251, 191, 36, 0.08)' : 'rgba(15, 23, 42, 0.28)' }}>
            <span className="font-semibold">{selectedClassification.label}</span>
            <span> | {selectedResolutionAction?.helper ?? 'Choose the correct resolution path.'}</span>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {workflowMode === 'deposit_batch' ? (
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'rgba(15, 23, 42, 0.28)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Deposit batch lines</span>
                <span className="text-[11px]" style={{ color: depositVariance <= 0.01 ? '#86efac' : '#fbbf24' }}>
                  Selected {amountText(selectedDepositTotal, selectedTransaction?.currencyCode ?? '')}
                </span>
              </div>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Select posted invoice receipts and/or open invoices. Open invoices will create invoice receipts; the deposit is matched only when selected lines equal the bank amount.
              </p>
              <div className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
                {depositBatchCandidates.length === 0 ? (
                  <p className="rounded-md border px-2 py-2 text-xs" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
                    No customer-side invoice receipts or open invoices are available for this currency.
                  </p>
                ) : depositBatchCandidates.map((candidate) => {
                  const checked = selectedDepositCandidateIds.includes(candidate.id)
                  const amount = Math.abs(Number(candidate.openAmount ?? candidate.amount))
                  return (
                    <label key={candidate.id} className="flex cursor-pointer items-start gap-2 rounded-md border px-2 py-2 text-xs" style={{ borderColor: checked ? '#60a5fa' : 'var(--border-muted)', backgroundColor: checked ? 'rgba(37, 99, 235, 0.12)' : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setSelectedDepositCandidateIds((current) => event.target.checked
                            ? Array.from(new Set([...current, candidate.id]))
                            : current.filter((id) => id !== candidate.id))
                          setMessage('')
                          setLastResult(null)
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-white" title={candidate.label}>{candidate.label}</span>
                        <span className="mt-0.5 block" style={{ color: 'var(--text-muted)' }}>{recordTypeLabel(candidate.type)}</span>
                      </span>
                      <span className="font-semibold text-white">{amountText(amount, candidate.currencyCode)}</span>
                    </label>
                  )
                })}
              </div>
              <div className="mt-2 grid gap-1 text-[11px]">
                <div className="flex justify-between rounded-md border px-2 py-1" style={{ borderColor: 'var(--border-muted)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Bank amount</span>
                  <span className="text-white">{amountText(Math.abs(selectedTransaction?.amount ?? 0), selectedTransaction?.currencyCode ?? '')}</span>
                </div>
                <div className="flex justify-between rounded-md border px-2 py-1" style={{ borderColor: depositVariance <= 0.01 ? '#4ade80' : '#fbbf24' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Difference</span>
                  <span style={{ color: depositVariance <= 0.01 ? '#86efac' : '#fbbf24' }}>{amountText(depositVariance, selectedTransaction?.currencyCode ?? '')}</span>
                </div>
              </div>
            </div>
          ) : workflowMode === 'post_journal' || workflowMode === 'post_unapplied_cash' ? (
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
                {workflowMode === 'post_unapplied_cash' ? 'Unapplied Cash / Customer Deposit Account' : journalOffsetLabel(selectedClassification)}
              </span>
              <div className="mt-1">
                <SearchableSelect selectedValue={selectedGlAccountId} onSelect={(value) => { setSelectedGlAccountId(value); setMessage(''); setLastResult(null) }} options={selectedCodingAccountOptions.map((account) => ({ value: account.id, label: selectedClassification.code === 'transfer' && workflowMode !== 'post_unapplied_cash' ? account.bankAccountName ?? account.label : account.label, searchText: account.searchText }))} placeholder={selectedClassification.code === 'transfer' && workflowMode !== 'post_unapplied_cash' ? 'Select bank account' : 'Select GL account'} searchPlaceholder={selectedClassification.code === 'transfer' && workflowMode !== 'post_unapplied_cash' ? 'Search bank accounts' : 'Search GL accounts'} dropdownWidthMode="trigger" />
              </div>
              {!selectedGlAccountId ? (
                <span className="mt-2 block text-[11px]" style={{ color: '#fbbf24' }}>
                  {workflowMode === 'post_unapplied_cash'
                    ? 'Select an unapplied cash or customer deposit balance sheet account.'
                    : selectedClassification.code === 'transfer'
                    ? 'Select the other bank account. The system will post the GL debit and credit to the linked bank GL accounts.'
                    : 'No company setup default is configured for this bank activity type. Select an account or update Company Setup.'}
                </span>
              ) : null}
            </label>
          ) : workflowMode === 'create_bill' ? (
            <div className="rounded-lg border p-3 text-xs leading-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'rgba(15, 23, 42, 0.28)', color: 'var(--text-secondary)' }}>
              <p className="font-semibold text-white">Create the missing bill first</p>
              <p className="mt-1">
                This bank outflow has no bill payment/check to match. The new bill form will prefill the vendor, date, currency, amount, memo, and one expense line from this bank activity where possible.
              </p>
              <Link href={createBillHref(selectedTransaction)} className="mt-3 inline-flex rounded-md px-3 py-2 text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>
                Open Prefilled Bill
              </Link>
            </div>
          ) : workflowMode === 'post_from_bank' && selectedTransaction && selectedTransaction.amount >= 0 ? (
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'rgba(15, 23, 42, 0.28)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Invoice receipt recommendation</p>
              <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                {suspectedReceiptInvoice && suspectedReceiptInvoice.counterparty && selectedTransaction.counterparty
                  ? `Looks like an invoice receipt for ${suspectedReceiptInvoice.counterparty}, specifically ${suspectedReceiptInvoice.label.split('|')[0].trim()}. Below are open invoices for ${suspectedReceiptInvoice.counterparty}; the suspected invoice is checked.`
                  : suspectedReceiptInvoice && suspectedReceiptInvoice.counterparty
                    ? `Looks like a payment for an invoice, but the bank counterparty is not clear. There is an open invoice for ${suspectedReceiptInvoice.counterparty} with a close match, so that customer is shown below and the suspected invoice is checked.`
                    : `Looks like a payment for an invoice, but the customer is not identifiable. Select a customer below, then check the invoice or invoices that make up the bank amount.`}
              </p>

              <label className="mt-3 block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Customer</span>
                <div className="mt-1">
                  <SearchableSelect
                    selectedValue={effectiveReceiptCustomer}
                    onSelect={(value) => {
                      setSelectedReceiptCustomer(value)
                      setSelectedReceiptInvoiceIds([])
                      setSelectedCandidateId('')
                      setMessage('')
                      setLastResult(null)
                    }}
                    options={receiptCustomerOptions.map((customer) => ({ value: customer, label: customer }))}
                    placeholder="Select customer"
                    searchPlaceholder="Search customers"
                    dropdownWidthMode="trigger"
                  />
                </div>
              </label>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Open invoices</span>
                <span className="text-[11px]" style={{ color: receiptVariance <= 0.01 ? '#86efac' : '#fbbf24' }}>
                  Selected {amountText(receiptSelectedTotal, selectedTransaction.currencyCode)}
                </span>
              </div>
              <div className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
                {receiptInvoiceList.length === 0 ? (
                  <p className="rounded-md border px-2 py-2 text-xs" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
                    No open invoices are available for the selected customer/currency.
                  </p>
                ) : receiptInvoiceList.map((candidate) => {
                  const checked = selectedReceiptInvoiceIds.includes(candidate.id)
                  const amount = openAmount(candidate)
                  const invoiceNumber = candidate.label.split('|')[0].trim()
                  return (
                    <label key={candidate.id} className="flex cursor-pointer items-start gap-2 rounded-md border px-2 py-2 text-xs" style={{ borderColor: checked ? '#60a5fa' : 'var(--border-muted)', backgroundColor: checked ? 'rgba(37, 99, 235, 0.12)' : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setSelectedReceiptInvoiceIds((current) => event.target.checked
                            ? Array.from(new Set([...current, candidate.id]))
                            : current.filter((id) => id !== candidate.id))
                          setSelectedCandidateId(event.target.checked ? candidate.id : selectedCandidateId === candidate.id ? '' : selectedCandidateId)
                          setMessage('')
                          setLastResult(null)
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-white" title={candidate.label}>{invoiceNumber}</span>
                        <span className="mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
                          Due {candidate.dueDate ? new Date(candidate.dueDate).toLocaleDateString('en-US') : '-'}
                        </span>
                      </span>
                      <span className="font-semibold text-white">{amountText(amount, candidate.currencyCode)}</span>
                    </label>
                  )
                })}
              </div>
              <div className="mt-2 grid gap-1 text-[11px]">
                <div className="flex justify-between rounded-md border px-2 py-1" style={{ borderColor: 'var(--border-muted)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Bank amount</span>
                  <span className="text-white">{amountText(Math.abs(selectedTransaction.amount), selectedTransaction.currencyCode)}</span>
                </div>
                <div className="flex justify-between rounded-md border px-2 py-1" style={{ borderColor: receiptVariance <= 0.01 ? '#4ade80' : '#fbbf24' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Difference</span>
                  <span style={{ color: receiptVariance <= 0.01 ? '#86efac' : '#fbbf24' }}>{amountText(receiptVariance, selectedTransaction.currencyCode)}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>{workflowMode === 'post_from_bank' ? 'Open Document Type' : 'Posted Cash Record Type'}</span>
                <div className="mt-1">
                  <SearchableSelect selectedValue={selectedType} onSelect={(value) => { setSelectedType(value || recordTypeOptions[0]?.value || (workflowMode === 'post_from_bank' ? 'invoice' : 'cash_receipt')); setSelectedCandidateId(''); setMessage(''); setLastResult(null) }} options={recordTypeOptions} placeholder="Select record type" searchPlaceholder="Search types" dropdownWidthMode="trigger" />
                </div>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>{workflowMode === 'post_from_bank' ? 'Open Invoice / Bill' : selectedTransaction && selectedTransaction.amount < 0 ? 'Payment / Check to Match' : 'Receipt / Deposit to Match'}</span>
                <div className="mt-1">
                  <SearchableSelect selectedValue={selectedCandidateId} onSelect={(value) => { setSelectedCandidateId(value); setMessage(''); setLastResult(null) }} options={filteredCandidates.map((candidate) => ({ value: candidate.id, label: candidate.label, searchText: candidate.searchText }))} placeholder={`Select ${recordTypeLabel(selectedType)}`} searchPlaceholder="Search records" dropdownWidthMode="trigger" />
                </div>
                <span className="mt-2 block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Showing same-direction, same-currency records first. Use search when the customer/vendor is not confidently detected.
                </span>
              </label>
            </>
          )}
          {workflowMode !== 'post_journal' && selectedCandidateId ? (
            <a href={selectedCandidate?.href ?? '#'} className="inline-flex text-xs font-semibold hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
              Open selected record
            </a>
          ) : null}
          {workflowMode === 'deposit_batch' ? (
            <button type="button" disabled={saving || !selectedTransactionId || selectedDepositCandidateIds.length === 0 || depositVariance > 0.01} onClick={createDepositBatch} className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>
              {saving ? 'Creating Deposit...' : 'Create And Match Deposit'}
            </button>
          ) : workflowMode === 'post_journal' || workflowMode === 'post_unapplied_cash' ? (
            <button type="button" disabled={saving || !selectedTransactionId || !selectedGlAccountId} onClick={postJournalFromBankActivity} className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>
              {saving ? 'Posting...' : workflowMode === 'post_unapplied_cash' ? unappliedCashActionLabel() : journalActionLabel(selectedClassification)}
            </button>
          ) : workflowMode === 'create_bill' ? (
            <Link href={createBillHref(selectedTransaction)} className="w-full rounded-lg px-3 py-2 text-center text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>
              Create Prefilled Bill
            </Link>
          ) : workflowMode === 'post_from_bank' ? (
            <button type="button" disabled={saving || !selectedTransactionId || (selectedTransaction && selectedTransaction.amount >= 0 ? selectedReceiptInvoiceIds.length === 0 || receiptVariance > 0.01 : !selectedCandidateId)} onClick={postFromBankActivity} className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>
              {saving ? 'Posting...' : selectedTransaction && selectedTransaction.amount < 0 ? 'Pay Selected Bill' : 'Apply to Invoice'}
            </button>
          ) : (
            <button type="button" disabled={saving || !selectedTransactionId || !selectedCandidateId} onClick={saveMatch} className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>
              {saving ? 'Saving Match...' : 'Save Match'}
            </button>
          )}
          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'rgba(15, 23, 42, 0.28)' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Posting policy</span>
              <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: '#60a5fa', color: '#bfdbfe' }}>{effectivePostingPolicy.flow}</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-white">{effectivePostingPolicy.status}</p>
            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>{effectivePostingPolicy.action}</p>
          </div>
          {previewLines.length > 0 ? (
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'rgba(15, 23, 42, 0.28)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Accounting coding preview</span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{selectedTransaction?.currencyCode}</span>
              </div>
              <div className="mt-2 grid gap-1.5">
                {previewFacts.map((fact) => (
                  <div key={fact.label} className="grid grid-cols-[5.75rem_1fr] gap-2 rounded-md border px-2 py-1.5 text-[11px]" style={{ borderColor: 'var(--border-muted)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{fact.label}</span>
                    <span className="truncate text-white" title={fact.title ?? fact.value}>{fact.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 space-y-1">
                {previewLines.map((line) => (
                  <div key={line.line} className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-2 rounded-md border px-2 py-1.5 text-xs" style={{ borderColor: 'var(--border-muted)' }}>
                    <span className="truncate text-white" title={`${line.account} - ${line.note}`}>{line.account}</span>
                    <span className="text-right" style={{ color: line.debit ? '#bbf7d0' : 'var(--text-muted)' }}>{line.debit ? amountText(line.debit, selectedTransaction?.currencyCode ?? '') : '-'}</span>
                    <span className="text-right" style={{ color: line.credit ? '#fecaca' : 'var(--text-muted)' }}>{line.credit ? amountText(line.credit, selectedTransaction?.currencyCode ?? '') : '-'}</span>
                    <span className="col-span-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>{line.note}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 space-y-1">
                {previewFxNotes.map((note) => (
                  <p key={note} className="rounded-md border px-2 py-1 text-[11px]" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
                    {note}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          {lastResult ? (
            <div className="rounded-lg border p-3 text-xs" style={{ borderColor: '#4ade80', backgroundColor: 'rgba(34, 197, 94, 0.08)' }}>
              <p className="font-semibold" style={{ color: '#86efac' }}>{lastResult.title}</p>
              <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{lastResult.message}</p>
              {lastResult.href ? <a href={lastResult.href} className="mt-2 inline-flex font-semibold hover:underline" style={{ color: '#bfdbfe' }}>Open {lastResult.recordNumber ?? 'record'}</a> : null}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: /saved|posted/i.test(message) ? '#4ade80' : '#f87171', color: /saved|posted/i.test(message) ? '#86efac' : '#fecaca' }}>
              {message}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
