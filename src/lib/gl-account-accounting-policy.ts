export type GlMonetaryClassification =
  | 'monetary'
  | 'non_monetary_historical_cost'
  | 'equity_historical'
  | 'p_and_l_flow'

export type GlTranslationTreatment =
  | 'closing_rate'
  | 'average_rate'
  | 'historical_rate'
  | 'no_translation'

export type GlAccountingPolicyInput = {
  accountType?: string | null
  category?: string | null
  name?: string | null
  financialStatementCategory?: string | null
  accountRole?: string | null
  rollforwardCategory?: string | null
  inventory?: boolean | null
  revalueOpenBalance?: boolean | null
  monetaryClassification?: string | null
  translationTreatment?: string | null
  isPosting?: boolean | null
  summary?: boolean | null
}

export type GlAccountCategoryPolicy = {
  category: string
  accountTypes: string[]
  normalBalance: 'debit' | 'credit'
  financialStatementSection: string
  financialStatementGroup: string
  financialStatementCategory: string
  rollforwardCategory: string
  accountRole: string
  inventory: boolean
  revalueOpenBalance: boolean
  isControlAccount: boolean
  allowsManualPosting: boolean
  requiresSubledgerType: string | null
  cashFlowCategory: string | null
  requiresMonthlyReconciliation: boolean
  reconciliationType: string | null
  closeReviewFrequency: string | null
  aiReviewEnabled: boolean
  aiRiskLevel: string | null
  autoMatchStrategy: string | null
  materialityThreshold: string | null
  agingReviewRequired: boolean
  reserveReviewRequired: boolean
  writeOffReviewRequired: boolean
  waterfallReviewRequired: boolean
  taxSensitive: boolean
  intercompanyAccount: boolean
  eliminationAccount: boolean
  bankAccountRequired: boolean
  inventoryCostLayerAccount: boolean
  revenueRecognitionAccount: boolean
  deferredCostAccount: boolean
  fixedAssetAccount: boolean
  prepaidAccount: boolean
  accrualAccount: boolean
  clearingAccount: boolean
  suspenseAccount: boolean
  monetaryClassification: GlMonetaryClassification
  translationTreatment: GlTranslationTreatment
  releaseFxBasis?: 'current_or_average_rate' | 'historical_source_layer'
}

export type GlAccountingPolicyWarning = {
  severity: 'error' | 'warning' | 'info'
  message: string
}

export const MONETARY_CLASSIFICATION_OPTIONS: Array<{ value: GlMonetaryClassification; label: string }> = [
  { value: 'monetary', label: 'Monetary Open Balance' },
  { value: 'non_monetary_historical_cost', label: 'Non-Monetary Historical Cost' },
  { value: 'equity_historical', label: 'Equity / Historical' },
  { value: 'p_and_l_flow', label: 'P&L Flow Account' },
]

export const TRANSLATION_TREATMENT_OPTIONS: Array<{ value: GlTranslationTreatment; label: string }> = [
  { value: 'closing_rate', label: 'Closing Rate' },
  { value: 'average_rate', label: 'Average Rate' },
  { value: 'historical_rate', label: 'Historical Rate' },
  { value: 'no_translation', label: 'No Translation / Statistical' },
]

