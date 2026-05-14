import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ListRowActions from '@/components/ListRowActions'
import PaginationFooter from '@/components/PaginationFooter'
import MasterDataPageHeader from '@/components/MasterDataPageHeader'
import MasterDataListSection from '@/components/MasterDataListSection'
import { MasterDataBodyCell, MasterDataEmptyStateRow, MasterDataHeaderCell, MasterDataMutedCell } from '@/components/MasterDataTableCells'
import RecordCreateDetailPageClient from '@/components/RecordCreateDetailPageClient'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import RecordDetailActionBar from '@/components/RecordDetailActionBar'
import RecordDetailCustomizeMode from '@/components/RecordDetailCustomizeMode'
import MasterDataHeaderDetails from '@/components/MasterDataHeaderDetails'
import RecordBottomTabsSection from '@/components/RecordBottomTabsSection'
import RelatedRecordsSection from '@/components/RelatedRecordsSection'
import CommunicationsSection from '@/components/CommunicationsSection'
import SystemNotesSection from '@/components/SystemNotesSection'
import type { InlineRecordField, InlineRecordSection } from '@/components/InlineRecordDetails'
import { getPagination } from '@/lib/pagination'
import { MASTER_DATA_TABLE_DIVIDER_STYLE, getMasterDataRowStyle } from '@/lib/master-data-table'
import { displayMasterDataValue, formatMasterDataDate } from '@/lib/master-data-display'
import { loadCompanyPageLogo } from '@/lib/company-page-logo'
import { buildMasterDataExportUrl } from '@/lib/master-data-export-url'
import { loadListOptionsForSource } from '@/lib/list-source'
import { DEFAULT_RECORD_LIST_SORT, ID_NEWEST_OLDEST_NAME_SORT_OPTIONS } from '@/lib/record-list-sort'
import { buildMasterDataSystemInformationItems } from '@/components/RecordSystemInformationSection'
import { loadMasterDataSystemInfo } from '@/lib/master-data-system-info'
import { loadMasterDataSystemNotes } from '@/lib/master-data-system-notes'
import { getBillingMasterDataConfig, type BillingEntityConfig, type BillingFieldConfig, type BillingMasterDataKey } from '@/lib/billing-subscription-master-data'
import {
  buildConfiguredInlineSections,
  buildCustomizePreviewFields,
} from '@/lib/detail-page-helpers'
import { loadBillingMasterDataDetailCustomization } from '@/lib/billing-master-data-detail-customization-store'
import type { BillingMasterDataDetailCustomizationConfig } from '@/lib/billing-master-data-detail-customization'

type SearchParams = Promise<{ q?: string; sort?: string; page?: string; edit?: string; customize?: string }>

function prismaModel(config: BillingEntityConfig) {
  return prisma[config.prismaModel] as any
}

async function loadOptions(fields: BillingFieldConfig[]) {
  const entries = await Promise.all(
    fields
      .filter((field) => field.type === 'select' && field.sourceType && field.sourceKey)
      .map(async (field) => [
        field.key,
        await loadListOptionsForSource({ sourceType: field.sourceType, sourceKey: field.sourceKey }),
      ] as const),
  )
  return Object.fromEntries(entries) as Record<string, Array<{ value: string; label: string }>>
}

function optionLabel(options: Record<string, Array<{ value: string; label: string }>>, key: string, value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return '-'
  return options[key]?.find((option) => option.value === raw)?.label ?? displayMasterDataValue(raw)
}

