import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { InlineRecordSection } from '@/components/InlineRecordDetails'
import MasterDataHeaderDetails from '@/components/MasterDataHeaderDetails'
import RecordBottomTabsSection from '@/components/RecordBottomTabsSection'
import RecordDetailActionBar from '@/components/RecordDetailActionBar'
import { buildMasterDataSystemInformationItems } from '@/components/RecordSystemInformationSection'
import PriceBookDetailCustomizeMode from '@/components/PriceBookDetailCustomizeMode'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import CommunicationsSection from '@/components/CommunicationsSection'
import RelatedRecordsSection from '@/components/RelatedRecordsSection'
import SystemNotesSection from '@/components/SystemNotesSection'
import TransactionStatsRow from '@/components/TransactionStatsRow'
import PriceBookItemsSection from '@/components/PriceBookItemsSection'
import { buildFieldMetaById, getFieldSourceText, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import { buildConfiguredInlineSections, buildCustomizePreviewFields } from '@/lib/detail-page-helpers'
import { loadPriceBookFormCustomization } from '@/lib/price-book-form-customization-store'
import { PRICE_BOOK_FORM_FIELDS, type PriceBookFormFieldKey } from '@/lib/price-book-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { loadMasterDataSystemInfo } from '@/lib/master-data-system-info'
import { loadMasterDataSystemNotes } from '@/lib/master-data-system-notes'
import { loadListOptionsForSource } from '@/lib/list-source'
import type { TransactionStatDefinition, TransactionVisualTone } from '@/lib/transaction-page-config'

function dateInputValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : ''
}

function decimalInputValue(value: { toString(): string } | null | undefined) {
  return value ? value.toString() : ''
}

