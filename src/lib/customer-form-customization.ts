import { getListSourceText, type FieldSourceType } from '@/lib/list-source'
import type { TransactionStatCardSlot } from '@/lib/transaction-page-config'

export type CustomerFormFieldKey =
  | 'customerId'
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'industry'
  | 'customerType'
  | 'customerGroup'
  | 'customerStatus'
  | 'territory'
  | 'salesManager'
  | 'projectManager'
  | 'arAccountId'
  | 'startDate'
  | 'endDate'
  | 'reminderDays'
  | 'priceLevel'
  | 'priceBook'
  | 'taxable'
  | 'taxItem'
  | 'resaleNumber'
  | 'language'
  | 'numberFormat'
  | 'negativeNumberFormat'
  | 'shipComplete'
  | 'shippingCarrier'
  | 'shippingMethod'
  | 'blockCollectionEmail'
  | 'collectionsRep'
  | 'primarySubsidiaryId'
  | 'primaryCurrencyId'
  | 'includeChildren'
  | 'inactive'

export type CustomerFormFieldMeta = {
  id: CustomerFormFieldKey
  label: string
  fieldType: string
  sourceType?: FieldSourceType
  sourceKey?: string
  source?: string
  description?: string
}

export type CustomerFormFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type CustomerFormCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<CustomerFormFieldKey, CustomerFormFieldCustomization>
  statCards?: Array<TransactionStatCardSlot<CustomerStatCardMetric>>
}

export type CustomerStatCardMetric =
  | 'contacts'
  | 'opportunities'
  | 'pipelineValue'
  | 'status'

export const CUSTOMER_STAT_CARDS: Array<{ id: CustomerStatCardMetric; label: string }> = [
  { id: 'contacts', label: 'Contacts' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'pipelineValue', label: 'Pipeline Value' },
  { id: 'status', label: 'Status' },
]

