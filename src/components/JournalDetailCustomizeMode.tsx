'use client'

import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import {
  JOURNAL_GL_IMPACT_COLUMNS,
  JOURNAL_LINE_COLUMNS,
  JOURNAL_STAT_CARDS,
  type JournalDetailCustomizationConfig,
  type JournalDetailFieldKey,
  type JournalGlImpactColumnKey,
  type JournalLineColumnKey,
} from '@/lib/journal-detail-customization'
import type { JournalPageConfigRecord } from '@/lib/transaction-page-configs/journal'
import type { TransactionStatDefinition, TransactionVisualTone } from '@/lib/transaction-page-config'

const DISPLAY_MODE_COLUMNS = new Set<JournalLineColumnKey>([
  'accountId',
  'subsidiaryId',
  'departmentId',
  'locationId',
  'projectId',
  'customerId',
  'vendorId',
  'itemId',
  'employeeId',
])

const JOURNAL_LINE_SETTING_AVAILABILITY = Object.fromEntries(
  JOURNAL_LINE_COLUMNS.map((column) => [
    column.id,
    [
      'widthMode',
      ...(DISPLAY_MODE_COLUMNS.has(column.id) ? ['editDisplay', 'viewDisplay', 'dropdownDisplay'] : []),
      ...(DISPLAY_MODE_COLUMNS.has(column.id) ? ['dropdownSort'] : []),
    ],
  ]),
) as Record<JournalLineColumnKey, string[]>

const GL_IMPACT_DISPLAY_COLUMNS = new Set<JournalGlImpactColumnKey>([
  'accountId',
  'subsidiaryId',
  'departmentId',
  'locationId',
  'projectId',
  'customerId',
  'vendorId',
  'itemId',
  'employeeId',
])

const JOURNAL_GL_IMPACT_SETTING_AVAILABILITY = Object.fromEntries(
  JOURNAL_GL_IMPACT_COLUMNS.map((column) => [
    column.id,
    [
      'widthMode',
      ...(GL_IMPACT_DISPLAY_COLUMNS.has(column.id) ? ['viewDisplay'] : []),
    ],
  ]),
) as Record<JournalGlImpactColumnKey, string[]>

type CustomizeField = {
  id: JournalDetailFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function JournalDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  sectionDescriptions,
  lineColumnDefinitions,
  glImpactColumnDefinitions,
  statPreviewRecord,
  statPreviewDefinitions,
}: {
  detailHref: string
  initialLayout: JournalDetailCustomizationConfig
  fields: CustomizeField[]
  sectionDescriptions?: Record<string, string>
  lineColumnDefinitions?: Array<{ id: JournalLineColumnKey; label: string; description?: string }>
  glImpactColumnDefinitions?: Array<{ id: JournalGlImpactColumnKey; label: string; description?: string }>
  statPreviewRecord?: JournalPageConfigRecord
  statPreviewDefinitions?: Array<TransactionStatDefinition<JournalPageConfigRecord>>
}) {
  const customizeLayout = {
    ...initialLayout,
    secondarySettings: initialLayout.glImpactSettings,
    secondaryColumns: initialLayout.glImpactColumns,
  }
  const statPreviewCards: Array<{
    id: string
    label: string
    value: string | number
    href?: string | null
    accent?: true | 'teal' | 'yellow'
    valueTone?: TransactionVisualTone
    cardTone?: TransactionVisualTone
    supportsColorized?: boolean
    supportsLink?: boolean
  }> | undefined =
    statPreviewRecord && statPreviewDefinitions
      ? statPreviewDefinitions.map((stat) => ({
          id: stat.id,
          label: stat.label,
          value: stat.getValue(statPreviewRecord),
          href: stat.getHref?.(statPreviewRecord) ?? null,
          accent: stat.accent,
          valueTone: stat.getValueTone?.(statPreviewRecord),
          cardTone: stat.getCardTone?.(statPreviewRecord),
          supportsColorized: Boolean(stat.accent || stat.getValueTone || stat.getCardTone),
          supportsLink: Boolean(stat.getHref),
        }))
      : undefined

  return (
    <TransactionRecordDetailCustomizeMode
      detailHref={detailHref}
      initialLayout={customizeLayout}
      fields={fields}
      formKey="journalCreate"
      saveEndpoint="/api/config/journal-detail-customization"
      recordLabel="journal"
      lineColumnsLabel="Journal Lines"
      secondaryColumnsLabel="GL Impact"
      sectionDescriptions={sectionDescriptions}
      statCardDefinitions={JOURNAL_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      lineColumnDefinitions={lineColumnDefinitions ?? [...JOURNAL_LINE_COLUMNS]}
      lineColumnSettingAvailability={JOURNAL_LINE_SETTING_AVAILABILITY}
      secondaryColumnDefinitions={glImpactColumnDefinitions ?? [...JOURNAL_GL_IMPACT_COLUMNS]}
      secondaryColumnSettingAvailability={JOURNAL_GL_IMPACT_SETTING_AVAILABILITY}
    />
  )
}
