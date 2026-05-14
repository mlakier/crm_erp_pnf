import { getDimensionConfigurationRows } from '@/lib/dimension-control-plane'
import type { FormKey } from '@/lib/form-requirements'
import {
  FORM_LABELS,
  FORM_REQUIREMENTS,
  LOCKED_FORM_REQUIREMENTS,
} from '@/lib/form-requirements'
import {
  TRANSACTION_DOCUMENT_REQUIRED_FIELDS,
  type TransactionDocumentType,
} from '@/lib/transaction-posting-context'
import {
  TRANSACTION_DOCUMENT_LINE_REQUIREMENTS,
  type TransactionLineRequirementsDocumentType,
} from '@/lib/transaction-line-requirements'
import {
  getTransactionLineDimensionPolicy,
  formatTransactionLineDimensionStatus,
} from '@/lib/transaction-line-dimensions'

type TransactionRequirementViewConfig = {
  label: string
  formKey?: FormKey
  documentType: TransactionDocumentType
  lineDocumentType?: TransactionLineRequirementsDocumentType
  section: 'crm' | 'ptp' | 'rtr' | 'accounting'
  lineEntryMode?: 'direct' | 'source-derived' | 'hybrid' | 'none'
}

export type TransactionRequirementsStatus = 'complete' | 'partial' | 'gap' | 'na'

const VIEW_CONFIG: TransactionRequirementViewConfig[] = [
  { label: 'Opportunity', formKey: 'opportunityCreate', documentType: 'opportunity', lineDocumentType: 'opportunity', section: 'crm', lineEntryMode: 'direct' },
  { label: 'Quote', formKey: 'quoteCreate', documentType: 'quote', lineDocumentType: 'quote', section: 'crm', lineEntryMode: 'source-derived' },
  { label: 'Sales Order', formKey: 'salesOrderCreate', documentType: 'sales-order', lineDocumentType: 'sales-order', section: 'crm', lineEntryMode: 'hybrid' },
  { label: 'Fulfillment', formKey: 'fulfillmentCreate', documentType: 'fulfillment', lineDocumentType: 'fulfillment', section: 'crm', lineEntryMode: 'source-derived' },
  { label: 'Invoice', formKey: 'invoiceCreate', documentType: 'invoice', lineDocumentType: 'invoice', section: 'crm', lineEntryMode: 'hybrid' },
  { label: 'Invoice Receipt', formKey: 'invoiceReceiptCreate', documentType: 'invoice-receipt', section: 'crm', lineEntryMode: 'none' },
  { label: 'Credit Memo', formKey: 'creditMemoCreate', documentType: 'credit-memo', lineDocumentType: 'credit-memo', section: 'crm', lineEntryMode: 'direct' },
  { label: 'Customer Refund', formKey: 'customerRefundCreate', documentType: 'customer-refund', section: 'crm', lineEntryMode: 'none' },
  { label: 'Purchase Requisition', formKey: 'purchaseRequisitionCreate', documentType: 'purchase-requisition', lineDocumentType: 'purchase-requisition', section: 'ptp', lineEntryMode: 'direct' },
  { label: 'Purchase Order', formKey: 'purchaseOrderCreate', documentType: 'purchase-order', lineDocumentType: 'purchase-order', section: 'ptp', lineEntryMode: 'hybrid' },
  { label: 'Receipt', formKey: 'receiptCreate', documentType: 'receipt', lineDocumentType: 'receipt', section: 'ptp', lineEntryMode: 'source-derived' },
  { label: 'Bill', formKey: 'billCreate', documentType: 'bill', lineDocumentType: 'bill', section: 'ptp', lineEntryMode: 'hybrid' },
  { label: 'Bill Payment', formKey: 'billPaymentCreate', documentType: 'bill-payment', section: 'ptp', lineEntryMode: 'none' },
  { label: 'Bill Credit', formKey: 'billCreditCreate', documentType: 'bill-credit', lineDocumentType: 'bill-credit', section: 'ptp', lineEntryMode: 'direct' },
  { label: 'Vendor Refund', formKey: 'vendorRefundCreate', documentType: 'vendor-refund', section: 'ptp', lineEntryMode: 'none' },
  { label: 'Journal', formKey: 'journalCreate', documentType: 'journal', lineDocumentType: 'journal', section: 'rtr', lineEntryMode: 'direct' },
  { label: 'Intercompany Journal', documentType: 'intercompany-journal', lineDocumentType: 'intercompany-journal', section: 'rtr', lineEntryMode: 'direct' },
  { label: 'Open Item', documentType: 'open-item', section: 'accounting', lineEntryMode: 'none' },
  { label: 'Clearing Document', documentType: 'clearing-document', section: 'accounting', lineEntryMode: 'none' },
]