export const GL_ACCOUNT_CATEGORY_POLICIES: GlAccountCategoryPolicy[] = [
  categoryPolicy('Cash', ['Asset'], 'debit', 'Balance Sheet', 'Current Assets', 'Cash', 'Cash and Cash Equivalents', 'Cash Account', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Bank Account', ['Asset'], 'debit', 'Balance Sheet', 'Current Assets', 'Cash', 'Cash and Cash Equivalents', 'Bank Account', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Accounts Receivable', ['Asset'], 'debit', 'Balance Sheet', 'Current Assets', 'Accounts Receivable', 'Accounts Receivable', 'AR Trade', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Allowance for Doubtful Accounts', ['Asset'], 'credit', 'Balance Sheet', 'Current Assets', 'Accounts Receivable', 'Accounts Receivable', 'AR Allowance', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Unapplied Cash', ['Asset'], 'credit', 'Balance Sheet', 'Current Assets', 'Accounts Receivable', 'Accounts Receivable', 'AR Trade', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Intercompany Receivable', ['Asset'], 'debit', 'Balance Sheet', 'Current Assets', 'Intercompany Receivable', 'Intercompany', 'Intercompany Receivable', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Tax Receivable', ['Asset'], 'debit', 'Balance Sheet', 'Current Assets', 'Tax Receivable', 'Other Assets', 'Tax Receivable', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Notes Receivable', ['Asset'], 'debit', 'Balance Sheet', 'Long-Term Assets', 'Notes Receivable', 'Other Assets', 'Not Applicable', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Employee Advance', ['Asset'], 'debit', 'Balance Sheet', 'Current Assets', 'Other Current Assets', 'Other Assets', 'Not Applicable', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Deposit / Advance Asset', ['Asset'], 'debit', 'Balance Sheet', 'Current Assets', 'Other Current Assets', 'Prepaids and Other Current Assets', 'Prepaid Asset', false, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Accrued Revenue / Contract Asset', ['Asset'], 'debit', 'Balance Sheet', 'Current Assets', 'Contract Assets', 'Other Assets', 'Not Applicable', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Inventory', ['Asset'], 'debit', 'Balance Sheet', 'Current Assets', 'Inventory', 'Inventory', 'Inventory', true, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Inventory Reserve', ['Asset'], 'credit', 'Balance Sheet', 'Current Assets', 'Inventory', 'Inventory', 'Inventory Reserve', true, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Prepaid Expense', ['Asset'], 'debit', 'Balance Sheet', 'Current Assets', 'Prepaids', 'Prepaids and Other Current Assets', 'Prepaid Asset', false, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Deferred Cost', ['Asset'], 'debit', 'Balance Sheet', 'Current Assets', 'Deferred Costs', 'Prepaids and Other Current Assets', 'Deferred Cost', false, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Deferred Tax Asset', ['Asset'], 'debit', 'Balance Sheet', 'Long-Term Assets', 'Deferred Tax Assets', 'Other Assets', 'Tax Receivable', false, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Fixed Asset', ['Asset'], 'debit', 'Balance Sheet', 'Long-Term Assets', 'Fixed Assets', 'Fixed Assets', 'Fixed Asset', false, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Accumulated Depreciation', ['Asset'], 'credit', 'Balance Sheet', 'Long-Term Assets', 'Accumulated Depreciation and Amortization', 'Accumulated Depreciation and Amortization', 'Accumulated Depreciation', false, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Right-of-Use Asset', ['Asset'], 'debit', 'Balance Sheet', 'Long-Term Assets', 'Right-of-Use Assets', 'Fixed Assets', 'Fixed Asset', false, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Intangible Asset', ['Asset'], 'debit', 'Balance Sheet', 'Long-Term Assets', 'Intangible Assets', 'Fixed Assets', 'Intangible Asset', false, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Goodwill', ['Asset'], 'debit', 'Balance Sheet', 'Long-Term Assets', 'Goodwill', 'Fixed Assets', 'Intangible Asset', false, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Accumulated Amortization', ['Asset'], 'credit', 'Balance Sheet', 'Long-Term Assets', 'Accumulated Depreciation and Amortization', 'Accumulated Depreciation and Amortization', 'Accumulated Amortization', false, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Investment', ['Asset'], 'debit', 'Balance Sheet', 'Long-Term Assets', 'Investments', 'Other Assets', 'Investment', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Other Current Asset', ['Asset'], 'debit', 'Balance Sheet', 'Current Assets', 'Other Current Assets', 'Other Assets', 'Not Applicable', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Other Non-current Asset', ['Asset'], 'debit', 'Balance Sheet', 'Long-Term Assets', 'Other Non-current Assets', 'Other Assets', 'Not Applicable', false, true, 'monetary', 'closing_rate'),

  categoryPolicy('Accounts Payable', ['Liability'], 'credit', 'Balance Sheet', 'Current Liabilities', 'Accounts Payable', 'Accounts Payable', 'AP Trade', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Credit Card Payable', ['Liability'], 'credit', 'Balance Sheet', 'Current Liabilities', 'Credit Card Payable', 'Accounts Payable', 'AP Trade', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Accrued Expense', ['Liability'], 'credit', 'Balance Sheet', 'Current Liabilities', 'Accrued Expenses', 'Accrued Expenses', 'Accrued Expense', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Payroll Liability', ['Liability'], 'credit', 'Balance Sheet', 'Current Liabilities', 'Accrued Expenses', 'Accrued Expenses', 'Payroll Liability', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Tax Payable', ['Liability'], 'credit', 'Balance Sheet', 'Current Liabilities', 'Tax Payable', 'Other Liabilities', 'Tax Payable', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Intercompany Payable', ['Liability'], 'credit', 'Balance Sheet', 'Current Liabilities', 'Intercompany Payable', 'Intercompany', 'Intercompany Payable', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Loan / Debt', ['Liability'], 'credit', 'Balance Sheet', 'Long-Term Liabilities', 'Debt', 'Debt', 'Debt', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Deferred Revenue', ['Liability'], 'credit', 'Balance Sheet', 'Current Liabilities', 'Deferred Revenue', 'Deferred Revenue', 'Deferred Revenue', false, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Customer Deposit', ['Liability'], 'credit', 'Balance Sheet', 'Current Liabilities', 'Deferred Revenue', 'Deferred Revenue', 'Deferred Revenue', false, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Contract Liability', ['Liability'], 'credit', 'Balance Sheet', 'Current Liabilities', 'Deferred Revenue', 'Deferred Revenue', 'Deferred Revenue', false, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Deferred Tax Liability', ['Liability'], 'credit', 'Balance Sheet', 'Long-Term Liabilities', 'Deferred Tax Liabilities', 'Other Liabilities', 'Tax Payable', false, false, 'non_monetary_historical_cost', 'closing_rate'),
  categoryPolicy('Other Current Liability', ['Liability'], 'credit', 'Balance Sheet', 'Current Liabilities', 'Other Current Liabilities', 'Other Liabilities', 'Not Applicable', false, true, 'monetary', 'closing_rate'),
  categoryPolicy('Other Non-current Liability', ['Liability'], 'credit', 'Balance Sheet', 'Long-Term Liabilities', 'Other Non-current Liabilities', 'Other Liabilities', 'Not Applicable', false, true, 'monetary', 'closing_rate'),

  categoryPolicy('Common Stock', ['Equity'], 'credit', 'Balance Sheet', 'Equity', 'Common Stock', 'Equity', 'Equity', false, false, 'equity_historical', 'historical_rate'),
  categoryPolicy('Preferred Stock', ['Equity'], 'credit', 'Balance Sheet', 'Equity', 'Preferred Stock', 'Equity', 'Equity', false, false, 'equity_historical', 'historical_rate'),
  categoryPolicy('Additional Paid-in Capital', ['Equity'], 'credit', 'Balance Sheet', 'Equity', 'Additional Paid-in Capital', 'Equity', 'Equity', false, false, 'equity_historical', 'historical_rate'),
  categoryPolicy('Retained Earnings', ['Equity'], 'credit', 'Balance Sheet', 'Equity', 'Retained Earnings', 'Equity', 'Equity', false, false, 'equity_historical', 'historical_rate'),
  categoryPolicy('Dividends / Distributions', ['Equity'], 'debit', 'Balance Sheet', 'Equity', 'Dividends and Distributions', 'Equity', 'Equity', false, false, 'equity_historical', 'historical_rate'),
  categoryPolicy('CTA / Currency Translation Adjustment', ['Equity'], 'credit', 'Balance Sheet', 'Equity', 'Currency Translation Adjustment', 'Equity', 'CTA', false, false, 'equity_historical', 'historical_rate'),

  categoryPolicy('Product Revenue', ['Revenue'], 'credit', 'Income Statement', 'Revenue', 'Product Revenue', 'Not Applicable', 'Revenue', false, false, 'p_and_l_flow', 'average_rate'),
  categoryPolicy('Service Revenue', ['Revenue'], 'credit', 'Income Statement', 'Revenue', 'Service Revenue', 'Not Applicable', 'Revenue', false, false, 'p_and_l_flow', 'average_rate'),
  categoryPolicy('Subscription Revenue', ['Revenue'], 'credit', 'Income Statement', 'Revenue', 'Subscription Revenue', 'Not Applicable', 'Revenue', false, false, 'p_and_l_flow', 'average_rate', 'historical_source_layer'),
  categoryPolicy('Deferred Revenue Release', ['Revenue'], 'credit', 'Income Statement', 'Revenue', 'Revenue Recognition', 'Deferred Revenue', 'Revenue', false, false, 'p_and_l_flow', 'average_rate', 'historical_source_layer'),
  categoryPolicy('Discount / Contra Revenue', ['Revenue'], 'debit', 'Income Statement', 'Revenue', 'Discounts and Contra Revenue', 'Not Applicable', 'Contra Revenue', false, false, 'p_and_l_flow', 'average_rate'),
  categoryPolicy('Returns and Rebates', ['Revenue'], 'debit', 'Income Statement', 'Revenue', 'Returns and Rebates', 'Not Applicable', 'Contra Revenue', false, false, 'p_and_l_flow', 'average_rate'),
  categoryPolicy('Other Revenue', ['Revenue'], 'credit', 'Income Statement', 'Revenue', 'Other Revenue', 'Not Applicable', 'Revenue', false, false, 'p_and_l_flow', 'average_rate'),

  categoryPolicy('Cost of Goods Sold', ['Expense'], 'debit', 'Income Statement', 'Cost of Sales', 'Cost of Goods Sold', 'Not Applicable', 'COGS', false, false, 'p_and_l_flow', 'average_rate', 'historical_source_layer'),
  categoryPolicy('Deferred Cost Amortization', ['Expense'], 'debit', 'Income Statement', 'Cost of Sales', 'Deferred Cost Amortization', 'Prepaids and Other Current Assets', 'Deferred Cost Amortization', false, false, 'p_and_l_flow', 'average_rate', 'historical_source_layer'),
  categoryPolicy('Prepaid Amortization', ['Expense'], 'debit', 'Income Statement', 'Operating Expenses', 'Prepaid Amortization', 'Prepaids and Other Current Assets', 'Prepaid Amortization', false, false, 'p_and_l_flow', 'average_rate', 'historical_source_layer'),
  categoryPolicy('Depreciation Expense', ['Expense'], 'debit', 'Income Statement', 'Depreciation and Amortization', 'Depreciation', 'Accumulated Depreciation and Amortization', 'Depreciation Expense', false, false, 'p_and_l_flow', 'average_rate', 'historical_source_layer'),
  categoryPolicy('Amortization Expense', ['Expense'], 'debit', 'Income Statement', 'Depreciation and Amortization', 'Amortization', 'Accumulated Depreciation and Amortization', 'Amortization Expense', false, false, 'p_and_l_flow', 'average_rate', 'historical_source_layer'),
  categoryPolicy('Payroll Expense', ['Expense'], 'debit', 'Income Statement', 'Operating Expenses', 'Payroll Expense', 'Not Applicable', 'Expense', false, false, 'p_and_l_flow', 'average_rate'),
  categoryPolicy('Rent Expense', ['Expense'], 'debit', 'Income Statement', 'Operating Expenses', 'Rent Expense', 'Not Applicable', 'Expense', false, false, 'p_and_l_flow', 'average_rate'),
  categoryPolicy('Professional Fees', ['Expense'], 'debit', 'Income Statement', 'Operating Expenses', 'Professional Fees', 'Not Applicable', 'Expense', false, false, 'p_and_l_flow', 'average_rate'),
  categoryPolicy('Interest Expense', ['Expense'], 'debit', 'Income Statement', 'Other Income / Expense', 'Interest Expense', 'Not Applicable', 'Expense', false, false, 'p_and_l_flow', 'average_rate'),
  categoryPolicy('Income Tax Expense', ['Expense'], 'debit', 'Income Statement', 'Tax Expense', 'Income Tax Expense', 'Not Applicable', 'Expense', false, false, 'p_and_l_flow', 'average_rate'),
  categoryPolicy('Realized FX Gain / Loss', ['Expense', 'Other'], 'debit', 'Income Statement', 'Other Income / Expense', 'Realized FX Gain / Loss', 'FX Revaluation', 'FX Loss', false, false, 'p_and_l_flow', 'average_rate'),
  categoryPolicy('Unrealized FX Gain / Loss', ['Expense', 'Other'], 'debit', 'Income Statement', 'Other Income / Expense', 'Unrealized FX Gain / Loss', 'FX Revaluation', 'FX Loss', false, false, 'p_and_l_flow', 'average_rate'),
  categoryPolicy('Other Expense', ['Expense'], 'debit', 'Income Statement', 'Operating Expenses', 'Other Expense', 'Not Applicable', 'Expense', false, false, 'p_and_l_flow', 'average_rate'),
  categoryPolicy('Other Income', ['Revenue', 'Other'], 'credit', 'Income Statement', 'Other Income / Expense', 'Other Income', 'Not Applicable', 'Revenue', false, false, 'p_and_l_flow', 'average_rate'),
]

