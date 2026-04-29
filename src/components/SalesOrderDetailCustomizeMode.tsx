'use client'

import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'
import {
  SALES_ORDER_LINE_COLUMNS,
  SALES_ORDER_REFERENCE_SOURCES,
  SALES_ORDER_STAT_CARDS,
  type SalesOrderDetailCustomizationConfig,
  type SalesOrderLineColumnKey,
} from '@/lib/sales-order-detail-customization'

const LOOKUP_DISPLAY_COLUMNS = new Set<SalesOrderLineColumnKey>(['item-id'])

const SALES_ORDER_LINE_SETTING_AVAILABILITY = Object.fromEntries(
  SALES_ORDER_LINE_COLUMNS.map((column) => [
    column.id,
    [
      'widthMode',
      ...(LOOKUP_DISPLAY_COLUMNS.has(column.id) ? ['dropdownDisplay', 'dropdownSort', 'editDisplay', 'viewDisplay'] : []),
    ],
  ]),
) as Record<SalesOrderLineColumnKey, string[]>

type CustomizeField = {
  id: string
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function SalesOrderDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  referenceSourceDefinitions,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: SalesOrderDetailCustomizationConfig
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
  }>
}) {
  return (
    <TransactionRecordDetailCustomizeMode
      detailHref={detailHref}
      initialLayout={initialLayout}
      fields={fields}
      formKey="salesOrderCreate"
      saveEndpoint="/api/config/sales-order-detail-customization"
      recordLabel="sales order"
      lineColumnsLabel="Sales Order Line Items"
      sectionDescriptions={sectionDescriptions}
      statCardDefinitions={SALES_ORDER_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      referenceSourceDefinitions={referenceSourceDefinitions ?? SALES_ORDER_REFERENCE_SOURCES}
      lineColumnDefinitions={SALES_ORDER_LINE_COLUMNS}
      lineColumnSettingAvailability={SALES_ORDER_LINE_SETTING_AVAILABILITY}
    />
  )
}
