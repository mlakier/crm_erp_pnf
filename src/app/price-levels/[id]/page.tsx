import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { InlineRecordSection } from '@/components/InlineRecordDetails'
import MasterDataHeaderDetails from '@/components/MasterDataHeaderDetails'
import RecordBottomTabsSection from '@/components/RecordBottomTabsSection'
import RecordDetailActionBar from '@/components/RecordDetailActionBar'
import { buildMasterDataSystemInformationItems } from '@/components/RecordSystemInformationSection'
import PriceLevelDetailCustomizeMode from '@/components/PriceLevelDetailCustomizeMode'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import CommunicationsSection from '@/components/CommunicationsSection'
import RelatedRecordsSection from '@/components/RelatedRecordsSection'
import SystemNotesSection from '@/components/SystemNotesSection'
import TransactionStatsRow from '@/components/TransactionStatsRow'
import { buildFieldMetaById, getFieldSourceText, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import { buildConfiguredInlineSections, buildCustomizePreviewFields } from '@/lib/detail-page-helpers'
import { loadPriceLevelFormCustomization } from '@/lib/price-level-form-customization-store'
import { PRICE_LEVEL_FORM_FIELDS, type PriceLevelFormFieldKey } from '@/lib/price-level-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { loadMasterDataSystemInfo } from '@/lib/master-data-system-info'
import { loadMasterDataSystemNotes } from '@/lib/master-data-system-notes'
import type { TransactionStatDefinition, TransactionVisualTone } from '@/lib/transaction-page-config'

function dateInputValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : ''
}

function decimalText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value)
}