const HEADER_API_ENFORCED_DOCUMENT_TYPES = new Set<TransactionDocumentType>([
  'opportunity',
  'quote',
  'sales-order',
  'fulfillment',
  'invoice',
  'invoice-receipt',
  'credit-memo',
  'customer-refund',
  'purchase-requisition',
  'purchase-order',
  'receipt',
  'bill',
  'bill-payment',
  'bill-credit',
  'vendor-refund',
  'journal',
  'intercompany-journal',
  'open-item',
  'clearing-document',
])

const LINE_API_ENFORCED_DOCUMENT_TYPES = new Set<TransactionLineRequirementsDocumentType>([
  'opportunity',
  'quote',
  'invoice',
  'sales-order',
  'fulfillment',
  'purchase-requisition',
  'purchase-order',
  'receipt',
  'bill',
  'credit-memo',
  'bill-credit',
  'journal',
  'intercompany-journal',
])

export type TransactionRequirementsViewRow = {
  label: string
  formLabel: string | null
  section: TransactionRequirementViewConfig['section']
  headerRequiredFields: string[]
  headerLockedFields: string[]
  postingContextFields: string[]
  lineMode: string
  minimumLines: number | null
  negativeUnitPricePolicy: string
  negativeQuantityPolicy: string
  lineDimensionPolicies: { label: string; value: string }[]
  lineRequiredFields: string[]
  lineRuleSummary: string[]
  headerRuleDefinedStatus: TransactionRequirementsStatus
  headerApiEnforcedStatus: TransactionRequirementsStatus
  lineRuleDefinedStatus: TransactionRequirementsStatus
  lineApiEnforcedStatus: TransactionRequirementsStatus
  customizeHeaderLockedStatus: TransactionRequirementsStatus
  customizeLineLockedStatus: TransactionRequirementsStatus
}

function summarizeLineRules(documentType?: TransactionLineRequirementsDocumentType) {
  if (!documentType) return []
  const requirement = TRANSACTION_DOCUMENT_LINE_REQUIREMENTS[documentType]
  if (!requirement) return []

  const summary: string[] = []
  if (requirement.minLines > 0) {
    summary.push(`At least ${requirement.minLines} line item${requirement.minLines === 1 ? '' : 's'}`)
  } else {
    summary.push('Lines optional')
  }
  if (requirement.requiredFields?.length) {
    summary.push(`Required fields: ${requirement.requiredFields.join(', ')}`)
  }
  if (requirement.requiredAnyOf?.length) {
    summary.push(
      ...requirement.requiredAnyOf.map((group) => `One of: ${group.join(', ')}`),
    )
  }
  if (requirement.positiveNumberFields?.length) {
    summary.push(`Positive values: ${requirement.positiveNumberFields.join(', ')}`)
  }
  if (requirement.nonNegativeNumberFields?.length) {
    summary.push(`Non-negative values: ${requirement.nonNegativeNumberFields.join(', ')}`)
  }
  return summary
}

