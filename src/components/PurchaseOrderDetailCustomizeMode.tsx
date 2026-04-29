'use client'

import type {
  PurchaseOrderDetailCustomizationConfig,
  PurchaseOrderLineColumnKey,
} from '@/lib/purchase-order-detail-customization'
import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import {
  PURCHASE_ORDER_LINE_COLUMNS,
  PURCHASE_ORDER_REFERENCE_SOURCES,
  PURCHASE_ORDER_STAT_CARDS,
} from '@/lib/purchase-order-detail-customization'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'

const LOOKUP_DISPLAY_COLUMNS = new Set<PurchaseOrderLineColumnKey>(['item-id'])

const PURCHASE_ORDER_LINE_SETTING_AVAILABILITY = Object.fromEntries(
  PURCHASE_ORDER_LINE_COLUMNS.map((column) => [
    column.id,
    [
      'widthMode',
      ...(LOOKUP_DISPLAY_COLUMNS.has(column.id)
        ? ['dropdownDisplay', 'dropdownSort', 'editDisplay', 'viewDisplay']
        : []),
    ],
  ]),
) as Record<PurchaseOrderLineColumnKey, string[]>

type CustomizeField = {
  id: string
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function PurchaseOrderDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  referenceSourceDefinitions,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: PurchaseOrderDetailCustomizationConfig
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
      formKey="purchaseOrderCreate"
      saveEndpoint="/api/config/purchase-order-detail-customization"
      recordLabel="purchase order"
      lineColumnsLabel="Purchase Order Line Items"
      sectionDescriptions={sectionDescriptions}
      referenceSourceDefinitions={referenceSourceDefinitions ?? PURCHASE_ORDER_REFERENCE_SOURCES}
      statCardDefinitions={PURCHASE_ORDER_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      lineColumnDefinitions={PURCHASE_ORDER_LINE_COLUMNS}
      lineColumnSettingAvailability={PURCHASE_ORDER_LINE_SETTING_AVAILABILITY}
    />
  )
}
