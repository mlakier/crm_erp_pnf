'use client'

import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import {
  CHART_OF_ACCOUNTS_STAT_CARDS,
  type ChartOfAccountsFormCustomizationConfig,
  type ChartOfAccountsFormFieldKey,
} from '@/lib/chart-of-accounts-form-customization'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'

type CustomizeField = {
  id: ChartOfAccountsFormFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function ChartOfAccountsDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: ChartOfAccountsFormCustomizationConfig
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
      formKey="chartOfAccountCreate"
      saveEndpoint="/api/config/chart-of-accounts-form-customization"
      recordLabel="chart of accounts record"
      sectionDescriptions={sectionDescriptions}
      statCardDefinitions={CHART_OF_ACCOUNTS_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      layoutErrorMessage="Unable to save chart of accounts form layout"
      requirementsErrorMessage="Unable to save chart of accounts form requirements"
      fallbackErrorMessage="Unable to save chart of accounts customization"
    />
  )
}
