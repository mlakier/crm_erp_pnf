export type ItemFormFieldKey =
  | 'name'
  | 'itemId'
  | 'sku'
  | 'description'
  | 'inactive'
  | 'itemType'
  | 'uom'
  | 'listPrice'
  | 'revenueStream'
  | 'recognitionMethod'
  | 'recognitionTrigger'
  | 'defaultRevRecTemplateId'
  | 'defaultTermMonths'
  | 'standaloneSellingPrice'
  | 'billingType'
  | 'standardCost'
  | 'averageCost'
  | 'entityId'
  | 'currencyId'
  | 'incomeAccountId'
  | 'deferredRevenueAccountId'
  | 'inventoryAccountId'
  | 'cogsExpenseAccountId'
  | 'deferredCostAccountId'
  | 'directRevenuePosting'

export type ItemFormFieldMeta = {
  id: ItemFormFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
}

export type ItemFormFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type ItemFormCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<ItemFormFieldKey, ItemFormFieldCustomization>
}

export const ITEM_FORM_FIELDS: ItemFormFieldMeta[] = [
  { id: 'name', label: 'Name', fieldType: 'text', description: 'Primary item name shown on transactions and reports.' },
  { id: 'itemId', label: 'Item ID', fieldType: 'text', description: 'Internal item identifier.' },
  { id: 'sku', label: 'SKU', fieldType: 'text', description: 'Stock keeping unit or external product code.' },
  { id: 'description', label: 'Description', fieldType: 'text', description: 'Longer description for operational context, purchasing, sales, or internal documentation.' },
  { id: 'inactive', label: 'Inactive', fieldType: 'list', source: 'System status values', description: 'Marks the item as unavailable for new use while preserving historical transactions and reporting.' },
  { id: 'itemType', label: 'Item Type', fieldType: 'list', source: 'Manage Lists -> Item Types', description: 'High-level item classification.' },
  { id: 'uom', label: 'UOM', fieldType: 'text', description: 'Default unit of measure.' },
  { id: 'listPrice', label: 'List Price', fieldType: 'number', description: 'Default commercial sales price.' },
  { id: 'revenueStream', label: 'Revenue Stream', fieldType: 'text', description: 'Reporting bucket for item revenue.' },
  { id: 'recognitionMethod', label: 'Recognition Method', fieldType: 'list', source: 'System values', description: 'Point in time or over time revenue logic.' },
  { id: 'recognitionTrigger', label: 'Recognition Trigger', fieldType: 'text', description: 'Operational event that triggers recognition.' },
  { id: 'defaultRevRecTemplateId', label: 'Revenue Recognition Template', fieldType: 'list', source: 'Revenue Recognition Templates', description: 'Default revenue schedule template.' },
  { id: 'defaultTermMonths', label: 'Default Term Months', fieldType: 'number', description: 'Default contract or service term.' },
  { id: 'standaloneSellingPrice', label: 'Standalone Selling Price', fieldType: 'number', description: 'Used for bundle allocation logic.' },
  { id: 'billingType', label: 'Billing Type', fieldType: 'text', description: 'One-time, recurring, milestone, or usage pattern.' },
  { id: 'standardCost', label: 'Standard Cost', fieldType: 'number', description: 'Planned cost for analysis and reporting.' },
  { id: 'averageCost', label: 'Average Cost', fieldType: 'number', description: 'Average cost basis for the item.' },
  { id: 'entityId', label: 'Subsidiary', fieldType: 'list', source: 'Subsidiaries master data', description: 'Default legal entity context.' },
  { id: 'currencyId', label: 'Currency', fieldType: 'list', source: 'Currencies master data', description: 'Default item currency.' },
  { id: 'incomeAccountId', label: 'Income Account', fieldType: 'list', source: 'Chart of Accounts', description: 'Default revenue posting account.' },
  { id: 'deferredRevenueAccountId', label: 'Deferred Revenue Account', fieldType: 'list', source: 'Chart of Accounts', description: 'Default deferred revenue liability account.' },
  { id: 'inventoryAccountId', label: 'Inventory Account', fieldType: 'list', source: 'Chart of Accounts', description: 'Default inventory asset account.' },
  { id: 'cogsExpenseAccountId', label: 'COGS / Expense Account', fieldType: 'list', source: 'Chart of Accounts', description: 'Default cost or expense account.' },
  { id: 'deferredCostAccountId', label: 'Deferred Cost Account', fieldType: 'list', source: 'Chart of Accounts', description: 'Default deferred cost asset account.' },
  { id: 'directRevenuePosting', label: 'Direct Revenue Posting', fieldType: 'boolean', description: 'Determines whether deferred revenue and deferred cost logic should be bypassed.' },
]

