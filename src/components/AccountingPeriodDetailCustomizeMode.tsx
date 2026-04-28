'use client'

import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import {
  ACCOUNTING_PERIOD_STAT_CARDS,
  type AccountingPeriodFormCustomizationConfig,
  type AccountingPeriodFormFieldKey,
} from '@/lib/accounting-period-form-customization'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'

type CustomizeField = {
  id: AccountingPeriodFormFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function AccountingPeriodDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: AccountingPeriodFormCustomizationConfig
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
      formKey="accountingPeriodCreate"
      saveEndpoint="/api/config/accounting-period-form-customization"
      recordLabel="accounting period"
      sectionDescriptions={sectionDescriptions}
      statCardDefinitions={ACCOUNTING_PERIOD_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      layoutErrorMessage="Unable to save accounting period form layout"
      requirementsErrorMessage="Unable to save accounting period form requirements"
      fallbackErrorMessage="Unable to save accounting period form customization"
    />
  )
}