function categoryPolicy(
  category: string,
  accountTypes: string[],
  normalBalance: 'debit' | 'credit',
  financialStatementSection: string,
  financialStatementGroup: string,
  financialStatementCategory: string,
  rollforwardCategory: string,
  accountRole: string,
  inventory: boolean,
  revalueOpenBalance: boolean,
  monetaryClassification: GlMonetaryClassification,
  translationTreatment: GlTranslationTreatment,
  releaseFxBasis: 'current_or_average_rate' | 'historical_source_layer' = 'current_or_average_rate',
): GlAccountCategoryPolicy {
  const isControlAccount = deriveControlAccountFromPolicy(category, accountRole, inventory)
  const requiresSubledgerType = deriveSubledgerTypeFromPolicy(category, accountRole, inventory)
  const cashFlowCategory = deriveCashFlowCategoryFromPolicy(category, accountTypes, financialStatementCategory, accountRole)
  const extensionDefaults = deriveExtensionDefaultsFromPolicy(category, accountTypes, financialStatementCategory, accountRole, inventory, revalueOpenBalance)

  return {
    category,
    accountTypes,
    normalBalance,
    financialStatementSection: normalizeFinancialStatementSectionForPolicy(financialStatementSection, accountTypes),
    financialStatementGroup,
    financialStatementCategory,
    rollforwardCategory,
    accountRole,
    inventory,
    revalueOpenBalance,
    isControlAccount,
    allowsManualPosting: !isControlAccount,
    requiresSubledgerType,
    cashFlowCategory,
    ...extensionDefaults,
    monetaryClassification,
    translationTreatment,
    releaseFxBasis,
  }
}

