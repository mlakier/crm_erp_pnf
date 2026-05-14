import { getListSourceText, type FieldSourceType } from '@/lib/list-source'
import type { TransactionStatCardSlot } from '@/lib/transaction-page-config'

export type PriceBookFormFieldKey =
  | 'priceBookId'
  | 'name'
  | 'description'
  | 'bookType'
  | 'subsidiaryId'
  | 'includeChildren'
  | 'currencyId'
  | 'defaultPriceLevelId'
  | 'approvalRequired'
  | 'approvalWorkflow'
  | 'allowManualOverride'
  | 'effectiveStartDate'
  | 'effectiveEndDate'
  | 'inactive'

export type PriceBookFormFieldMeta = {
  id: PriceBookFormFieldKey
  label: string
  fieldType: string
  sourceType?: FieldSourceType
  sourceKey?: string
  source?: string
  description?: string
}

export type PriceBookFormFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type PriceBookStatCardMetric = 'status' | 'bookType' | 'currency' | 'scope'

export type PriceBookFormCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<PriceBookFormFieldKey, PriceBookFormFieldCustomization>
  statCards?: Array<TransactionStatCardSlot<PriceBookStatCardMetric>>
}

export const PRICE_BOOK_STAT_CARDS: Array<{ id: PriceBookStatCardMetric; label: string }> = [
  { id: 'status', label: 'Status' },
  { id: 'bookType', label: 'Book Type' },
  { id: 'currency', label: 'Currency' },
  { id: 'scope', label: 'Scope' },
]

export const PRICE_BOOK_FORM_FIELDS: PriceBookFormFieldMeta[] = [
  { id: 'priceBookId', label: 'Price Book ID', fieldType: 'text', description: 'System-generated business identifier for the price book.' },
  { id: 'name', label: 'Name', fieldType: 'text', description: 'Business-facing name for this price book.' },
  { id: 'description', label: 'Description', fieldType: 'textarea', description: 'Short explanation of when this price book should be used.' },
  { id: 'bookType', label: 'Book Type', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'PRICE-BOOK-TYPE', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'PRICE-BOOK-TYPE' }), description: 'Governed category such as standard, customer-specific, regional, channel, or promotional.' },
  { id: 'subsidiaryId', label: 'Subsidiary', fieldType: 'list', sourceType: 'reference', sourceKey: 'subsidiaries', source: getListSourceText({ sourceType: 'reference', sourceKey: 'subsidiaries' }), description: 'Optional subsidiary scope for this price book.' },
  { id: 'includeChildren', label: 'Include Children', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Allows child subsidiaries to use this price book when a parent subsidiary is selected.' },
  { id: 'currencyId', label: 'Currency', fieldType: 'list', sourceType: 'reference', sourceKey: 'currencies', source: getListSourceText({ sourceType: 'reference', sourceKey: 'currencies' }), description: 'Default transaction currency for this price book.' },
  { id: 'defaultPriceLevelId', label: 'Default Price Level', fieldType: 'list', sourceType: 'reference', sourceKey: 'price-levels', source: getListSourceText({ sourceType: 'reference', sourceKey: 'price-levels' }), description: 'Optional price level fallback used when a customer does not provide a more specific one.' },
  { id: 'approvalRequired', label: 'Approval Required', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Requires approval before this price book can be used.' },
  { id: 'approvalWorkflow', label: 'Approval Workflow', fieldType: 'text', description: 'Optional workflow key or name used when approval is required.' },
  { id: 'allowManualOverride', label: 'Allow Manual Override', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Allows authorized users to override price-book pricing output.' },
  { id: 'effectiveStartDate', label: 'Effective Start Date', fieldType: 'date', description: 'First date this price book is valid.' },
  { id: 'effectiveEndDate', label: 'Effective End Date', fieldType: 'date', description: 'Last date this price book is valid, if applicable.' },
  { id: 'inactive', label: 'Inactive', fieldType: 'list', sourceType: 'system', sourceKey: 'activeInactive', source: getListSourceText({ sourceType: 'system', sourceKey: 'activeInactive' }), description: 'Marks the price book unavailable for new use while preserving history.' },
]

export const DEFAULT_PRICE_BOOK_FORM_SECTIONS = ['Core', 'Scope', 'Pricing Governance', 'Effective Dating', 'Status'] as const

export function defaultPriceBookFormCustomization(): PriceBookFormCustomizationConfig {
  const sectionMap: Record<PriceBookFormFieldKey, string> = {
    priceBookId: 'Core',
    name: 'Core',
    description: 'Core',
    bookType: 'Core',
    subsidiaryId: 'Scope',
    includeChildren: 'Scope',
    currencyId: 'Scope',
    defaultPriceLevelId: 'Pricing Governance',
    approvalRequired: 'Pricing Governance',
    approvalWorkflow: 'Pricing Governance',
    allowManualOverride: 'Pricing Governance',
    effectiveStartDate: 'Effective Dating',
    effectiveEndDate: 'Effective Dating',
    inactive: 'Status',
  }
  const orderMap: Record<PriceBookFormFieldKey, number> = {
    priceBookId: 0,
    name: 1,
    description: 2,
    bookType: 3,
    subsidiaryId: 0,
    includeChildren: 1,
    currencyId: 2,
    defaultPriceLevelId: 0,
    approvalRequired: 1,
    approvalWorkflow: 2,
    allowManualOverride: 3,
    effectiveStartDate: 0,
    effectiveEndDate: 1,
    inactive: 0,
  }
  return {
    formColumns: 2,
    sections: [...DEFAULT_PRICE_BOOK_FORM_SECTIONS],
    sectionRows: Object.fromEntries(DEFAULT_PRICE_BOOK_FORM_SECTIONS.map((section, index) => [section, index])),
    fields: Object.fromEntries(
      PRICE_BOOK_FORM_FIELDS.map((field) => [
        field.id,
        {
          visible: true,
          section: sectionMap[field.id],
          order: orderMap[field.id],
          column: field.id === 'description' ? 1 : orderMap[field.id] % 2,
        },
      ]),
    ) as Record<PriceBookFormFieldKey, PriceBookFormFieldCustomization>,
    statCards: PRICE_BOOK_STAT_CARDS.map((card, index) => ({
      id: card.id,
      metric: card.id,
      visible: true,
      order: index,
      size: 'md',
      colorized: true,
      linked: false,
    })),
  }
}
