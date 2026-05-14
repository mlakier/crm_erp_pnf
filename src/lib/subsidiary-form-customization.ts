import { getListSourceText, type FieldSourceType } from '@/lib/list-source'
import type { TransactionStatCardSlot } from '@/lib/transaction-page-config'

export type SubsidiaryFormFieldKey =
  | 'subsidiaryId'
  | 'name'
  | 'legalName'
  | 'entityType'
  | 'country'
  | 'address'
  | 'taxId'
  | 'registrationNumber'
  | 'parentSubsidiaryId'
  | 'localCurrencyId'
  | 'functionalCurrencyId'
  | 'groupCurrencyId'
  | 'fiscalCalendarId'
  | 'accountingStandard'
  | 'consolidationMethod'
  | 'ownershipPercent'
  | 'directOwnershipPercent'
  | 'ultimateOwnershipPercent'
  | 'ownershipEffectiveFrom'
  | 'ownershipEffectiveThrough'
  | 'consolidationEffectiveFrom'
  | 'consolidationEffectiveThrough'
  | 'controlIndicator'
  | 'nciRequired'
  | 'eliminationTargetParentId'
  | 'eliminationScope'
  | 'eliminationCurrencyBasis'
  | 'retainedEarningsAccountId'
  | 'ctaAccountId'
  | 'intercompanyClearingAccountId'
  | 'dueToAccountId'
  | 'dueFromAccountId'
  | 'investmentInSubsidiaryAccountId'
  | 'nciEquityAccountId'
  | 'nciIncomeStatementAccountId'
  | 'realizedFxGainAccountId'
  | 'realizedFxLossAccountId'
  | 'unrealizedFxGainAccountId'
  | 'unrealizedFxLossAccountId'
  | 'allowTransactions'
  | 'allowBankAccounts'
  | 'allowInventory'
  | 'allowPayroll'
  | 'allowProjects'
  | 'inactive'

export type SubsidiaryFormFieldMeta = {
  id: SubsidiaryFormFieldKey
  label: string
  fieldType: string
  sourceType?: FieldSourceType
  sourceKey?: string
  source?: string
  description?: string
}

export type SubsidiaryFormFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type SubsidiaryFormCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<SubsidiaryFormFieldKey, SubsidiaryFormFieldCustomization>
  statCards?: Array<TransactionStatCardSlot<SubsidiaryStatCardMetric>>
}

export type SubsidiaryStatCardMetric =
  | 'childSubsidiaries'
  | 'employees'
  | 'customers'
  | 'vendors'

export const SUBSIDIARY_STAT_CARDS: Array<{ id: SubsidiaryStatCardMetric; label: string }> = [
  { id: 'childSubsidiaries', label: 'Child Subsidiaries' },
  { id: 'employees', label: 'Employees' },
  { id: 'customers', label: 'Customers' },
  { id: 'vendors', label: 'Vendors' },
]

