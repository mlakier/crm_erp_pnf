export type ChartOfAccountsFormFieldKey =
  | 'accountId'
  | 'name'
  | 'description'
  | 'accountType'
  | 'normalBalance'
  | 'financialStatementSection'
  | 'financialStatementGroup'
  | 'parentAccountId'
  | 'closeToAccountId'
  | 'isPosting'
  | 'isControlAccount'
  | 'allowsManualPosting'
  | 'requiresSubledgerType'
  | 'cashFlowCategory'
  | 'inventory'
  | 'revalueOpenBalance'
  | 'eliminateIntercoTransactions'
  | 'summary'

export type ChartOfAccountsFormFieldMeta = {
  id: ChartOfAccountsFormFieldKey
  label: string
  fieldType: string
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
}

export const CHART_OF_ACCOUNTS_FORM_FIELDS: ChartOfAccountsFormFieldMeta[] = [
  { id: 'accountId', label: 'Account Id', fieldType: 'text', description: 'Unique account number or code used throughout the ledger.' },
  { id: 'name', label: 'Name', fieldType: 'text', description: 'Reporting name for the account.' },
  { id: 'description', label: 'Description', fieldType: 'text', description: 'Longer explanation of the account purpose or usage guidance.' },
  { id: 'accountType', label: 'Account Type', fieldType: 'list', source: 'System account type values', description: 'Broad accounting classification for the account.' },
  { id: 'normalBalance', label: 'Normal Balance', fieldType: 'list', source: 'System balance values', description: 'Default debit or credit orientation for the account.' },
  { id: 'financialStatementSection', label: 'FS Section', fieldType: 'text', description: 'Financial statement section used for rollups and presentation.' },
  { id: 'financialStatementGroup', label: 'FS Group', fieldType: 'text', description: 'More granular reporting group under the statement section.' },
  { id: 'parentAccountId', label: 'Parent Account', fieldType: 'list', source: 'Chart of Accounts master data', description: 'Rollup parent for hierarchical reporting.' },
  { id: 'closeToAccountId', label: 'Close To Account', fieldType: 'list', source: 'Chart of Accounts master data', description: 'Target account used when closing temporary balances.' },
  { id: 'isPosting', label: 'Posting Account', fieldType: 'boolean', description: 'Controls whether journals can post directly to this account.' },
  { id: 'isControlAccount', label: 'Control Account', fieldType: 'boolean', description: 'Marks accounts managed primarily by subledgers or protected processes.' },
  { id: 'allowsManualPosting', label: 'Allow Manual Posting', fieldType: 'boolean', description: 'Determines whether users can manually post journals to this account.' },
  { id: 'requiresSubledgerType', label: 'Requires Subledger Type', fieldType: 'text', description: 'Optional validation hint for the related subledger dimension.' },
  { id: 'cashFlowCategory', label: 'Cash Flow Category', fieldType: 'text', description: 'Classification used for operating, investing, or financing cash flow reporting.' },
  { id: 'inventory', label: 'Inventory', fieldType: 'boolean', description: 'Flags the account as inventory-related for downstream logic and reporting.' },
  { id: 'revalueOpenBalance', label: 'Revalue Open Balance', fieldType: 'boolean', description: 'Controls whether open balances are revalued for FX processes.' },
  { id: 'eliminateIntercoTransactions', label: 'Eliminate Interco Transactions', fieldType: 'boolean', description: 'Marks the account for intercompany elimination handling.' },
  { id: 'summary', label: 'Summary', fieldType: 'boolean', description: 'Indicates a header or summary account rather than a direct posting account.' },
]

export const DEFAULT_CHART_OF_ACCOUNTS_FORM_SECTIONS = [
  'Core',
  'Reporting',
  'Structure',
  'Controls',
] as const

export function defaultChartOfAccountsFormCustomization(): ChartOfAccountsFormCustomizationConfig {
  const sectionMap: Record<ChartOfAccountsFormFieldKey, string> = {
    accountId: 'Core',
    name: 'Core',
    description: 'Core',
    accountType: 'Core',
    normalBalance: 'Reporting',
    financialStatementSection: 'Reporting',
    financialStatementGroup: 'Reporting',
    cashFlowCategory: 'Reporting',
    parentAccountId: 'Structure',
    closeToAccountId: 'Structure',
    requiresSubledgerType: 'Structure',
    isPosting: 'Controls',
    isControlAccount: 'Controls',
    allowsManualPosting: 'Controls',
    inventory: 'Controls',
    revalueOpenBalance: 'Controls',
    eliminateIntercoTransactions: 'Controls',
    summary: 'Controls',
  }

  const columnMap: Record<ChartOfAccountsFormFieldKey, number> = {
    accountId: 1,
    name: 2,
    description: 1,
    accountType: 2,
    normalBalance: 1,
    financialStatementSection: 2,
    financialStatementGroup: 1,
    cashFlowCategory: 2,
    parentAccountId: 1,
    closeToAccountId: 2,
    requiresSubledgerType: 1,
    isPosting: 1,
    isControlAccount: 2,
    allowsManualPosting: 1,
    inventory: 2,
    revalueOpenBalance: 1,
    eliminateIntercoTransactions: 2,
    summary: 1,
  }

  const rowMap: Record<ChartOfAccountsFormFieldKey, number> = {
    accountId: 0,
    name: 0,
    description: 1,
    accountType: 1,
    normalBalance: 0,
    financialStatementSection: 0,
    financialStatementGroup: 1,
    cashFlowCategory: 1,
    parentAccountId: 0,
    closeToAccountId: 0,
    requiresSubledgerType: 1,
    isPosting: 0,
    isControlAccount: 0,
    allowsManualPosting: 1,
    inventory: 1,
    revalueOpenBalance: 2,
    eliminateIntercoTransactions: 2,
    summary: 3,
  }

  return {
    formColumns: 2,
    sections: [...DEFAULT_CHART_OF_ACCOUNTS_FORM_SECTIONS],
    sectionRows: {
      Core: 2,
      Reporting: 2,
      Structure: 2,
      Controls: 4,
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
  }
}
