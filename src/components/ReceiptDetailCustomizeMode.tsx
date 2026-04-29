'use client'

import type { ReceiptDetailCustomizationConfig } from '@/lib/receipt-detail-customization'
import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import { RECEIPT_REFERENCE_SOURCES, RECEIPT_STAT_CARDS } from '@/lib/receipt-detail-customization'
import {
  TRANSACTION_GL_IMPACT_COLUMNS,
  TRANSACTION_GL_IMPACT_SETTING_AVAILABILITY,
} from '@/lib/transaction-gl-impact'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'

type CustomizeField = {
  id: string
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function ReceiptDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  referenceSourceDefinitions,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: ReceiptDetailCustomizationConfig
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
  const customizeLayout = {
    ...initialLayout,
    secondarySettings: initialLayout.glImpactSettings,
    secondaryColumns: initialLayout.glImpactColumns,
  }

  return (
    <TransactionRecordDetailCustomizeMode
      detailHref={detailHref}
      initialLayout={customizeLayout}
      fields={fields}
      formKey="receiptCreate"
      saveEndpoint="/api/config/receipt-detail-customization"
      recordLabel="receipt"
      sectionDescriptions={sectionDescriptions}
      referenceSourceDefinitions={referenceSourceDefinitions ?? RECEIPT_REFERENCE_SOURCES}
      statCardDefinitions={RECEIPT_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      secondaryColumnsLabel="GL Impact"
      secondaryColumnDefinitions={TRANSACTION_GL_IMPACT_COLUMNS}
      secondaryColumnSettingAvailability={TRANSACTION_GL_IMPACT_SETTING_AVAILABILITY}
    />
  )
}
