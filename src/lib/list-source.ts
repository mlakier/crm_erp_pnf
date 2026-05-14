import { prisma } from '@/lib/prisma'
import { loadPostingAccountSelectOptions } from '@/lib/posting-account-options'
import { COUNTRY_OPTIONS } from '@/lib/address-country-config'
import { GL_ACCOUNT_CATEGORY_POLICIES } from '@/lib/gl-account-accounting-policy'

export type FieldSourceType = 'reference' | 'managed-list' | 'system'

export type ListSourceDefinition = {
  sourceType?: FieldSourceType
  sourceKey?: string
}

export type SelectOption = {
  value: string
  label: string
  accountTypes?: string[]
}

const MANAGED_LIST_LABELS: Record<string, string> = {
  'ACCOUNTING-PERIOD-STATUS': 'Accounting Period Status',
  'BILL-STATUS': 'Bill Status',
  'BILL-PAYMENT-STATUS': 'Bill Payment Status',
  'CLEARING-DOCUMENT-STATUS': 'Clearing Document Status',
  'COA-CASH-FLOW-CATEGORY': 'Cash Flow Category',
  'COA-ACCOUNT-CATEGORY': 'Account Category',
  'COA-FS-CATEGORY': 'Financial Statement Category',
  'COA-FS-GROUP': 'Financial Statement Group',
  'COA-FS-SECTION': 'Financial Statement Section',
  'COA-SUBLEDGER-TYPE': 'Required Subledger Type',
  'CONSOLIDATION-METHOD': 'Consolidation Method',
  'ACCOUNTING-STANDARD': 'Accounting Standard',
  'FISCAL-CALENDAR': 'Fiscal Calendar',
  'ELIMINATION-SCOPE': 'Elimination Scope',
  'ELIMINATION-CURRENCY-BASIS': 'Elimination Currency Basis',
  'DEPT-DIVISION': 'Division',
  'ENTITY-TYPE': 'Subsidiary Type',
  'EMP-LABOR-TYPE': 'Labor Type',
  'EXCHANGE-RATE-TYPE': 'Exchange Rate Type',
  'FULFILL-STATUS': 'Fulfillment Status',
  'CUST-INDUSTRY': 'Industry',
  'CUST-TYPE': 'Customer Type',
  'CUST-GROUP': 'Customer Group',
  'CUST-STATUS': 'Customer Status',
  'CUST-TERRITORY': 'Territory',
  'CUST-PRICE-LEVEL': 'Customer Price Level',
  'PRICE-LEVEL-TYPE': 'Price Level Type',
  'PRICE-BOOK-TYPE': 'Price Book Type',
  'BILLING-SCHEDULE-TYPE': 'Billing Schedule Type',
  'BILLING-FREQUENCY': 'Billing Frequency',
  'BILLING-TIMING': 'Billing Timing',
  'BILLING-ANCHOR': 'Billing Anchor',
  'PRORATION-POLICY': 'Proration Policy',
  'RENEWAL-MODE': 'Renewal Mode',
  'INVOICE-GROUPING-POLICY': 'Invoice Grouping Policy',
  'BILLING-ACCOUNT-TYPE': 'Billing Account Type',
  'BILLING-ACCOUNT-STATUS': 'Billing Account Status',
  'INVOICE-DELIVERY-METHOD': 'Invoice Delivery Method',
  'PAYMENT-TERMS': 'Payment Terms',
  'TAX-REGISTRATION-STATUS': 'Tax Registration Status',
  'SUBSCRIPTION-PLAN-TYPE': 'Subscription Plan Type',
  'SUBSCRIPTION-BILLING-MODEL': 'Subscription Billing Model',
  'SUBSCRIPTION-PLAN-STATUS': 'Subscription Plan Status',
  'USAGE-RATING-MODEL': 'Usage Rating Model',
  'SUBSCRIPTION-REVREC-POLICY': 'Subscription Revenue Recognition Policy',
  'SHIPPING-CARRIER': 'Shipping Carrier',
  'SHIPPING-METHOD': 'Shipping Method',
  'BANK-PROVIDER': 'Bank Provider',
  'LANGUAGE': 'Language',
  'NUMBER-FORMAT': 'Number Format',
  'NEGATIVE-NUMBER-FORMAT': 'Negative Number Format',
  'INV-RECEIPT-STATUS': 'Invoice Receipt Status',
  'INV-STATUS': 'Invoice Status',
  'JOURNAL-STATUS': 'Journal Status',
  'JOURNAL-SOURCE-TYPE': 'Journal Source Type',
  'ITEM-TYPE': 'Item Type',
  'ITEM-BILLING-TYPE': 'Billing Type',
  'ITEM-BILLING-TRIGGER': 'Billing Trigger',
  'ITEM-FORECAST-PLAN-TRIGGER': 'Create Forecast Plan On',
  'ITEM-BUSINESS-LINE': 'Business Line',
  'ITEM-PERFORMANCE-OBLIGATION-TYPE': 'Performance Obligation Type',
  'ITEM-PRIMARY-PURCHASE-UNIT': 'Primary Purchase Unit',
  'ITEM-PRIMARY-SALE-UNIT': 'Primary Sales Unit',
  'ITEM-PRODUCT-LINE': 'Product Line',
  'ITEM-REVENUE-PLAN-TRIGGER': 'Create Revenue Plan On',
  'ITEM-REVENUE-STREAM': 'Revenue Stream',
  'ITEM-REV-ARRANGEMENT-TRIGGER': 'Create Revenue Arrangement On',
  'ITEM-UOM': 'UOM',
  'ITEM-UNITS-TYPE': 'Primary Units Type',
  'LEAD-RAT': 'Lead Rating',
  'LEAD-SRC': 'Lead Source',
  'LEAD-STATUS': 'Lead Status',
  'LOCATION-TYPE': 'Location Type',
  'OPP-STAGE': 'Opportunity Stage',
  'PAYMENT-METHOD': 'Payment Method',
  'PO-STATUS': 'Purchase Order Status',
  'QUOTE-STATUS': 'Quote Status',
  'RECEIPT-STATUS': 'Receipt Status',
  'REQ-STATUS': 'Requisition Status',
  'SO-STATUS': 'Sales Order Status',
  'ACCOUNT-TYPE': 'Account Type',
  'NORMAL-BALANCE': 'Normal Balance',
  'ITEM-RECOGNITION-METHOD': 'Item Recognition Method',
  'ITEM-RECOGNITION-TRIGGER': 'Item Recognition Trigger',
  'ITEM-CATEGORY': 'Item Category',
  'DEPT-PLANNING-CATEGORY': 'Department Planning Category',
}

