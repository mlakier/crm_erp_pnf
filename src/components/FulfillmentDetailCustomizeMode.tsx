'use client'

import type {
  FulfillmentDetailCustomizationConfig,
  FulfillmentLineColumnKey,
} from '@/lib/fulfillment-detail-customization'
import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import {
  FULFILLMENT_REFERENCE_SOURCES,
  FULFILLMENT_LINE_COLUMNS,
  FULFILLMENT_STAT_CARDS,
} from '@/lib/fulfillment-detail-customization'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'

const LOOKUP_DISPLAY_COLUMNS = new Set<FulfillmentLineColumnKey>(['item-id'])

const FULFILLMENT_LINE_SETTING_AVAILABILITY = Object.fromEntries(
  FULFILLMENT_LINE_COLUMNS.map((column) => [
    column.id,
    [
      'widthMode',
      ...(LOOKUP_DISPLAY_COLUMNS.has(column.id) ? ['dropdownDisplay', 'dropdownSort', 'editDisplay', 'viewDisplay'] : []),
    ],
  ]),
) as Record<FulfillmentLineColumnKey, string[]>

type CustomizeField = {
  id: string
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function FulfillmentDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  referenceSourceDefinitions,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: FulfillmentDetailCustomizationConfig
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
      formKey="fulfillmentCreate"
      saveEndpoint="/api/config/fulfillment-detail-customization"
      recordLabel="fulfillment"
      lineColumnsLabel="Fulfillment Lines"
      sectionDescriptions={sectionDescriptions}
      referenceSourceDefinitions={referenceSourceDefinitions ?? FULFILLMENT_REFERENCE_SOURCES}
      statCardDefinitions={FULFILLMENT_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      lineColumnDefinitions={FULFILLMENT_LINE_COLUMNS}
      lineColumnSettingAvailability={FULFILLMENT_LINE_SETTING_AVAILABILITY}
    />
  )
}
