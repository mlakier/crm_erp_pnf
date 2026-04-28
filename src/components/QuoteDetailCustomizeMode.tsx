'use client'

import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'
import {
  QUOTE_LINE_COLUMNS,
  QUOTE_REFERENCE_SOURCES,
  QUOTE_STAT_CARDS,
  type QuoteDetailCustomizationConfig,
  type QuoteDetailFieldKey,
  type QuoteLineColumnKey,
} from '@/lib/quotes-detail-customization'

const LOOKUP_DISPLAY_COLUMNS = new Set<QuoteLineColumnKey>(['item-id'])

const QUOTE_LINE_SETTING_AVAILABILITY = Object.fromEntries(
  QUOTE_LINE_COLUMNS.map((column) => [
    column.id,
    [
      'widthMode',
      ...(LOOKUP_DISPLAY_COLUMNS.has(column.id) ? ['dropdownDisplay', 'dropdownSort', 'editDisplay', 'viewDisplay'] : []),
    ],
  ]),
) as Record<QuoteLineColumnKey, string[]>

type CustomizeField = {
  id: QuoteDetailFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function QuoteDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  referenceSourceDefinitions,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: QuoteDetailCustomizationConfig
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
      formKey="quoteCreate"
      saveEndpoint="/api/config/quote-detail-customization"
      recordLabel="quote"
      lineColumnsLabel="Quote Line Items"
      sectionDescriptions={sectionDescriptions}
      referenceSourceDefinitions={referenceSourceDefinitions ?? QUOTE_REFERENCE_SOURCES}
      statCardDefinitions={QUOTE_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      lineColumnDefinitions={QUOTE_LINE_COLUMNS}
      lineColumnSettingAvailability={QUOTE_LINE_SETTING_AVAILABILITY}
    />
  )
}