const REFERENCE_SOURCE_LABELS: Record<string, string> = {
  chartOfAccounts: 'Chart of Accounts',
  currencies: 'Currencies master data',
  customers: 'Customers master data',
  'customer-payment-instruments': 'Customer Payment Instruments',
  departments: 'Departments master data',
  employees: 'Employees master data',
  items: 'Items master data',
  locations: 'Locations master data',
  billingAccounts: 'Billing Accounts master data',
  'billing-accounts': 'Billing Accounts master data',
  billingSchedules: 'Billing Schedules master data',
  'billing-schedules': 'Billing Schedules master data',
  priceBooks: 'Price Books master data',
  'price-books': 'Price Books master data',
  priceLevels: 'Price Levels master data',
  'price-levels': 'Price Levels master data',
  revRecTemplates: 'Revenue Recognition Templates',
  roles: 'Roles master data',
  subsidiaries: 'Subsidiaries master data',
  subscriptionPlans: 'Subscription Plans master data',
  'subscription-plans': 'Subscription Plans master data',
  taxCodes: 'Tax Codes master data',
  'tax-codes': 'Tax Codes master data',
  users: 'Users master data',
  vendors: 'Vendors master data',
}

const SYSTEM_SOURCE_LABELS: Record<string, string> = {
  activeInactive: 'System status values',
  boolean: 'System values',
  countries: 'System country values',
  accountType: 'System account type values',
  normalBalance: 'System balance values',
  monetaryClassification: 'System accounting policy values',
  translationTreatment: 'System currency translation values',
  subledgerType: 'System subledger type values',
  cashFlowCategory: 'System cash flow category values',
  reconciliationType: 'System reconciliation type values',
  closeReviewFrequency: 'System close review frequencies',
  aiRiskLevel: 'System AI risk levels',
  autoMatchStrategy: 'System auto-match strategies',
}