export const CUSTOMER_FORM_FIELDS: CustomerFormFieldMeta[] = [
  { id: 'customerId', label: 'Customer ID', fieldType: 'text', description: 'System-generated customer identifier.' },
  { id: 'name', label: 'Name', fieldType: 'text', description: 'Primary customer or account name.' },
  { id: 'email', label: 'Email', fieldType: 'text', description: 'Primary customer email address.' },
  { id: 'phone', label: 'Phone', fieldType: 'text', description: 'Primary customer phone number.' },
  { id: 'address', label: 'Billing Address', fieldType: 'address', description: 'Main billing address for the customer.' },
  { id: 'industry', label: 'Industry', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-CUST-INDUSTRY', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-CUST-INDUSTRY' }), description: 'Customer industry or segment classification.' },
  { id: 'customerType', label: 'Customer Type', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-CUST-TYPE', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-CUST-TYPE' }), description: 'Commercial classification such as direct, partner, distributor, or enterprise.' },
  { id: 'customerGroup', label: 'Customer Group', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-CUST-GROUP', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-CUST-GROUP' }), description: 'Reporting and segmentation group for this customer.' },
  { id: 'customerStatus', label: 'Customer Status', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-CUST-STATUS', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-CUST-STATUS' }), description: 'Commercial lifecycle status such as prospect, active, on hold, or inactive.' },
  { id: 'territory', label: 'Territory', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-CUST-TERRITORY', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-CUST-TERRITORY' }), description: 'Sales territory used for assignment and reporting.' },
  { id: 'salesManager', label: 'Sales Manager', fieldType: 'list', sourceType: 'reference', sourceKey: 'employees', source: getListSourceText({ sourceType: 'reference', sourceKey: 'employees' }), description: 'Sales owner responsible for this customer relationship.' },
  { id: 'projectManager', label: 'Project Manager', fieldType: 'list', sourceType: 'reference', sourceKey: 'employees', source: getListSourceText({ sourceType: 'reference', sourceKey: 'employees' }), description: 'Default project manager for delivery work tied to this customer.' },
  { id: 'arAccountId', label: 'AR Account', fieldType: 'list', sourceType: 'reference', sourceKey: 'chart-of-accounts', source: getListSourceText({ sourceType: 'reference', sourceKey: 'chart-of-accounts' }), description: 'Default receivables control account for customer postings.' },
  { id: 'startDate', label: 'Start Date', fieldType: 'date', description: 'Date the customer relationship starts.' },
  { id: 'endDate', label: 'End Date', fieldType: 'date', description: 'Date the customer relationship ends, if applicable.' },
  { id: 'reminderDays', label: 'Reminder Days', fieldType: 'number', description: 'Default reminder lead time for customer follow-up and collections.' },
  { id: 'priceLevel', label: 'Price Level', fieldType: 'list', sourceType: 'reference', sourceKey: 'price-levels', source: getListSourceText({ sourceType: 'reference', sourceKey: 'price-levels' }), description: 'Default price level master record used for sales pricing governance.' },
  { id: 'priceBook', label: 'Price Book', fieldType: 'list', sourceType: 'reference', sourceKey: 'price-books', source: getListSourceText({ sourceType: 'reference', sourceKey: 'price-books' }), description: 'Default price book master record used for quotes, orders, and invoices.' },
  { id: 'taxable', label: 'Taxable', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Whether sales to this customer are taxable by default.' },
  { id: 'taxItem', label: 'Tax Code', fieldType: 'list', sourceType: 'reference', sourceKey: 'tax-codes', source: getListSourceText({ sourceType: 'reference', sourceKey: 'tax-codes' }), description: 'Default sales tax code master record.' },
  { id: 'resaleNumber', label: 'Resale Number', fieldType: 'text', description: 'Customer resale or exemption certificate number.' },
  { id: 'language', label: 'Language', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-LANGUAGE', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-LANGUAGE' }), description: 'Default language for customer-facing communication.' },
  { id: 'numberFormat', label: 'Number Format', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-NUMBER-FORMAT', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-NUMBER-FORMAT' }), description: 'Preferred number formatting for customer-facing documents.' },
  { id: 'negativeNumberFormat', label: 'Negative Number Format', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-NEGATIVE-NUMBER-FORMAT', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-NEGATIVE-NUMBER-FORMAT' }), description: 'Preferred negative number presentation.' },
  { id: 'shipComplete', label: 'Ship Complete', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Whether orders should ship only when all lines are available.' },
  { id: 'shippingCarrier', label: 'Shipping Carrier', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-SHIPPING-CARRIER', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-SHIPPING-CARRIER' }), description: 'Default carrier for customer shipments.' },
  { id: 'shippingMethod', label: 'Shipping Method', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-SHIPPING-METHOD', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-SHIPPING-METHOD' }), description: 'Default shipping method for customer shipments.' },
  { id: 'blockCollectionEmail', label: 'Block Collection Email', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Prevents automated collection emails for this customer.' },
  { id: 'collectionsRep', label: 'Collections Rep', fieldType: 'list', sourceType: 'reference', sourceKey: 'employees', source: getListSourceText({ sourceType: 'reference', sourceKey: 'employees' }), description: 'Default collections owner for overdue balances.' },
  { id: 'primarySubsidiaryId', label: 'Primary Subsidiary', fieldType: 'list', sourceType: 'reference', sourceKey: 'subsidiaries', source: getListSourceText({ sourceType: 'reference', sourceKey: 'subsidiaries' }), description: 'Default subsidiary context for this customer.' },
  { id: 'primaryCurrencyId', label: 'Primary Currency', fieldType: 'list', sourceType: 'reference', sourceKey: 'currencies', source: getListSourceText({ sourceType: 'reference', sourceKey: 'currencies' }), description: 'Default transaction currency for this customer.' },
  { id: 'includeChildren', label: 'Include Children', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Extends subsidiary availability to child subsidiaries when subsidiary hierarchy is used.' },
  { id: 'inactive', label: 'Inactive', fieldType: 'list', sourceType: 'system', sourceKey: 'activeInactive', source: getListSourceText({ sourceType: 'system', sourceKey: 'activeInactive' }), description: 'Marks the customer unavailable for new activity while preserving history.' },
]

export const DEFAULT_CUSTOMER_FORM_SECTIONS = [
  'Core',
  'Sales',
  'Contact',
  'Financial',
  'Tax',
  'Preferences',
  'Collections',
  'Subsidiary Access',
  'Status',
] as const

export function defaultCustomerFormCustomization(): CustomerFormCustomizationConfig {
  const sectionMap: Record<CustomerFormFieldKey, string> = {
    customerId: 'Core',
    name: 'Core',
    customerType: 'Sales',
    customerGroup: 'Sales',
    customerStatus: 'Sales',
    territory: 'Sales',
    salesManager: 'Sales',
    projectManager: 'Sales',
    email: 'Contact',
    phone: 'Contact',
    address: 'Contact',
    industry: 'Sales',
    arAccountId: 'Financial',
    startDate: 'Financial',
    endDate: 'Financial',
    reminderDays: 'Financial',
    priceLevel: 'Financial',
    priceBook: 'Financial',
    taxable: 'Tax',
    taxItem: 'Tax',
    resaleNumber: 'Tax',
    language: 'Preferences',
    numberFormat: 'Preferences',
    negativeNumberFormat: 'Preferences',
    shipComplete: 'Preferences',
    shippingCarrier: 'Preferences',
    shippingMethod: 'Preferences',
    blockCollectionEmail: 'Collections',
    collectionsRep: 'Collections',
    primarySubsidiaryId: 'Subsidiary Access',
    primaryCurrencyId: 'Subsidiary Access',
    includeChildren: 'Subsidiary Access',
    inactive: 'Status',
  }

  const columnMap: Record<CustomerFormFieldKey, number> = {
    customerId: 1,
    name: 2,
    customerType: 1,
    customerGroup: 2,
    customerStatus: 1,
    territory: 2,
    salesManager: 1,
    projectManager: 2,
    email: 1,
    phone: 2,
    address: 1,
    industry: 1,
    arAccountId: 1,
    startDate: 2,
    endDate: 1,
    reminderDays: 2,
    priceLevel: 1,
    priceBook: 2,
    taxable: 1,
    taxItem: 2,
    resaleNumber: 1,
    language: 1,
    numberFormat: 2,
    negativeNumberFormat: 1,
    shipComplete: 2,
    shippingCarrier: 1,
    shippingMethod: 2,
    blockCollectionEmail: 1,
    collectionsRep: 2,
    primarySubsidiaryId: 1,
    primaryCurrencyId: 2,
    includeChildren: 1,
    inactive: 1,
  }

  const rowMap: Record<CustomerFormFieldKey, number> = {
    customerId: 0,
    name: 0,
    customerType: 0,
    customerGroup: 0,
    customerStatus: 1,
    territory: 1,
    salesManager: 2,
    projectManager: 2,
    email: 0,
    phone: 0,
    address: 1,
    industry: 3,
    arAccountId: 0,
    startDate: 0,
    endDate: 1,
    reminderDays: 1,
    priceLevel: 2,
    priceBook: 2,
    taxable: 0,
    taxItem: 0,
    resaleNumber: 1,
    language: 0,
    numberFormat: 0,
    negativeNumberFormat: 1,
    shipComplete: 1,
    shippingCarrier: 2,
    shippingMethod: 2,
    blockCollectionEmail: 0,
    collectionsRep: 0,
    primarySubsidiaryId: 0,
    primaryCurrencyId: 0,
    includeChildren: 1,
    inactive: 0,
  }

  return {
    formColumns: 2,
    sections: [...DEFAULT_CUSTOMER_FORM_SECTIONS],
    sectionRows: {
      Core: 1,
      Sales: 4,
      Contact: 2,
      Financial: 3,
      Tax: 2,
      Preferences: 3,
      Collections: 1,
      'Subsidiary Access': 2,
      Status: 1,
    },
    fields: Object.fromEntries(
      CUSTOMER_FORM_FIELDS.map((field) => [
        field.id,
        {
          visible: true,
          section: sectionMap[field.id],
          order: rowMap[field.id],
          column: columnMap[field.id],
        },
      ])
    ) as Record<CustomerFormFieldKey, CustomerFormFieldCustomization>,
    statCards: CUSTOMER_STAT_CARDS.map((card, index) => ({
      id: `customer-stat-${card.id}`,
      metric: card.id,
      visible: true,
      order: index,
      size: 'md',
      colorized: true,
      linked: true,
    })),
  }
}
