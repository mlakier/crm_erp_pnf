'use client'

import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'
import {
  LEAD_REFERENCE_SOURCES,
  LEAD_STAT_CARDS,
  type LeadDetailCustomizationConfig,
} from '@/lib/lead-detail-customization'

type CustomizeField = {
  id: string
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function LeadDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  referenceSourceDefinitions,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: LeadDetailCustomizationConfig
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
      formKey="leadCreate"
      saveEndpoint="/api/config/lead-detail-customization"
      recordLabel="lead"
      sectionDescriptions={sectionDescriptions}
      statCardDefinitions={LEAD_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      referenceSourceDefinitions={referenceSourceDefinitions ?? LEAD_REFERENCE_SOURCES}
    />
  )
}