function relationLabel(row: any, key: string, options: Record<string, Array<{ value: string; label: string }>>) {
  if (key === 'customerId') return row.customer ? `${row.customer.customerId ?? 'Customer'} - ${row.customer.name}` : optionLabel(options, key, row[key])
  if (key === 'subsidiaryId') return row.subsidiary ? `${row.subsidiary.subsidiaryId} - ${row.subsidiary.name}` : optionLabel(options, key, row[key])
  if (key === 'currencyId') return row.currency ? `${row.currency.code} - ${row.currency.name}` : optionLabel(options, key, row[key])
  if (key === 'defaultBillingScheduleId') return row.defaultBillingSchedule ? `${row.defaultBillingSchedule.billingScheduleId ?? 'Schedule'} - ${row.defaultBillingSchedule.name}` : optionLabel(options, key, row[key])
  if (key === 'defaultPriceBookId') return row.defaultPriceBook ? `${row.defaultPriceBook.priceBookId ?? 'Price Book'} - ${row.defaultPriceBook.name}` : optionLabel(options, key, row[key])
  if (key === 'defaultPriceLevelId') return row.defaultPriceLevel ? `${row.defaultPriceLevel.priceLevelId ?? 'Price Level'} - ${row.defaultPriceLevel.name}` : optionLabel(options, key, row[key])
  if (key === 'billToContactId') return row.billToContact ? `${row.billToContact.firstName} ${row.billToContact.lastName}` : optionLabel(options, key, row[key])
  if (key === 'itemId') return row.item ? `${row.item.itemId ?? 'Item'} - ${row.item.name}` : optionLabel(options, key, row[key])
  if (key.endsWith('AccountId')) {
    const relationKey = key.replace(/Id$/, '')
    const account = row[relationKey]
    return account ? `${account.accountNumber} - ${account.name}` : optionLabel(options, key, row[key])
  }
  return optionLabel(options, key, row[key])
}

