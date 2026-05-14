import { getListSourceText, type FieldSourceType } from '@/lib/list-source'
import type { TransactionStatCardSlot } from '@/lib/transaction-page-config'

export type ChartOfAccountsFormFieldKey =
  | 'accountId'
  | 'accountNumber'
  | 'name'
  | 'description'
  | 'accountType'
  | 'category'
  | 'normalBalance'
  | 'financialStatementSection'
  | 'financialStatementGroup'
  | 'financialStatementCategory'
  | 'accountRole'
  | 'rollforwardCategory'
  | 'subsidiaryIds'
  | 'includeChildren'
  | 'parentAccountId'
  | 'closeToAccountId'
  | 'isPosting'
  | 'isControlAccount'
  | 'allowsManualPosting'
  | 'requiresSubledgerType'
  | 'cashFlowCategory'
  | 'inventory'
  | 'revalueOpenBalance'
  | 'monetaryClassification'
  | 'translationTreatment'
  | 'eliminateIntercoTransactions'
  | 'summary'
  | 'requiresMonthlyReconciliation'
  | 'reconciliationType'
  | 'closeReviewOwnerId'
  | 'closeReviewFrequency'
  | 'aiReviewEnabled'
  | 'aiRiskLevel'
  | 'autoMatchStrategy'
  | 'materialityThreshold'
  | 'agingReviewRequired'
  | 'reserveReviewRequired'
  | 'writeOffReviewRequired'
  | 'waterfallReviewRequired'
  | 'taxSensitive'
  | 'intercompanyAccount'
  | 'eliminationAccount'
  | 'bankAccountRequired'
  | 'inventoryCostLayerAccount'
  | 'revenueRecognitionAccount'
  | 'deferredCostAccount'
  | 'fixedAssetAccount'
  | 'prepaidAccount'
  | 'accrualAccount'
  | 'clearingAccount'
  | 'suspenseAccount'

export type ChartOfAccountsFormFieldMeta = {
  id: ChartOfAccountsFormFieldKey
  label: string
  fieldType: string
  sourceType?: FieldSourceType
  sourceKey?: string
  source?: string
  description?: string
}

export type ChartOfAccountsFormFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type ChartOfAccountsFormCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<ChartOfAccountsFormFieldKey, ChartOfAccountsFormFieldCustomization>
  statCards?: Array<TransactionStatCardSlot<ChartOfAccountsStatCardMetric>>
}

export type ChartOfAccountsStatCardMetric =
  | 'subsidiaries'
  | 'childAccounts'
  | 'posting'
  | 'summary'

export const CHART_OF_ACCOUNTS_STAT_CARDS: Array<{ id: ChartOfAccountsStatCardMetric; label: string }> = [
  { id: 'subsidiaries', label: 'Subsidiaries' },
  { id: 'childAccounts', label: 'Child Accounts' },
  { id: 'posting', label: 'Posting' },
  { id: 'summary', label: 'Summary' },
]

