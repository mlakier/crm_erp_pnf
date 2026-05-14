import type { FormKey } from '@/lib/form-requirements'

type TransactionLineRequirement = {
  minLines: number
  requiredFields?: readonly string[]
  requiredAnyOf?: readonly (readonly string[])[]
  positiveNumberFields?: readonly string[]
  nonNegativeNumberFields?: readonly string[]
  allowNegativeUnitPrice?: boolean
  allowNegativeQuantity?: boolean
  uiRequiredColumnIds?: readonly string[]
  uiNotes?: readonly string[]
}

export const TRANSACTION_DOCUMENT_LINE_REQUIREMENTS: Record<string, TransactionLineRequirement> = {
  opportunity: {
    minLines: 0,
    requiredAnyOf: [['itemId', 'description']],
    positiveNumberFields: ['quantity'],
    nonNegativeNumberFields: ['unitPrice'],
  },
  quote: {
    minLines: 1,
    requiredAnyOf: [['itemId', 'description']],
    positiveNumberFields: ['quantity'],
    allowNegativeUnitPrice: true,
    uiNotes: ['Negative unit price is allowed for discount lines.'],
  },
  'sales-order': {
    minLines: 1,
    requiredAnyOf: [['itemId', 'description']],
    positiveNumberFields: ['quantity'],
    allowNegativeUnitPrice: true,
    uiNotes: ['Negative unit price is allowed for discount lines.'],
  },
  invoice: {
    minLines: 1,
    requiredAnyOf: [['itemId', 'description']],
    positiveNumberFields: ['quantity'],
    allowNegativeUnitPrice: true,
    uiNotes: ['Negative unit price is allowed for discount lines.'],
  },
  fulfillment: {
    minLines: 0,
    requiredFields: ['salesOrderLineItemId'],
    positiveNumberFields: ['quantity'],
    uiRequiredColumnIds: ['line', 'fulfilled-qty'],
    uiNotes: ['Item Id and Description are sourced from the selected sales order line.'],
  },
  'purchase-requisition': {
    minLines: 0,
    requiredAnyOf: [['itemId', 'description']],
    positiveNumberFields: ['quantity'],
    nonNegativeNumberFields: ['unitPrice'],
  },
  'purchase-order': {
    minLines: 0,
    requiredAnyOf: [['itemId', 'description', 'expenseAccountId']],
    positiveNumberFields: ['quantity'],
    nonNegativeNumberFields: ['unitPrice'],
  },
  receipt: {
    minLines: 0,
    requiredFields: ['purchaseOrderLineItemId'],
    positiveNumberFields: ['quantity'],
    uiRequiredColumnIds: ['line', 'document-qty'],
    uiNotes: ['Item Id and Description are sourced from the selected purchase order line.'],
  },
  bill: {
    minLines: 0,
    requiredAnyOf: [['itemId', 'expenseAccountId', 'description']],
    positiveNumberFields: ['quantity'],
    nonNegativeNumberFields: ['unitPrice'],
  },
  'credit-memo': {
    minLines: 1,
    requiredAnyOf: [['itemId', 'description']],
    positiveNumberFields: ['quantity'],
    nonNegativeNumberFields: ['unitPrice'],
    uiNotes: [
      'Credit memo lines use positive quantity and positive unit price.',
      'Use the credit document type itself to represent the credit, including discount-style credits.',
    ],
  },
  'bill-credit': {
    minLines: 1,
    requiredAnyOf: [['itemId', 'description']],
    positiveNumberFields: ['quantity'],
    nonNegativeNumberFields: ['unitPrice'],
    uiNotes: [
      'Bill credit lines use positive quantity and positive unit price.',
      'Use the credit document type itself to represent the credit, including discount-style credits.',
    ],
  },
  journal: {
    minLines: 1,
    requiredFields: ['accountId'],
  },
  'intercompany-journal': {
    minLines: 1,
    requiredFields: ['accountId'],
  },
}

export type TransactionLineRequirementsDocumentType = keyof typeof TRANSACTION_DOCUMENT_LINE_REQUIREMENTS

const FORM_KEY_TO_LINE_REQUIREMENTS_DOCUMENT_TYPE: Partial<
  Record<FormKey, TransactionLineRequirementsDocumentType>
> = {
  opportunityCreate: 'opportunity',
  quoteCreate: 'quote',
  salesOrderCreate: 'sales-order',
  fulfillmentCreate: 'fulfillment',
  invoiceCreate: 'invoice',
  purchaseRequisitionCreate: 'purchase-requisition',
  purchaseOrderCreate: 'purchase-order',
  receiptCreate: 'receipt',
  billCreate: 'bill',
  creditMemoCreate: 'credit-memo',
  billCreditCreate: 'bill-credit',
  journalCreate: 'journal',
}

