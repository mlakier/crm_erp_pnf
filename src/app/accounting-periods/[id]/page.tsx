import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { InlineRecordSection } from '@/components/InlineRecordDetails'
import MasterDataHeaderDetails from '@/components/MasterDataHeaderDetails'
import { buildMasterDataSystemInformationItems } from '@/components/RecordSystemInformationSection'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import RecordBottomTabsSection from '@/components/RecordBottomTabsSection'
import SystemNotesSection from '@/components/SystemNotesSection'
import AccountingPeriodDetailCustomizeMode from '@/components/AccountingPeriodDetailCustomizeMode'
import MasterDataActionBar from '@/components/MasterDataActionBar'
import CommunicationsSection from '@/components/CommunicationsSection'
import TransactionStatsRow from '@/components/TransactionStatsRow'
import TransactionRelatedDocumentsTabs, {
  RelatedDocumentsStatusBadge,
} from '@/components/TransactionRelatedDocumentsTabs'
import { buildFieldMetaById, getFieldSourceText, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import { buildConfiguredInlineSections, buildCustomizePreviewFields } from '@/lib/detail-page-helpers'
import { loadAccountingPeriodFormCustomization } from '@/lib/accounting-period-form-customization-store'
import { ACCOUNTING_PERIOD_FORM_FIELDS, type AccountingPeriodFormFieldKey } from '@/lib/accounting-period-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { loadMasterDataSystemInfo } from '@/lib/master-data-system-info'
import { loadMasterDataSystemNotes } from '@/lib/master-data-system-notes'
import type { TransactionStatDefinition, TransactionVisualTone } from '@/lib/transaction-page-config'

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No'
}