function normalizeFinancialStatementSectionForPolicy(section: string, accountTypes: string[]) {
  const normalizedSection = normalizePolicyKey(section)
  if (normalizedSection !== 'balance sheet') return section

  const normalizedTypes = accountTypes.map((type) => normalizePolicyKey(type))
  if (normalizedTypes.includes('asset')) return 'Assets'
  if (normalizedTypes.includes('liability')) return 'Liabilities'
  if (normalizedTypes.includes('equity')) return 'Equity'
  return section
}

function deriveExtensionDefaultsFromPolicy(
  category: string,
  accountTypes: string[],
  financialStatementCategory: string,
  accountRole: string,
  inventory: boolean,
  revalueOpenBalance: boolean,
) {
  const text = normalizePolicyKey(`${category} ${financialStatementCategory} ${accountRole}`)
  const normalizedTypes = accountTypes.map((type) => normalizePolicyKey(type))
  const isBalanceSheet = normalizedTypes.some((type) => ['asset', 'liability', 'equity'].includes(type))
  const isAr = includesAny(text, ['accounts receivable', 'ar trade', 'ar allowance', 'unapplied cash'])
  const isAp = includesAny(text, ['accounts payable', 'ap trade', 'credit card payable'])
  const isCash = includesAny(text, ['cash', 'bank'])
  const isIntercompany = includesAny(text, ['intercompany'])
  const isElimination = includesAny(text, ['elimination', 'cta currency translation adjustment'])
  const isTax = includesAny(text, ['tax'])
  const isInventory = inventory || includesAny(text, ['inventory', 'cost of goods sold', 'cogs'])
  const isDeferredRevenue = includesAny(text, ['deferred revenue', 'customer deposit', 'contract liability', 'revenue recognition'])
  const isDeferredCost = includesAny(text, ['deferred cost'])
  const isFixedAsset = includesAny(text, ['fixed asset', 'depreciation', 'right of use asset'])
  const isPrepaid = includesAny(text, ['prepaid'])
  const isAccrual = includesAny(text, ['accrued', 'accrual', 'payroll liability'])
  const isClearing = includesAny(text, ['clearing', 'unapplied cash', 'suspense'])
  const isSuspense = includesAny(text, ['suspense'])
  const requiresMonthlyReconciliation = isBalanceSheet && !isElimination
  const agingReviewRequired = isAr || isAp
  const reserveReviewRequired = isAr || isInventory
  const writeOffReviewRequired = isAr
  const waterfallReviewRequired = isDeferredRevenue || isDeferredCost || isPrepaid || isFixedAsset
  const aiRiskLevel = isCash || revalueOpenBalance || isIntercompany || waterfallReviewRequired || agingReviewRequired ? 'high' : requiresMonthlyReconciliation ? 'medium' : 'low'

  return {
    requiresMonthlyReconciliation,
    reconciliationType: deriveReconciliationType({
      isCash,
      isAr,
      isAp,
      isInventory,
      isDeferredRevenue,
      isDeferredCost,
      isPrepaid,
      isFixedAsset,
      isIntercompany,
      isBalanceSheet,
    }),
    closeReviewFrequency: requiresMonthlyReconciliation ? 'monthly' : 'quarterly',
    aiReviewEnabled: requiresMonthlyReconciliation || agingReviewRequired || waterfallReviewRequired || revalueOpenBalance,
    aiRiskLevel,
    autoMatchStrategy: deriveAutoMatchStrategy({ isCash, isAr, isAp, isInventory, isDeferredRevenue, isDeferredCost, isPrepaid, isFixedAsset, isBalanceSheet }),
    materialityThreshold: null,
    agingReviewRequired,
    reserveReviewRequired,
    writeOffReviewRequired,
    waterfallReviewRequired,
    taxSensitive: isTax,
    intercompanyAccount: isIntercompany,
    eliminationAccount: isElimination,
    bankAccountRequired: isCash,
    inventoryCostLayerAccount: isInventory,
    revenueRecognitionAccount: isDeferredRevenue,
    deferredCostAccount: isDeferredCost,
    fixedAssetAccount: isFixedAsset,
    prepaidAccount: isPrepaid,
    accrualAccount: isAccrual,
    clearingAccount: isClearing,
    suspenseAccount: isSuspense,
  }
}