export async function getTransactionRequirementsViewRows(): Promise<TransactionRequirementsViewRow[]> {
  const dimensionRows = await getDimensionConfigurationRows()

  return VIEW_CONFIG.map((config) => {
    const headerRequirementMap = config.formKey ? (FORM_REQUIREMENTS[config.formKey] ?? {}) : {}
    const lockedRequirementMap = config.formKey
      ? (LOCKED_FORM_REQUIREMENTS[config.formKey] ?? {})
      : {}
    const headerRequiredFields = config.formKey
      ? Object.entries(headerRequirementMap)
          .filter(([, required]) => required)
          .map(([field]) => field)
      : []
    const headerLockedFields = config.formKey
      ? Object.entries(lockedRequirementMap)
          .filter(([, required]) => required)
          .map(([field]) => field)
      : []
    const postingContextFields = [...TRANSACTION_DOCUMENT_REQUIRED_FIELDS[config.documentType].header]
    const lineRuleSummary = summarizeLineRules(config.lineDocumentType)
    const lineRequirements = config.lineDocumentType
      ? TRANSACTION_DOCUMENT_LINE_REQUIREMENTS[config.lineDocumentType]
      : null
    const lineDimensionPolicy = config.lineDocumentType
      ? getTransactionLineDimensionPolicy(config.lineDocumentType, dimensionRows)
      : null
    const lineRequiredFields = lineRequirements
      ? [
          ...(lineRequirements.requiredFields ?? []),
          ...((lineRequirements.requiredAnyOf ?? []).flat()),
          ...(lineRequirements.positiveNumberFields ?? []),
          ...(lineRequirements.nonNegativeNumberFields ?? []),
        ]
      : []
    const directlyLockableLineRequiredFields = lineRequirements
      ? [
          ...(lineRequirements.requiredFields ?? []),
          ...(lineRequirements.positiveNumberFields ?? []),
          ...(lineRequirements.nonNegativeNumberFields ?? []),
        ]
      : []

    const headerRuleDefinedStatus: TransactionRequirementsStatus = postingContextFields.length
      ? 'complete'
      : 'gap'
    const headerApiEnforcedStatus: TransactionRequirementsStatus =
      HEADER_API_ENFORCED_DOCUMENT_TYPES.has(config.documentType) ? 'complete' : 'gap'
    const lineRuleDefinedStatus: TransactionRequirementsStatus = config.lineDocumentType
      ? 'complete'
      : 'na'
    const lineApiEnforcedStatus: TransactionRequirementsStatus = config.lineDocumentType
      ? LINE_API_ENFORCED_DOCUMENT_TYPES.has(config.lineDocumentType)
        ? 'complete'
        : 'gap'
      : 'na'

    let customizeHeaderLockedStatus: TransactionRequirementsStatus = 'na'
    if (config.formKey) {
      if (!headerRequiredFields.length) {
        customizeHeaderLockedStatus = 'na'
      } else {
        const lockedRequiredCount = headerRequiredFields.filter((field) => lockedRequirementMap[field]).length
        customizeHeaderLockedStatus =
          lockedRequiredCount === headerRequiredFields.length
            ? 'complete'
            : lockedRequiredCount > 0
              ? 'partial'
              : 'gap'
      }
    }

    let customizeLineLockedStatus: TransactionRequirementsStatus = 'na'
    if (config.lineDocumentType) {
      customizeLineLockedStatus =
        directlyLockableLineRequiredFields.length > 0 ? 'complete' : 'partial'
    }

    return {
      label: config.label,
      formLabel: config.formKey ? FORM_LABELS[config.formKey] : null,
      section: config.section,
      headerRequiredFields,
      headerLockedFields,
      postingContextFields,
      lineMode:
        config.lineEntryMode === 'source-derived'
          ? 'Source-derived'
          : config.lineEntryMode === 'hybrid'
            ? 'Hybrid'
          : config.lineEntryMode === 'direct'
            ? 'Direct entry'
            : 'No line entry',
      minimumLines: lineRequirements?.minLines ?? null,
      negativeUnitPricePolicy: lineRequirements
        ? lineRequirements.allowNegativeUnitPrice
          ? 'Allowed'
          : 'Not allowed'
        : 'N/A',
      negativeQuantityPolicy: lineRequirements
        ? lineRequirements.allowNegativeQuantity
          ? 'Allowed'
          : 'Not allowed'
        : 'N/A',
      lineDimensionPolicies: lineDimensionPolicy
        ? [
            { label: 'Department', value: formatTransactionLineDimensionStatus(lineDimensionPolicy.department) },
            { label: 'Location', value: formatTransactionLineDimensionStatus(lineDimensionPolicy.location) },
            { label: 'Class', value: formatTransactionLineDimensionStatus(lineDimensionPolicy.class) },
            { label: 'Project', value: formatTransactionLineDimensionStatus(lineDimensionPolicy.project) },
          ]
        : [],
      lineRequiredFields: Array.from(new Set(lineRequiredFields)),
      lineRuleSummary,
      headerRuleDefinedStatus,
      headerApiEnforcedStatus,
      lineRuleDefinedStatus,
      lineApiEnforcedStatus,
      customizeHeaderLockedStatus,
      customizeLineLockedStatus,
    }
  })
}
