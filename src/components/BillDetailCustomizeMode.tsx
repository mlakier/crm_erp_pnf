'use client'

import type {
  BillDetailCustomizationConfig,
  BillDetailFieldKey,
  BillLineColumnKey,
} from '@/lib/bill-detail-customization'
import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import { BILL_LINE_COLUMNS, BILL_REFERENCE_SOURCES, BILL_STAT_CARDS } from '@/lib/bill-detail-customization'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'

const LOOKUP_DISPLAY_COLUMNS = new Set<BillLineColumnKey>(['item-id'])

const BILL_LINE_SETTING_AVAILABILITY = Object.fromEntries(
  BILL_LINE_COLUMNS.map((column) => [
    column.id,
    [
      'widthMode',
      ...(LOOKUP_DISPLAY_COLUMNS.has(column.id) ? ['dropdownDisplay', 'dropdownSort', 'editDisplay', 'viewDisplay'] : []),
    ],
  ]),
) as Record<BillLineColumnKey, string[]>

type CustomizeField = {
  id: BillDetailFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function BillDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  referenceSourceDefinitions,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: BillDetailCustomizationConfig
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
      formKey="billCreate"
      saveEndpoint="/api/config/bill-detail-customization"
      recordLabel="bill"
      lineColumnsLabel="Bill Line Items"
      sectionDescriptions={sectionDescriptions}
      referenceSourceDefinitions={referenceSourceDefinitions ?? BILL_REFERENCE_SOURCES}
      statCardDefinitions={BILL_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      lineColumnDefinitions={BILL_LINE_COLUMNS}
      lineColumnSettingAvailability={BILL_LINE_SETTING_AVAILABILITY}
    />
  )
}