export const CHART_OF_ACCOUNTS_FORM_FIELDS: ChartOfAccountsFormFieldMeta[] = [
  { id: 'accountId', label: 'Account Id', fieldType: 'text', description: 'System-generated GL account identifier used throughout the platform.' },
  { id: 'accountNumber', label: 'Account Number', fieldType: 'text', description: 'Business-facing GL account number such as 1000 or 760.' },
  { id: 'name', label: 'Name', fieldType: 'text', description: 'Reporting name for the account.' },
  { id: 'description', label: 'Description', fieldType: 'text', description: 'Longer explanation of the account purpose or usage guidance.' },
  { id: 'accountType', label: 'Account Type', fieldType: 'list', sourceType: 'system', sourceKey: 'accountType', source: getListSourceText({ sourceType: 'system', sourceKey: 'accountType' }), description: 'Broad accounting classification for the account.' },
  { id: 'category', label: 'Account Category', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-COA-ACCOUNT-CATEGORY', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-COA-ACCOUNT-CATEGORY' }), description: 'Controlled accounting-policy category used to derive FS presentation, remeasurement, monetary classification, and translation treatment.' },
  { id: 'normalBalance', label: 'Normal Balance', fieldType: 'list', sourceType: 'system', sourceKey: 'normalBalance', source: getListSourceText({ sourceType: 'system', sourceKey: 'normalBalance' }), description: 'Default debit or credit orientation for the account.' },
  { id: 'financialStatementSection', label: 'FS Section', fieldType: 'text', description: 'Financial statement section used for rollups and presentation.' },
  { id: 'financialStatementGroup', label: 'FS Group', fieldType: 'text', description: 'More granular reporting group under the statement section.' },
  { id: 'financialStatementCategory', label: 'FS Category', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-COA-FS-CATEGORY', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-COA-FS-CATEGORY' }), description: 'Detailed reporting category such as Cash, AR, Inventory, AP, or FX.' },
  { id: 'accountRole', label: 'Account Role', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-COA-ACCOUNT-ROLE', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-COA-ACCOUNT-ROLE' }), description: 'Operational role used for shared dropdown filters, defaults, and system account selection.' },
  { id: 'rollforwardCategory', label: 'Rollforward Category', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-COA-ROLLFORWARD-CATEGORY', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-COA-ROLLFORWARD-CATEGORY' }), description: 'Controlled rollforward grouping used to govern downstream balance movement reporting.' },
  { id: 'subsidiaryIds', label: 'Subsidiaries', fieldType: 'list', sourceType: 'reference', sourceKey: 'subsidiaries', source: getListSourceText({ sourceType: 'reference', sourceKey: 'subsidiaries' }), description: 'Subsidiaries where this GL account is available.' },
  { id: 'includeChildren', label: 'Include Children', fieldType: 'boolean', description: 'If enabled, child subsidiaries under selected subsidiaries also inherit account availability.' },
  { id: 'parentAccountId', label: 'Parent Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chartOfAccounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chartOfAccounts' }), description: 'Rollup parent for hierarchical reporting.' },
  { id: 'closeToAccountId', label: 'Close To Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chartOfAccounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chartOfAccounts' }), description: 'Target account used when closing temporary balances.' },
  { id: 'isPosting', label: 'Posting Account', fieldType: 'boolean', description: 'Controls whether journals can post directly to this account.' },
  { id: 'isControlAccount', label: 'Control Account', fieldType: 'boolean', description: 'Marks accounts managed primarily by subledgers or protected processes.' },
  { id: 'allowsManualPosting', label: 'Allow Manual Posting', fieldType: 'boolean', description: 'Determines whether users can manually post journals to this account.' },
  { id: 'requiresSubledgerType', label: 'Requires Subledger Type', fieldType: 'list', sourceType: 'system', sourceKey: 'subledgerType', source: getListSourceText({ sourceType: 'system', sourceKey: 'subledgerType' }), description: 'Policy-derived subledger dimension required when this account is posted, such as Customer, Vendor, Item, Employee, Tax Authority, or Intercompany Partner.' },
  { id: 'cashFlowCategory', label: 'Cash Flow Category', fieldType: 'list', sourceType: 'system', sourceKey: 'cashFlowCategory', source: getListSourceText({ sourceType: 'system', sourceKey: 'cashFlowCategory' }), description: 'Policy-derived cash flow classification used for operating, investing, financing, or cash-and-cash-equivalents presentation.' },
  { id: 'inventory', label: 'Inventory', fieldType: 'boolean', description: 'Flags the account as inventory-related for downstream logic and reporting.' },
  { id: 'revalueOpenBalance', label: 'Remeasure Open Balance', fieldType: 'boolean', description: 'Enables period-end FX remeasurement for monetary foreign-currency open balances. Do not use for historical-cost releases like prepaid amortization, deferred revenue recognition, fixed asset depreciation, or inventory cost relief.' },
  { id: 'monetaryClassification', label: 'Monetary Classification', fieldType: 'list', sourceType: 'system', sourceKey: 'monetaryClassification', source: getListSourceText({ sourceType: 'system', sourceKey: 'monetaryClassification' }), description: 'Accounting policy classification that determines whether balances are monetary, historical-cost, equity, or P&L flow accounts.' },
  { id: 'translationTreatment', label: 'Translation Treatment', fieldType: 'list', sourceType: 'system', sourceKey: 'translationTreatment', source: getListSourceText({ sourceType: 'system', sourceKey: 'translationTreatment' }), description: 'Consolidation translation basis for group reporting. CTA is driven by consolidation policy, not by this account alone.' },
  { id: 'eliminateIntercoTransactions', label: 'Eliminate Interco Transactions', fieldType: 'boolean', description: 'Marks the account for intercompany elimination handling.' },
  { id: 'summary', label: 'Summary', fieldType: 'boolean', description: 'Indicates a header or summary account rather than a direct posting account.' },
  { id: 'requiresMonthlyReconciliation', label: 'Requires Monthly Reconciliation', fieldType: 'boolean', description: 'Requires this balance to be reconciled during the monthly close.' },
  { id: 'reconciliationType', label: 'Reconciliation Type', fieldType: 'list', sourceType: 'system', sourceKey: 'reconciliationType', source: getListSourceText({ sourceType: 'system', sourceKey: 'reconciliationType' }), description: 'Close method expected for this account, such as bank rec, subledger tie-out, rollforward, waterfall, or support schedule.' },
  { id: 'closeReviewOwnerId', label: 'Close Review Owner', fieldType: 'list', sourceType: 'reference', sourceKey: 'users', source: getListSourceText({ sourceType: 'reference', sourceKey: 'users' }), description: 'Default owner responsible for reviewing this account during close.' },
  { id: 'closeReviewFrequency', label: 'Close Review Frequency', fieldType: 'list', sourceType: 'system', sourceKey: 'closeReviewFrequency', source: getListSourceText({ sourceType: 'system', sourceKey: 'closeReviewFrequency' }), description: 'How often the account should be reviewed during close.' },
  { id: 'aiReviewEnabled', label: 'AI Review Enabled', fieldType: 'boolean', description: 'Allows close automation to review balances, detect anomalies, and recommend supporting schedules.' },
  { id: 'aiRiskLevel', label: 'AI Risk Level', fieldType: 'list', sourceType: 'system', sourceKey: 'aiRiskLevel', source: getListSourceText({ sourceType: 'system', sourceKey: 'aiRiskLevel' }), description: 'Risk tier used to prioritize AI review, exception surfacing, and human approval.' },
  { id: 'autoMatchStrategy', label: 'Auto-Match Strategy', fieldType: 'list', sourceType: 'system', sourceKey: 'autoMatchStrategy', source: getListSourceText({ sourceType: 'system', sourceKey: 'autoMatchStrategy' }), description: 'Default automation strategy for reconciling or matching this account.' },
  { id: 'materialityThreshold', label: 'Materiality Threshold', fieldType: 'number', description: 'Optional account-level threshold for AI close review and exception surfacing.' },
  { id: 'agingReviewRequired', label: 'Aging Review Required', fieldType: 'boolean', description: 'Requires aging review during close, typically for AR and AP.' },
  { id: 'reserveReviewRequired', label: 'Reserve Review Required', fieldType: 'boolean', description: 'Requires reserve review, such as allowance or inventory reserve analysis.' },
  { id: 'writeOffReviewRequired', label: 'Write-Off Review Required', fieldType: 'boolean', description: 'Requires write-off candidate review, typically for AR exposure.' },
  { id: 'waterfallReviewRequired', label: 'Waterfall Review Required', fieldType: 'boolean', description: 'Requires deferred, prepaid, fixed asset, or amortization waterfall review.' },
  { id: 'taxSensitive', label: 'Tax Sensitive', fieldType: 'boolean', description: 'Flags accounts that may require tax close review or tax reporting controls.' },
  { id: 'intercompanyAccount', label: 'Intercompany Account', fieldType: 'boolean', description: 'Flags accounts used for intercompany receivables, payables, settlement, or eliminations.' },
  { id: 'eliminationAccount', label: 'Elimination Account', fieldType: 'boolean', description: 'Flags accounts used for consolidation elimination or CTA-style close activity.' },
  { id: 'bankAccountRequired', label: 'Bank Account Required', fieldType: 'boolean', description: 'Requires a bank account reference for posting or reconciliation.' },
  { id: 'inventoryCostLayerAccount', label: 'Inventory Cost Layer Account', fieldType: 'boolean', description: 'Flags accounts tied to inventory cost layers or inventory relief.' },
  { id: 'revenueRecognitionAccount', label: 'Revenue Recognition Account', fieldType: 'boolean', description: 'Flags accounts tied to revenue arrangements, elements, plans, and recognition runs.' },
  { id: 'deferredCostAccount', label: 'Deferred Cost Account', fieldType: 'boolean', description: 'Flags accounts used for deferred cost capitalization and amortization.' },
  { id: 'fixedAssetAccount', label: 'Fixed Asset Account', fieldType: 'boolean', description: 'Flags accounts used for fixed asset capitalization, depreciation, or accumulated depreciation.' },
  { id: 'prepaidAccount', label: 'Prepaid Account', fieldType: 'boolean', description: 'Flags accounts used for prepaid schedules and amortization.' },
  { id: 'accrualAccount', label: 'Accrual Account', fieldType: 'boolean', description: 'Flags accounts used for accrued expenses, accrued revenue, or payroll liabilities.' },
  { id: 'clearingAccount', label: 'Clearing Account', fieldType: 'boolean', description: 'Flags temporary clearing accounts requiring close monitoring.' },
  { id: 'suspenseAccount', label: 'Suspense Account', fieldType: 'boolean', description: 'Flags suspense accounts that should be cleared or explained during close.' },
]