function hasValue(value: unknown) {
  if (typeof value === 'string') return value.trim().length > 0
  return value !== null && value !== undefined
}

function toFiniteNumber(value: unknown) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}

function formatFieldName(field: string) {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/Id$/i, ' Id')
    .toLowerCase()
}

function normalizeFieldKey(value: string) {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase()
}

export function getTransactionLineRequirementsDocumentType(
  formKey: FormKey,
): TransactionLineRequirementsDocumentType | null {
  return FORM_KEY_TO_LINE_REQUIREMENTS_DOCUMENT_TYPE[formKey] ?? null
}

export function getTransactionLineRequiredColumnFlags(
  documentType: TransactionLineRequirementsDocumentType,
  lineColumnIds: readonly string[],
) {
  const requirements = TRANSACTION_DOCUMENT_LINE_REQUIREMENTS[documentType]
  const explicitUiRequiredColumns = requirements.uiRequiredColumnIds ?? []
  const requiredFields = new Set<string>([
    ...(requirements.requiredFields ?? []),
    ...(requirements.positiveNumberFields ?? []),
    ...(requirements.nonNegativeNumberFields ?? []),
  ])

  const normalizedUiRequiredColumns = new Set(
    explicitUiRequiredColumns.map((field) => normalizeFieldKey(field)),
  )
  const normalizedRequirementFields = new Set(
    [...requiredFields].map((field) => normalizeFieldKey(field)),
  )

  return Object.fromEntries(
    lineColumnIds.map((columnId) => [
      columnId,
      normalizedUiRequiredColumns.size > 0
        ? normalizedUiRequiredColumns.has(normalizeFieldKey(columnId))
        : normalizedRequirementFields.has(normalizeFieldKey(columnId)),
    ]),
  ) as Record<string, boolean>
}

export function getTransactionLineRequirementsSummary(
  documentType: TransactionLineRequirementsDocumentType,
  lineColumnDefinitions: ReadonlyArray<{ id: string; label: string }>,
) {
  const requirements = TRANSACTION_DOCUMENT_LINE_REQUIREMENTS[documentType]
  const notes: string[] = []

  if (requirements.minLines > 0) {
    notes.push(
      `At least ${requirements.minLines} line item${requirements.minLines === 1 ? '' : 's'} required.`,
    )
  }

  if (requirements.uiNotes?.length) {
    notes.push(...requirements.uiNotes)
  }

  for (const anyOfGroup of requirements.requiredAnyOf ?? []) {
    const labels = anyOfGroup.map((field) => {
      const match = lineColumnDefinitions.find(
        (column) => normalizeFieldKey(column.id) === normalizeFieldKey(field),
      )
      return match?.label ?? formatFieldName(field)
    })
    notes.push(`At least one of ${labels.join(', ')} is required on each line.`)
  }

  return notes.join(' ')
}

export function getTransactionLineRequirementsError(
  documentType: TransactionLineRequirementsDocumentType,
  lineItems: unknown,
) {
  if (!Array.isArray(lineItems)) return null

  const requirements = TRANSACTION_DOCUMENT_LINE_REQUIREMENTS[documentType]
  if (lineItems.length < requirements.minLines) {
    return `${documentType} requires at least ${requirements.minLines} line item${requirements.minLines === 1 ? '' : 's'}`
  }

  for (let index = 0; index < lineItems.length; index += 1) {
    const candidate = lineItems[index]
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return `${documentType} line ${index + 1} is invalid`
    }

    const line = candidate as Record<string, unknown>

    for (const field of requirements.requiredFields ?? []) {
      if (!hasValue(line[field])) {
        return `${documentType} line ${index + 1} is missing ${formatFieldName(field)}`
      }
    }

    for (const anyOfGroup of requirements.requiredAnyOf ?? []) {
      const satisfied = anyOfGroup.some((field) => hasValue(line[field]))
      if (!satisfied) {
        return `${documentType} line ${index + 1} must include at least one of ${anyOfGroup
          .map(formatFieldName)
          .join(', ')}`
      }
    }

    for (const field of requirements.positiveNumberFields ?? []) {
      const value = toFiniteNumber(line[field])
      if (value == null || value <= 0) {
        return `${documentType} line ${index + 1} must include a positive ${formatFieldName(field)}`
      }
    }

    for (const field of requirements.nonNegativeNumberFields ?? []) {
      const value = toFiniteNumber(line[field])
      if (value == null || value < 0) {
        return `${documentType} line ${index + 1} must include a non-negative ${formatFieldName(field)}`
      }
    }
  }

  return null
}
