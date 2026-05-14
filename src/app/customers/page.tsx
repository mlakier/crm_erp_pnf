import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/format'
import ListRowActions from '@/components/ListRowActions'
import MasterDataPageHeader from '@/components/MasterDataPageHeader'
import MasterDataListSection from '@/components/MasterDataListSection'
import { MasterDataBodyCell, MasterDataEmptyStateRow, MasterDataHeaderCell, MasterDataMutedCell } from '@/components/MasterDataTableCells'
import PaginationFooter from '@/components/PaginationFooter'
import { getPagination } from '@/lib/pagination'
import { MASTER_DATA_TABLE_DIVIDER_STYLE, getMasterDataRowStyle } from '@/lib/master-data-table'
import { displayMasterDataValue, formatMasterDataDate } from '@/lib/master-data-display'
import { loadCompanyPageLogo } from '@/lib/company-page-logo'
import { loadCustomerFormCustomization } from '@/lib/customer-form-customization-store'
import { CUSTOMER_FORM_FIELDS } from '@/lib/customer-form-customization'
import { customerListDefinition } from '@/lib/master-data-list-definitions'
import { buildMasterDataExportUrl } from '@/lib/master-data-export-url'
import { buildFieldMetaById, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import { DEFAULT_RECORD_LIST_SORT } from '@/lib/record-list-sort'

export default async function CRMPage({
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
          { customerId: { contains: query, mode: 'insensitive' as const } },
          { name: { contains: query, mode: 'insensitive' as const } },
          { email: { contains: query, mode: 'insensitive' as const } },
          { industry: { contains: query, mode: 'insensitive' as const } },
          { customerStatus: { contains: query, mode: 'insensitive' as const } },
          { customerType: { contains: query, mode: 'insensitive' as const } },
          { customerGroup: { contains: query, mode: 'insensitive' as const } },
          { territory: { contains: query, mode: 'insensitive' as const } },
          { resaleNumber: { contains: query, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const orderBy =
    sort === 'id'
      ? [{ customerId: 'asc' as const }, { createdAt: 'desc' as const }]
      : sort === 'oldest'
      ? [{ createdAt: 'asc' as const }]
      : sort === 'name'
        ? [{ name: 'asc' as const }, { createdAt: 'desc' as const }]
        : [{ createdAt: 'desc' as const }]
  const customerFieldMetaById = buildFieldMetaById(CUSTOMER_FORM_FIELDS)

  const [totalCustomers, subsidiaries, currencies, companyLogoPages, fieldOptions, formCustomization] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.subsidiary.findMany({ orderBy: { subsidiaryId: 'asc' }, select: { id: true, subsidiaryId: true, name: true } }),
    prisma.currency.findMany({ orderBy: { code: 'asc' }, select: { id: true, currencyId: true, code: true, name: true } }),
    loadCompanyPageLogo(),
    loadFieldOptionsMap(customerFieldMetaById, [
      'industry',
      'customerType',
      'customerGroup',
      'customerStatus',
      'territory',
      'salesManager',
      'projectManager',
      'arAccountId',
      'priceLevel',
      'priceBook',
      'taxable',
      'taxItem',
      'language',
      'numberFormat',
      'negativeNumberFormat',
      'shipComplete',
      'shippingCarrier',
      'shippingMethod',
      'blockCollectionEmail',
      'collectionsRep',
      'includeChildren',
      'inactive',
    ]),
    loadCustomerFormCustomization(),
  ])

  const pagination = getPagination(totalCustomers, params.page)

  const [customers, priceLevels, priceBooks] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: { subsidiary: true, currency: true, arAccount: true },
      orderBy,
      skip: pagination.skip,
      take: pagination.pageSize,
    }),
    prisma.priceLevel.findMany({
      select: { id: true, priceLevelId: true, name: true, levelType: true },
      orderBy: [{ priceLevelId: 'asc' }, { name: 'asc' }],
    }),
    prisma.priceBook.findMany({
      select: { id: true, priceBookId: true, name: true, bookType: true },
      orderBy: [{ priceBookId: 'asc' }, { name: 'asc' }],
    }),
  ])
  const priceLevelLabels = new Map<string, string>()
  for (const priceLevel of priceLevels) {
    const label = priceLevel.priceLevelId ? `${priceLevel.priceLevelId} - ${priceLevel.name}` : priceLevel.name
    priceLevelLabels.set(priceLevel.id, label)
    if (priceLevel.priceLevelId) priceLevelLabels.set(priceLevel.priceLevelId, label)
    priceLevelLabels.set(priceLevel.name, label)
    if (priceLevel.levelType) priceLevelLabels.set(priceLevel.levelType, label)
  }
  const priceBookLabels = new Map<string, string>()
  for (const priceBook of priceBooks) {
    const label = priceBook.priceBookId ? `${priceBook.priceBookId} - ${priceBook.name}` : priceBook.name
    priceBookLabels.set(priceBook.id, label)
    if (priceBook.priceBookId) priceBookLabels.set(priceBook.priceBookId, label)
    priceBookLabels.set(priceBook.name, label)
    if (priceBook.bookType) priceBookLabels.set(priceBook.bookType, label)
  }
  const displayPriceLevel = (value: string | null) => (value ? priceLevelLabels.get(value) ?? displayMasterDataValue(value) : displayMasterDataValue(null))
  const displayPriceBook = (value: string | null) => (value ? priceBookLabels.get(value) ?? displayMasterDataValue(value) : displayMasterDataValue(null))

  const buildPageHref = (nextPage: number) => {
    const search = new URLSearchParams()
    if (params.q) search.set('q', params.q)
    if (sort) search.set('sort', sort)
    search.set('page', String(nextPage))
    return `/customers?${search.toString()}`
  }

  return (
    <div className="min-h-full px-8 py-8">
      <MasterDataPageHeader
        title="Customers"
        total={totalCustomers}
        logoUrl={companyLogoPages?.url}
        actions={
          <Link
            href="/customers/new"
            className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-base font-semibold transition"
            style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}
          >
            <span className="mr-1.5 text-lg leading-none">+</span>
            New Customer
          </Link>
        }
      />

      <MasterDataListSection
        query={params.q}
        searchPlaceholder={customerListDefinition.searchPlaceholder}
        tableId={customerListDefinition.tableId}
        exportFileName={customerListDefinition.exportFileName}
        exportAllUrl={buildMasterDataExportUrl('customers', params.q, sort)}
        columns={customerListDefinition.columns}
        sort={sort}
        sortOptions={customerListDefinition.sortOptions}
      >
        <table className="min-w-full" id={customerListDefinition.tableId}>
          <thead>
            <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
              <MasterDataHeaderCell columnId="number">Customer Id</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="name">Name</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="customer-status">Status</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="customer-type">Type</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="customer-group">Group</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="territory">Territory</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="sales-manager">Sales Manager</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="subsidiary">Primary Subsidiary</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="currency">Primary Currency</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="ar-account">AR Account</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="reminder-days">Reminder Days</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="price-level">Price Level</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="price-book">Price Book</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="taxable">Taxable</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="tax-item">Tax Code</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="collections-rep">Collections Rep</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="industry">Industry</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="address">Billing Address</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="email">Email</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="phone">Phone</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="inactive">Inactive</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="db-id">DB Id</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="created">Created</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="last-modified">Last Modified</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="actions">Actions</MasterDataHeaderCell>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <MasterDataEmptyStateRow colSpan={25}>No customers found</MasterDataEmptyStateRow>
            ) : (
              customers.map((customer, index) => (
                <tr key={customer.id} style={getMasterDataRowStyle(index, customers.length)}>
                  <MasterDataBodyCell columnId="number">
                    <Link href={`/customers/${customer.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                      {customer.customerId ?? 'Pending'}
                    </Link>
                  </MasterDataBodyCell>
                  <MasterDataBodyCell columnId="name" className="px-4 py-2 text-sm text-white">{customer.name}</MasterDataBodyCell>
                  <MasterDataMutedCell columnId="customer-status">{displayMasterDataValue(customer.customerStatus)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="customer-type">{displayMasterDataValue(customer.customerType)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="customer-group">{displayMasterDataValue(customer.customerGroup)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="territory">{displayMasterDataValue(customer.territory)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="sales-manager">{displayMasterDataValue(customer.salesManager)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="subsidiary">{customer.subsidiary ? `${customer.subsidiary.subsidiaryId} (${customer.subsidiary.name})` : displayMasterDataValue(null)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="currency">{displayMasterDataValue(customer.currency?.code)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="ar-account">{customer.arAccount ? `${customer.arAccount.accountNumber} - ${customer.arAccount.name}` : displayMasterDataValue(null)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="reminder-days">{displayMasterDataValue(customer.reminderDays)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="price-level">{displayPriceLevel(customer.priceLevel)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="price-book">{displayPriceBook(customer.priceBook)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="taxable">{customer.taxable ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="tax-item">{displayMasterDataValue(customer.taxItem)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="collections-rep">{displayMasterDataValue(customer.collectionsRep)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="industry">{displayMasterDataValue(customer.industry)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="address">{displayMasterDataValue(customer.address)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="email">{displayMasterDataValue(customer.email)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="phone">{displayMasterDataValue(normalizePhone(customer.phone))}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="inactive">{customer.inactive ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="db-id">{customer.id}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="created">{formatMasterDataDate(customer.createdAt)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="last-modified">{formatMasterDataDate(customer.updatedAt)}</MasterDataMutedCell>
                  <MasterDataBodyCell columnId="actions">
                    <ListRowActions
                      viewHref={`/customers/${customer.id}`}
                      editButton={{
                        resource: 'customers',
                        id: customer.id,
                        fields: [
                          ...(formCustomization.fields.customerId.visible ? [{ name: 'customerId', label: 'Customer ID', value: customer.customerId ?? '' }] : []),
                          ...(formCustomization.fields.name.visible ? [{ name: 'name', label: 'Name', value: customer.name }] : []),
                          ...(formCustomization.fields.email.visible ? [{ name: 'email', label: 'Email', value: customer.email ?? '', type: 'email' as const }] : []),
                          ...(formCustomization.fields.phone.visible ? [{ name: 'phone', label: 'Phone', value: normalizePhone(customer.phone) ?? '' }] : []),
                          ...(formCustomization.fields.address.visible ? [{ name: 'address', label: 'Billing Address', value: customer.address ?? '', type: 'address' as const }] : []),
                          ...(formCustomization.fields.industry.visible
                            ? [{
                                name: 'industry',
                                label: 'Industry',
                                value: customer.industry ?? '',
                                type: 'select' as const,
                                options: [{ value: '', label: 'None' }, ...(fieldOptions.industry ?? [])],
                              }]
                            : []),
                          ...(formCustomization.fields.primarySubsidiaryId.visible
                            ? [{
                                name: 'primarySubsidiaryId',
                                label: 'Primary Subsidiary',
                                value: customer.subsidiaryId ?? '',
                                type: 'select' as const,
                                options: [{ value: '', label: 'None' }, ...subsidiaries.map((subsidiary) => ({ value: subsidiary.id, label: `${subsidiary.subsidiaryId} - ${subsidiary.name}` }))],
                              }]
                            : []),
                          ...(formCustomization.fields.primaryCurrencyId.visible
                            ? [{
                                name: 'primaryCurrencyId',
                                label: 'Primary Currency',
                                value: customer.currencyId ?? '',
                                type: 'select' as const,
                                options: [{ value: '', label: 'None' }, ...currencies.map((currency) => ({ value: currency.id, label: `${currency.code} - ${currency.name}` }))],
                              }]
                            : []),
                          ...(formCustomization.fields.priceLevel.visible
                            ? [{
                                name: 'priceLevel',
                                label: 'Price Level',
                                value: customer.priceLevel ?? '',
                                type: 'select' as const,
                                options: [{ value: '', label: 'None' }, ...(fieldOptions.priceLevel ?? [])],
                              }]
                            : []),
                          ...(formCustomization.fields.priceBook.visible
                            ? [{
                                name: 'priceBook',
                                label: 'Price Book',
                                value: customer.priceBook ?? '',
                                type: 'select' as const,
                                options: [{ value: '', label: 'None' }, ...(fieldOptions.priceBook ?? [])],
                              }]
                            : []),
                          ...(formCustomization.fields.inactive.visible
                            ? [{
                                name: 'inactive',
                                label: 'Inactive',
                                value: customer.inactive ? 'true' : 'false',
                                type: 'select' as const,
                                options: fieldOptions.inactive ?? [],
                              }]
                            : []),
                        ],
                      }}
                      deleteButton={{ resource: 'customers', id: customer.id }}
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
          total={totalCustomers}
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
