'use client'

import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import {
  SUBSIDIARY_STAT_CARDS,
  type SubsidiaryFormCustomizationConfig,
  type SubsidiaryFormFieldKey,
} from '@/lib/subsidiary-form-customization'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'

type CustomizeField = {
  id: SubsidiaryFormFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function SubsidiaryDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: SubsidiaryFormCustomizationConfig
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
      formKey="subsidiaryCreate"
      saveEndpoint="/api/config/subsidiary-form-customization"
      recordLabel="subsidiary"
      sectionDescriptions={sectionDescriptions}
      statCardDefinitions={SUBSIDIARY_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      layoutErrorMessage="Unable to save subsidiary form layout"
      requirementsErrorMessage="Unable to save subsidiary form requirements"
      fallbackErrorMessage="Unable to save subsidiary form customization"
    />
  )
}