const MANAGED_LIST_DEFAULT_OPTIONS: Record<string, SelectOption[]> = {
  'COA-ACCOUNT-CATEGORY': Array.from(
    new Map(
      GL_ACCOUNT_CATEGORY_POLICIES.map((policy) => [
        policy.category,
        { value: policy.category, label: policy.category, accountTypes: policy.accountTypes },
      ]),
    ).values(),
  ),
  'BILLING-SCHEDULE-TYPE': [
    { value: 'recurring', label: 'Recurring' },
    { value: 'milestone', label: 'Milestone' },
    { value: 'usage', label: 'Usage' },
    { value: 'one_time', label: 'One Time' },
    { value: 'evergreen', label: 'Evergreen' },
  ],
  'BILLING-FREQUENCY': [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'semiannual', label: 'Semiannual' },
    { value: 'annual', label: 'Annual' },
    { value: 'custom', label: 'Custom' },
  ],
  'BILLING-TIMING': [
    { value: 'advance', label: 'In Advance' },
    { value: 'arrears', label: 'In Arrears' },
  ],
  'BILLING-ANCHOR': [
    { value: 'contract_start', label: 'Contract Start' },
    { value: 'calendar_month', label: 'Calendar Month' },
    { value: 'calendar_quarter', label: 'Calendar Quarter' },
    { value: 'calendar_year', label: 'Calendar Year' },
    { value: 'fixed_day', label: 'Fixed Day' },
  ],
  'PRORATION-POLICY': [
    { value: 'none', label: 'No Proration' },
    { value: 'daily', label: 'Daily' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'calendar_year_first_period', label: 'Calendar Year First Period' },
    { value: 'custom', label: 'Custom' },
  ],
  'RENEWAL-MODE': [
    { value: 'none', label: 'No Renewal' },
    { value: 'manual', label: 'Manual Renewal' },
    { value: 'auto', label: 'Auto Renewal' },
  ],
  'INVOICE-GROUPING-POLICY': [
    { value: 'per_subscription', label: 'Per Subscription' },
    { value: 'by_billing_account', label: 'By Billing Account' },
    { value: 'by_customer', label: 'By Customer' },
    { value: 'by_project', label: 'By Project' },
  ],
  'BILLING-ACCOUNT-TYPE': [
    { value: 'standard', label: 'Standard' },
    { value: 'consolidated', label: 'Consolidated' },
    { value: 'project', label: 'Project' },
    { value: 'subscription', label: 'Subscription' },
    { value: 'usage', label: 'Usage' },
    { value: 'internal', label: 'Internal' },
  ],
  'BILLING-ACCOUNT-STATUS': [
    { value: 'active', label: 'Active' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'closed', label: 'Closed' },
  ],
  'INVOICE-DELIVERY-METHOD': [
    { value: 'email', label: 'Email' },
    { value: 'portal', label: 'Portal' },
    { value: 'edi', label: 'EDI' },
    { value: 'print', label: 'Print' },
    { value: 'none', label: 'None' },
  ],
  'PAYMENT-TERMS': [
    { value: 'due_on_receipt', label: 'Due On Receipt' },
    { value: 'net_15', label: 'Net 15' },
    { value: 'net_30', label: 'Net 30' },
    { value: 'net_45', label: 'Net 45' },
    { value: 'net_60', label: 'Net 60' },
  ],
  'TAX-REGISTRATION-STATUS': [
    { value: 'taxable', label: 'Taxable' },
    { value: 'exempt', label: 'Exempt' },
    { value: 'reverse_charge', label: 'Reverse Charge' },
    { value: 'out_of_scope', label: 'Out Of Scope' },
  ],
  'SUBSCRIPTION-PLAN-TYPE': [
    { value: 'recurring', label: 'Recurring' },
    { value: 'usage', label: 'Usage' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'support', label: 'Support' },
    { value: 'professional_services', label: 'Professional Services' },
  ],
  'SUBSCRIPTION-BILLING-MODEL': [
    { value: 'fixed_recurring', label: 'Fixed Recurring' },
    { value: 'usage_based', label: 'Usage Based' },
    { value: 'tiered_usage', label: 'Tiered Usage' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'milestone', label: 'Milestone' },
  ],
  'SUBSCRIPTION-PLAN-STATUS': [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ],
  'USAGE-RATING-MODEL': [
    { value: 'none', label: 'None' },
    { value: 'per_unit', label: 'Per Unit' },
    { value: 'tiered', label: 'Tiered' },
    { value: 'volume', label: 'Volume' },
    { value: 'package', label: 'Package' },
  ],
  'SUBSCRIPTION-REVREC-POLICY': [
    { value: 'immediate', label: 'Immediate' },
    { value: 'ratable', label: 'Ratable' },
    { value: 'milestone', label: 'Milestone' },
    { value: 'usage', label: 'Usage' },
    { value: 'manual', label: 'Manual' },
  ],
  'ACCOUNTING-PERIOD-STATUS': [
    { value: 'Open', label: 'Open' },
    { value: 'Closed', label: 'Closed' },
    { value: 'Locked', label: 'Locked' },
  ],
  'PRICE-LEVEL-TYPE': [
    { value: 'Standard', label: 'Standard' },
    { value: 'Preferred', label: 'Preferred' },
    { value: 'Distributor', label: 'Distributor' },
    { value: 'Partner', label: 'Partner' },
    { value: 'Enterprise', label: 'Enterprise' },
    { value: 'Employee', label: 'Employee' },
    { value: 'Promotional', label: 'Promotional' },
    { value: 'Contracted', label: 'Contracted' },
  ],
  'PRICE-BOOK-TYPE': [
    { value: 'Standard', label: 'Standard' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Customer Specific', label: 'Customer Specific' },
    { value: 'Partner', label: 'Partner' },
    { value: 'Promotional', label: 'Promotional' },
    { value: 'Regional', label: 'Regional' },
    { value: 'Channel', label: 'Channel' },
  ],
  'PRICE-BOOK-ITEM-STATUS': [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ],
  'PRICE-SOURCE': [
    { value: 'manual', label: 'Manual' },
    { value: 'imported', label: 'Imported' },
    { value: 'calculated', label: 'Calculated' },
    { value: 'contract', label: 'Contract' },
  ],
  'BILL-PAYMENT-STATUS': [
    { value: 'Pending', label: 'Pending' },
    { value: 'Processed', label: 'Processed' },
    { value: 'Cleared', label: 'Cleared' },
    { value: 'Void', label: 'Void' },
  ],
  'CLEARING-DOCUMENT-STATUS': [
    { value: 'Draft', label: 'Draft' },
    { value: 'Pending Approval', label: 'Pending Approval' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Posted', label: 'Posted' },
    { value: 'Void', label: 'Void' },
    { value: 'Reversed', label: 'Reversed' },
  ],
  'CONSOLIDATION-METHOD': [
    { value: 'full_consolidation', label: 'Full consolidation' },
    { value: 'consolidation_only', label: 'Consolidation parent only' },
    { value: 'elimination', label: 'Elimination subsidiary' },
    { value: 'equity_method', label: 'Equity method' },
    { value: 'proportional', label: 'Proportional consolidation' },
    { value: 'not_consolidated', label: 'Not consolidated' },
  ],
  'ACCOUNTING-STANDARD': [
    { value: 'US_GAAP', label: 'US GAAP' },
    { value: 'IFRS', label: 'IFRS' },
    { value: 'LOCAL_GAAP', label: 'Local GAAP' },
    { value: 'TAX_BASIS', label: 'Tax basis' },
  ],
  'FISCAL-CALENDAR': [
    { value: 'calendar_year', label: 'Calendar year' },
    { value: 'four_four_five', label: '4-4-5 fiscal calendar' },
    { value: 'custom', label: 'Custom fiscal calendar' },
  ],
  'ELIMINATION-SCOPE': [
    { value: 'all', label: 'All intercompany eliminations' },
    { value: 'ar_ap', label: 'Intercompany AR/AP' },
    { value: 'revenue_expense', label: 'Intercompany revenue/expense' },
    { value: 'investment_equity', label: 'Investment and equity' },
    { value: 'none', label: 'None' },
  ],
  'ELIMINATION-CURRENCY-BASIS': [
    { value: 'group', label: 'Group currency' },
    { value: 'parent_reporting', label: 'Parent reporting currency' },
    { value: 'functional', label: 'Functional currency' },
    { value: 'local', label: 'Local currency' },
  ],
  'EXCHANGE-RATE-TYPE': [
    { value: 'Spot', label: 'Spot' },
    { value: 'Average', label: 'Average' },
    { value: 'Closing', label: 'Closing' },
    { value: 'Historical', label: 'Historical' },
  ],
  'FULFILL-STATUS': [
    { value: 'Pending', label: 'Pending' },
    { value: 'Shipped', label: 'Shipped' },
    { value: 'Delivered', label: 'Delivered' },
    { value: 'Cancelled', label: 'Cancelled' },
  ],
  'JOURNAL-STATUS': [
    { value: 'Draft', label: 'Draft' },
    { value: 'Pending Approval', label: 'Pending Approval' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Posted', label: 'Posted' },
    { value: 'Void', label: 'Void' },
    { value: 'Reversed', label: 'Reversed' },
  ],
  'JOURNAL-SOURCE-TYPE': [
    { value: 'Manual', label: 'Manual' },
    { value: 'Allocation', label: 'Allocation' },
    { value: 'Accrual', label: 'Accrual' },
    { value: 'Reclass', label: 'Reclass' },
    { value: 'Elimination', label: 'Elimination' },
    { value: 'Recurring', label: 'Recurring' },
  ],
  'PAYMENT-METHOD': [
    { value: 'Check', label: 'Check' },
    { value: 'Wire', label: 'Wire' },
    { value: 'ACH', label: 'ACH' },
    { value: 'Credit Card', label: 'Credit Card' },
    { value: 'Cash', label: 'Cash' },
  ],
  'ITEM-RECOGNITION-METHOD': [
    { value: 'Point in Time', label: 'Point in Time' },
    { value: 'Over Time', label: 'Over Time' },
  ],
  'ITEM-RECOGNITION-TRIGGER': [
    { value: 'Sales Order Approval', label: 'Sales Order Approval' },
    { value: 'Invoice Posting', label: 'Invoice Posting' },
    { value: 'Fulfillment', label: 'Fulfillment' },
    { value: 'Manual', label: 'Manual' },
  ],
  'ITEM-REV-ARRANGEMENT-TRIGGER': [
    { value: 'Sales Order Approval', label: 'Sales Order Approval' },
    { value: 'Invoice Posting', label: 'Invoice Posting' },
    { value: 'Fulfillment', label: 'Fulfillment' },
    { value: 'Manual', label: 'Manual' },
  ],
  'ITEM-FORECAST-PLAN-TRIGGER': [
    { value: 'Quote Approval', label: 'Quote Approval' },
    { value: 'Opportunity Close-Won', label: 'Opportunity Close-Won' },
    { value: 'Sales Order Creation', label: 'Sales Order Creation' },
    { value: 'Sales Order Approval', label: 'Sales Order Approval' },
    { value: 'Manual', label: 'Manual' },
  ],
  'ITEM-REVENUE-PLAN-TRIGGER': [
    { value: 'Invoice Posting', label: 'Invoice Posting' },
    { value: 'Fulfillment', label: 'Fulfillment' },
    { value: 'Service Start', label: 'Service Start' },
    { value: 'Manual', label: 'Manual' },
  ],
  'ITEM-PERFORMANCE-OBLIGATION-TYPE': [
    { value: 'License', label: 'License' },
    { value: 'Subscription', label: 'Subscription' },
    { value: 'Service', label: 'Service' },
    { value: 'Support', label: 'Support' },
    { value: 'Hardware', label: 'Hardware' },
    { value: 'Usage', label: 'Usage' },
    { value: 'Milestone', label: 'Milestone' },
    { value: 'Other', label: 'Other' },
  ],
  'ITEM-BILLING-TYPE': [
    { value: 'One-Time', label: 'One-Time' },
    { value: 'Recurring', label: 'Recurring' },
    { value: 'Usage', label: 'Usage' },
    { value: 'Milestone', label: 'Milestone' },
  ],
  'ITEM-BILLING-TRIGGER': [
    { value: 'Sales Order Approval', label: 'Sales Order Approval' },
    { value: 'Fulfillment', label: 'Fulfillment' },
    { value: 'Delivery', label: 'Delivery' },
    { value: 'Acceptance', label: 'Acceptance' },
    { value: 'Milestone Completion', label: 'Milestone Completion' },
    { value: 'Manual', label: 'Manual' },
  ],
  'ITEM-UOM': [
    { value: 'Each', label: 'Each' },
    { value: 'Hour', label: 'Hour' },
    { value: 'Day', label: 'Day' },
    { value: 'Month', label: 'Month' },
    { value: 'Seat', label: 'Seat' },
  ],
  'ITEM-PRIMARY-PURCHASE-UNIT': [
    { value: 'Each', label: 'Each' },
    { value: 'Hour', label: 'Hour' },
    { value: 'Day', label: 'Day' },
    { value: 'Month', label: 'Month' },
    { value: 'Seat', label: 'Seat' },
  ],
  'ITEM-PRIMARY-SALE-UNIT': [
    { value: 'Each', label: 'Each' },
    { value: 'Hour', label: 'Hour' },
    { value: 'Day', label: 'Day' },
    { value: 'Month', label: 'Month' },
    { value: 'Seat', label: 'Seat' },
  ],
  'ITEM-UNITS-TYPE': [
    { value: 'Each', label: 'Each' },
    { value: 'Time', label: 'Time' },
    { value: 'Subscription', label: 'Subscription' },
    { value: 'Usage', label: 'Usage' },
  ],
  'EMP-LABOR-TYPE': [
    { value: 'FTE', label: 'FTE' },
    { value: 'PTE', label: 'PTE' },
    { value: 'IC', label: 'IC' },
    { value: 'Intern', label: 'Intern' },
  ],
  'LOCATION-TYPE': [
    { value: 'Office', label: 'Office' },
    { value: 'Warehouse', label: 'Warehouse' },
    { value: 'Store', label: 'Store' },
  ],
  'CUST-TERRITORY': [
    { value: 'North America', label: 'North America' },
    { value: 'EMEA', label: 'EMEA' },
    { value: 'APAC', label: 'APAC' },
    { value: 'LATAM', label: 'LATAM' },
  ],
  'SHIPPING-CARRIER': [
    { value: 'UPS', label: 'UPS' },
    { value: 'FedEx', label: 'FedEx' },
    { value: 'DHL', label: 'DHL' },
    { value: 'USPS', label: 'USPS' },
  ],
  'SHIPPING-METHOD': [
    { value: 'Ground', label: 'Ground' },
    { value: '2 Day', label: '2 Day' },
    { value: 'Overnight', label: 'Overnight' },
    { value: 'International', label: 'International' },
  ],
  'BANK-PROVIDER': [
    { value: 'Bank API', label: 'Bank API' },
    { value: 'Plaid', label: 'Plaid' },
    { value: 'Stripe', label: 'Stripe' },
    { value: 'Kyriba', label: 'Kyriba' },
    { value: 'Manual Vault', label: 'Manual Vault' },
  ],
  'CUST-PRICE-BOOK': [
    { value: 'US Commercial', label: 'US Commercial' },
    { value: 'EU Book', label: 'EU Book' },
    { value: 'Global Standard', label: 'Global Standard' },
  ],
  'TAX-CODE': [
    { value: 'AVATAX-CA', label: 'AVATAX-CA' },
    { value: 'AVATAX-NY', label: 'AVATAX-NY' },
    { value: 'AVATAX-SW', label: 'AVATAX-SW' },
    { value: 'AVATAX-SVC', label: 'AVATAX-SVC' },
  ],
}

export function normalizeManagedListKey(sourceKey: string): string {
  const trimmed = sourceKey.trim().toUpperCase()
  return trimmed.startsWith('LIST-') ? trimmed.slice(5) : trimmed
}

export function getListSourceText(source: ListSourceDefinition): string | undefined {
  if (!source.sourceType || !source.sourceKey) return undefined

  if (source.sourceType === 'reference') {
    return REFERENCE_SOURCE_LABELS[source.sourceKey] ?? source.sourceKey
  }

  if (source.sourceType === 'managed-list') {
    const normalizedKey = normalizeManagedListKey(source.sourceKey)
    return `Manage Lists -> ${MANAGED_LIST_LABELS[normalizedKey] ?? normalizedKey}`
  }

  return SYSTEM_SOURCE_LABELS[source.sourceKey] ?? 'System values'
}

async function loadReferenceOptions(sourceKey: string): Promise<SelectOption[]> {
  switch (sourceKey) {
    case 'chartOfAccounts': {
      return loadPostingAccountSelectOptions()
    }
    case 'currencies': {
      const currencies = await prisma.currency.findMany({
        orderBy: { code: 'asc' },
        select: { id: true, code: true, name: true },
      })
      return currencies.map((currency) => ({ value: currency.id, label: `${currency.code} - ${currency.name}` }))
    }
    case 'customers': {
      const customers = await prisma.customer.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      })
      return customers.map((customer) => ({ value: customer.id, label: customer.name }))
    }
    case 'customer-payment-instruments': {
      const rows = await prisma.customerPaymentInstrument.findMany({
        where: { inactive: false },
        include: { customer: { select: { name: true } }, currency: { select: { code: true } } },
        orderBy: [{ instrumentId: 'asc' }, { createdAt: 'desc' }],
      })
      return rows.map((row) => ({
        value: row.id,
        label: `${row.instrumentId ?? row.maskedAccountNumber ?? row.id} - ${row.customer.name}${row.currency?.code ? ` (${row.currency.code})` : ''}`,
      }))
    }
    case 'chart-of-accounts': {
      const accounts = await prisma.chartOfAccounts.findMany({
        orderBy: [{ accountNumber: 'asc' }, { name: 'asc' }],
        select: { id: true, accountNumber: true, name: true },
      })
      return accounts.map((account) => ({ value: account.id, label: `${account.accountNumber} - ${account.name}` }))
    }
    case 'departments': {
      const departments = await prisma.department.findMany({
        orderBy: { departmentId: 'asc' },
        select: { id: true, departmentId: true, name: true },
      })
      return departments.map((department) => ({ value: department.id, label: `${department.departmentId} - ${department.name}` }))
    }
    case 'employees': {
      const employees = await prisma.employee.findMany({
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: { id: true, employeeId: true, firstName: true, lastName: true },
      })
      return employees.map((employee) => ({
        value: employee.id,
        label: `${employee.firstName} ${employee.lastName}${employee.employeeId ? ` (${employee.employeeId})` : ''}`,
      }))
    }
    case 'items': {
      const items = await prisma.item.findMany({
        orderBy: [{ itemId: 'asc' }, { name: 'asc' }],
        select: { id: true, itemId: true, name: true },
      })
      return items.map((item) => ({
        value: item.id,
        label: item.itemId ? `${item.itemId} - ${item.name}` : item.name,
      }))
    }
    case 'locations': {
      const locations = await prisma.location.findMany({
        orderBy: { locationId: 'asc' },
        select: { id: true, locationId: true, code: true, name: true },
      })
      return locations.map((location) => ({
        value: location.id,
        label: `${location.locationId} - ${location.code} - ${location.name}`,
      }))
    }
    case 'billingAccounts':
    case 'billing-accounts': {
      const rows = await prisma.billingAccount.findMany({
        where: { inactive: false },
        orderBy: [{ billingAccountId: 'asc' }, { name: 'asc' }],
        select: { id: true, billingAccountId: true, name: true },
      })
      return rows.map((row) => ({
        value: row.id,
        label: row.billingAccountId ? `${row.billingAccountId} - ${row.name}` : row.name,
      }))
    }
    case 'billingSchedules':
    case 'billing-schedules': {
      const rows = await prisma.billingSchedule.findMany({
        where: { inactive: false },
        orderBy: [{ billingScheduleId: 'asc' }, { name: 'asc' }],
        select: { id: true, billingScheduleId: true, name: true },
      })
      return rows.map((row) => ({
        value: row.id,
        label: row.billingScheduleId ? `${row.billingScheduleId} - ${row.name}` : row.name,
      }))
    }
    case 'priceBooks':
    case 'price-books': {
      const rows = await prisma.priceBook.findMany({
        where: { inactive: false },
        orderBy: [{ priceBookId: 'asc' }, { name: 'asc' }],
        select: { id: true, priceBookId: true, name: true },
      })
      return rows.map((row) => ({
        value: row.id,
        label: row.priceBookId ? `${row.priceBookId} - ${row.name}` : row.name,
      }))
    }
    case 'priceLevels':
    case 'price-levels': {
      const rows = await prisma.priceLevel.findMany({
        where: { inactive: false },
        orderBy: [{ priceLevelId: 'asc' }, { name: 'asc' }],
        select: { id: true, priceLevelId: true, name: true },
      })
      return rows.map((row) => ({
        value: row.id,
        label: row.priceLevelId ? `${row.priceLevelId} - ${row.name}` : row.name,
      }))
    }
    case 'revRecTemplates': {
      const templates = await prisma.revRecTemplate.findMany({
        where: { active: true },
        orderBy: { templateId: 'asc' },
        select: { id: true, templateId: true, name: true },
      })
      return templates.map((template) => ({ value: template.id, label: `${template.templateId} - ${template.name}` }))
    }
    case 'roles': {
      const roles = await prisma.role.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      })
      return roles.map((role) => ({ value: role.id, label: role.name }))
    }
    case 'subsidiaries': {
      const subsidiaries = await prisma.subsidiary.findMany({
        orderBy: { subsidiaryId: 'asc' },
        select: { id: true, subsidiaryId: true, name: true },
      })
      return subsidiaries.map((subsidiary) => ({ value: subsidiary.id, label: `${subsidiary.subsidiaryId} - ${subsidiary.name}` }))
    }
    case 'subscriptionPlans':
    case 'subscription-plans': {
      const rows = await prisma.subscriptionPlan.findMany({
        where: { inactive: false },
        orderBy: [{ subscriptionPlanId: 'asc' }, { name: 'asc' }],
        select: { id: true, subscriptionPlanId: true, name: true },
      })
      return rows.map((row) => ({
        value: row.id,
        label: row.subscriptionPlanId ? `${row.subscriptionPlanId} - ${row.name}` : row.name,
      }))
    }
    case 'taxCodes':
    case 'tax-codes': {
      return loadManagedListOptions('TAX-CODE')
    }
    case 'users': {
      const users = await prisma.user.findMany({
        orderBy: [{ userId: 'asc' }, { email: 'asc' }],
        select: { id: true, userId: true, name: true, email: true },
      })
      return users.map((user) => ({
        value: user.id,
        label: user.userId ? `${user.userId} - ${user.name ?? user.email}` : user.name ?? user.email,
      }))
    }
    case 'vendors': {
      const vendors = await prisma.vendor.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, vendorNumber: true },
      })
      return vendors.map((vendor) => ({
        value: vendor.id,
        label: vendor.vendorNumber ? `${vendor.vendorNumber} - ${vendor.name}` : vendor.name,
      }))
    }
    default:
      return []
  }
}

