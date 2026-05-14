export type BankMatchSuggestionTransaction = {
  amount: number
  currencyCode: string
  date: Date
  description: string
  counterparty?: string | null
  externalId?: string | null
  direction?: string | null
  bankAccountId?: string | null
  glAccountId?: string | null
  subsidiaryId?: string | null
}

export type BankMatchSuggestionCandidate = {
  id: string
  type: string
  amount: number
  openAmount?: number | null
  currencyCode: string
  date: Date
  dueDate?: Date | null
  label: string
  reference?: string | null
  counterparty?: string | null
  description?: string | null
  expectedDirection?: 'inflow' | 'outflow' | 'neutral'
  bankAccountId?: string | null
  glAccountId?: string | null
  subsidiaryId?: string | null
  aliases?: string[]
  toleranceAmount?: number | null
  tolerancePercent?: number | null
  historicalMatchCount?: number
}

export type BankMatchSuggestionResult = {
  candidateId: string
  candidateType: string
  confidence: number
  reason: string
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string | null | undefined) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 3)
}

function compactText(value: string | null | undefined) {
  return normalizeText(value).replace(/\s/g, '')
}

function daysBetween(left: Date, right: Date) {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.abs(Math.round((left.getTime() - right.getTime()) / msPerDay))
}

function directionFromAmount(amount: number): 'inflow' | 'outflow' | 'neutral' {
  if (amount > 0) return 'inflow'
  if (amount < 0) return 'outflow'
  return 'neutral'
}

export function isBankFeeTransaction(value: Pick<BankMatchSuggestionTransaction, 'description' | 'counterparty'>) {
  const text = normalizeText(`${value.description} ${value.counterparty ?? ''}`)
  return /\b(bank fee|bank fees|service charge|monthly analysis fee|analysis fee|wire fee|ach fee|merchant fee|bank charge)\b/.test(text)
}

function isValidDate(value: Date | null | undefined) {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

function documentReferenceScore(transaction: BankMatchSuggestionTransaction, candidate: BankMatchSuggestionCandidate) {
  const bankText = compactText(`${transaction.description} ${transaction.counterparty ?? ''} ${transaction.externalId ?? ''}`)
  const references = [
    candidate.reference,
    candidate.label,
    candidate.description,
    ...extractLikelyReferences(candidate.reference),
    ...extractLikelyReferences(candidate.label),
    ...extractLikelyReferences(candidate.description),
  ]
    .map(compactText)
    .filter(Boolean)

  if (bankText.length === 0 || references.length === 0) return 0
  return references.some((reference) => reference.length >= 5 && bankText.includes(reference)) ? 25 : 0
}

function hasDocumentReference(transaction: BankMatchSuggestionTransaction, candidate: BankMatchSuggestionCandidate) {
  return documentReferenceScore(transaction, candidate) > 0
}

function extractLikelyReferences(value: string | null | undefined) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => /[a-z]+[0-9]+|[0-9]+[a-z]+/.test(token) || token.length >= 8)
}

function aliasScore(transaction: BankMatchSuggestionTransaction, candidate: BankMatchSuggestionCandidate) {
  const bankText = compactText(`${transaction.description} ${transaction.counterparty ?? ''}`)
  const aliases = [
    candidate.counterparty,
    candidate.label,
    ...(candidate.aliases ?? []),
  ]
    .map(compactText)
    .filter((alias) => alias.length >= 4)

  if (bankText.length === 0 || aliases.length === 0) return 0
  return aliases.some((alias) => bankText.includes(alias) || alias.includes(bankText)) ? 18 : 0
}

function textOverlapScore(transaction: BankMatchSuggestionTransaction, candidate: BankMatchSuggestionCandidate) {
  const bankText = tokenize(`${transaction.description} ${transaction.counterparty ?? ''} ${transaction.externalId ?? ''}`)
  const candidateText = new Set(tokenize(`${candidate.label} ${candidate.reference ?? ''} ${candidate.counterparty ?? ''} ${candidate.description ?? ''} ${(candidate.aliases ?? []).join(' ')}`))
  if (bankText.length === 0 || candidateText.size === 0) return 0
  const matches = bankText.filter((token) => candidateText.has(token)).length
  return Math.min(20, matches * 5)
}