function displayRowValue(row: any, field: BillingFieldConfig, options: Record<string, Array<{ value: string; label: string }>>) {
  const value = row[field.key]
  if (field.key === 'createdAt' || field.key === 'updatedAt') return formatMasterDataDate(value)
  if (field.type === 'select' && field.sourceType === 'system') return String(value) === 'true' ? 'Yes' : 'No'
  if (field.type === 'select' && field.sourceType === 'reference') return relationLabel(row, field.key, options)
  if (field.type === 'select' && field.sourceType === 'managed-list') return optionLabel(options, field.key, value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return displayMasterDataValue(value)
}

function fieldsWithSystemColumns(config: BillingEntityConfig): BillingFieldConfig[] {
  return [
    ...config.fields,
    { key: 'createdAt', label: 'Created', section: 'System' },
    { key: 'updatedAt', label: 'Last Modified', section: 'System' },
  ]
}

function billingFieldType(field: BillingFieldConfig) {
  if (field.type === 'select') return 'list'
  if (field.type === 'checkbox') return 'boolean'
  if (field.type === 'money' || field.type === 'number') return 'number'
  if (field.type === 'date') return 'date'
  if (field.type === 'textarea') return 'textarea'
  return 'text'
}

function makeLayoutFields(config: BillingEntityConfig) {
  return config.fields.map((field) => ({
    id: field.key,
    label: field.label,
    fieldType: billingFieldType(field),
    source: field.sourceType ? [field.sourceType, field.sourceKey].filter(Boolean).join(': ') : undefined,
    description: field.helpText,
  }))
}

function makeFieldDefinitions(config: BillingEntityConfig, row: any, options: Record<string, Array<{ value: string; label: string }>>): Record<string, InlineRecordField> {
  return Object.fromEntries(config.fields.map((field) => {
    const fieldOptions = field.type === 'select' ? [{ value: '', label: field.required ? '-- Select --' : 'None' }, ...(options[field.key] ?? [])] : undefined
    const inlineField: InlineRecordField = {
      name: field.key,
      label: field.label,
      value: field.readOnly ? row[field.key] ?? 'Generated automatically' : String(row[field.key] ?? ''),
      type: field.type === 'date' ? 'date' : field.type === 'select' ? 'select' : field.type === 'number' || field.type === 'money' ? 'number' : 'text',
      options: fieldOptions,
      readOnly: field.readOnly,
      required: field.required,
      helpText: field.helpText,
      displayValue: field.type === 'select' ? displayRowValue(row, field, options) : undefined,
    }
    return [field.key, inlineField]
  }))
}

function makeSectionDescriptions(config: BillingEntityConfig) {
  return Object.fromEntries(
    Array.from(new Set(config.fields.map((field) => field.section))).map((section) => [
      section,
      section === 'Core' ? config.description : '',
    ]),
  ) as Record<string, string>
}

function makeSections(
  config: BillingEntityConfig,
  row: any,
  options: Record<string, Array<{ value: string; label: string }>>,
  customization: BillingMasterDataDetailCustomizationConfig,
  editing = false,
): InlineRecordSection[] {
  return buildConfiguredInlineSections({
    fields: makeLayoutFields(config),
    layout: customization,
    fieldDefinitions: makeFieldDefinitions(config, row, options),
    sectionDescriptions: makeSectionDescriptions(config),
  }).map((section) => ({
    ...section,
    columns: editing ? 2 : customization.formColumns,
  }))
}

export async function BillingMasterDataListPage({ entityKey, searchParams }: { entityKey: BillingMasterDataKey; searchParams: SearchParams }) {
  const config = getBillingMasterDataConfig(entityKey)
  const params = await searchParams
  const query = (params.q ?? '').trim()
  const sort = params.sort ?? DEFAULT_RECORD_LIST_SORT
  const model = prismaModel(config)
  const where = query
    ? {
        OR: [
          { [config.idField]: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      }
    : {}
  const total = await model.count({ where })
  const pagination = getPagination(total, params.page)
  const [rows, companyLogoPages, options] = await Promise.all([
    model.findMany({
      where,
      include: config.includes,
      orderBy:
        sort === 'id'
          ? [{ [config.idField]: 'asc' }, { createdAt: 'desc' }]
          : sort === 'oldest'
            ? [{ createdAt: 'asc' }]
            : sort === 'name'
              ? [{ name: 'asc' }]
              : config.orderBy,
      skip: pagination.skip,
      take: pagination.pageSize,
    }),
    loadCompanyPageLogo(),
    loadOptions(config.fields),
  ])
  const columns = fieldsWithSystemColumns(config).filter((field) => config.listColumns.includes(field.key))
  const buildPageHref = (p: number) => {
    const s = new URLSearchParams()
    if (params.q) s.set('q', params.q)
    if (sort) s.set('sort', sort)
    s.set('page', String(p))
    return `${config.route}?${s.toString()}`
  }

  return (
    <div className="min-h-full px-8 py-8">
      <MasterDataPageHeader
        title={config.title}
        total={total}
        logoUrl={companyLogoPages?.url}
        actions={
          <Link href={`${config.route}/new`} className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-base font-semibold text-white transition" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>
            <span className="mr-1.5 text-lg leading-none">+</span>
            New {config.singularTitle}
          </Link>
        }
      />
      <MasterDataListSection
        query={params.q}
        searchPlaceholder={config.searchPlaceholder}
        tableId={config.tableId}
        exportFileName={config.exportFileName}
        exportAllUrl={buildMasterDataExportUrl(entityKey, params.q, sort)}
        columns={[...columns.map((field) => ({ id: field.key, label: field.label })), { id: 'actions', label: 'Actions', locked: true }]}
        sort={sort}
        sortOptions={ID_NEWEST_OLDEST_NAME_SORT_OPTIONS}
      >
        <table className="min-w-full" id={config.tableId}>
          <thead>
            <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
              {columns.map((field) => <MasterDataHeaderCell key={field.key} columnId={field.key}>{field.label}</MasterDataHeaderCell>)}
              <MasterDataHeaderCell columnId="actions">Actions</MasterDataHeaderCell>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <MasterDataEmptyStateRow colSpan={columns.length + 1}>No {config.title.toLowerCase()} found</MasterDataEmptyStateRow>
            ) : rows.map((row: any, index: number) => (
              <tr key={row.id} style={getMasterDataRowStyle(index, rows.length)}>
                {columns.map((field, columnIndex) => (
                  columnIndex === 0 ? (
                    <MasterDataBodyCell key={field.key} columnId={field.key} className="px-4 py-2 text-sm font-medium">
                      <Link href={`${config.route}/${row.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {displayRowValue(row, field, options)}
                      </Link>
                    </MasterDataBodyCell>
                  ) : (
                    <MasterDataMutedCell key={field.key} columnId={field.key}>{displayRowValue(row, field, options)}</MasterDataMutedCell>
                  )
                ))}
                <MasterDataBodyCell columnId="actions">
                  <ListRowActions
                    viewHref={`${config.route}/${row.id}`}
                    editHref={`${config.route}/${row.id}?edit=1`}
                    deleteButton={{ resource: entityKey, id: row.id }}
                  />
                </MasterDataBodyCell>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationFooter
          startRow={pagination.startRow}
          endRow={pagination.endRow}
          total={total}
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          hasPrevPage={pagination.hasPrevPage}
          hasNextPage={pagination.hasNextPage}
          prevHref={buildPageHref(pagination.currentPage - 1)}
          nextHref={buildPageHref(pagination.currentPage + 1)}
        />
      </MasterDataListSection>
    </div>
  )
}

export async function BillingMasterDataNewPage({ entityKey }: { entityKey: BillingMasterDataKey }) {
  const config = getBillingMasterDataConfig(entityKey)
  const [options, customization] = await Promise.all([
    loadOptions(config.fields),
    loadBillingMasterDataDetailCustomization(entityKey),
  ])
  const initial = Object.fromEntries(config.fields.map((field) => [field.key, field.readOnly ? '' : field.type === 'select' && field.sourceType === 'system' ? 'false' : '']))
  const sections = makeSections(config, initial, options, customization, true)
  return (
    <RecordCreateDetailPageClient
      resource={entityKey}
      backHref={config.route}
      backLabel={`<- Back to ${config.title}`}
      title={`New ${config.singularTitle}`}
      detailsTitle={`${config.singularTitle} details`}
      formId={`create-${entityKey}-inline-form`}
      sections={sections}
      formColumns={2}
      createEndpoint={config.apiRoute}
      successRedirectBasePath={config.route}
    />
  )
}

export async function BillingMasterDataDetailPage({ entityKey, params, searchParams }: { entityKey: BillingMasterDataKey; params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const config = getBillingMasterDataConfig(entityKey)
  const { id } = await params
  const { edit, customize } = await searchParams
  const isEditing = edit === '1'
  const isCustomizing = customize === '1'
  const model = prismaModel(config)
  const [row, options, customization] = await Promise.all([
    model.findUnique({ where: { id }, include: config.includes }),
    loadOptions(config.fields),
    loadBillingMasterDataDetailCustomization(entityKey),
  ])
  if (!row) notFound()
  const detailHref = `${config.route}/${row.id}`
  const sections = makeSections(config, row, options, customization, isEditing)
  const fieldDefinitions = makeFieldDefinitions(config, row, options)
  const customizeFields = buildCustomizePreviewFields(makeLayoutFields(config), fieldDefinitions)
  const systemInfo = await loadMasterDataSystemInfo({ entityType: entityKey, entityId: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt })
  const systemNotes = await loadMasterDataSystemNotes({ entityType: entityKey, entityId: row.id })
  const communicationsToolbarTargetId = `${entityKey}-communications-toolbar`
  const systemNotesToolbarTargetId = `${entityKey}-system-notes-toolbar`

  return (
    <RecordDetailPageShell
      backHref={isCustomizing ? detailHref : config.route}
      backLabel={isCustomizing ? `<- Back to ${config.singularTitle} Detail` : `<- Back to ${config.title}`}
      meta={row[config.idField] ?? 'Pending'}
      title={row.name}
      actions={isCustomizing ? null : (
        <RecordDetailActionBar
          mode={isEditing ? 'edit' : 'detail'}
          detailHref={detailHref}
          formId={`inline-record-form-${row.id}`}
          newHref={`${config.route}/new`}
          duplicateHref={`${config.route}/new`}
          exportTitle={row.name}
          exportFileName={`${entityKey}-${row[config.idField] ?? row.id}`}
          exportSections={sections}
          editHref={`${detailHref}?edit=1`}
          customizeHref={`${detailHref}?customize=1`}
          deleteResource={entityKey}
          deleteId={row.id}
        />
      )}
    >
      {isCustomizing ? (
        <RecordDetailCustomizeMode
          detailHref={detailHref}
          initialLayout={customization}
          fields={customizeFields}
          saveEndpoint={`/api/config/billing-master-data-detail-customization?entityKey=${entityKey}`}
          recordLabel={config.singularTitle.toLowerCase()}
          sectionDescriptions={makeSectionDescriptions(config)}
        />
      ) : (
        <>
          <MasterDataHeaderDetails
            resource={entityKey}
            id={row.id}
            title={`${config.singularTitle} Details`}
            sections={sections}
            editing={isEditing}
            columns={isEditing ? 2 : customization.formColumns}
            systemInformationItems={buildMasterDataSystemInformationItems(systemInfo, row.id)}
          />
          <RecordBottomTabsSection
            defaultActiveKey="related-records"
            tabs={[
              {
                key: 'related-records',
                label: 'Related Records',
                count: 0,
                content: <RelatedRecordsSection embedded tabs={[]} showDisplayControl={false} />,
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
        </>
      )}
    </RecordDetailPageShell>
  )
}
