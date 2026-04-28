'use client'

import type {
  PurchaseRequisitionDetailCustomizationConfig,
  PurchaseRequisitionDetailFieldKey,
  PurchaseRequisitionLineColumnKey,
} from '@/lib/purchase-requisitions-detail-customization'
import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import {
  PURCHASE_REQUISITION_LINE_COLUMNS,
  PURCHASE_REQUISITION_REFERENCE_SOURCES,
  PURCHASE_REQUISITION_STAT_CARDS,
} from '@/lib/purchase-requisitions-detail-customization'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'

const LOOKUP_DISPLAY_COLUMNS = new Set<PurchaseRequisitionLineColumnKey>(['item-id'])

const PURCHASE_REQUISITION_LINE_SETTING_AVAILABILITY = Object.fromEntries(
  PURCHASE_REQUISITION_LINE_COLUMNS.map((column) => [
    column.id,
    [
      'widthMode',
      ...(LOOKUP_DISPLAY_COLUMNS.has(column.id) ? ['dropdownDisplay', 'dropdownSort', 'editDisplay', 'viewDisplay'] : []),
    ],
  ]),
) as Record<PurchaseRequisitionLineColumnKey, string[]>

type CustomizeField = {
  id: PurchaseRequisitionDetailFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function PurchaseRequisitionDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  referenceSourceDefinitions,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: PurchaseRequisitionDetailCustomizationConfig
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
      formKey="purchaseRequisitionCreate"
      saveEndpoint="/api/config/purchase-requisitions-detail-customization"
      recordLabel="purchase requisition"
      lineColumnsLabel="Purchase Requisition Line Items"
      sectionDescriptions={sectionDescriptions}
      referenceSourceDefinitions={referenceSourceDefinitions ?? PURCHASE_REQUISITION_REFERENCE_SOURCES}
      statCardDefinitions={PURCHASE_REQUISITION_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      lineColumnDefinitions={PURCHASE_REQUISITION_LINE_COLUMNS}
      lineColumnSettingAvailability={PURCHASE_REQUISITION_LINE_SETTING_AVAILABILITY}
    />
  )
}