export default async function PriceLevelDetailPage({
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
  const fieldMetaById = buildFieldMetaById(PRICE_LEVEL_FORM_FIELDS)

  const [priceLevel, customers, fieldOptions, formCustomization, formRequirements] = await Promise.all([
    prisma.priceLevel.findUnique({
      where: { id },
      include: { subsidiary: { select: { id: true, subsidiaryId: true, name: true } } },
    }),
    prisma.customer.findMany({
      where: { OR: [{ priceLevel: id }, { priceLevel: { equals: id, mode: 'insensitive' } }] },
      orderBy: [{ customerId: 'asc' }, { name: 'asc' }],
      select: { id: true, customerId: true, name: true, customerStatus: true, inactive: true },
    }),
    loadFieldOptionsMap(fieldMetaById, [
      'levelType',
      'subsidiaryId',
      'includeChildren',
      'approvalRequired',
      'allowManualOverride',
      'inactive',
    ]),
    loadPriceLevelFormCustomization(),
    loadFormRequirements(),
  ])

  if (!priceLevel) notFound()

  const detailHref = `/price-levels/${priceLevel.id}`
  const sectionDescriptions: Record<string, string> = {
    Core: 'Primary identity and classification for this price level.',
    Scope: 'Subsidiary availability and child-entity usage.',
    'Pricing Governance': 'Discount, margin, approval, and override controls.',
    'Effective Dating': 'When this price level is valid for new use.',
    Status: 'Availability and active-state controls.',
  }

  const fieldDefinitions: Record<PriceLevelFormFieldKey, InlineRecordSection['fields'][number]> = {
    priceLevelId: {
      name: 'priceLevelId',
      label: 'Price Level ID',
      value: priceLevel.priceLevelId ?? '',
      helpText: 'System-generated business identifier for the price level.',
      readOnly: true,
    },
    name: {
      name: 'name',
      label: 'Name',
      value: priceLevel.name,
      helpText: 'Business-facing name for this price level.',
    },
    description: {
      name: 'description',
      label: 'Description',
      value: priceLevel.description ?? '',
      helpText: 'Short explanation of how and when this price level should be used.',
    },
    levelType: {
      name: 'levelType',
      label: 'Level Type',
      value: priceLevel.levelType ?? '',
      type: 'select',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.levelType ?? [])],
      helpText: 'Governed category such as standard, preferred, partner, enterprise, or promotional.',
      sourceText: getFieldSourceText(fieldMetaById, 'levelType'),
    },
    subsidiaryId: {
      name: 'subsidiaryId',
      label: 'Subsidiary',
      value: priceLevel.subsidiaryId ?? '',
      type: 'select',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.subsidiaryId ?? [])],
      helpText: 'Optional subsidiary scope for this price level.',
      sourceText: getFieldSourceText(fieldMetaById, 'subsidiaryId'),
    },
    includeChildren: {
      name: 'includeChildren',
      label: 'Include Children',
      value: priceLevel.includeChildren ? 'true' : 'false',
      type: 'select',
      options: fieldOptions.includeChildren ?? [],
      helpText: 'Allows child subsidiaries to use this price level when a parent subsidiary is selected.',
      sourceText: getFieldSourceText(fieldMetaById, 'includeChildren'),
    },
    defaultDiscountPct: {
      name: 'defaultDiscountPct',
      label: 'Default Discount %',
      value: decimalText(priceLevel.defaultDiscountPct),
      type: 'number',
      helpText: 'Default discount percentage suggested when this price level is applied.',
    },
    minimumMarginPct: {
      name: 'minimumMarginPct',
      label: 'Minimum Margin %',
      value: decimalText(priceLevel.minimumMarginPct),
      type: 'number',
      helpText: 'Minimum margin guardrail for pricing approvals and exception review.',
    },
    approvalRequired: {
      name: 'approvalRequired',
      label: 'Approval Required',
      value: priceLevel.approvalRequired ? 'true' : 'false',
      type: 'select',
      options: fieldOptions.approvalRequired ?? [],
      helpText: 'Requires approval before this price level can be used on customer-facing transactions.',
      sourceText: getFieldSourceText(fieldMetaById, 'approvalRequired'),
    },
    approvalWorkflow: {
      name: 'approvalWorkflow',
      label: 'Approval Workflow',
      value: priceLevel.approvalWorkflow ?? '',
      helpText: 'Optional workflow key or name used when approval is required.',
    },
    allowManualOverride: {
      name: 'allowManualOverride',
      label: 'Allow Manual Override',
      value: priceLevel.allowManualOverride ? 'true' : 'false',
      type: 'select',
      options: fieldOptions.allowManualOverride ?? [],
      helpText: 'Allows authorized users to override the default pricing output.',
      sourceText: getFieldSourceText(fieldMetaById, 'allowManualOverride'),
    },
    effectiveStartDate: {
      name: 'effectiveStartDate',
      label: 'Effective Start Date',
      value: dateInputValue(priceLevel.effectiveStartDate),
      type: 'date',
      helpText: 'First date this price level is valid.',
    },
    effectiveEndDate: {
      name: 'effectiveEndDate',
      label: 'Effective End Date',
      value: dateInputValue(priceLevel.effectiveEndDate),
      type: 'date',
      helpText: 'Last date this price level is valid, if applicable.',
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: priceLevel.inactive ? 'true' : 'false',
      type: 'select',
      options: fieldOptions.inactive ?? [],
      helpText: 'Marks the price level unavailable for new use while preserving history.',
      sourceText: getFieldSourceText(fieldMetaById, 'inactive'),
    },
  }

  const detailSections: InlineRecordSection[] = buildConfiguredInlineSections({
    fields: PRICE_LEVEL_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions,
  })
  const customizeFields = buildCustomizePreviewFields(PRICE_LEVEL_FORM_FIELDS, fieldDefinitions)
  const statPreviewCards: Array<{
    id: string
    label: string
    value: string | number
    accent?: true | 'teal' | 'yellow'
    cardTone?: TransactionVisualTone
    valueTone?: TransactionVisualTone
    supportsColorized: boolean
    supportsLink: boolean
  }> = [
    { id: 'status', label: 'Status', value: priceLevel.inactive ? 'Inactive' : 'Active', cardTone: priceLevel.inactive ? 'red' : 'green', valueTone: priceLevel.inactive ? 'red' : 'green', supportsColorized: true, supportsLink: false },
    { id: 'levelType', label: 'Level Type', value: priceLevel.levelType ?? '-', cardTone: 'accent', valueTone: 'accent', supportsColorized: true, supportsLink: false },
    { id: 'scope', label: 'Scope', value: priceLevel.subsidiary ? priceLevel.subsidiary.subsidiaryId : 'Global', cardTone: 'teal', valueTone: 'teal', supportsColorized: true, supportsLink: false },
    { id: 'approval', label: 'Approval', value: priceLevel.approvalRequired ? 'Required' : 'Not Required', cardTone: priceLevel.approvalRequired ? 'yellow' : 'green', valueTone: priceLevel.approvalRequired ? 'yellow' : 'green', supportsColorized: true, supportsLink: false },
  ]
  const statDefinitions: Array<TransactionStatDefinition<typeof priceLevel>> = [
    { id: 'status', label: 'Status', getValue: () => (priceLevel.inactive ? 'Inactive' : 'Active'), getCardTone: () => (priceLevel.inactive ? 'red' : 'green'), getValueTone: () => (priceLevel.inactive ? 'red' : 'green') },
    { id: 'levelType', label: 'Level Type', getValue: () => priceLevel.levelType ?? '-', getCardTone: () => 'accent', getValueTone: () => 'accent' },
    { id: 'scope', label: 'Scope', getValue: () => priceLevel.subsidiary?.subsidiaryId ?? 'Global', getCardTone: () => 'teal', getValueTone: () => 'teal' },
    { id: 'approval', label: 'Approval', getValue: () => (priceLevel.approvalRequired ? 'Required' : 'Not Required'), getCardTone: () => (priceLevel.approvalRequired ? 'yellow' : 'green'), getValueTone: () => (priceLevel.approvalRequired ? 'yellow' : 'green') },
  ]

  const systemInfo = await loadMasterDataSystemInfo({
    entityType: 'price-level',
    entityId: priceLevel.id,
    createdAt: priceLevel.createdAt,
    updatedAt: priceLevel.updatedAt,
  })
  const systemNotes = await loadMasterDataSystemNotes({ entityType: 'price-level', entityId: priceLevel.id })
  const relatedRecordsTabs = [
    {
      key: 'customers',
      label: 'Customers',
      count: customers.length,
      emptyMessage: 'No customers are assigned to this price level yet.',
      rows: customers.map((customer) => ({
        id: customer.id,
        type: customer.inactive ? 'Inactive Customer' : 'Customer',
        reference: customer.customerId ?? 'Pending',
        name: customer.name,
        details: customer.customerStatus ?? '-',
        href: `/customers/${customer.id}`,
      })),
    },
  ]
  const communicationsToolbarTargetId = 'price-level-communications-toolbar'
  const systemNotesToolbarTargetId = 'price-level-system-notes-toolbar'

  return (
    <RecordDetailPageShell
      backHref={isCustomizing ? detailHref : '/price-levels'}
      backLabel={isCustomizing ? '<- Back to Price Level Detail' : '<- Back to Price Levels'}
      meta={priceLevel.priceLevelId ?? 'Pending'}
      title={priceLevel.name}
      badge={
        priceLevel.inactive ? (
          <span className="inline-block rounded-full px-3 py-0.5 text-xs font-medium" style={{ backgroundColor: 'rgba(239,68,68,0.18)', color: 'var(--danger)' }}>
            Inactive
          </span>
        ) : null
      }
      actions={
        isCustomizing ? null : (
          <RecordDetailActionBar
            mode={isEditing ? 'edit' : 'detail'}
            detailHref={detailHref}
            formId={`inline-record-form-${priceLevel.id}`}
            newHref="/price-levels/new"
            duplicateHref={`/price-levels/new?duplicateFrom=${priceLevel.id}`}
            exportTitle={priceLevel.name}
            exportFileName={`price-level-${priceLevel.priceLevelId ?? priceLevel.id}`}
            exportSections={detailSections}
            customizeHref={`${detailHref}?customize=1`}
            editHref={`${detailHref}?edit=1`}
            deleteResource="price-levels"
            deleteId={priceLevel.id}
          />
        )
      }
    >
      {!isCustomizing ? (
        <div className="mb-8">
          <TransactionStatsRow
            record={priceLevel}
            stats={statDefinitions}
            visibleStatCards={formCustomization.statCards as Array<{ id: string; metric: string; visible: boolean; order: number; size?: 'sm' | 'md' | 'lg'; colorized?: boolean; linked?: boolean }> | undefined}
          />
        </div>
      ) : null}

      {isCustomizing ? (
        <PriceLevelDetailCustomizeMode
          detailHref={detailHref}
          initialLayout={formCustomization}
          initialRequirements={{ ...formRequirements.priceLevelCreate }}
          fields={customizeFields}
          sectionDescriptions={sectionDescriptions}
          statPreviewCards={statPreviewCards}
        />
      ) : (
        <MasterDataHeaderDetails
          resource="price-levels"
          id={priceLevel.id}
          title="Price Level Details"
          sections={detailSections}
          editing={isEditing}
          columns={formCustomization.formColumns}
          systemInformationItems={buildMasterDataSystemInformationItems(systemInfo, priceLevel.id)}
        />
      )}

      {!isCustomizing ? (
        <RecordBottomTabsSection
          defaultActiveKey="related-records"
          tabs={[
            {
              key: 'related-records',
              label: 'Related Records',
              count: relatedRecordsTabs.reduce((sum, tab) => sum + tab.count, 0),
              content: <RelatedRecordsSection embedded tabs={relatedRecordsTabs} showDisplayControl={false} />,
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
