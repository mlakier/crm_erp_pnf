export const TRANSACTION_DOCUMENT_REQUIRED_FIELDS = {
  opportunity: {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  quote: {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  'sales-order': {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  fulfillment: {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  invoice: {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  'invoice-receipt': {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  'credit-memo': {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  'customer-refund': {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  'purchase-requisition': {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  'purchase-order': {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  receipt: {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  bill: {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  'bill-payment': {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  'bill-credit': {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  'vendor-refund': {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  journal: {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  'intercompany-journal': {
    header: ['subsidiaryId', 'currencyId'],
    lines: [],
  },
  'open-item': {
    header: ['subsidiaryId', 'transactionCurrencyId'],
    lines: [],
  },
  'clearing-document': {
    header: ['subsidiaryId', 'transactionCurrencyId'],
    lines: [],
  },
} as const

export type TransactionDocumentType = keyof typeof TRANSACTION_DOCUMENT_REQUIRED_FIELDS

type PostingContextCandidate = {
  subsidiaryId?: string | null
  currencyId?: string | null
  transactionCurrencyId?: string | null
}

type StandardTransactionDocumentType = Exclude<
  TransactionDocumentType,
  'open-item' | 'clearing-document'
>

type AccountingPostingDocumentType = Extract<
  TransactionDocumentType,
  'open-item' | 'clearing-document'
>

function hasValue(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0
}

export function getMissingTransactionPostingContextFields(
  documentType: TransactionDocumentType,
  candidate: PostingContextCandidate,
) {
  return TRANSACTION_DOCUMENT_REQUIRED_FIELDS[documentType].header.filter((field) => {
    if (field === 'transactionCurrencyId') return !hasValue(candidate.transactionCurrencyId)
    if (field === 'currencyId') return !hasValue(candidate.currencyId)
    return !hasValue(candidate.subsidiaryId)
  })
}

export function getTransactionPostingContextError(
  documentType: TransactionDocumentType,
  candidate: PostingContextCandidate,
) {
  const missing = getMissingTransactionPostingContextFields(documentType, candidate)
  if (!missing.length) return null
  return `Transaction posting context is incomplete for ${documentType}: missing ${missing.join(', ')}`
}

export function getRequiredStandardTransactionPostingContext(
  documentType: StandardTransactionDocumentType,
  candidate: PostingContextCandidate,
) {
  const error = getTransactionPostingContextError(documentType, candidate)
  if (error) {
    return { error } as const
  }

  return {
    subsidiaryId: candidate.subsidiaryId!.trim(),
    currencyId: candidate.currencyId!.trim(),
  } as const
}

export function getRequiredAccountingPostingContext(
  documentType: AccountingPostingDocumentType,
  candidate: PostingContextCandidate,
) {
  const error = getTransactionPostingContextError(documentType, candidate)
  if (error) {
    return { error } as const
  }

  return {
    subsidiaryId: candidate.subsidiaryId!.trim(),
    transactionCurrencyId: candidate.transactionCurrencyId!.trim(),
  } as const
}