export function scoreBankMatchCandidate(
  transaction: BankMatchSuggestionTransaction,
  candidate: BankMatchSuggestionCandidate,
) {
  if (
    isBankFeeTransaction(transaction)
    && ['invoice', 'bill', 'cash_receipt', 'bill_payment', 'bank_check', 'clearing_document'].includes(candidate.type)
  ) {
    return {
      score: 0,
      reason: 'bank fee requires a journal or existing fee journal, not an AR/AP settlement',
    }
  }

  let score = 0
  const reasons: string[] = []
  const absoluteTransactionAmount = Math.abs(transaction.amount)
  const comparisonAmount = candidate.openAmount && candidate.openAmount > 0 ? candidate.openAmount : candidate.amount
  const absoluteCandidateAmount = Math.abs(comparisonAmount)
  const amountDelta = Math.abs(absoluteTransactionAmount - absoluteCandidateAmount)
  const transactionDirection = transaction.direction === 'inflow' || transaction.direction === 'outflow'
    ? transaction.direction
    : directionFromAmount(transaction.amount)

  if (transaction.currencyCode && candidate.currencyCode && transaction.currencyCode === candidate.currencyCode) {
    score += 15
    reasons.push('same currency')
  } else if (transaction.currencyCode && candidate.currencyCode) {
    score -= 25
    reasons.push('currency mismatch')
  }

  if (candidate.expectedDirection && candidate.expectedDirection !== 'neutral') {
    if (candidate.expectedDirection === transactionDirection) {
      score += 18
      reasons.push('right cash direction')
    } else {
      score -= 35
      reasons.push('wrong cash direction')
    }
  }

  if (amountDelta < 0.01) {
    score += 45
    reasons.push(candidate.openAmount ? 'exact open balance' : 'exact amount')
  } else if (absoluteTransactionAmount > 0 && amountDelta / absoluteTransactionAmount <= 0.02) {
    score += 25
    reasons.push('amount within 2%')
  } else if (
    candidate.toleranceAmount != null
    && candidate.toleranceAmount >= 0
    && amountDelta <= candidate.toleranceAmount
  ) {
    score += 18
    reasons.push('within configured tolerance')
  } else if (
    candidate.tolerancePercent != null
    && candidate.tolerancePercent > 0
    && absoluteTransactionAmount > 0
    && amountDelta / absoluteTransactionAmount <= candidate.tolerancePercent
  ) {
    score += 18
    reasons.push('within configured tolerance')
  } else if (absoluteTransactionAmount > 0 && amountDelta / absoluteTransactionAmount > 0.15) {
    score -= 15
    reasons.push('amount gap')
  }

  const targetDate = isValidDate(candidate.dueDate) ? candidate.dueDate as Date : candidate.date
  const dayDelta = daysBetween(transaction.date, targetDate)
  if (dayDelta <= 1) {
    score += 20
    reasons.push('same/next due date')
  } else if (dayDelta <= 7) {
    score += 12
    reasons.push('within 7 days')
  } else if (dayDelta <= 30) {
    score += 5
    reasons.push('within 30 days')
  }

  if (transaction.subsidiaryId && candidate.subsidiaryId) {
    if (transaction.subsidiaryId === candidate.subsidiaryId) {
      score += 12
      reasons.push('same subsidiary')
    } else {
      score -= 20
      reasons.push('subsidiary mismatch')
    }
  }

  if (transaction.bankAccountId && candidate.bankAccountId && transaction.bankAccountId === candidate.bankAccountId) {
    score += 8
    reasons.push('same bank account')
  }

  if (transaction.glAccountId && candidate.glAccountId && transaction.glAccountId === candidate.glAccountId) {
    score += 8
    reasons.push('same GL cash account')
  }

  const referenceScore = documentReferenceScore(transaction, candidate)
  if (referenceScore > 0) {
    score += referenceScore
    reasons.push('document reference in bank memo')
  }

  const counterpartyAliasScore = aliasScore(transaction, candidate)
  if (counterpartyAliasScore > 0) {
    score += counterpartyAliasScore
    reasons.push('counterparty alias match')
  }

  const overlap = textOverlapScore(transaction, candidate)
  if (overlap > 0) {
    score += overlap
    reasons.push('text/reference overlap')
  }

  if (candidate.historicalMatchCount && candidate.historicalMatchCount > 0) {
    score += Math.min(15, candidate.historicalMatchCount * 5)
    reasons.push('historical match pattern')
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reason: reasons.join(', ') || 'low confidence candidate',
  }
}

export function suggestBankMatch(
  transaction: BankMatchSuggestionTransaction,
  candidates: BankMatchSuggestionCandidate[],
): BankMatchSuggestionResult | null {
  const scored = candidates
    .map((candidate) => {
      const result = scoreBankMatchCandidate(transaction, candidate)
      const absoluteTransactionAmount = Math.abs(transaction.amount)
      const comparisonAmount = candidate.openAmount && candidate.openAmount > 0 ? candidate.openAmount : candidate.amount
      const exactAmount = Math.abs(absoluteTransactionAmount - Math.abs(comparisonAmount)) < 0.01
      const referenceMatch = hasDocumentReference(transaction, candidate)
      return { candidate, exactAmount, referenceMatch, ...result }
    })
    .sort((left, right) => {
      if (left.referenceMatch !== right.referenceMatch) return left.referenceMatch ? -1 : 1
      if (left.exactAmount !== right.exactAmount) return left.exactAmount ? -1 : 1
      return right.score - left.score
    })

  const best = scored[0]
  if (!best || best.score < 75) return null

  const hasStrongEvidence = [
    'document reference in bank memo',
    'counterparty alias match',
    'same bank account',
    'same GL cash account',
    'historical match pattern',
  ].some((reason) => best.reason.includes(reason))

  if (best.score < 90 && !hasStrongEvidence) return null

  return {
    candidateId: best.candidate.id,
    candidateType: best.candidate.type,
    confidence: best.score,
    reason: best.reason,
  }
}
