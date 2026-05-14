export type BillingMasterDataKey = 'billing-schedules' | 'billing-accounts' | 'subscription-plans'

export type BillingFieldType = 'text' | 'textarea' | 'select' | 'date' | 'number' | 'money' | 'checkbox'

export type BillingFieldConfig = {
  key: string
  label: string
  section: string
  type?: BillingFieldType
  sourceType?: 'reference' | 'managed-list' | 'system'
  sourceKey?: string
  required?: boolean
  readOnly?: boolean
  helpText?: string
}

export type BillingEntityConfig = {
  key: BillingMasterDataKey
  title: string
  singularTitle: string
  route: string
  apiRoute: string
  prismaModel: 'billingSchedule' | 'billingAccount' | 'subscriptionPlan'
  idField: string
  idPrefix: string
  nameField: string
  description: string
  searchPlaceholder: string
  tableId: string
  exportFileName: string
  includes?: Record<string, true | Record<string, unknown>>
  orderBy: Array<Record<string, 'asc' | 'desc'>>
  fields: BillingFieldConfig[]
  listColumns: string[]
}

const BOOLEAN_OPTIONS = { sourceType: 'system' as const, sourceKey: 'boolean' }
const ACTIVE_OPTIONS = { sourceType: 'system' as const, sourceKey: 'activeInactive' }