function deriveReconciliationType(flags: {
  isCash: boolean
  isAr: boolean
  isAp: boolean
  isInventory: boolean
  isDeferredRevenue: boolean
  isDeferredCost: boolean
  isPrepaid: boolean
  isFixedAsset: boolean
  isIntercompany: boolean
  isBalanceSheet: boolean
}) {
  if (flags.isCash) return 'bank'
  if (flags.isAr || flags.isAp || flags.isIntercompany) return 'subledger_tie_out'
  if (flags.isDeferredRevenue || flags.isDeferredCost || flags.isPrepaid || flags.isFixedAsset) return 'waterfall'
  if (flags.isInventory) return 'rollforward'
  if (flags.isBalanceSheet) return 'manual_support'
  return 'none'
}

function deriveAutoMatchStrategy(flags: {
  isCash: boolean
  isAr: boolean
  isAp: boolean
  isInventory: boolean
  isDeferredRevenue: boolean
  isDeferredCost: boolean
  isPrepaid: boolean
  isFixedAsset: boolean
  isBalanceSheet: boolean
}) {
  if (flags.isCash) return 'statement'
  if (flags.isAr || flags.isAp) return 'subledger'
  if (flags.isDeferredRevenue || flags.isDeferredCost || flags.isPrepaid || flags.isFixedAsset) return 'schedule'
  if (flags.isInventory) return 'rollforward'
  if (flags.isBalanceSheet) return 'tolerance'
  return 'none'
}

