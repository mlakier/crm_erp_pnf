import {
  getDimensionTransactionFamilyForDocumentType,
  getSeededDimensionApplicability,
  getSeededDimensionFamilyAssignment,
  type DimensionConfigurationRow,
} from '@/lib/dimension-control-plane'
import type { TransactionLineRequirementsDocumentType } from '@/lib/transaction-line-requirements'

export type TransactionLineDimensionStatus =
  | 'required'
  | 'optional'
  | 'source-derived'
  | 'header-derived'
  | 'not-modeled'

export type TransactionLineDimensionPolicy = {
  department: TransactionLineDimensionStatus
  location: TransactionLineDimensionStatus
  class: TransactionLineDimensionStatus
  project: TransactionLineDimensionStatus
}

const NOT_MODELED: TransactionLineDimensionPolicy = {
  department: 'not-modeled',
  location: 'not-modeled',
  class: 'not-modeled',
  project: 'not-modeled',
}

export const TRANSACTION_LINE_DIMENSION_POLICIES: Record<
  TransactionLineRequirementsDocumentType,
  TransactionLineDimensionPolicy
> = {
  opportunity: NOT_MODELED,
  quote: NOT_MODELED,
  'sales-order': NOT_MODELED,
  invoice: {
    department: 'optional',
    location: 'optional',
    class: 'optional',
    project: 'optional',
  },
  fulfillment: NOT_MODELED,
  'purchase-requisition': NOT_MODELED,
  'purchase-order': NOT_MODELED,
  receipt: NOT_MODELED,
  bill: {
    department: 'optional',
    location: 'optional',
    class: 'optional',
    project: 'optional',
  },
  'credit-memo': NOT_MODELED,
  'bill-credit': NOT_MODELED,
  journal: {
    department: 'optional',
    location: 'optional',
    class: 'optional',
    project: 'optional',
  },
  'intercompany-journal': {
    department: 'optional',
    location: 'optional',
    class: 'optional',
    project: 'optional',
  },
}

function resolveSeededDimensionStatus(
  baseStatus: TransactionLineDimensionStatus,
  rows: readonly DimensionConfigurationRow[],
  dimensionKey: 'department' | 'location' | 'class',
  documentType: TransactionLineRequirementsDocumentType,
) {
  if (baseStatus === 'not-modeled') return baseStatus

  const applicability = getSeededDimensionApplicability(rows, dimensionKey, 'transaction_line')
  if (!applicability) return baseStatus
  const familyKey = getDimensionTransactionFamilyForDocumentType(documentType)
  const familyAssignment = getSeededDimensionFamilyAssignment(rows, dimensionKey, familyKey)
  if (familyKey && familyAssignment?.allowsLine !== true) return 'not-modeled'

  return applicability.isRequired ? 'required' : 'optional'
}

export function getTransactionLineDimensionPolicy(
  documentType: TransactionLineRequirementsDocumentType,
  dimensionRows: readonly DimensionConfigurationRow[] = [],
) {
  const basePolicy = TRANSACTION_LINE_DIMENSION_POLICIES[documentType]
  if (!dimensionRows.length) return basePolicy

  return {
    ...basePolicy,
    department: resolveSeededDimensionStatus(basePolicy.department, dimensionRows, 'department', documentType),
    location: resolveSeededDimensionStatus(basePolicy.location, dimensionRows, 'location', documentType),
    class: resolveSeededDimensionStatus(basePolicy.class, dimensionRows, 'class', documentType),
  }
}

export function formatTransactionLineDimensionStatus(
  status: TransactionLineDimensionStatus,
) {
  switch (status) {
    case 'required':
      return 'Required'
    case 'optional':
      return 'Optional'
    case 'source-derived':
      return 'Source-derived'
    case 'header-derived':
      return 'Header-derived'
    case 'not-modeled':
      return 'Not modeled'
  }
}
