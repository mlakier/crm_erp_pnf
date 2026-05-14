'use client'

import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import {
  PRICE_BOOK_STAT_CARDS,
  type PriceBookFormCustomizationConfig,
  type PriceBookFormFieldKey,
} from '@/lib/price-book-form-customization'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'

type CustomizeField = {
  id: PriceBookFormFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
  required?: boolean
}

export default function PriceBookDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: PriceBookFormCustomizationConfig
  initialRequirements: Record<string, boolean>
  fields: CustomizeField[]
  sectionDescriptions?: Record<string, string>
  statPreviewCards: Array<{
    id: string
    label: string
    value: string | number
    href?: string | null
    accent?: true | 'teal' | 'yellow'
    cardTone?: TransactionVisualTone
    valueTone?: TransactionVisualTone
    supportsColorized?: boolean
    supportsLink?: boolean
  }>
}) {
  return (
    <TransactionRecordDetailCustomizeMode
      detailHref={detailHref}
      initialLayout={initialLayout}
      fields={fields}
      formKey="priceBookCreate"
      saveEndpoint="/api/config/price-book-form-customization"
      recordLabel="price book"
      sectionDescriptions={sectionDescriptions}
      statCardDefinitions={PRICE_BOOK_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      layoutErrorMessage="Unable to save price book form layout"
      requirementsErrorMessage="Unable to save price book form requirements"
      fallbackErrorMessage="Unable to save price book form customization"
    />
  )
}