function deriveControlAccountFromPolicy(category: string, accountRole: string, inventory: boolean) {
  if (inventory) return true

  const text = normalizePolicyKey(`${category} ${accountRole}`)
  return includesAny(text, [
    'accounts receivable',
    'ar trade',
    'ar allowance',
    'unapplied cash',
    'accounts payable',
    'ap trade',
    'credit card payable',
    'tax receivable',
    'tax payable',
    'deferred revenue',
    'customer deposit',
    'contract liability',
  ])
}

function deriveSubledgerTypeFromPolicy(category: string, accountRole: string, inventory: boolean) {
  if (inventory) return 'item'

  const text = normalizePolicyKey(`${category} ${accountRole}`)
  if (includesAny(text, ['accounts receivable', 'ar trade', 'ar allowance', 'unapplied cash'])) return 'customer'
  if (includesAny(text, ['accounts payable', 'ap trade', 'credit card payable'])) return 'vendor'
  if (includesAny(text, ['tax receivable', 'tax payable'])) return 'tax-authority'
  if (includesAny(text, ['intercompany receivable', 'intercompany payable'])) return 'intercompany-partner'
  if (includesAny(text, ['employee advance'])) return 'employee'
  if (includesAny(text, ['deferred revenue', 'customer deposit', 'contract liability'])) return 'customer'
  return null
}