export const DEFAULT_ITEM_FORM_SECTIONS = [
  'Core',
  'Pricing And Costing',
  'Revenue Recognition',
  'Accounting',
] as const

export function defaultItemFormCustomization(): ItemFormCustomizationConfig {
  const sectionMap: Record<ItemFormFieldKey, string> = {
    name: 'Core',
    itemId: 'Core',
    sku: 'Core',
    description: 'Core',
    inactive: 'Core',
    itemType: 'Core',
    uom: 'Pricing And Costing',
    listPrice: 'Pricing And Costing',
    revenueStream: 'Revenue Recognition',
    recognitionMethod: 'Revenue Recognition',
    recognitionTrigger: 'Revenue Recognition',
    defaultRevRecTemplateId: 'Revenue Recognition',
    defaultTermMonths: 'Revenue Recognition',
    standaloneSellingPrice: 'Pricing And Costing',
    billingType: 'Revenue Recognition',
    standardCost: 'Pricing And Costing',
    averageCost: 'Pricing And Costing',
    entityId: 'Accounting',
    currencyId: 'Pricing And Costing',
    incomeAccountId: 'Accounting',
    deferredRevenueAccountId: 'Accounting',
    inventoryAccountId: 'Accounting',
    cogsExpenseAccountId: 'Accounting',
    deferredCostAccountId: 'Accounting',
    directRevenuePosting: 'Accounting',
  }

  const columnMap: Record<ItemFormFieldKey, number> = {
    name: 1,
    itemId: 2,
    sku: 1,
    description: 1,
    inactive: 2,
    itemType: 2,
    uom: 1,
    listPrice: 2,
    revenueStream: 1,
    recognitionMethod: 2,
    recognitionTrigger: 1,
    defaultRevRecTemplateId: 2,
    defaultTermMonths: 1,
    standaloneSellingPrice: 2,
    billingType: 1,
    standardCost: 1,
    averageCost: 2,
    entityId: 1,
    currencyId: 2,
    incomeAccountId: 1,
    deferredRevenueAccountId: 2,
    inventoryAccountId: 1,
    cogsExpenseAccountId: 2,
    deferredCostAccountId: 1,
    directRevenuePosting: 1,
  }

  const rowMap: Record<ItemFormFieldKey, number> = {
    name: 0,
    itemId: 0,
    sku: 1,
    description: 1,
    inactive: 1,
    itemType: 0,
    uom: 0,
    listPrice: 1,
    revenueStream: 0,
    recognitionMethod: 0,
    recognitionTrigger: 1,
    defaultRevRecTemplateId: 1,
    defaultTermMonths: 2,
    standaloneSellingPrice: 0,
    billingType: 2,
    standardCost: 1,
    averageCost: 1,
    entityId: 0,
    currencyId: 2,
    incomeAccountId: 1,
    deferredRevenueAccountId: 1,
    inventoryAccountId: 2,
    cogsExpenseAccountId: 2,
    deferredCostAccountId: 2,
    directRevenuePosting: 0,
  }

  return {
    formColumns: 2,
    sections: [...DEFAULT_ITEM_FORM_SECTIONS],
    sectionRows: {
      Core: 2,
      'Pricing And Costing': 3,
      'Revenue Recognition': 3,
      Accounting: 3,
    },
    fields: Object.fromEntries(
      ITEM_FORM_FIELDS.map((field) => [
        field.id,
        {
          visible: true,
          section: sectionMap[field.id],
          order: rowMap[field.id],
          column: columnMap[field.id],
        },
      ])
    ) as Record<ItemFormFieldKey, ItemFormFieldCustomization>,
  }
}
