'use client'

import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import {
  PRICE_LEVEL_STAT_CARDS,
  type PriceLevelFormCustomizationConfig,
  type PriceLevelFormFieldKey,
} from '@/lib/price-level-form-customization'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'

type CustomizeField = {
  id: PriceLevelFormFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function PriceLevelDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: PriceLevelFormCustomizationConfig
  initialRequirements: Record<string, boolean>
  fields: CustomizeField[]
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
      formKey="priceLevelCreate"
      saveEndpoint="/api/config/price-level-form-customization"
      recordLabel="price level"
      sectionDescriptions={sectionDescriptions}
      statCardDefinitions={PRICE_LEVEL_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      layoutErrorMessage="Unable to save price level form layout"
      requirementsErrorMessage="Unable to save price level form requirements"
      fallbackErrorMessage="Unable to save price level form customization"
    />
  )
}