function deriveCashFlowCategoryFromPolicy(
  category: string,
  accountTypes: string[],
  financialStatementCategory: string,
  accountRole: string,
) {
  const text = normalizePolicyKey(`${category} ${financialStatementCategory} ${accountRole}`)
  const normalizedTypes = accountTypes.map((type) => normalizePolicyKey(type))

  if (includesAny(text, ['cash', 'bank'])) return 'Cash and Cash Equivalents'
  if (includesAny(text, ['investment', 'fixed asset', 'intangible asset', 'goodwill', 'right of use asset'])) return 'Investing'
  if (includesAny(text, ['loan', 'debt', 'common stock', 'preferred stock', 'additional paid in capital', 'dividends', 'distributions'])) return 'Financing'
  if (normalizedTypes.some((type) => ['revenue', 'expense'].includes(type))) return 'Operating'
  if (normalizedTypes.some((type) => ['asset', 'liability'].includes(type))) return 'Operating'
  return null
}

function words(input: GlAccountingPolicyInput) {
  return [
    input.accountType,
    input.category,
    input.name,
    input.financialStatementCategory,
    input.accountRole,
    input.rollforwardCategory,
  ].join(' ').toLowerCase()
}

function normalizePolicyKey(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ')
}

export function findGlAccountCategoryPolicy(category: string | null | undefined, accountType?: string | null): GlAccountCategoryPolicy | null {
  const normalizedCategory = normalizePolicyKey(category)
  if (!normalizedCategory) return null

  const normalizedAccountType = normalizePolicyKey(accountType)
  const matches = GL_ACCOUNT_CATEGORY_POLICIES.filter((policy) => normalizePolicyKey(policy.category) === normalizedCategory)
  if (matches.length === 0) return null
  if (!normalizedAccountType) return matches[0]
  return matches.find((policy) => policy.accountTypes.some((type) => normalizePolicyKey(type) === normalizedAccountType)) ?? null
}

export function deriveGlAccountCategoryDefaults(input: GlAccountingPolicyInput): GlAccountCategoryPolicy | null {
  return findGlAccountCategoryPolicy(input.category, input.accountType)
}

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
}

export function normalizeMonetaryClassification(value: unknown): GlMonetaryClassification | null {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const alias: Record<string, GlMonetaryClassification> = {
    monetary_open_balance: 'monetary',
    monetary: 'monetary',
    nonmonetary: 'non_monetary_historical_cost',
    non_monetary: 'non_monetary_historical_cost',
    non_monetary_historical: 'non_monetary_historical_cost',
    non_monetary_historical_cost: 'non_monetary_historical_cost',
    historical_cost: 'non_monetary_historical_cost',
    equity: 'equity_historical',
    equity_historical: 'equity_historical',
    p_l_flow_account: 'p_and_l_flow',
    pnl_flow_account: 'p_and_l_flow',
    p_and_l_flow: 'p_and_l_flow',
    revenue_expense: 'p_and_l_flow',
  }
  return alias[normalized] ?? null
}