export const SUBSIDIARY_FORM_FIELDS: SubsidiaryFormFieldMeta[] = [
  { id: 'subsidiaryId', label: 'Subsidiary ID', fieldType: 'text', description: 'System-generated legal Subsidiary code.' },
  { id: 'name', label: 'Name', fieldType: 'text', description: 'Operating name of the subsidiary.' },
  { id: 'legalName', label: 'Legal Name', fieldType: 'text', description: 'Registered legal Subsidiary name.' },
  { id: 'entityType', label: 'Type', fieldType: 'text', description: 'Subsidiary classification such as corporation, LLC, or branch.' },
  { id: 'country', label: 'Country', fieldType: 'list', sourceType: 'system', sourceKey: 'countries', source: getListSourceText({ sourceType: 'system', sourceKey: 'countries' }), description: 'Country of registration or primary operation.' },
  { id: 'address', label: 'Address', fieldType: 'address', description: 'Mailing or registered office address.' },
  { id: 'taxId', label: 'Tax ID', fieldType: 'text', description: 'Primary tax registration or identification number.' },
  { id: 'registrationNumber', label: 'Registration Number', fieldType: 'text', description: 'Corporate registration number where applicable.' },
  { id: 'parentSubsidiaryId', label: 'Parent Subsidiary', fieldType: 'list', sourceType: 'reference', sourceKey: 'subsidiaries', source: getListSourceText({ sourceType: 'reference', sourceKey: 'subsidiaries' }), description: 'Parent Subsidiary used for hierarchy and consolidation.' },
  { id: 'localCurrencyId', label: 'Local Currency', fieldType: 'list', sourceType: 'reference', sourceKey: 'currencies', source: getListSourceText({ sourceType: 'reference', sourceKey: 'currencies' }), description: 'Local statutory currency used for this subsidiary’s primary books.' },
  { id: 'functionalCurrencyId', label: 'Functional Currency', fieldType: 'list', sourceType: 'reference', sourceKey: 'currencies', source: getListSourceText({ sourceType: 'reference', sourceKey: 'currencies' }), description: 'Currency of the primary economic environment. This may match the country’s local currency, but it can differ when the subsidiary mainly prices, funds, and operates in another currency.' },
  { id: 'groupCurrencyId', label: 'Group Currency', fieldType: 'list', sourceType: 'reference', sourceKey: 'currencies', source: getListSourceText({ sourceType: 'reference', sourceKey: 'currencies' }), description: 'Currency used for consolidated group reporting and translation.' },
  { id: 'fiscalCalendarId', label: 'Fiscal Calendar', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'FISCAL-CALENDAR', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'FISCAL-CALENDAR' }), description: 'Calendar used to derive accounting periods for this subsidiary.' },
  { id: 'accountingStandard', label: 'Accounting Standard', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'ACCOUNTING-STANDARD', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'ACCOUNTING-STANDARD' }), description: 'Primary accounting basis for statutory and close reporting.' },
  { id: 'consolidationMethod', label: 'Consolidation Method', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'CONSOLIDATION-METHOD', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'CONSOLIDATION-METHOD' }), description: 'How the subsidiary participates in consolidation, elimination, or equity-method reporting.' },
  { id: 'ownershipPercent', label: 'Ownership Percent', fieldType: 'number', description: 'Ownership percentage held in the subsidiary.' },
  { id: 'directOwnershipPercent', label: 'Direct Ownership Percent', fieldType: 'number', description: 'Direct ownership percentage held by the immediate parent.' },
  { id: 'ultimateOwnershipPercent', label: 'Ultimate Ownership Percent', fieldType: 'number', description: 'Ultimate group ownership percentage after ownership chain rollup.' },
  { id: 'ownershipEffectiveFrom', label: 'Ownership Effective From', fieldType: 'date', description: 'First date this ownership percentage is effective.' },
  { id: 'ownershipEffectiveThrough', label: 'Ownership Effective Through', fieldType: 'date', description: 'Last date this ownership percentage is effective, if divested or changed.' },
  { id: 'consolidationEffectiveFrom', label: 'Consolidation Effective From', fieldType: 'date', description: 'First date this consolidation method is effective.' },
  { id: 'consolidationEffectiveThrough', label: 'Consolidation Effective Through', fieldType: 'date', description: 'Last date this consolidation method is effective, if changed.' },
  { id: 'controlIndicator', label: 'Control Indicator', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Whether the group controls this subsidiary for consolidation purposes.' },
  { id: 'nciRequired', label: 'NCI Required', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Whether non-controlling interest accounting is required.' },
  { id: 'eliminationTargetParentId', label: 'Elimination Target Parent', fieldType: 'list', sourceType: 'reference', sourceKey: 'subsidiaries', source: getListSourceText({ sourceType: 'reference', sourceKey: 'subsidiaries' }), description: 'Consolidation parent where this elimination subsidiary applies.' },
  { id: 'eliminationScope', label: 'Elimination Scope', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'ELIMINATION-SCOPE', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'ELIMINATION-SCOPE' }), description: 'Kinds of elimination activity this subsidiary supports.' },
  { id: 'eliminationCurrencyBasis', label: 'Elimination Currency Basis', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'ELIMINATION-CURRENCY-BASIS', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'ELIMINATION-CURRENCY-BASIS' }), description: 'Currency basis used when posting elimination journals.' },
  { id: 'retainedEarningsAccountId', label: 'Retained Earnings Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chartOfAccounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chartOfAccounts' }), description: 'Default retained earnings account for close activity.' },
  { id: 'ctaAccountId', label: 'CTA Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chartOfAccounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chartOfAccounts' }), description: 'Cumulative translation adjustment account.' },
  { id: 'intercompanyClearingAccountId', label: 'Intercompany Clearing Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chartOfAccounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chartOfAccounts' }), description: 'Clearing account for intercompany activity.' },
  { id: 'dueToAccountId', label: 'Due To Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chartOfAccounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chartOfAccounts' }), description: 'Default due-to intercompany account.' },
  { id: 'dueFromAccountId', label: 'Due From Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chartOfAccounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chartOfAccounts' }), description: 'Default due-from intercompany account.' },
  { id: 'investmentInSubsidiaryAccountId', label: 'Investment In Subsidiary Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chartOfAccounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chartOfAccounts' }), description: 'Investment account used for ownership and equity eliminations.' },
  { id: 'nciEquityAccountId', label: 'NCI Equity Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chartOfAccounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chartOfAccounts' }), description: 'Equity account for non-controlling interest.' },
  { id: 'nciIncomeStatementAccountId', label: 'NCI Income Statement Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chartOfAccounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chartOfAccounts' }), description: 'Income statement account for non-controlling interest share of earnings.' },
  { id: 'realizedFxGainAccountId', label: 'Realized FX Gain Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chartOfAccounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chartOfAccounts' }), description: 'Subsidiary override for realized FX gains.' },
  { id: 'realizedFxLossAccountId', label: 'Realized FX Loss Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chartOfAccounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chartOfAccounts' }), description: 'Subsidiary override for realized FX losses.' },
  { id: 'unrealizedFxGainAccountId', label: 'Unrealized FX Gain Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chartOfAccounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chartOfAccounts' }), description: 'Subsidiary override for unrealized FX remeasurement gains.' },
  { id: 'unrealizedFxLossAccountId', label: 'Unrealized FX Loss Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chartOfAccounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chartOfAccounts' }), description: 'Subsidiary override for unrealized FX remeasurement losses.' },
  { id: 'allowTransactions', label: 'Allow Transactions', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Whether new business transactions can be posted to this subsidiary.' },
  { id: 'allowBankAccounts', label: 'Allow Bank Accounts', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Whether bank accounts can be assigned to this subsidiary.' },
  { id: 'allowInventory', label: 'Allow Inventory', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Whether inventory locations and inventory activity are allowed.' },
  { id: 'allowPayroll', label: 'Allow Payroll', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Whether payroll activity is allowed for this subsidiary.' },
  { id: 'allowProjects', label: 'Allow Projects', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Whether project activity is allowed for this subsidiary.' },
  { id: 'inactive', label: 'Inactive', fieldType: 'list', sourceType: 'system', sourceKey: 'activeInactive', source: getListSourceText({ sourceType: 'system', sourceKey: 'activeInactive' }), description: 'Marks the subsidiary unavailable for new activity while preserving history.' },
]

export const DEFAULT_SUBSIDIARY_FORM_SECTIONS = [
  'Core',
  'Registration',
  'Hierarchy',
  'Currency',
  'Consolidation',
  'Elimination',
  'Accounting',
  'FX Defaults',
  'Controls',
  'Status',
] as const

export function defaultSubsidiaryFormCustomization(): SubsidiaryFormCustomizationConfig {
  const sectionMap: Record<SubsidiaryFormFieldKey, string> = {
    subsidiaryId: 'Core',
    name: 'Core',
    legalName: 'Registration',
    entityType: 'Registration',
    country: 'Registration',
    address: 'Registration',
    taxId: 'Registration',
    registrationNumber: 'Registration',
    parentSubsidiaryId: 'Hierarchy',
    localCurrencyId: 'Currency',
    functionalCurrencyId: 'Currency',
    groupCurrencyId: 'Currency',
    fiscalCalendarId: 'Currency',
    accountingStandard: 'Accounting',
    consolidationMethod: 'Consolidation',
    ownershipPercent: 'Consolidation',
    directOwnershipPercent: 'Consolidation',
    ultimateOwnershipPercent: 'Consolidation',
    ownershipEffectiveFrom: 'Consolidation',
    ownershipEffectiveThrough: 'Consolidation',
    consolidationEffectiveFrom: 'Consolidation',
    consolidationEffectiveThrough: 'Consolidation',
    controlIndicator: 'Consolidation',
    nciRequired: 'Consolidation',
    eliminationTargetParentId: 'Elimination',
    eliminationScope: 'Elimination',
    eliminationCurrencyBasis: 'Elimination',
    retainedEarningsAccountId: 'Accounting',
    ctaAccountId: 'Accounting',
    intercompanyClearingAccountId: 'Accounting',
    dueToAccountId: 'Accounting',
    dueFromAccountId: 'Accounting',
    investmentInSubsidiaryAccountId: 'Elimination',
    nciEquityAccountId: 'Elimination',
    nciIncomeStatementAccountId: 'Elimination',
    realizedFxGainAccountId: 'FX Defaults',
    realizedFxLossAccountId: 'FX Defaults',
    unrealizedFxGainAccountId: 'FX Defaults',
    unrealizedFxLossAccountId: 'FX Defaults',
    allowTransactions: 'Controls',
    allowBankAccounts: 'Controls',
    allowInventory: 'Controls',
    allowPayroll: 'Controls',
    allowProjects: 'Controls',
    inactive: 'Status',
  }

  const columnMap: Record<SubsidiaryFormFieldKey, number> = {
    subsidiaryId: 1,
    name: 2,
    legalName: 1,
    entityType: 2,
    country: 1,
    address: 2,
    taxId: 1,
    registrationNumber: 2,
    parentSubsidiaryId: 1,
    localCurrencyId: 1,
    functionalCurrencyId: 2,
    groupCurrencyId: 1,
    fiscalCalendarId: 2,
    accountingStandard: 1,
    consolidationMethod: 1,
    ownershipPercent: 2,
    directOwnershipPercent: 1,
    ultimateOwnershipPercent: 2,
    ownershipEffectiveFrom: 1,
    ownershipEffectiveThrough: 2,
    consolidationEffectiveFrom: 1,
    consolidationEffectiveThrough: 2,
    controlIndicator: 1,
    nciRequired: 2,
    eliminationTargetParentId: 1,
    eliminationScope: 2,
    eliminationCurrencyBasis: 1,
    retainedEarningsAccountId: 1,
    ctaAccountId: 2,
    intercompanyClearingAccountId: 1,
    dueToAccountId: 2,
    dueFromAccountId: 1,
    investmentInSubsidiaryAccountId: 1,
    nciEquityAccountId: 2,
    nciIncomeStatementAccountId: 1,
    realizedFxGainAccountId: 1,
    realizedFxLossAccountId: 2,
    unrealizedFxGainAccountId: 1,
    unrealizedFxLossAccountId: 2,
    allowTransactions: 1,
    allowBankAccounts: 2,
    allowInventory: 1,
    allowPayroll: 2,
    allowProjects: 1,
    inactive: 1,
  }

  const rowMap: Record<SubsidiaryFormFieldKey, number> = {
    subsidiaryId: 0,
    name: 0,
    legalName: 0,
    entityType: 0,
    country: 1,
    address: 1,
    taxId: 2,
    registrationNumber: 2,
    parentSubsidiaryId: 0,
    localCurrencyId: 0,
    functionalCurrencyId: 0,
    groupCurrencyId: 1,
    fiscalCalendarId: 1,
    accountingStandard: 0,
    consolidationMethod: 0,
    ownershipPercent: 0,
    directOwnershipPercent: 1,
    ultimateOwnershipPercent: 1,
    ownershipEffectiveFrom: 2,
    ownershipEffectiveThrough: 2,
    consolidationEffectiveFrom: 3,
    consolidationEffectiveThrough: 3,
    controlIndicator: 4,
    nciRequired: 4,
    eliminationTargetParentId: 0,
    eliminationScope: 0,
    eliminationCurrencyBasis: 1,
    retainedEarningsAccountId: 0,
    ctaAccountId: 0,
    intercompanyClearingAccountId: 1,
    dueToAccountId: 1,
    dueFromAccountId: 2,
    investmentInSubsidiaryAccountId: 1,
    nciEquityAccountId: 2,
    nciIncomeStatementAccountId: 2,
    realizedFxGainAccountId: 0,
    realizedFxLossAccountId: 0,
    unrealizedFxGainAccountId: 1,
    unrealizedFxLossAccountId: 1,
    allowTransactions: 0,
    allowBankAccounts: 0,
    allowInventory: 1,
    allowPayroll: 1,
    allowProjects: 2,
    inactive: 0,
  }

  return {
    formColumns: 2,
    sections: [...DEFAULT_SUBSIDIARY_FORM_SECTIONS],
    sectionRows: {
      Core: 1,
      Registration: 3,
      Hierarchy: 1,
      Currency: 2,
      Consolidation: 5,
      Elimination: 3,
      Accounting: 3,
      'FX Defaults': 2,
      Controls: 3,
      Status: 1,
    },
    fields: Object.fromEntries(
      SUBSIDIARY_FORM_FIELDS.map((field) => [
        field.id,
        {
          visible: true,
          section: sectionMap[field.id],
          order: rowMap[field.id],
          column: columnMap[field.id],
        },
      ])
    ) as Record<SubsidiaryFormFieldKey, SubsidiaryFormFieldCustomization>,
    statCards: SUBSIDIARY_STAT_CARDS.map((card, index) => ({
      id: `subsidiary-stat-${card.id}`,
      metric: card.id,
      visible: true,
      order: index,
      size: 'md',
      colorized: true,
      linked: true,
    })),
  }
}