export default async function AccountingPeriodDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string; customize?: string }>
}) {
  const { id } = await params
  const { edit, customize } = await searchParams
  const isEditing = edit === '1'
  const isCustomizing = customize === '1'
  const fieldMetaById = buildFieldMetaById(ACCOUNTING_PERIOD_FORM_FIELDS)

  const [period, fieldOptions, customization, formRequirements] = await Promise.all([
    prisma.accountingPeriod.findUnique({
      where: { id },
      include: {
        subsidiary: true,
        journalEntries: {
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          select: { id: true, number: true, date: true, status: true, description: true, total: true },
        },
        _count: { select: { journalEntries: true } },
      },
    }),
    loadFieldOptionsMap(fieldMetaById, ['subsidiaryId', 'status']),
    loadAccountingPeriodFormCustomization(),
    loadFormRequirements(),
  ])

  if (!period) notFound()

  const detailHref = `/accounting-periods/${period.id}`
  const statusOptions = (fieldOptions.status ?? []).map((option) => ({
    value: option.value.toLowerCase(),
    label: option.label,
  }))
  const sectionDescriptions: Record<string, string> = {
    Core: 'Primary period identity, dates, and scope.',
    Controls: 'Period-close and subledger control settings.',
  }

  const fieldDefinitions: Record<AccountingPeriodFormFieldKey, InlineRecordSection['fields'][number]> = {
    name: { name: 'name', label: 'Name', value: period.name, helpText: 'Display name for the accounting period.' },
    startDate: { name: 'startDate', label: 'Start Date', value: new Date(period.startDate).toISOString().slice(0, 10), type: 'date', helpText: 'First date included in the accounting period.' },
    endDate: { name: 'endDate', label: 'End Date', value: new Date(period.endDate).toISOString().slice(0, 10), type: 'date', helpText: 'Last date included in the accounting period.' },
    subsidiaryId: {
      name: 'subsidiaryId',
      label: 'Subsidiary',
      value: period.subsidiaryId ?? '',
      type: 'select',
      options: fieldOptions.subsidiaryId ?? [],
      helpText: 'Optional subsidiary scope for the accounting period.',
      sourceText: getFieldSourceText(fieldMetaById, 'subsidiaryId'),
    },
    status: {
      name: 'status',
      label: 'Status',
      value: period.status,
      type: 'select',
      options: statusOptions,
      helpText: 'Operational status of the period.',
      sourceText: getFieldSourceText(fieldMetaById, 'status'),
    },
    closed: { name: 'closed', label: 'Closed', value: String(period.closed), type: 'checkbox', helpText: 'Marks the period closed for posting.' },
    arLocked: { name: 'arLocked', label: 'AR Locked', value: String(period.arLocked), type: 'checkbox', helpText: 'Prevents new AR activity in the period.' },
    apLocked: { name: 'apLocked', label: 'AP Locked', value: String(period.apLocked), type: 'checkbox', helpText: 'Prevents new AP activity in the period.' },
    inventoryLocked: { name: 'inventoryLocked', label: 'Inventory Locked', value: String(period.inventoryLocked), type: 'checkbox', helpText: 'Prevents inventory postings in the period.' },
  }

  const customizeFields = buildCustomizePreviewFields(ACCOUNTING_PERIOD_FORM_FIELDS, fieldDefinitions)
  const detailSections: InlineRecordSection[] = buildConfiguredInlineSections({
    fields: ACCOUNTING_PERIOD_FORM_FIELDS,
    layout: customization,
    fieldDefinitions,
    sectionDescriptions,
  })
  const systemInfo = await loadMasterDataSystemInfo({
    entityType: 'accounting-period',
    entityId: period.id,
    createdAt: period.createdAt,
    updatedAt: period.updatedAt,
  })
  const systemNotes = await loadMasterDataSystemNotes({ entityType: 'accounting-period', entityId: period.id })
  const activeLocks = [period.arLocked, period.apLocked, period.inventoryLocked].filter(Boolean).length
  const statusLabel = statusOptions.find((option) => option.value === period.status)?.label ?? period.status
  const statPreviewCards: Array<{
    id: string
    label: string
    value: string | number
    cardTone: TransactionVisualTone
    valueTone: TransactionVisualTone
    supportsColorized: boolean
    supportsLink: boolean
  }> = [
    { id: 'journalEntries', label: 'Journal Entries', value: period._count.journalEntries, cardTone: 'accent', valueTone: 'accent', supportsColorized: true, supportsLink: false },
    { id: 'closed', label: 'Closed', value: yesNo(period.closed), cardTone: period.closed ? 'green' : 'yellow', valueTone: period.closed ? 'green' : 'yellow', supportsColorized: true, supportsLink: false },
    { id: 'lockedAreas', label: 'Locked Areas', value: activeLocks, cardTone: activeLocks > 0 ? 'yellow' : 'teal', valueTone: activeLocks > 0 ? 'yellow' : 'teal', supportsColorized: true, supportsLink: false },
  ]
  const statDefinitions: Array<TransactionStatDefinition<typeof period>> = [
    { id: 'journalEntries', label: 'Journal Entries', getValue: () => period._count.journalEntries, getCardTone: () => 'accent', getValueTone: () => 'accent' },
    { id: 'closed', label: 'Closed', getValue: () => yesNo(period.closed), getCardTone: () => (period.closed ? 'green' : 'yellow'), getValueTone: () => (period.closed ? 'green' : 'yellow') },
    { id: 'lockedAreas', label: 'Locked Areas', getValue: () => activeLocks, getCardTone: () => (activeLocks > 0 ? 'yellow' : 'teal'), getValueTone: () => (activeLocks > 0 ? 'yellow' : 'teal') },
  ]
  const relatedDocumentsTabs = [
    {
      key: 'journals',
      label: 'Journals',
      count: period.journalEntries.length,
      tone: 'downstream' as const,
      emptyMessage: 'No journals are linked to this accounting period yet.',
      headers: ['Txn ID', 'Date', 'Status', 'Description', 'Total'],
      rows: period.journalEntries.map((entry) => ({
        id: entry.id,
        cells: [
          <Link key="link" href={`/journals/${entry.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
            {entry.number}
          </Link>,
          new Date(entry.date).toLocaleDateString(),
          <RelatedDocumentsStatusBadge key="status" status={entry.status} />,
          entry.description || '-',
          Number(entry.total).toFixed(2),
        ],
        filterValues: [
          entry.number,
          new Date(entry.date).toLocaleDateString(),
          entry.status,
          entry.description || '-',
          Number(entry.total).toFixed(2),
        ],
      })),
    },
  ]
  const communicationsToolbarTargetId = 'accounting-period-communications-toolbar'
  const systemNotesToolbarTargetId = 'accounting-period-system-notes-toolbar'

  return (
    <RecordDetailPageShell
      backHref={isCustomizing ? detailHref : '/accounting-periods'}
      backLabel={isCustomizing ? '<- Back to Accounting Period Detail' : '<- Back to Accounting Periods'}
      meta={period.subsidiary ? period.subsidiary.subsidiaryId : 'Global'}
      title={period.name}
      badge={
        <span
          className="inline-block rounded-full px-3 py-0.5 text-sm"
          style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}
        >
          {statusLabel}
        </span>
      }
      actions={
        !isCustomizing ? (
          <MasterDataActionBar
            mode={isEditing ? 'edit' : 'detail'}
            detailHref={detailHref}
            formId={`inline-record-form-${period.id}`}
            newHref="/accounting-periods/new"
            duplicateHref={`/accounting-periods/new?duplicateFrom=${period.id}`}
            customizeHref={`${detailHref}?customize=1`}
            editHref={`${detailHref}?edit=1`}
            deleteResource="accounting-periods"
            deleteId={period.id}
            deleteLabel={period.name}
            exportTitle={period.name}
            exportFileName={`accounting-period-${period.name}`}
            exportSections={detailSections}
          />
        ) : null
      }
    >
      {!isCustomizing ? (
      <div className="mb-8">
        <TransactionStatsRow
          record={period}
          stats={statDefinitions}
          visibleStatCards={customization.statCards as Array<{ id: string; metric: string; visible: boolean; order: number; size?: 'sm' | 'md' | 'lg'; colorized?: boolean; linked?: boolean }> | undefined}
        />
      </div>
      ) : null}

      {isCustomizing ? (
        <AccountingPeriodDetailCustomizeMode
          detailHref={detailHref}
          initialLayout={customization}
          initialRequirements={{ ...formRequirements.accountingPeriodCreate }}
          fields={customizeFields}
          sectionDescriptions={sectionDescriptions}
          statPreviewCards={statPreviewCards}
        />
      ) : (
        <MasterDataHeaderDetails
          resource="accounting-periods"
          id={period.id}
          title="Accounting Period Details"
          sections={detailSections}
          editing={isEditing}
          columns={customization.formColumns}
          systemInformationItems={buildMasterDataSystemInformationItems(systemInfo, period.id)}
        />
      )}

      {!isCustomizing ? (
        <RecordBottomTabsSection
          defaultActiveKey="related-documents"
          tabs={[
            {
              key: 'related-documents',
              label: 'Related Documents',
              count: period.journalEntries.length,
              content: (
                <TransactionRelatedDocumentsTabs
                  embedded
                  tabs={relatedDocumentsTabs}
                  showDisplayControl={false}
                />
              ),
            },
            {
              key: 'communications',
              label: 'Communications',
              count: 0,
              toolbarTargetId: communicationsToolbarTargetId,
              toolbarPlacement: 'tab-bar',
              content: (
                <CommunicationsSection
                  embedded
                  toolbarTargetId={communicationsToolbarTargetId}
                  rows={[]}
                  showDisplayControl={false}
                />
              ),
            },
            {
              key: 'system-notes',
              label: 'System Notes',
              count: systemNotes.length,
              toolbarTargetId: systemNotesToolbarTargetId,
              toolbarPlacement: 'tab-bar',
              content: (
                <SystemNotesSection
                  embedded
                  toolbarTargetId={systemNotesToolbarTargetId}
                  notes={systemNotes}
                  showDisplayControl={false}
                />
              ),
            },
          ]}
        />
      ) : null}
    </RecordDetailPageShell>
  )
}
