import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import CreateModalButton from '@/components/CreateModalButton'
import CurrencyCreateForm from '@/components/CurrencyCreateForm'
import MasterDataPageHeader from '@/components/MasterDataPageHeader'
import MasterDataListSection from '@/components/MasterDataListSection'
import { MasterDataBodyCell, MasterDataEmptyStateRow, MasterDataHeaderCell, MasterDataMutedCell } from '@/components/MasterDataTableCells'
import EditButton from '@/components/EditButton'
import DeleteButton from '@/components/DeleteButton'
import PaginationFooter from '@/components/PaginationFooter'
import { getPagination } from '@/lib/pagination'
import { MASTER_DATA_TABLE_DIVIDER_STYLE, getMasterDataRowStyle } from '@/lib/master-data-table'
import { formatMasterDataDate } from '@/lib/master-data-display'
import { loadCompanyPageLogo } from '@/lib/company-page-logo'
import { currencyListDefinition } from '@/lib/master-data-list-definitions'

export default async function CurrenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>
}) {
  const params = await searchParams
  const query = (params.q ?? '').trim()
  const sort = params.sort ?? 'newest'

  const where = query
    ? { OR: [{ currencyId: { contains: query } }, { name: { contains: query } }] }
    : {}

  const total = await prisma.currency.count({ where })
  const pagination = getPagination(total, params.page)
  const [currencies, companyLogoPages] = await Promise.all([
    prisma.currency.findMany({
      where,
      orderBy:
        sort === 'oldest'
          ? [{ createdAt: 'asc' as const }]
          : sort === 'name'
            ? [{ name: 'asc' as const }]
            : [{ createdAt: 'desc' as const }],
      skip: pagination.skip,
      take: pagination.pageSize,
    }),
    loadCompanyPageLogo(),
  ])

  const buildPageHref = (p: number) => {
    const s = new URLSearchParams()
    if (params.q) s.set('q', params.q)
    s.set('page', String(p))
    return `/currencies?${s.toString()}`
  }

  return (
    <div className="min-h-full px-8 py-8">
      <MasterDataPageHeader
        title="Currencies"
        total={total}
        logoUrl={companyLogoPages?.url}
        actions={
          <CreateModalButton buttonLabel="New Currency" title="New Currency">
            <CurrencyCreateForm />
          </CreateModalButton>
        }
      />

      <MasterDataListSection
        query={params.q}
        searchPlaceholder={currencyListDefinition.searchPlaceholder}
        tableId={currencyListDefinition.tableId}
        exportFileName={currencyListDefinition.exportFileName}
        columns={currencyListDefinition.columns}
        sort={sort}
        sortOptions={currencyListDefinition.sortOptions}
      >
        <table className="min-w-full" id={currencyListDefinition.tableId}>
          <thead>
            <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
              <MasterDataHeaderCell columnId="currency-id">Currency Id</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="name">Name</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="symbol">Symbol</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="decimals">Decimals</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="inactive">Inactive</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="created">Created</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="last-modified">Last Modified</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="actions">Actions</MasterDataHeaderCell>
            </tr>
          </thead>
          <tbody>
            {currencies.length === 0 ? (
              <MasterDataEmptyStateRow colSpan={7}>No currencies found</MasterDataEmptyStateRow>
            ) : (
              currencies.map((currency, index) => (
                <tr key={currency.id} style={getMasterDataRowStyle(index, currencies.length)}>
                  <MasterDataBodyCell columnId="currency-id" className="px-4 py-2 text-sm font-medium text-white">
                    <Link href={`/currencies/${currency.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                      {currency.currencyId}
                    </Link>
                  </MasterDataBodyCell>
                  <MasterDataMutedCell columnId="name">{currency.name}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="symbol">{currency.symbol ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="decimals">{currency.decimals}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="inactive">{currency.active ? 'No' : 'Yes'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="created">{formatMasterDataDate(currency.createdAt)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="last-modified">{formatMasterDataDate(currency.updatedAt)}</MasterDataMutedCell>
                  <MasterDataBodyCell columnId="actions">
                    <div className="flex items-center gap-2">
                      <EditButton
                        resource="currencies"
                        id={currency.id}
                        fields={[
                          { name: 'currencyId', label: 'Currency Id', value: currency.currencyId },
                          { name: 'name', label: 'Name', value: currency.name },
                          { name: 'symbol', label: 'Symbol', value: currency.symbol ?? '' },
                        ]}
                      />
                      <DeleteButton resource="currencies" id={currency.id} />
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
