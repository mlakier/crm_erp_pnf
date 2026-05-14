'use client'

import RecordDetailCustomizeMode from '@/components/RecordDetailCustomizeMode'
import {
  BANK_TRANSACTION_STAT_CARDS,
  type BankTransactionDetailCustomizationConfig,
  type BankTransactionDetailType,
} from '@/lib/bank-transaction-detail-customization'
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

const RECORD_LABEL: Record<BankTransactionDetailType, string> = {
  deposit: 'bank deposit',
  transfer: 'bank transfer',
  check: 'check',
}

export default function BankTransactionDetailCustomizeMode({
  type,
  detailHref,
  initialLayout,
  fields,
  statPreviewCards,
}: {
  type: BankTransactionDetailType
  detailHref: string
  initialLayout: BankTransactionDetailCustomizationConfig
  fields: CustomizeField[]
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
    <RecordDetailCustomizeMode
      detailHref={detailHref}
      initialLayout={{
        ...initialLayout,
        secondarySettings: initialLayout.glImpactSettings,
        secondaryColumns: initialLayout.glImpactColumns,
      }}
      fields={fields}
      saveEndpoint={`/api/config/bank-transaction-detail-customization?type=${type}`}
      recordLabel={RECORD_LABEL[type]}
      statCardDefinitions={BANK_TRANSACTION_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      secondaryColumnsLabel="GL Impact"
      secondaryColumnDefinitions={TRANSACTION_GL_IMPACT_COLUMNS}
      secondaryColumnSettingAvailability={TRANSACTION_GL_IMPACT_SETTING_AVAILABILITY}
      introText={`Customize the ${RECORD_LABEL[type]} detail layout. This is the bank transaction page contract surface for header fields, reference details, stats, and GL impact columns.`}
      secondaryColumnsIntro="Control which GL impact columns appear on this bank transaction detail page."
    />
  )
}