export function normalizeTranslationTreatment(value: unknown): GlTranslationTreatment | null {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const alias: Record<string, GlTranslationTreatment> = {
    closing: 'closing_rate',
    closing_rate: 'closing_rate',
    current_rate: 'closing_rate',
    average: 'average_rate',
    average_rate: 'average_rate',
    historical: 'historical_rate',
    historical_rate: 'historical_rate',
    no_translation: 'no_translation',
    none: 'no_translation',
    statistical: 'no_translation',
  }
  return alias[normalized] ?? null
}

export function monetaryClassificationLabel(value: string | null | undefined) {
  return MONETARY_CLASSIFICATION_OPTIONS.find((option) => option.value === value)?.label ?? value ?? '-'
}

export function translationTreatmentLabel(value: string | null | undefined) {
  return TRANSLATION_TREATMENT_OPTIONS.find((option) => option.value === value)?.label ?? value ?? '-'
}

export function deriveSuggestedMonetaryClassification(input: GlAccountingPolicyInput): GlMonetaryClassification | null {
  const categoryDefaults = deriveGlAccountCategoryDefaults(input)
  if (categoryDefaults) return categoryDefaults.monetaryClassification

  const accountType = String(input.accountType ?? '').trim().toLowerCase()
  const haystack = words(input)

  if (accountType === 'revenue' || accountType === 'expense') return 'p_and_l_flow'
  if (accountType === 'equity') return 'equity_historical'
  if (
    input.inventory
    || includesAny(haystack, [
      'inventory',
      'prepaid',
      'fixed asset',
      'capitalized software',
      'deferred revenue',
      'deferred cost',
      'right of use',
      'rou asset',
    ])
  ) {
    return 'non_monetary_historical_cost'
  }
  if (accountType === 'asset' || accountType === 'liability') return 'monetary'
  return null
}

export function deriveSuggestedTranslationTreatment(input: GlAccountingPolicyInput): GlTranslationTreatment | null {
  const categoryDefaults = deriveGlAccountCategoryDefaults(input)
  if (categoryDefaults) return categoryDefaults.translationTreatment

  const accountType = String(input.accountType ?? '').trim().toLowerCase()
  if (input.summary || input.isPosting === false) return 'no_translation'
  if (accountType === 'revenue' || accountType === 'expense') return 'average_rate'
  if (accountType === 'equity') return 'historical_rate'
  if (accountType === 'asset' || accountType === 'liability') return 'closing_rate'
  return null
}

export function getGlAccountingPolicyWarnings(input: GlAccountingPolicyInput): GlAccountingPolicyWarning[] {
  const warnings: GlAccountingPolicyWarning[] = []
  const classification = normalizeMonetaryClassification(input.monetaryClassification)
  const translation = normalizeTranslationTreatment(input.translationTreatment)
  const suggestedClassification = deriveSuggestedMonetaryClassification(input)
  const suggestedTranslation = deriveSuggestedTranslationTreatment(input)

  if (input.revalueOpenBalance && classification && classification !== 'monetary') {
    warnings.push({
      severity: 'error',
      message: 'Remeasure Open Balance should only be enabled for monetary open-balance accounts. Historical-cost, equity, and P&L flow accounts should not be remeasured through the open balance FX process.',
    })
  }

  if (suggestedClassification && classification && classification !== suggestedClassification) {
    warnings.push({
      severity: 'warning',
      message: `Accounting policy check: this account looks like ${monetaryClassificationLabel(suggestedClassification)}, but is set to ${monetaryClassificationLabel(classification)}.`,
    })
  }

  if (suggestedClassification === 'monetary' && !input.revalueOpenBalance) {
    warnings.push({
      severity: 'info',
      message: 'Monetary balance-sheet accounts with foreign-currency open items usually need period-end remeasurement until settled.',
    })
  }

  if (suggestedTranslation && translation && translation !== suggestedTranslation) {
    warnings.push({
      severity: 'warning',
      message: `Translation policy check: this account usually translates at ${translationTreatmentLabel(suggestedTranslation)}, but is set to ${translationTreatmentLabel(translation)}.`,
    })
  }

  return warnings
}
