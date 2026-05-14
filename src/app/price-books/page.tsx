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
import { loadPriceBookFormCustomization } from '@/lib/price-book-form-customization-store'
import { priceBookListDefinition } from '@/lib/master-data-list-definitions'
import { buildMasterDataExportUrl } from '@/lib/master-data-export-url'
import { buildFieldMetaById, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import { PRICE_BOOK_FORM_FIELDS } from '@/lib/price-book-form-customization'
import { loadListOptionsForSource } from '@/lib/list-source'
import { DEFAULT_RECORD_LIST_SORT } from '@/lib/record-list-sort'

export default async function PriceBooksPage({
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
          { priceBookId: { contains: query, mode: 'insensitive' as const } },
          { name: { contains: query, mode: 'insensitive' as const } },
          { description: { contains: query, mode: 'insensitive' as const } },
          { bookType: { contains: query, mode: 'insensitive' as const } },
          { subsidiary: { is: { name: { contains: query, mode: 'insensitive' as const } } } },
          { subsidiary: { is: { subsidiaryId: { contains: query, mode: 'insensitive' as const } } } },
          { currency: { is: { code: { contains: query, mode: 'insensitive' as const } } } },
        ],
      }
    : {}

  const total = await prisma.priceBook.count({ where })
  const pagination = getPagination(total, params.page)
  const fieldMetaById = buildFieldMetaById(PRICE_BOOK_FORM_FIELDS)

  const [priceBooks, companyLogoPages, inactiveOptions, fieldOptions, formCustomization] = await Promise.all([
    prisma.priceBook.findMany({
      where,
      include: {
        subsidiary: { select: { id: true, subsidiaryId: true, name: true } },
        currency: { select: { id: true, code: true, name: true } },
        defaultPriceLevel: { select: { id: true, priceLevelId: true, name: true } },
      },
      orderBy:
        sort === 'id'
          ? [{ priceBookId: 'asc' as const }, { createdAt: 'desc' as const }]
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
      'bookType',
      'subsidiaryId',
      'includeChildren',
      'currencyId',
      'defaultPriceLevelId',
      'approvalRequired',
      'allowManualOverride',
    ]),
    loadPriceBookFormCustomization(),
  ])

  const buildPageHref = (p: number) => {
    const s = new URLSearchParams()
    if (params.q) s.set('q', params.q)
    if (sort) s.set('sort', sort)
    s.set('page', String(p))
    return `/price-books?${s.toString()}`
  }

  return (
    <div className="min-h-full px-8 py-8">
      <MasterDataPageHeader
        title="Price Books"
        total={total}
        logoUrl={companyLogoPages?.url}
        actions={
          <Link
            href="/price-books/new"
            className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-base font-semibold transition"
            style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}
          >
            <span className="mr-1.5 text-lg leading-none">+</span>
            New Price Book
          </Link>
        }
      />
      <MasterDataListSection
        query={params.q}
        searchPlaceholder={priceBookListDefinition.searchPlaceholder}
        tableId={priceBookListDefinition.tableId}
        exportFileName={priceBookListDefinition.exportFileName}
        exportAllUrl={buildMasterDataExportUrl('price-books', params.q, sort)}
        columns={priceBookListDefinition.columns}
        sort={sort}
        sortOptions={priceBookListDefinition.sortOptions}
      >
        <table className="min-w-full" id={priceBookListDefinition.tableId}>
          <thead>
            <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
              <MasterDataHeaderCell columnId="price-book-id">Price Book Id</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="name">Name</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="book-type">Book Type</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="subsidiary">Subsidiary</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="include-children">Include Children</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="currency">Currency</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="default-price-level">Default Price Level</MasterDataHeaderCell>
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
            {priceBooks.length === 0 ? (
              <MasterDataEmptyStateRow colSpan={16}>No price books found</MasterDataEmptyStateRow>
            ) : (
              priceBooks.map((priceBook, index) => (
                <tr key={priceBook.id} style={getMasterDataRowStyle(index, priceBooks.length)}>
                  <MasterDataBodyCell columnId="price-book-id" className="px-4 py-2 text-sm font-medium">
                    <Link href={`/price-books/${priceBook.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                      {priceBook.priceBookId ?? 'Pending'}
                    </Link>
                  </MasterDataBodyCell>
                  <MasterDataBodyCell columnId="name" className="px-4 py-2 text-sm font-medium text-white">{priceBook.name}</MasterDataBodyCell>
                  <MasterDataMutedCell columnId="book-type">{displayMasterDataValue(priceBook.bookType)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="subsidiary">{priceBook.subsidiary ? `${priceBook.subsidiary.subsidiaryId} (${priceBook.subsidiary.name})` : '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="include-children">{priceBook.includeChildren ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="currency">{priceBook.currency ? `${priceBook.currency.code} - ${priceBook.currency.name}` : '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="default-price-level">{priceBook.defaultPriceLevel ? `${priceBook.defaultPriceLevel.priceLevelId} - ${priceBook.defaultPriceLevel.name}` : '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="approval-required">{priceBook.approvalRequired ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="allow-manual-override">{priceBook.allowManualOverride ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="effective-start">{formatMasterDataDate(priceBook.effectiveStartDate)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="effective-end">{formatMasterDataDate(priceBook.effectiveEndDate)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="inactive">{priceBook.inactive ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="db-id">{priceBook.id}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="created">{formatMasterDataDate(priceBook.createdAt)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="last-modified">{formatMasterDataDate(priceBook.updatedAt)}</MasterDataMutedCell>
                  <MasterDataBodyCell columnId="actions">
                    <ListRowActions
                      viewHref={`/price-books/${priceBook.id}`}
                      editButton={{
                        resource: 'price-books',
                        id: priceBook.id,
                        fields: [
                          ...(formCustomization.fields.name.visible ? [{ name: 'name', label: 'Name', value: priceBook.name }] : []),
                          ...(formCustomization.fields.description.visible ? [{ name: 'description', label: 'Description', value: priceBook.description ?? '' }] : []),
                          ...(formCustomization.fields.bookType.visible ? [{ name: 'bookType', label: 'Book Type', value: priceBook.bookType ?? '', type: 'select' as const, options: [{ value: '', label: 'None' }, ...(fieldOptions.bookType ?? [])] }] : []),
                          ...(formCustomization.fields.subsidiaryId.visible ? [{ name: 'subsidiaryId', label: 'Subsidiary', value: priceBook.subsidiaryId ?? '', type: 'select' as const, options: [{ value: '', label: 'None' }, ...(fieldOptions.subsidiaryId ?? [])] }] : []),
                          ...(formCustomization.fields.includeChildren.visible ? [{ name: 'includeChildren', label: 'Include Children', value: priceBook.includeChildren ? 'true' : 'false', type: 'select' as const, options: fieldOptions.includeChildren ?? [] }] : []),
                          ...(formCustomization.fields.currencyId.visible ? [{ name: 'currencyId', label: 'Currency', value: priceBook.currencyId ?? '', type: 'select' as const, options: [{ value: '', label: 'None' }, ...(fieldOptions.currencyId ?? [])] }] : []),
                          ...(formCustomization.fields.defaultPriceLevelId.visible ? [{ name: 'defaultPriceLevelId', label: 'Default Price Level', value: priceBook.defaultPriceLevelId ?? '', type: 'select' as const, options: [{ value: '', label: 'None' }, ...(fieldOptions.defaultPriceLevelId ?? [])] }] : []),
                          ...(formCustomization.fields.approvalRequired.visible ? [{ name: 'approvalRequired', label: 'Approval Required', value: priceBook.approvalRequired ? 'true' : 'false', type: 'select' as const, options: fieldOptions.approvalRequired ?? [] }] : []),
                          ...(formCustomization.fields.approvalWorkflow.visible ? [{ name: 'approvalWorkflow', label: 'Approval Workflow', value: priceBook.approvalWorkflow ?? '' }] : []),
                          ...(formCustomization.fields.allowManualOverride.visible ? [{ name: 'allowManualOverride', label: 'Allow Manual Override', value: priceBook.allowManualOverride ? 'true' : 'false', type: 'select' as const, options: fieldOptions.allowManualOverride ?? [] }] : []),
                          ...(formCustomization.fields.effectiveStartDate.visible ? [{ name: 'effectiveStartDate', label: 'Effective Start Date', value: priceBook.effectiveStartDate ? priceBook.effectiveStartDate.toISOString().slice(0, 10) : '', type: 'date' as const }] : []),
                          ...(formCustomization.fields.effectiveEndDate.visible ? [{ name: 'effectiveEndDate', label: 'Effective End Date', value: priceBook.effectiveEndDate ? priceBook.effectiveEndDate.toISOString().slice(0, 10) : '', type: 'date' as const }] : []),
                          ...(formCustomization.fields.inactive.visible ? [{ name: 'inactive', label: 'Inactive', value: priceBook.inactive ? 'true' : 'false', type: 'select' as const, options: inactiveOptions }] : []),
                        ],
                      }}
                      deleteButton={{ resource: 'price-books', id: priceBook.id }}
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