export default async function PriceBookDetailPage({
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
  const fieldMetaById = buildFieldMetaById(PRICE_BOOK_FORM_FIELDS)

  const [priceBook, customers, items, currencies, lineStatusOptions, priceSourceOptions, fieldOptions, formCustomization, formRequirements] = await Promise.all([
    prisma.priceBook.findUnique({
      where: { id },
      include: {
        subsidiary: { select: { id: true, subsidiaryId: true, name: true } },
        currency: { select: { id: true, code: true, name: true } },
        defaultPriceLevel: { select: { id: true, priceLevelId: true, name: true } },
        priceBookItems: {
          orderBy: [{ item: { itemId: 'asc' } }, { minimumQuantity: 'asc' }],
          include: {
            item: { select: { id: true, itemId: true, name: true, uom: true } },
            currency: { select: { id: true, code: true, name: true } },
          },
        },
      },
    }),
    prisma.customer.findMany({
      where: { OR: [{ priceBook: id }, { priceBook: { equals: id, mode: 'insensitive' } }] },
      orderBy: [{ customerId: 'asc' }, { name: 'asc' }],
      select: { id: true, customerId: true, name: true, customerStatus: true, inactive: true },
    }),
    prisma.item.findMany({
      where: { active: true },
      orderBy: [{ itemId: 'asc' }, { name: 'asc' }],
      select: { id: true, itemId: true, name: true, uom: true },
    }),
    prisma.currency.findMany({
      where: { active: true },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true },
    }),
    loadListOptionsForSource({ sourceType: 'managed-list', sourceKey: 'PRICE-BOOK-ITEM-STATUS' }),
    loadListOptionsForSource({ sourceType: 'managed-list', sourceKey: 'PRICE-SOURCE' }),
    loadFieldOptionsMap(fieldMetaById, [
      'bookType',
      'subsidiaryId',
      'includeChildren',
      'currencyId',
      'defaultPriceLevelId',
      'approvalRequired',
      'allowManualOverride',
      'inactive',
    ]),
    loadPriceBookFormCustomization(),
    loadFormRequirements(),
  ])

  if (!priceBook) notFound()

  const detailHref = `/price-books/${priceBook.id}`
  const sectionDescriptions: Record<string, string> = {
    Core: 'Primary identity and classification for this price book.',
    Scope: 'Subsidiary, currency, and child-entity availability.',
    'Pricing Governance': 'Price-level fallback, approval, and override controls.',
    'Effective Dating': 'When this price book is valid for new use.',
    Status: 'Availability and active-state controls.',
  }

  const fieldDefinitions: Record<PriceBookFormFieldKey, InlineRecordSection['fields'][number]> = {
    priceBookId: {
      name: 'priceBookId',
      label: 'Price Book ID',
      value: priceBook.priceBookId ?? '',
      helpText: 'System-generated business identifier for the price book.',
      readOnly: true,
    },
    name: { name: 'name', label: 'Name', value: priceBook.name, helpText: 'Business-facing name for this price book.' },
    description: { name: 'description', label: 'Description', value: priceBook.description ?? '', helpText: 'Short explanation of how and when this price book should be used.' },
    bookType: {
      name: 'bookType',
      label: 'Book Type',
      value: priceBook.bookType ?? '',
      type: 'select',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.bookType ?? [])],
      helpText: 'Governed category such as standard, contracted, customer specific, regional, or promotional.',
      sourceText: getFieldSourceText(fieldMetaById, 'bookType'),
    },
    subsidiaryId: {
      name: 'subsidiaryId',
      label: 'Subsidiary',
      value: priceBook.subsidiaryId ?? '',
      type: 'select',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.subsidiaryId ?? [])],
      helpText: 'Optional subsidiary scope for this price book.',
      sourceText: getFieldSourceText(fieldMetaById, 'subsidiaryId'),
    },
    includeChildren: {
      name: 'includeChildren',
      label: 'Include Children',
      value: priceBook.includeChildren ? 'true' : 'false',
      type: 'select',
      options: fieldOptions.includeChildren ?? [],
      helpText: 'Allows child subsidiaries to use this price book when a parent subsidiary is selected.',
      sourceText: getFieldSourceText(fieldMetaById, 'includeChildren'),
    },
    currencyId: {
      name: 'currencyId',
      label: 'Currency',
      value: priceBook.currencyId ?? '',
      type: 'select',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.currencyId ?? [])],
      helpText: 'Default transaction currency for this price book.',
      sourceText: getFieldSourceText(fieldMetaById, 'currencyId'),
    },
    defaultPriceLevelId: {
      name: 'defaultPriceLevelId',
      label: 'Default Price Level',
      value: priceBook.defaultPriceLevelId ?? '',
      type: 'select',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.defaultPriceLevelId ?? [])],
      helpText: 'Optional price level fallback used when customer-specific pricing does not override it.',
      sourceText: getFieldSourceText(fieldMetaById, 'defaultPriceLevelId'),
    },
    approvalRequired: {
      name: 'approvalRequired',
      label: 'Approval Required',
      value: priceBook.approvalRequired ? 'true' : 'false',
      type: 'select',
      options: fieldOptions.approvalRequired ?? [],
      helpText: 'Requires approval before this price book can be used on customer-facing transactions.',
      sourceText: getFieldSourceText(fieldMetaById, 'approvalRequired'),
    },
    approvalWorkflow: { name: 'approvalWorkflow', label: 'Approval Workflow', value: priceBook.approvalWorkflow ?? '', helpText: 'Optional workflow key or name used when approval is required.' },
    allowManualOverride: {
      name: 'allowManualOverride',
      label: 'Allow Manual Override',
      value: priceBook.allowManualOverride ? 'true' : 'false',
      type: 'select',
      options: fieldOptions.allowManualOverride ?? [],
      helpText: 'Allows authorized users to override the default pricing output.',
      sourceText: getFieldSourceText(fieldMetaById, 'allowManualOverride'),
    },
    effectiveStartDate: { name: 'effectiveStartDate', label: 'Effective Start Date', value: dateInputValue(priceBook.effectiveStartDate), type: 'date', helpText: 'First date this price book is valid.' },
    effectiveEndDate: { name: 'effectiveEndDate', label: 'Effective End Date', value: dateInputValue(priceBook.effectiveEndDate), type: 'date', helpText: 'Last date this price book is valid, if applicable.' },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: priceBook.inactive ? 'true' : 'false',
      type: 'select',
      options: fieldOptions.inactive ?? [],
      helpText: 'Marks the price book unavailable for new use while preserving history.',
      sourceText: getFieldSourceText(fieldMetaById, 'inactive'),
    },
  }

  const detailSections: InlineRecordSection[] = buildConfiguredInlineSections({
    fields: PRICE_BOOK_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions,
  })
  const customizeFields = buildCustomizePreviewFields(PRICE_BOOK_FORM_FIELDS, fieldDefinitions)
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
    { id: 'status', label: 'Status', value: priceBook.inactive ? 'Inactive' : 'Active', cardTone: priceBook.inactive ? 'red' : 'green', valueTone: priceBook.inactive ? 'red' : 'green', supportsColorized: true, supportsLink: false },
    { id: 'bookType', label: 'Book Type', value: priceBook.bookType ?? '-', cardTone: 'accent', valueTone: 'accent', supportsColorized: true, supportsLink: false },
    { id: 'currency', label: 'Currency', value: priceBook.currency?.code ?? '-', cardTone: 'teal', valueTone: 'teal', supportsColorized: true, supportsLink: false },
    { id: 'scope', label: 'Scope', value: priceBook.subsidiary ? priceBook.subsidiary.subsidiaryId : 'Global', cardTone: 'teal', valueTone: 'teal', supportsColorized: true, supportsLink: false },
  ]
  const statDefinitions: Array<TransactionStatDefinition<typeof priceBook>> = [
    { id: 'status', label: 'Status', getValue: () => (priceBook.inactive ? 'Inactive' : 'Active'), getCardTone: () => (priceBook.inactive ? 'red' : 'green'), getValueTone: () => (priceBook.inactive ? 'red' : 'green') },
    { id: 'bookType', label: 'Book Type', getValue: () => priceBook.bookType ?? '-', getCardTone: () => 'accent', getValueTone: () => 'accent' },
    { id: 'currency', label: 'Currency', getValue: () => priceBook.currency?.code ?? '-', getCardTone: () => 'teal', getValueTone: () => 'teal' },
    { id: 'scope', label: 'Scope', getValue: () => priceBook.subsidiary?.subsidiaryId ?? 'Global', getCardTone: () => 'teal', getValueTone: () => 'teal' },
  ]

  const systemInfo = await loadMasterDataSystemInfo({
    entityType: 'price-book',
    entityId: priceBook.id,
    createdAt: priceBook.createdAt,
    updatedAt: priceBook.updatedAt,
  })
  const systemNotes = await loadMasterDataSystemNotes({ entityType: 'price-book', entityId: priceBook.id })
  const relatedRecordsTabs = [
    {
      key: 'customers',
      label: 'Customers',
      count: customers.length,
      emptyMessage: 'No customers are assigned to this price book yet.',
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
  const communicationsToolbarTargetId = 'price-book-communications-toolbar'
  const systemNotesToolbarTargetId = 'price-book-system-notes-toolbar'
  const itemOptions = items.map((item) => ({
    value: item.id,
    label: `${item.itemId ?? 'Item'} - ${item.name}${item.uom ? ` (${item.uom})` : ''}`,
  }))
  const currencyOptions = currencies.map((currency) => ({ value: currency.id, label: `${currency.code} - ${currency.name}` }))
  const priceBookItemRows = priceBook.priceBookItems.map((line) => ({
    id: line.id,
    priceBookItemId: line.priceBookItemId,
    itemId: line.itemId,
    itemLabel: `${line.item.itemId ?? 'Item'} - ${line.item.name}`,
    unitPrice: decimalInputValue(line.unitPrice),
    currencyId: line.currencyId ?? '',
    currencyLabel: line.currency?.code ?? priceBook.currency?.code ?? '-',
    uom: line.uom ?? line.item.uom ?? '',
    minimumQuantity: decimalInputValue(line.minimumQuantity),
    maximumQuantity: decimalInputValue(line.maximumQuantity),
    effectiveStartDate: dateInputValue(line.effectiveStartDate),
    effectiveEndDate: dateInputValue(line.effectiveEndDate),
    status: line.status,
    priceSource: line.priceSource,
    marginFloorPct: decimalInputValue(line.marginFloorPct),
  }))

  return (
    <RecordDetailPageShell
      backHref={isCustomizing ? detailHref : '/price-books'}
      backLabel={isCustomizing ? '<- Back to Price Book Detail' : '<- Back to Price Books'}
      meta={priceBook.priceBookId ?? 'Pending'}
      title={priceBook.name}
      badge={priceBook.inactive ? <span className="inline-block rounded-full px-3 py-0.5 text-xs font-medium" style={{ backgroundColor: 'rgba(239,68,68,0.18)', color: 'var(--danger)' }}>Inactive</span> : null}
      actions={
        isCustomizing ? null : (
          <RecordDetailActionBar
            mode={isEditing ? 'edit' : 'detail'}
            detailHref={detailHref}
            formId={`inline-record-form-${priceBook.id}`}
            newHref="/price-books/new"
            duplicateHref={`/price-books/new?duplicateFrom=${priceBook.id}`}
            exportTitle={priceBook.name}
            exportFileName={`price-book-${priceBook.priceBookId ?? priceBook.id}`}
            exportSections={detailSections}
            customizeHref={`${detailHref}?customize=1`}
            editHref={`${detailHref}?edit=1`}
            deleteResource="price-books"
            deleteId={priceBook.id}
          />
        )
      }
    >
      {!isCustomizing ? (
        <div className="mb-8">
          <TransactionStatsRow
            record={priceBook}
            stats={statDefinitions}
            visibleStatCards={formCustomization.statCards as Array<{ id: string; metric: string; visible: boolean; order: number; size?: 'sm' | 'md' | 'lg'; colorized?: boolean; linked?: boolean }> | undefined}
          />
        </div>
      ) : null}

      {isCustomizing ? (
        <PriceBookDetailCustomizeMode
          detailHref={detailHref}
          initialLayout={formCustomization}
          initialRequirements={{ ...formRequirements.priceBookCreate }}
          fields={customizeFields}
          sectionDescriptions={sectionDescriptions}
          statPreviewCards={statPreviewCards}
        />
      ) : (
        <MasterDataHeaderDetails
          resource="price-books"
          id={priceBook.id}
          title="Price Book Details"
          sections={detailSections}
          editing={isEditing}
          columns={formCustomization.formColumns}
          systemInformationItems={buildMasterDataSystemInformationItems(systemInfo, priceBook.id)}
        />
      )}

      {!isCustomizing ? (
        <PriceBookItemsSection
          priceBookId={priceBook.id}
          defaultCurrencyId={priceBook.currencyId ?? ''}
          rows={priceBookItemRows}
          itemOptions={itemOptions}
          currencyOptions={currencyOptions}
          statusOptions={lineStatusOptions}
          priceSourceOptions={priceSourceOptions}
          editable={isEditing}
        />
      ) : null}

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
              content: <CommunicationsSection embedded toolbarTargetId={communicationsToolbarTargetId} rows={[]} showDisplayControl={false} />,
            },
            {
              key: 'system-notes',
              label: 'System Notes',
              count: systemNotes.length,
              toolbarTargetId: systemNotesToolbarTargetId,
              toolbarPlacement: 'tab-bar',
              content: <SystemNotesSection embedded toolbarTargetId={systemNotesToolbarTargetId} notes={systemNotes} showDisplayControl={false} />,
            },
          ]}
        />
      ) : null}
    </RecordDetailPageShell>
  )
}
