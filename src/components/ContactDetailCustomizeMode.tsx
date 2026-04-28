'use client'

import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import {
  CONTACT_STAT_CARDS,
  type ContactFormCustomizationConfig,
  type ContactFormFieldKey,
} from '@/lib/contact-form-customization'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'

type CustomizeField = {
  id: ContactFormFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function ContactDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: ContactFormCustomizationConfig
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
      formKey="contactCreate"
      saveEndpoint="/api/config/contact-form-customization"
      recordLabel="contact"
      sectionDescriptions={sectionDescriptions}
      statCardDefinitions={CONTACT_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      layoutErrorMessage="Unable to save contact form layout"
      requirementsErrorMessage="Unable to save contact form requirements"
      fallbackErrorMessage="Unable to save contact form customization"
    />
  )
}
