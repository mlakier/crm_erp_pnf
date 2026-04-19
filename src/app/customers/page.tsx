import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/format'
import CustomerCreateForm from '@/components/CustomerCreateForm'
import DeleteButton from '@/components/DeleteButton'
import EditButton from '@/components/EditButton'
import CreateModalButton from '@/components/CreateModalButton'
import MasterDataPageHeader from '@/components/MasterDataPageHeader'
import MasterDataListSection from '@/components/MasterDataListSection'
import { MasterDataBodyCell, MasterDataEmptyStateRow, MasterDataHeaderCell, MasterDataMutedCell } from '@/components/MasterDataTableCells'
import PaginationFooter from '@/components/PaginationFooter'
import { getPagination } from '@/lib/pagination'
import { MASTER_DATA_TABLE_DIVIDER_STYLE, getMasterDataRowStyle } from '@/lib/master-data-table'
import { displayMasterDataValue, formatMasterDataDate } from '@/lib/master-data-display'
import { loadCompanyPageLogo } from '@/lib/company-page-logo'
import { loadListOptions } from '@/lib/list-options-store'
import { loadCustomerFormCustomization } from '@/lib/customer-form-customization-store'
import { customerListDefinition } from '@/lib/master-data-list-definitions'

export default async function CRMPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>
}) {
  const params = await searchParams
  const query = (params.q ?? '').trim()
  const sort = params.sort ?? 'newest'

  const where = query
    ? {
        OR: [
          { customerId: { contains: query } },
          { name: { contains: query } },
          { email: { contains: query } },
          { industry: { contains: query } },
        ],
      }
    : {}

  const orderBy =
    sort === 'oldest'
      ? [{ createdAt: 'asc' as const }]
      : sort === 'name'
        ? [{ name: 'asc' as const }, { createdAt: 'desc' as const }]
        : [{ createdAt: 'desc' as const }]

  const [totalCustomers, adminUser, subsidiaries, currencies, companyLogoPages, listOptions, formCustomization] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.user.findUnique({ where: { email: 'admin@example.com' } }),
    prisma.entity.findMany({ orderBy: { subsidiaryId: 'asc' }, select: { id: true, subsidiaryId: true, name: true } }),
    prisma.currency.findMany({ orderBy: { currencyId: 'asc' }, select: { id: true, currencyId: true, name: true } }),
    loadCompanyPageLogo(),
    loadListOptions(),
    loadCustomerFormCustomization(),
  ])

  const pagination = getPagination(totalCustomers, params.page)

  const customers = await prisma.customer.findMany({
    where,
    include: { entity: true, currency: true },
    orderBy,
    skip: pagination.skip,
    take: pagination.pageSize,
  })

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
          <CreateModalButton buttonLabel="New Customer" title="New Customer">
            <CustomerCreateForm ownerUserId={adminUser.id} subsidiaries={subsidiaries} currencies={currencies} />
          </CreateModalButton>
        }
      />

      <MasterDataListSection
        query={params.q}
        searchPlaceholder={customerListDefinition.searchPlaceholder}
        tableId={customerListDefinition.tableId}
        exportFileName={customerListDefinition.exportFileName}
        columns={customerListDefinition.columns}
        sort={sort}
        sortOptions={customerListDefinition.sortOptions}
      >
        <table className="min-w-full" id={customerListDefinition.tableId}>
          <thead>
            <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
              <MasterDataHeaderCell columnId="number">Customer Id</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="name">Name</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="subsidiary">Primary Subsidiary</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="currency">Primary Currency</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="address">Billing Address</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="inactive">Inactive</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="created">Created</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="last-modified">Last Modified</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="actions">Actions</MasterDataHeaderCell>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <MasterDataEmptyStateRow colSpan={9}>No customers found</MasterDataEmptyStateRow>
            ) : (
              customers.map((customer, index) => (
                <tr key={customer.id} style={getMasterDataRowStyle(index, customers.length)}>
                  <MasterDataBodyCell columnId="number">
                    <Link href={`/customers/${customer.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                      {customer.customerId ?? 'Pending'}
                    </Link>
                  </MasterDataBodyCell>
                  <MasterDataBodyCell columnId="name" className="px-4 py-2 text-sm text-white">{customer.name}</MasterDataBodyCell>
                  <MasterDataMutedCell columnId="subsidiary">{customer.entity ? `${customer.entity.subsidiaryId} (${customer.entity.name})` : displayMasterDataValue(null)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="currency">{displayMasterDataValue(customer.currency?.currencyId)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="address">{displayMasterDataValue(customer.address)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="inactive">{customer.inactive ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="created">{formatMasterDataDate(customer.createdAt)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="last-modified">{formatMasterDataDate(customer.updatedAt)}</MasterDataMutedCell>
                  <MasterDataBodyCell columnId="actions">
                    <div className="flex items-center gap-2">
                      <EditButton
                        resource="customers"
                        id={customer.id}
                        fields={[
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
                                options: [{ value: '', label: 'None' }, ...listOptions.customer.industry.map((option) => ({ value: option, label: option }))],
                              }]
                            : []),
                          ...(formCustomization.fields.primarySubsidiaryId.visible
                            ? [{
                                name: 'primarySubsidiaryId',
                                label: 'Primary Subsidiary',
                                value: customer.entityId ?? '',
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
                                options: [{ value: '', label: 'None' }, ...currencies.map((currency) => ({ value: currency.id, label: `${currency.currencyId} - ${currency.name}` }))],
                              }]
                            : []),
                          ...(formCustomization.fields.inactive.visible
                            ? [{
                                name: 'inactive',
                                label: 'Inactive',
                                value: customer.inactive ? 'true' : 'false',
                                type: 'select' as const,
                                options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }],
                              }]
                            : []),
                        ]}
                      />
                      <DeleteButton resource="customers" id={customer.id} />
                    </div>
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