export const BILLING_MASTER_DATA_CONFIGS: Record<BillingMasterDataKey, BillingEntityConfig> = {
  'billing-schedules': {
    key: 'billing-schedules',
    title: 'Billing Schedules',
    singularTitle: 'Billing Schedule',
    route: '/billing-schedules',
    apiRoute: '/api/billing-schedules',
    prismaModel: 'billingSchedule',
    idField: 'billingScheduleId',
    idPrefix: 'BSCH',
    nameField: 'name',
    description: 'Defines billing cadence, anchors, timing, proration, renewal, and invoice grouping defaults.',
    searchPlaceholder: 'Search schedule id, name, type, frequency, or policy',
    tableId: 'billing-schedules-list',
    exportFileName: 'billing_schedules',
    includes: { currency: true },
    orderBy: [{ billingScheduleId: 'asc' }, { name: 'asc' }],
    fields: [
      { key: 'billingScheduleId', label: 'Billing Schedule ID', section: 'Core', readOnly: true, helpText: 'Auto-generated business ID for this billing schedule.' },
      { key: 'name', label: 'Name', section: 'Core', required: true, helpText: 'Business-facing billing schedule name.' },
      { key: 'description', label: 'Description', section: 'Core', type: 'textarea' },
      { key: 'scheduleType', label: 'Schedule Type', section: 'Policy', type: 'select', sourceType: 'managed-list', sourceKey: 'BILLING-SCHEDULE-TYPE' },
      { key: 'frequency', label: 'Frequency', section: 'Policy', type: 'select', sourceType: 'managed-list', sourceKey: 'BILLING-FREQUENCY' },
      { key: 'billingTiming', label: 'Billing Timing', section: 'Policy', type: 'select', sourceType: 'managed-list', sourceKey: 'BILLING-TIMING' },
      { key: 'billingAnchor', label: 'Billing Anchor', section: 'Policy', type: 'select', sourceType: 'managed-list', sourceKey: 'BILLING-ANCHOR' },
      { key: 'billingDay', label: 'Billing Day', section: 'Policy', type: 'number' },
      { key: 'prorationPolicy', label: 'Proration Policy', section: 'Policy', type: 'select', sourceType: 'managed-list', sourceKey: 'PRORATION-POLICY' },
      { key: 'renewalMode', label: 'Renewal Mode', section: 'Renewal & Grouping', type: 'select', sourceType: 'managed-list', sourceKey: 'RENEWAL-MODE' },
      { key: 'invoiceGroupingPolicy', label: 'Invoice Grouping Policy', section: 'Renewal & Grouping', type: 'select', sourceType: 'managed-list', sourceKey: 'INVOICE-GROUPING-POLICY' },
      { key: 'graceDays', label: 'Grace Days', section: 'Renewal & Grouping', type: 'number' },
      { key: 'minimumBillAmount', label: 'Minimum Bill Amount', section: 'Renewal & Grouping', type: 'money' },
      { key: 'currencyId', label: 'Currency', section: 'Renewal & Grouping', type: 'select', sourceType: 'reference', sourceKey: 'currencies' },
      { key: 'inactive', label: 'Inactive', section: 'Status', type: 'select', ...ACTIVE_OPTIONS },
    ],
    listColumns: ['billingScheduleId', 'name', 'scheduleType', 'frequency', 'billingTiming', 'billingAnchor', 'prorationPolicy', 'renewalMode', 'invoiceGroupingPolicy', 'currencyId', 'inactive', 'createdAt', 'updatedAt'],
  },
  'billing-accounts': {
    key: 'billing-accounts',
    title: 'Billing Accounts',
    singularTitle: 'Billing Account',
    route: '/billing-accounts',
    apiRoute: '/api/billing-accounts',
    prismaModel: 'billingAccount',
    idField: 'billingAccountId',
    idPrefix: 'BA',
    nameField: 'name',
    description: 'Customer billing profile for invoice grouping, delivery, payment method, tax, collections, and schedule defaults.',
    searchPlaceholder: 'Search billing account id, name, customer, email, or status',
    tableId: 'billing-accounts-list',
    exportFileName: 'billing_accounts',
    includes: {
      customer: true,
      subsidiary: true,
      currency: true,
      defaultBillingSchedule: true,
      defaultPriceBook: true,
      defaultPriceLevel: true,
      billToContact: true,
    },
    orderBy: [{ billingAccountId: 'asc' }, { name: 'asc' }],
    fields: [
      { key: 'billingAccountId', label: 'Billing Account ID', section: 'Core', readOnly: true, helpText: 'Auto-generated business ID for this billing account.' },
      { key: 'name', label: 'Name', section: 'Core', required: true },
      { key: 'description', label: 'Description', section: 'Core', type: 'textarea' },
      { key: 'customerId', label: 'Customer', section: 'Core', type: 'select', sourceType: 'reference', sourceKey: 'customers', required: true },
      { key: 'accountType', label: 'Account Type', section: 'Core', type: 'select', sourceType: 'managed-list', sourceKey: 'BILLING-ACCOUNT-TYPE' },
      { key: 'status', label: 'Status', section: 'Core', type: 'select', sourceType: 'managed-list', sourceKey: 'BILLING-ACCOUNT-STATUS' },
      { key: 'subsidiaryId', label: 'Subsidiary', section: 'Scope', type: 'select', sourceType: 'reference', sourceKey: 'subsidiaries' },
      { key: 'includeChildren', label: 'Include Children', section: 'Scope', type: 'select', ...BOOLEAN_OPTIONS },
      { key: 'currencyId', label: 'Currency', section: 'Scope', type: 'select', sourceType: 'reference', sourceKey: 'currencies' },
      { key: 'defaultBillingScheduleId', label: 'Default Billing Schedule', section: 'Billing Defaults', type: 'select', sourceType: 'reference', sourceKey: 'billing-schedules' },
      { key: 'defaultPriceBookId', label: 'Default Price Book', section: 'Billing Defaults', type: 'select', sourceType: 'reference', sourceKey: 'price-books' },
      { key: 'defaultPriceLevelId', label: 'Default Price Level', section: 'Billing Defaults', type: 'select', sourceType: 'reference', sourceKey: 'price-levels' },
      { key: 'billToContactId', label: 'Bill-To Contact', section: 'Delivery', type: 'select', sourceType: 'reference', sourceKey: 'contacts' },
      { key: 'invoiceDeliveryMethod', label: 'Invoice Delivery Method', section: 'Delivery', type: 'select', sourceType: 'managed-list', sourceKey: 'INVOICE-DELIVERY-METHOD' },
      { key: 'billingEmail', label: 'Billing Email', section: 'Delivery' },
      { key: 'billingAddress', label: 'Billing Address', section: 'Delivery', type: 'textarea' },
      { key: 'paymentTerms', label: 'Payment Terms', section: 'Payment & Tax', type: 'select', sourceType: 'managed-list', sourceKey: 'PAYMENT-TERMS' },
      { key: 'paymentMethod', label: 'Payment Method', section: 'Payment & Tax', type: 'select', sourceType: 'managed-list', sourceKey: 'PAYMENT-METHOD' },
      { key: 'paymentInstrumentId', label: 'Payment Instrument', section: 'Payment & Tax', type: 'select', sourceType: 'reference', sourceKey: 'customer-payment-instruments' },
      { key: 'directDebitEnabled', label: 'Direct Debit Enabled', section: 'Payment & Tax', type: 'select', ...BOOLEAN_OPTIONS },
      { key: 'consolidateInvoices', label: 'Consolidate Invoices', section: 'Payment & Tax', type: 'select', ...BOOLEAN_OPTIONS },
      { key: 'requiresPurchaseOrder', label: 'Requires PO', section: 'Payment & Tax', type: 'select', ...BOOLEAN_OPTIONS },
      { key: 'poNumber', label: 'PO Number', section: 'Payment & Tax' },
      { key: 'taxable', label: 'Taxable', section: 'Payment & Tax', type: 'select', ...BOOLEAN_OPTIONS },
      { key: 'taxCode', label: 'Tax Code', section: 'Payment & Tax', type: 'select', sourceType: 'reference', sourceKey: 'tax-codes' },
      { key: 'taxRegistrationStatus', label: 'Tax Registration Status', section: 'Payment & Tax', type: 'select', sourceType: 'managed-list', sourceKey: 'TAX-REGISTRATION-STATUS' },
      { key: 'creditHold', label: 'Credit Hold', section: 'Collections', type: 'select', ...BOOLEAN_OPTIONS },
      { key: 'collectionsHold', label: 'Collections Hold', section: 'Collections', type: 'select', ...BOOLEAN_OPTIONS },
      { key: 'inactive', label: 'Inactive', section: 'Status', type: 'select', ...ACTIVE_OPTIONS },
    ],
    listColumns: ['billingAccountId', 'name', 'customerId', 'accountType', 'status', 'subsidiaryId', 'currencyId', 'defaultBillingScheduleId', 'defaultPriceBookId', 'invoiceDeliveryMethod', 'paymentTerms', 'paymentMethod', 'taxable', 'inactive', 'createdAt', 'updatedAt'],
  },
  'subscription-plans': {
    key: 'subscription-plans',
    title: 'Subscription Plans',
    singularTitle: 'Subscription Plan',
    route: '/subscription-plans',
    apiRoute: '/api/subscription-plans',
    prismaModel: 'subscriptionPlan',
    idField: 'subscriptionPlanId',
    idPrefix: 'SPLAN',
    nameField: 'name',
    description: 'Reusable subscription product policy for billing model, term, renewal, usage rating, pricing, and revenue/cost accounts.',
    searchPlaceholder: 'Search plan id, name, item, billing model, or status',
    tableId: 'subscription-plans-list',
    exportFileName: 'subscription_plans',
    includes: {
      item: true,
      subsidiary: true,
      currency: true,
      defaultBillingSchedule: true,
      defaultPriceBook: true,
      defaultPriceLevel: true,
      revenueAccount: true,
      deferredRevenueAccount: true,
      costAccount: true,
      deferredCostAccount: true,
    },
    orderBy: [{ subscriptionPlanId: 'asc' }, { name: 'asc' }],
    fields: [
      { key: 'subscriptionPlanId', label: 'Subscription Plan ID', section: 'Core', readOnly: true, helpText: 'Auto-generated business ID for this subscription plan.' },
      { key: 'name', label: 'Name', section: 'Core', required: true },
      { key: 'description', label: 'Description', section: 'Core', type: 'textarea' },
      { key: 'planType', label: 'Plan Type', section: 'Core', type: 'select', sourceType: 'managed-list', sourceKey: 'SUBSCRIPTION-PLAN-TYPE' },
      { key: 'billingModel', label: 'Billing Model', section: 'Core', type: 'select', sourceType: 'managed-list', sourceKey: 'SUBSCRIPTION-BILLING-MODEL' },
      { key: 'status', label: 'Status', section: 'Core', type: 'select', sourceType: 'managed-list', sourceKey: 'SUBSCRIPTION-PLAN-STATUS' },
      { key: 'itemId', label: 'Item', section: 'Scope', type: 'select', sourceType: 'reference', sourceKey: 'items' },
      { key: 'subsidiaryId', label: 'Subsidiary', section: 'Scope', type: 'select', sourceType: 'reference', sourceKey: 'subsidiaries' },
      { key: 'includeChildren', label: 'Include Children', section: 'Scope', type: 'select', ...BOOLEAN_OPTIONS },
      { key: 'currencyId', label: 'Currency', section: 'Scope', type: 'select', sourceType: 'reference', sourceKey: 'currencies' },
      { key: 'defaultBillingScheduleId', label: 'Default Billing Schedule', section: 'Pricing & Billing', type: 'select', sourceType: 'reference', sourceKey: 'billing-schedules' },
      { key: 'defaultPriceBookId', label: 'Default Price Book', section: 'Pricing & Billing', type: 'select', sourceType: 'reference', sourceKey: 'price-books' },
      { key: 'defaultPriceLevelId', label: 'Default Price Level', section: 'Pricing & Billing', type: 'select', sourceType: 'reference', sourceKey: 'price-levels' },
      { key: 'termMonths', label: 'Term Months', section: 'Term & Renewal', type: 'number' },
      { key: 'autoRenew', label: 'Auto Renew', section: 'Term & Renewal', type: 'select', ...BOOLEAN_OPTIONS },
      { key: 'renewalMode', label: 'Renewal Mode', section: 'Term & Renewal', type: 'select', sourceType: 'managed-list', sourceKey: 'RENEWAL-MODE' },
      { key: 'renewalTermMonths', label: 'Renewal Term Months', section: 'Term & Renewal', type: 'number' },
      { key: 'usageRatingModel', label: 'Usage Rating Model', section: 'Usage', type: 'select', sourceType: 'managed-list', sourceKey: 'USAGE-RATING-MODEL' },
      { key: 'includedQuantity', label: 'Included Quantity', section: 'Usage', type: 'number' },
      { key: 'overageRate', label: 'Overage Rate', section: 'Usage', type: 'number' },
      { key: 'minimumCommitAmount', label: 'Minimum Commit Amount', section: 'Usage', type: 'money' },
      { key: 'setupFeeAmount', label: 'Setup Fee Amount', section: 'Usage', type: 'money' },
      { key: 'revenueRecognitionPolicy', label: 'Revenue Recognition Policy', section: 'Accounting', type: 'select', sourceType: 'managed-list', sourceKey: 'SUBSCRIPTION-REVREC-POLICY' },
      { key: 'revenueAccountId', label: 'Revenue Account', section: 'Accounting', type: 'select', sourceType: 'reference', sourceKey: 'chartOfAccounts' },
      { key: 'deferredRevenueAccountId', label: 'Deferred Revenue Account', section: 'Accounting', type: 'select', sourceType: 'reference', sourceKey: 'chartOfAccounts' },
      { key: 'costAccountId', label: 'Cost Account', section: 'Accounting', type: 'select', sourceType: 'reference', sourceKey: 'chartOfAccounts' },
      { key: 'deferredCostAccountId', label: 'Deferred Cost Account', section: 'Accounting', type: 'select', sourceType: 'reference', sourceKey: 'chartOfAccounts' },
      { key: 'inactive', label: 'Inactive', section: 'Status', type: 'select', ...ACTIVE_OPTIONS },
    ],
    listColumns: ['subscriptionPlanId', 'name', 'planType', 'billingModel', 'status', 'itemId', 'subsidiaryId', 'currencyId', 'defaultBillingScheduleId', 'defaultPriceBookId', 'termMonths', 'autoRenew', 'revenueRecognitionPolicy', 'inactive', 'createdAt', 'updatedAt'],
  },
}

export function getBillingMasterDataConfig(key: BillingMasterDataKey) {
  return BILLING_MASTER_DATA_CONFIGS[key]
}