export const DEFAULT_CHART_OF_ACCOUNTS_FORM_SECTIONS = [
  'Core',
  'Reporting',
  'Structure',
  'Controls',
  'Close Automation',
  'System Behavior',
] as const

export function defaultChartOfAccountsFormCustomization(): ChartOfAccountsFormCustomizationConfig {
  const sectionMap: Record<ChartOfAccountsFormFieldKey, string> = {
    accountId: 'Core',
    accountNumber: 'Core',
    name: 'Core',
    description: 'Core',
    accountType: 'Core',
    category: 'Core',
    normalBalance: 'Reporting',
    financialStatementSection: 'Reporting',
    financialStatementGroup: 'Reporting',
    financialStatementCategory: 'Reporting',
    accountRole: 'Reporting',
    rollforwardCategory: 'Reporting',
    cashFlowCategory: 'Reporting',
    subsidiaryIds: 'Structure',
    includeChildren: 'Structure',
    parentAccountId: 'Structure',
    closeToAccountId: 'Structure',
    requiresSubledgerType: 'Structure',
    isPosting: 'Controls',
    isControlAccount: 'Controls',
    allowsManualPosting: 'Controls',
    inventory: 'Controls',
    revalueOpenBalance: 'Controls',
    monetaryClassification: 'Controls',
    translationTreatment: 'Controls',
    eliminateIntercoTransactions: 'Controls',
    summary: 'Controls',
    requiresMonthlyReconciliation: 'Close Automation',
    reconciliationType: 'Close Automation',
    closeReviewOwnerId: 'Close Automation',
    closeReviewFrequency: 'Close Automation',
    aiReviewEnabled: 'Close Automation',
    aiRiskLevel: 'Close Automation',
    autoMatchStrategy: 'Close Automation',
    materialityThreshold: 'Close Automation',
    agingReviewRequired: 'Close Automation',
    reserveReviewRequired: 'Close Automation',
    writeOffReviewRequired: 'Close Automation',
    waterfallReviewRequired: 'Close Automation',
    taxSensitive: 'System Behavior',
    intercompanyAccount: 'System Behavior',
    eliminationAccount: 'System Behavior',
    bankAccountRequired: 'System Behavior',
    inventoryCostLayerAccount: 'System Behavior',
    revenueRecognitionAccount: 'System Behavior',
    deferredCostAccount: 'System Behavior',
    fixedAssetAccount: 'System Behavior',
    prepaidAccount: 'System Behavior',
    accrualAccount: 'System Behavior',
    clearingAccount: 'System Behavior',
    suspenseAccount: 'System Behavior',
  }

  const columnMap: Record<ChartOfAccountsFormFieldKey, number> = {
    accountId: 1,
    accountNumber: 2,
    name: 1,
    description: 2,
    accountType: 1,
    category: 2,
    normalBalance: 1,
    financialStatementSection: 2,
    financialStatementGroup: 1,
    financialStatementCategory: 2,
    accountRole: 1,
    rollforwardCategory: 2,
    cashFlowCategory: 1,
    subsidiaryIds: 1,
    includeChildren: 2,
    parentAccountId: 1,
    closeToAccountId: 2,
    requiresSubledgerType: 1,
    isPosting: 1,
    isControlAccount: 2,
    allowsManualPosting: 1,
    inventory: 2,
    revalueOpenBalance: 1,
    monetaryClassification: 1,
    translationTreatment: 2,
    eliminateIntercoTransactions: 2,
    summary: 1,
    requiresMonthlyReconciliation: 1,
    reconciliationType: 2,
    closeReviewOwnerId: 1,
    closeReviewFrequency: 2,
    aiReviewEnabled: 1,
    aiRiskLevel: 2,
    autoMatchStrategy: 1,
    materialityThreshold: 2,
    agingReviewRequired: 1,
    reserveReviewRequired: 2,
    writeOffReviewRequired: 1,
    waterfallReviewRequired: 2,
    taxSensitive: 1,
    intercompanyAccount: 2,
    eliminationAccount: 1,
    bankAccountRequired: 2,
    inventoryCostLayerAccount: 1,
    revenueRecognitionAccount: 2,
    deferredCostAccount: 1,
    fixedAssetAccount: 2,
    prepaidAccount: 1,
    accrualAccount: 2,
    clearingAccount: 1,
    suspenseAccount: 2,
  }

  const rowMap: Record<ChartOfAccountsFormFieldKey, number> = {
    accountId: 0,
    accountNumber: 0,
    name: 1,
    description: 1,
    accountType: 2,
    category: 2,
    normalBalance: 0,
    financialStatementSection: 0,
    financialStatementGroup: 1,
    financialStatementCategory: 1,
    accountRole: 2,
    rollforwardCategory: 3,
    cashFlowCategory: 4,
    subsidiaryIds: 0,
    includeChildren: 0,
    parentAccountId: 1,
    closeToAccountId: 1,
    requiresSubledgerType: 2,
    isPosting: 0,
    isControlAccount: 0,
    allowsManualPosting: 1,
    inventory: 1,
    revalueOpenBalance: 2,
    monetaryClassification: 3,
    translationTreatment: 3,
    eliminateIntercoTransactions: 4,
    summary: 4,
    requiresMonthlyReconciliation: 0,
    reconciliationType: 0,
    closeReviewOwnerId: 1,
    closeReviewFrequency: 1,
    aiReviewEnabled: 2,
    aiRiskLevel: 2,
    autoMatchStrategy: 3,
    materialityThreshold: 3,
    agingReviewRequired: 4,
    reserveReviewRequired: 4,
    writeOffReviewRequired: 5,
    waterfallReviewRequired: 5,
    taxSensitive: 0,
    intercompanyAccount: 0,
    eliminationAccount: 1,
    bankAccountRequired: 1,
    inventoryCostLayerAccount: 2,
    revenueRecognitionAccount: 2,
    deferredCostAccount: 3,
    fixedAssetAccount: 3,
    prepaidAccount: 4,
    accrualAccount: 4,
    clearingAccount: 5,
    suspenseAccount: 5,
  }

  return {
    formColumns: 2,
    sections: [...DEFAULT_CHART_OF_ACCOUNTS_FORM_SECTIONS],
    sectionRows: {
      Core: 3,
      Reporting: 5,
      Structure: 3,
      Controls: 5,
      'Close Automation': 6,
      'System Behavior': 6,
    },
    fields: Object.fromEntries(
      CHART_OF_ACCOUNTS_FORM_FIELDS.map((field) => [
        field.id,
        {
          visible: true,
          section: sectionMap[field.id],
          order: rowMap[field.id],
          column: columnMap[field.id],
        },
      ])
    ) as Record<ChartOfAccountsFormFieldKey, ChartOfAccountsFormFieldCustomization>,
    statCards: CHART_OF_ACCOUNTS_STAT_CARDS.map((card, index) => ({
      id: `chart-of-accounts-stat-${card.id}`,
      metric: card.id,
      visible: true,
      order: index,
      size: 'md',
      colorized: true,
      linked: true,
    })),
  }
}
