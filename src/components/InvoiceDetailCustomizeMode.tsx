'use client'

import type {
  InvoiceDetailCustomizationConfig,
  InvoiceDetailFieldKey,
  InvoiceLineColumnKey,
} from '@/lib/invoice-detail-customization'
import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import { INVOICE_LINE_COLUMNS, INVOICE_REFERENCE_SOURCES, INVOICE_STAT_CARDS } from '@/lib/invoice-detail-customization'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'

const LOOKUP_DISPLAY_COLUMNS = new Set<InvoiceLineColumnKey>([
  'item-id',
  'department',
  'location',
  'project',
  'rev-rec-template',
])

const INVOICE_LINE_SETTING_AVAILABILITY = Object.fromEntries(
  INVOICE_LINE_COLUMNS.map((column) => [
    column.id,
    [
      'widthMode',
      ...(LOOKUP_DISPLAY_COLUMNS.has(column.id) ? ['dropdownDisplay', 'dropdownSort', 'editDisplay', 'viewDisplay'] : []),
    ],
  ]),
) as Record<InvoiceLineColumnKey, string[]>

type CustomizeField = {
  id: InvoiceDetailFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function InvoiceDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  referenceSourceDefinitions,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: InvoiceDetailCustomizationConfig
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
      formKey="invoiceCreate"
      saveEndpoint="/api/config/invoice-detail-customization"
      recordLabel="invoice"
      lineColumnsLabel="Invoice Line Items"
      sectionDescriptions={sectionDescriptions}
      referenceSourceDefinitions={referenceSourceDefinitions ?? INVOICE_REFERENCE_SOURCES}
      statCardDefinitions={INVOICE_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      lineColumnDefinitions={INVOICE_LINE_COLUMNS}
      lineColumnSettingAvailability={INVOICE_LINE_SETTING_AVAILABILITY}
    />
  )
}
