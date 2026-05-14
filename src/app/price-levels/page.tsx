import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import ListRowActions from '@/components/ListRowActions'
import PaginationFooter from '@/components/PaginationFooter'
import MasterDataPageHeader from '@/components/MasterDataPageHeader'
import MasterDataListSection from '@/components/MasterDataListSection'
import { MasterDataBodyCell, MasterDataEmptyStateRow, MasterDataHeaderCell, MasterDataMutedCell } from '@/components/MasterDataTableCells'
import { getPagination } from '@/lib/pagination'
import { MASTER_DATA_TABLE_DIVIDER_STYLE, getMasterDataRowStyle } from '@/lib/master-data-table'
import { displayMasterDataValue, formatMasterDataDate } from '@/lib/master-data-display'
import { loadCompanyPageLogo } from '@/lib/company-page-logo'
import { loadPriceLevelFormCustomization } from '@/lib/price-level-form-customization-store'
import { priceLevelListDefinition } from '@/lib/master-data-list-definitions'
import { buildMasterDataExportUrl } from '@/lib/master-data-export-url'
import { buildFieldMetaById, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import { PRICE_LEVEL_FORM_FIELDS } from '@/lib/price-level-form-customization'
import { loadListOptionsForSource } from '@/lib/list-source'
import { DEFAULT_RECORD_LIST_SORT } from '@/lib/record-list-sort'

function formatPercent(value: unknown) {
  if (value === null || value === undefined) return '-'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '-'
  return `${amount.toFixed(4).replace(/\.?0+$/, '')}%`
}

export default async function PriceLevelsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>
}) {
  const params = await searchParams
  const query = (params.q ?? '').trim()
  const sort = params.sort ?? DEFAULT_RECORD_LIST_SORT

  const where = query
    ? {
        OR: [
          { priceLevelId: { contains: query, mode: 'insensitive' as const } },
          { name: { contains: query, mode: 'insensitive' as const } },
          { description: { contains: query, mode: 'insensitive' as const } },
          { levelType: { contains: query, mode: 'insensitive' as const } },
          { subsidiary: { is: { name: { contains: query, mode: 'insensitive' as const } } } },
          { subsidiary: { is: { subsidiaryId: { contains: query, mode: 'insensitive' as const } } } },
        ],
      }
    : {}

  const total = await prisma.priceLevel.count({ where })
  const pagination = getPagination(total, params.page)
  const fieldMetaById = buildFieldMetaById(PRICE_LEVEL_FORM_FIELDS)

  const [priceLevels, companyLogoPages, inactiveOptions, fieldOptions, formCustomization] = await Promise.all([
    prisma.priceLevel.findMany({
      where,
      include: { subsidiary: { select: { id: true, subsidiaryId: true, name: true } } },
      orderBy:
        sort === 'id'
          ? [{ priceLevelId: 'asc' as const }, { createdAt: 'desc' as const }]
          : sort === 'oldest'
            ? [{ createdAt: 'asc' as const }]
            : sort === 'name'
              ? [{ name: 'asc' as const }]
              : [{ createdAt: 'desc' as const }],
      skip: pagination.skip,
      take: pagination.pageSize,
    }),
    loadCompanyPageLogo(),
    loadListOptionsForSource({ sourceType: 'system', sourceKey: 'activeInactive' }),
    loadFieldOptionsMap(fieldMetaById, [
      'levelType',
      'subsidiaryId',
      'includeChildren',
      'approvalRequired',
      'allowManualOverride',
    ]),
    loadPriceLevelFormCustomization(),
  ])

  const buildPageHref = (p: number) => {
    const s = new URLSearchParams()
    if (params.q) s.set('q', params.q)
    if (sort) s.set('sort', sort)
    s.set('page', String(p))
    return `/price-levels?${s.toString()}`
  }

  return (
    <div className="min-h-full px-8 py-8">
      <MasterDataPageHeader
        title="Price Levels"
        total={total}
        logoUrl={companyLogoPages?.url}
        actions={
          <Link
            href="/price-levels/new"
            className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-base font-semibold transition"
            style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}
          >
            <span className="mr-1.5 text-lg leading-none">+</span>
            New Price Level
          </Link>
        }
      />
      <MasterDataListSection
        query={params.q}
        searchPlaceholder={priceLevelListDefinition.searchPlaceholder}
        tableId={priceLevelListDefinition.tableId}
        exportFileName={priceLevelListDefinition.exportFileName}
        exportAllUrl={buildMasterDataExportUrl('price-levels', params.q, sort)}
        columns={priceLevelListDefinition.columns}
        sort={sort}
        sortOptions={priceLevelListDefinition.sortOptions}
      >
        <table className="min-w-full" id={priceLevelListDefinition.tableId}>
          <thead>
            <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
              <MasterDataHeaderCell columnId="price-level-id">Price Level Id</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="name">Name</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="level-type">Level Type</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="subsidiary">Subsidiary</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="include-children">Include Children</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="default-discount">Default Discount %</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="minimum-margin">Minimum Margin %</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="approval-required">Approval Required</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="allow-manual-override">Allow Manual Override</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="effective-start">Effective Start</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="effective-end">Effective End</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="inactive">Inactive</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="db-id">DB Id</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="created">Created</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="last-modified">Last Modified</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="actions">Actions</MasterDataHeaderCell>
            </tr>
          </thead>
          <tbody>
            {priceLevels.length === 0 ? (
              <MasterDataEmptyStateRow colSpan={16}>No price levels found</MasterDataEmptyStateRow>
            ) : (
              priceLevels.map((priceLevel, index) => (
                <tr key={priceLevel.id} style={getMasterDataRowStyle(index, priceLevels.length)}>
                  <MasterDataBodyCell columnId="price-level-id" className="px-4 py-2 text-sm font-medium">
                    <Link href={`/price-levels/${priceLevel.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                      {priceLevel.priceLevelId ?? 'Pending'}
                    </Link>
                  </MasterDataBodyCell>
                  <MasterDataBodyCell columnId="name" className="px-4 py-2 text-sm font-medium text-white">{priceLevel.name}</MasterDataBodyCell>
                  <MasterDataMutedCell columnId="level-type">{displayMasterDataValue(priceLevel.levelType)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="subsidiary">{priceLevel.subsidiary ? `${priceLevel.subsidiary.subsidiaryId} (${priceLevel.subsidiary.name})` : '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="include-children">{priceLevel.includeChildren ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="default-discount">{formatPercent(priceLevel.defaultDiscountPct)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="minimum-margin">{formatPercent(priceLevel.minimumMarginPct)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="approval-required">{priceLevel.approvalRequired ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="allow-manual-override">{priceLevel.allowManualOverride ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="effective-start">{formatMasterDataDate(priceLevel.effectiveStartDate)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="effective-end">{formatMasterDataDate(priceLevel.effectiveEndDate)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="inactive">{priceLevel.inactive ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="db-id">{priceLevel.id}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="created">{formatMasterDataDate(priceLevel.createdAt)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="last-modified">{formatMasterDataDate(priceLevel.updatedAt)}</MasterDataMutedCell>
                  <MasterDataBodyCell columnId="actions">
                    <ListRowActions
                      viewHref={`/price-levels/${priceLevel.id}`}
                      editButton={{
                        resource: 'price-levels',
                        id: priceLevel.id,
                        fields: [
                          ...(formCustomization.fields.name.visible ? [{ name: 'name', label: 'Name', value: priceLevel.name }] : []),
                          ...(formCustomization.fields.description.visible ? [{ name: 'description', label: 'Description', value: priceLevel.description ?? '' }] : []),
                          ...(formCustomization.fields.levelType.visible ? [{ name: 'levelType', label: 'Level Type', value: priceLevel.levelType ?? '', type: 'select' as const, options: [{ value: '', label: 'None' }, ...(fieldOptions.levelType ?? [])] }] : []),
                          ...(formCustomization.fields.subsidiaryId.visible ? [{ name: 'subsidiaryId', label: 'Subsidiary', value: priceLevel.subsidiaryId ?? '', type: 'select' as const, options: [{ value: '', label: 'None' }, ...(fieldOptions.subsidiaryId ?? [])] }] : []),
                          ...(formCustomization.fields.includeChildren.visible ? [{ name: 'includeChildren', label: 'Include Children', value: priceLevel.includeChildren ? 'true' : 'false', type: 'select' as const, options: fieldOptions.includeChildren ?? [] }] : []),
                          ...(formCustomization.fields.defaultDiscountPct.visible ? [{ name: 'defaultDiscountPct', label: 'Default Discount %', value: priceLevel.defaultDiscountPct?.toString() ?? '', type: 'number' as const }] : []),
                          ...(formCustomization.fields.minimumMarginPct.visible ? [{ name: 'minimumMarginPct', label: 'Minimum Margin %', value: priceLevel.minimumMarginPct?.toString() ?? '', type: 'number' as const }] : []),
                          ...(formCustomization.fields.approvalRequired.visible ? [{ name: 'approvalRequired', label: 'Approval Required', value: priceLevel.approvalRequired ? 'true' : 'false', type: 'select' as const, options: fieldOptions.approvalRequired ?? [] }] : []),
                          ...(formCustomization.fields.approvalWorkflow.visible ? [{ name: 'approvalWorkflow', label: 'Approval Workflow', value: priceLevel.approvalWorkflow ?? '' }] : []),
                          ...(formCustomization.fields.allowManualOverride.visible ? [{ name: 'allowManualOverride', label: 'Allow Manual Override', value: priceLevel.allowManualOverride ? 'true' : 'false', type: 'select' as const, options: fieldOptions.allowManualOverride ?? [] }] : []),
                          ...(formCustomization.fields.effectiveStartDate.visible ? [{ name: 'effectiveStartDate', label: 'Effective Start Date', value: priceLevel.effectiveStartDate ? priceLevel.effectiveStartDate.toISOString().slice(0, 10) : '', type: 'date' as const }] : []),
                          ...(formCustomization.fields.effectiveEndDate.visible ? [{ name: 'effectiveEndDate', label: 'Effective End Date', value: priceLevel.effectiveEndDate ? priceLevel.effectiveEndDate.toISOString().slice(0, 10) : '', type: 'date' as const }] : []),
                          ...(formCustomization.fields.inactive.visible ? [{ name: 'inactive', label: 'Inactive', value: priceLevel.inactive ? 'true' : 'false', type: 'select' as const, options: inactiveOptions }] : []),
                        ],
                      }}
                      deleteButton={{ resource: 'price-levels', id: priceLevel.id }}
                    />
                  </MasterDataBodyCell>
                </tr>
              ))
            )}
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
