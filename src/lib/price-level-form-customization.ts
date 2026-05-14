import { getListSourceText, type FieldSourceType } from '@/lib/list-source'
import type { TransactionStatCardSlot } from '@/lib/transaction-page-config'

export type PriceLevelFormFieldKey =
  | 'priceLevelId'
  | 'name'
  | 'description'
  | 'levelType'
  | 'subsidiaryId'
  | 'includeChildren'
  | 'defaultDiscountPct'
  | 'minimumMarginPct'
  | 'approvalRequired'
  | 'approvalWorkflow'
  | 'allowManualOverride'
  | 'effectiveStartDate'
  | 'effectiveEndDate'
  | 'inactive'

export type PriceLevelFormFieldMeta = {
  id: PriceLevelFormFieldKey
  label: string
  fieldType: string
  sourceType?: FieldSourceType
  sourceKey?: string
  source?: string
  description?: string
}

export type PriceLevelFormFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type PriceLevelFormCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<PriceLevelFormFieldKey, PriceLevelFormFieldCustomization>
  statCards?: Array<TransactionStatCardSlot<PriceLevelStatCardMetric>>
}

export type PriceLevelStatCardMetric =
  | 'status'
  | 'levelType'
  | 'scope'
  | 'approval'

export const PRICE_LEVEL_STAT_CARDS: Array<{ id: PriceLevelStatCardMetric; label: string }> = [
  { id: 'status', label: 'Status' },
  { id: 'levelType', label: 'Level Type' },
  { id: 'scope', label: 'Scope' },
  { id: 'approval', label: 'Approval' },
]

export const PRICE_LEVEL_FORM_FIELDS: PriceLevelFormFieldMeta[] = [
  { id: 'priceLevelId', label: 'Price Level ID', fieldType: 'text', description: 'System-generated business identifier for the price level.' },
  { id: 'name', label: 'Name', fieldType: 'text', description: 'Business-facing name for this price level.' },
  { id: 'description', label: 'Description', fieldType: 'text', description: 'Short explanation of how and when this price level should be used.' },
  { id: 'levelType', label: 'Level Type', fieldType: 'list', sourceType: 'managed-list', sourceKey: 'LIST-PRICE-LEVEL-TYPE', source: getListSourceText({ sourceType: 'managed-list', sourceKey: 'LIST-PRICE-LEVEL-TYPE' }), description: 'Governed category such as standard, preferred, partner, enterprise, or promotional.' },
  { id: 'subsidiaryId', label: 'Subsidiary', fieldType: 'list', sourceType: 'reference', sourceKey: 'subsidiaries', source: getListSourceText({ sourceType: 'reference', sourceKey: 'subsidiaries' }), description: 'Optional subsidiary scope for this price level.' },
  { id: 'includeChildren', label: 'Include Children', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Allows child subsidiaries to use this price level when a parent subsidiary is selected.' },
  { id: 'defaultDiscountPct', label: 'Default Discount %', fieldType: 'number', description: 'Default discount percentage suggested when this price level is applied.' },
  { id: 'minimumMarginPct', label: 'Minimum Margin %', fieldType: 'number', description: 'Minimum margin guardrail for pricing approvals and exception review.' },
  { id: 'approvalRequired', label: 'Approval Required', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Requires approval before this price level can be used on customer-facing transactions.' },
  { id: 'approvalWorkflow', label: 'Approval Workflow', fieldType: 'text', description: 'Optional workflow key or name used when approval is required.' },
  { id: 'allowManualOverride', label: 'Allow Manual Override', fieldType: 'list', sourceType: 'system', sourceKey: 'boolean', source: getListSourceText({ sourceType: 'system', sourceKey: 'boolean' }), description: 'Allows authorized users to override the default pricing output.' },
  { id: 'effectiveStartDate', label: 'Effective Start Date', fieldType: 'date', description: 'First date this price level is valid.' },
  { id: 'effectiveEndDate', label: 'Effective End Date', fieldType: 'date', description: 'Last date this price level is valid, if applicable.' },
  { id: 'inactive', label: 'Inactive', fieldType: 'list', sourceType: 'system', sourceKey: 'activeInactive', source: getListSourceText({ sourceType: 'system', sourceKey: 'activeInactive' }), description: 'Marks the price level unavailable for new use while preserving history.' },
]

export const DEFAULT_PRICE_LEVEL_FORM_SECTIONS = [
  'Core',
  'Scope',
  'Pricing Governance',
  'Effective Dating',
  'Status',
] as const

export function defaultPriceLevelFormCustomization(): PriceLevelFormCustomizationConfig {
  const sectionMap: Record<PriceLevelFormFieldKey, string> = {
    priceLevelId: 'Core',
    name: 'Core',
    description: 'Core',
    levelType: 'Core',
    subsidiaryId: 'Scope',
    includeChildren: 'Scope',
    defaultDiscountPct: 'Pricing Governance',
    minimumMarginPct: 'Pricing Governance',
    approvalRequired: 'Pricing Governance',
    approvalWorkflow: 'Pricing Governance',
    allowManualOverride: 'Pricing Governance',
    effectiveStartDate: 'Effective Dating',
    effectiveEndDate: 'Effective Dating',
    inactive: 'Status',
  }

  const columnMap: Record<PriceLevelFormFieldKey, number> = {
    priceLevelId: 1,
    name: 2,
    description: 1,
    levelType: 2,
    subsidiaryId: 1,
    includeChildren: 2,
    defaultDiscountPct: 1,
    minimumMarginPct: 2,
    approvalRequired: 1,
    approvalWorkflow: 2,
    allowManualOverride: 1,
    effectiveStartDate: 1,
    effectiveEndDate: 2,
    inactive: 1,
  }

  const rowMap: Record<PriceLevelFormFieldKey, number> = {
    priceLevelId: 0,
    name: 0,
    description: 1,
    levelType: 1,
    subsidiaryId: 0,
    includeChildren: 0,
    defaultDiscountPct: 0,
    minimumMarginPct: 0,
    approvalRequired: 1,
    approvalWorkflow: 1,
    allowManualOverride: 2,
    effectiveStartDate: 0,
    effectiveEndDate: 0,
    inactive: 0,
  }

  return {
    formColumns: 2,
    sections: [...DEFAULT_PRICE_LEVEL_FORM_SECTIONS],
    sectionRows: {
      Core: 2,
      Scope: 1,
      'Pricing Governance': 3,
      'Effective Dating': 1,
      Status: 1,
    },
    fields: Object.fromEntries(
      PRICE_LEVEL_FORM_FIELDS.map((field) => [
        field.id,
        {
          visible: true,
          section: sectionMap[field.id],
          order: rowMap[field.id],
          column: columnMap[field.id],
        },
      ]),
    ) as Record<PriceLevelFormFieldKey, PriceLevelFormFieldCustomization>,
    statCards: PRICE_LEVEL_STAT_CARDS.map((card, index) => ({
      id: `price-level-stat-${card.id}`,
      metric: card.id,
      visible: true,
      order: index,
      size: 'md',
      colorized: true,
      linked: true,
    })),
  }
}