async function loadManagedListOptions(sourceKey: string): Promise<SelectOption[]> {
  const normalizedKey = normalizeManagedListKey(sourceKey)
  const defaultOptions = MANAGED_LIST_DEFAULT_OPTIONS[normalizedKey] ?? []
  const defaultOptionMap = new Map(defaultOptions.map((option) => [option.value, option]))
  if (defaultOptions.length > 0) {
    const existingOptions = await prisma.listOption.findMany({
      where: { key: normalizedKey },
      select: { value: true },
    })
    const existingValues = new Set(existingOptions.map((option) => option.value))
    const missingDefaultOptions = defaultOptions.filter((option) => !existingValues.has(option.value))
    if (missingDefaultOptions.length > 0) {
      await prisma.listOption.createMany({
        data: missingDefaultOptions.map((option, index) => ({
          key: normalizedKey,
          listId: `LIST-${normalizedKey}-${String(existingOptions.length + index + 1).padStart(4, '0')}`,
          value: option.value,
          label: option.label,
          sortOrder: existingOptions.length + index,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        skipDuplicates: true,
      })
    }
  }

  const rows = await prisma.listOption.findMany({
    where: { key: normalizedKey },
    orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
    select: { value: true, label: true },
  })
  return rows.map((row) => ({
    value: row.value,
    label: row.label,
    accountTypes: defaultOptionMap.get(row.value)?.accountTypes,
  }))
}

function loadSystemOptions(sourceKey: string): SelectOption[] {
  switch (sourceKey) {
    case 'accountType':
      return [
        { value: 'Asset', label: 'Asset' },
        { value: 'Liability', label: 'Liability' },
        { value: 'Equity', label: 'Equity' },
        { value: 'Revenue', label: 'Revenue' },
        { value: 'Expense', label: 'Expense' },
        { value: 'Other', label: 'Other' },
      ]
    case 'activeInactive':
    case 'boolean':
      return [
        { value: 'false', label: 'No' },
        { value: 'true', label: 'Yes' },
      ]
    case 'normalBalance':
      return [
        { value: 'debit', label: 'Debit' },
        { value: 'credit', label: 'Credit' },
      ]
    case 'monetaryClassification':
      return [
        { value: 'monetary', label: 'Monetary Open Balance' },
        { value: 'non_monetary_historical_cost', label: 'Non-Monetary Historical Cost' },
        { value: 'equity_historical', label: 'Equity / Historical' },
        { value: 'p_and_l_flow', label: 'P&L Flow Account' },
      ]
    case 'translationTreatment':
      return [
        { value: 'closing_rate', label: 'Closing Rate' },
        { value: 'average_rate', label: 'Average Rate' },
        { value: 'historical_rate', label: 'Historical Rate' },
        { value: 'no_translation', label: 'No Translation / Statistical' },
      ]
    case 'subledgerType':
      return [
        { value: 'customer', label: 'Customer' },
        { value: 'vendor', label: 'Vendor' },
        { value: 'item', label: 'Item' },
        { value: 'employee', label: 'Employee' },
        { value: 'tax-authority', label: 'Tax Authority' },
        { value: 'intercompany-partner', label: 'Intercompany Partner' },
      ]
    case 'cashFlowCategory':
      return [
        { value: 'Operating', label: 'Operating' },
        { value: 'Investing', label: 'Investing' },
        { value: 'Financing', label: 'Financing' },
        { value: 'Cash and Cash Equivalents', label: 'Cash and Cash Equivalents' },
        { value: 'Non-Cash', label: 'Non-Cash' },
      ]
    case 'reconciliationType':
      return [
        { value: 'none', label: 'None' },
        { value: 'bank', label: 'Bank Reconciliation' },
        { value: 'subledger_tie_out', label: 'Subledger Tie-Out' },
        { value: 'rollforward', label: 'Rollforward' },
        { value: 'waterfall', label: 'Waterfall / Schedule' },
        { value: 'manual_support', label: 'Manual Support' },
      ]
    case 'closeReviewFrequency':
      return [
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'annually', label: 'Annually' },
        { value: 'none', label: 'None' },
      ]
    case 'aiRiskLevel':
      return [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ]
    case 'autoMatchStrategy':
      return [
        { value: 'none', label: 'None' },
        { value: 'exact', label: 'Exact Match' },
        { value: 'tolerance', label: 'Tolerance Match' },
        { value: 'subledger', label: 'Subledger Match' },
        { value: 'statement', label: 'Statement Match' },
        { value: 'schedule', label: 'Schedule Match' },
        { value: 'rollforward', label: 'Rollforward Match' },
      ]
    case 'countries':
      return COUNTRY_OPTIONS.map((option) => ({ value: option.code, label: option.label }))
    default:
      return []
  }
}

export async function loadListOptionsForSource(source: ListSourceDefinition): Promise<SelectOption[]> {
  if (!source.sourceType || !source.sourceKey) return []

  if (source.sourceType === 'reference') {
    return loadReferenceOptions(source.sourceKey)
  }

  if (source.sourceType === 'managed-list') {
    return loadManagedListOptions(source.sourceKey)
  }

  return loadSystemOptions(source.sourceKey)
}
