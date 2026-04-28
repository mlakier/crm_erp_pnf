'use client'

import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'
import {
  OPPORTUNITY_LINE_COLUMNS,
  OPPORTUNITY_REFERENCE_SOURCES,
  OPPORTUNITY_STAT_CARDS,
  type OpportunityDetailCustomizationConfig,
  type OpportunityDetailFieldKey,
  type OpportunityLineColumnKey,
} from '@/lib/opportunity-detail-customization'

const LOOKUP_DISPLAY_COLUMNS = new Set<OpportunityLineColumnKey>(['item-id'])

const OPPORTUNITY_LINE_SETTING_AVAILABILITY = Object.fromEntries(
  OPPORTUNITY_LINE_COLUMNS.map((column) => [
    column.id,
    [
      'widthMode',
      ...(LOOKUP_DISPLAY_COLUMNS.has(column.id) ? ['dropdownDisplay', 'dropdownSort', 'editDisplay', 'viewDisplay'] : []),
    ],
  ]),
) as Record<OpportunityLineColumnKey, string[]>

type CustomizeField = {
  id: OpportunityDetailFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function OpportunityDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  referenceSourceDefinitions,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: OpportunityDetailCustomizationConfig
  fields: CustomizeField[]
  referenceSourceDefinitions?: Array<{
    id: string
    label: string
    linkedFieldLabel: string
    description: string
    defaultVisibleFieldIds: string[]
    defaultColumns?: number
    defaultRows?: number
    fields: CustomizeField[]
  }>
  sectionDescriptions?: Record<string, string>
  statPreviewCards?: Array<{
    id: string
    label: string
    value: string | number
    href?: string | null
    accent?: true | 'teal' | 'yellow'
    valueTone?: TransactionVisualTone
    cardTone?: TransactionVisualTone
    supportsColorized?: boolean
    supportsLink?: boolean
  }>
}) {
  return (
    <TransactionRecordDetailCustomizeMode
      detailHref={detailHref}
      initialLayout={initialLayout}
      fields={fields}
      formKey="opportunityCreate"
      saveEndpoint="/api/config/opportunity-detail-customization"
      recordLabel="opportunity"
      lineColumnsLabel="Opportunity Line Items"
      sectionDescriptions={sectionDescriptions}
      referenceSourceDefinitions={referenceSourceDefinitions ?? OPPORTUNITY_REFERENCE_SOURCES}
      lineColumnDefinitions={OPPORTUNITY_LINE_COLUMNS}
      lineColumnSettingAvailability={OPPORTUNITY_LINE_SETTING_AVAILABILITY}
      statCardDefinitions={OPPORTUNITY_STAT_CARDS}
      statPreviewCards={statPreviewCards}
    />
  )
}
