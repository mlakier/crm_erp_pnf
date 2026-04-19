import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import CreateModalButton from '@/components/CreateModalButton'
import ItemCreateForm from '@/components/ItemCreateForm'
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
import { loadListOptions } from '@/lib/list-options-store'
import { itemListDefinition } from '@/lib/master-data-list-definitions'

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>
}) {
  const params = await searchParams
  const query = (params.q ?? '').trim()
  const sort = params.sort ?? 'newest'

  const where = query
    ? { OR: [{ name: { contains: query } }, { itemId: { contains: query } }, { sku: { contains: query } }] }
    : {}

  const total = await prisma.item.count({ where })
  const pagination = getPagination(total, params.page)

  const [items, entities, currencies, glAccounts, revRecTemplates, listOptions, companyLogoPages] = await Promise.all([
    prisma.item.findMany({
      where,
      include: {
        entity: true,
        currency: true,
        defaultRevRecTemplate: true,
        incomeAccount: true,
        deferredRevenueAccount: true,
        inventoryAccount: true,
        cogsExpenseAccount: true,
        deferredCostAccount: true,
      },
      orderBy:
        sort === 'oldest'
          ? [{ createdAt: 'asc' as const }]
          : sort === 'name'
            ? [{ name: 'asc' as const }]
            : [{ createdAt: 'desc' as const }],
      skip: pagination.skip,
      take: pagination.pageSize,
    }),
    prisma.entity.findMany({ orderBy: { subsidiaryId: 'asc' } }),
    prisma.currency.findMany({ orderBy: { currencyId: 'asc' } }),
    prisma.chartOfAccounts.findMany({
      where: { active: true },
      orderBy: { accountId: 'asc' },
      select: { id: true, accountId: true, name: true },
    }),
    prisma.revRecTemplate.findMany({
      where: { active: true },
      orderBy: { templateId: 'asc' },
      select: { id: true, templateId: true, name: true },
    }),
    loadListOptions(),
    loadCompanyPageLogo(),
  ])

  const buildPageHref = (p: number) => {
    const s = new URLSearchParams()
    if (params.q) s.set('q', params.q)
    s.set('page', String(p))
    return `/items?${s.toString()}`
  }

  const glOptions = glAccounts.map((account) => ({
    value: account.id,
    label: `${account.accountId} - ${account.name}`,
  }))

  const formatAccountLabel = (account: { accountId: string; name: string } | null) =>
    account ? `${account.accountId} - ${account.name}` : '-'

  return (
    <div className="min-h-full px-8 py-8">
      <MasterDataPageHeader
        title="Items"
        total={total}
        logoUrl={companyLogoPages?.url}
        actions={
          <CreateModalButton buttonLabel="New Item" title="New Item">
            <ItemCreateForm entities={entities} currencies={currencies} glAccounts={glAccounts} revRecTemplates={revRecTemplates} />
          </CreateModalButton>
        }
      />

      <MasterDataListSection
        query={params.q}
        searchPlaceholder={itemListDefinition.searchPlaceholder}
        tableId={itemListDefinition.tableId}
        exportFileName={itemListDefinition.exportFileName}
        columns={itemListDefinition.columns}
        sort={sort}
        sortOptions={itemListDefinition.sortOptions}
      >
        <table className="min-w-full" id={itemListDefinition.tableId}>
          <thead>
            <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
              <MasterDataHeaderCell columnId="item-id">Item Id</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="name">Name</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="sku">SKU</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="type">Item Type</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="price">Price</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="subsidiary">Subsidiary</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="currency">Currency</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="revenue-stream">Revenue Stream</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="recognition-method">Recognition Method</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="rev-rec-template">Rev Rec Template</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="ssp">SSP</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="standard-cost">Standard Cost</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="income-account">Income Account</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="deferred-revenue-account">Deferred Revenue Account</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="inventory-account">Inventory Account</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="cogs-expense-account">COGS / Expense Account</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="deferred-cost-account">Deferred Cost Account</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="direct-revenue-posting">Direct Revenue Posting</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="inactive">Inactive</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="created">Created</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="last-modified">Last Modified</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="actions">Actions</MasterDataHeaderCell>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <MasterDataEmptyStateRow colSpan={itemListDefinition.columns.length}>No items found</MasterDataEmptyStateRow>
            ) : (
              items.map((item, index) => (
                <tr key={item.id} style={getMasterDataRowStyle(index, items.length)}>
                  <MasterDataBodyCell columnId="item-id">
                    <Link href={`/items/${item.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                      {item.itemId ?? '-'}
                    </Link>
                  </MasterDataBodyCell>
                  <MasterDataBodyCell columnId="name" className="px-4 py-2 text-sm font-medium text-white">{item.name}</MasterDataBodyCell>
                  <MasterDataMutedCell columnId="sku">{item.sku ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="type" className="px-4 py-2 text-sm capitalize">{item.itemType}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="price">{item.listPrice.toFixed(2)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="subsidiary">{item.entity?.subsidiaryId ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="currency">{item.currency?.currencyId ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="revenue-stream">{item.revenueStream ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="recognition-method">{item.recognitionMethod ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="rev-rec-template">{item.defaultRevRecTemplate ? `${item.defaultRevRecTemplate.templateId} - ${item.defaultRevRecTemplate.name}` : '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="ssp">{item.standaloneSellingPrice != null ? item.standaloneSellingPrice.toFixed(2) : '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="standard-cost">{item.standardCost != null ? item.standardCost.toFixed(2) : '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="income-account">{formatAccountLabel(item.incomeAccount)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="deferred-revenue-account">{formatAccountLabel(item.deferredRevenueAccount)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="inventory-account">{formatAccountLabel(item.inventoryAccount)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="cogs-expense-account">{formatAccountLabel(item.cogsExpenseAccount)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="deferred-cost-account">{formatAccountLabel(item.deferredCostAccount)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="direct-revenue-posting">{item.directRevenuePosting ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="inactive">{item.active ? 'No' : 'Yes'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="created">{formatMasterDataDate(item.createdAt)}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="last-modified">{formatMasterDataDate(item.updatedAt)}</MasterDataMutedCell>
                  <MasterDataBodyCell columnId="actions">
                    <div className="flex items-center gap-2">
                      <EditButton
                        resource="items"
                        id={item.id}
                        fields={[
                          { name: 'name', label: 'Name', value: item.name },
                          { name: 'itemId', label: 'Item Id', value: item.itemId ?? '' },
                          { name: 'sku', label: 'SKU', value: item.sku ?? '' },
                          {
                            name: 'itemType',
                            label: 'Item Type',
                            value: item.itemType,
                            type: 'select',
                            placeholder: 'Select item type',
                            options: listOptions.item.type.map((value) => ({ value, label: value })),
                          },
                          { name: 'uom', label: 'UOM', value: item.uom ?? '' },
                          { name: 'listPrice', label: 'List Price', value: String(item.listPrice), type: 'number' },
                          { name: 'revenueStream', label: 'Revenue Stream', value: item.revenueStream ?? '' },
                          { name: 'recognitionMethod', label: 'Recognition Method', value: item.recognitionMethod ?? '', type: 'select', options: [{ value: 'point_in_time', label: 'Point in Time' }, { value: 'over_time', label: 'Over Time' }] },
                          { name: 'recognitionTrigger', label: 'Recognition Trigger', value: item.recognitionTrigger ?? '' },
                          { name: 'defaultRevRecTemplateId', label: 'Rev Rec Template', value: item.defaultRevRecTemplateId ?? '', type: 'select', placeholder: 'Select template', options: revRecTemplates.map((template) => ({ value: template.id, label: `${template.templateId} - ${template.name}` })) },
                          { name: 'defaultTermMonths', label: 'Default Term Months', value: item.defaultTermMonths != null ? String(item.defaultTermMonths) : '', type: 'number' },
                          { name: 'standaloneSellingPrice', label: 'Standalone Selling Price', value: item.standaloneSellingPrice != null ? String(item.standaloneSellingPrice) : '', type: 'number' },
                          { name: 'billingType', label: 'Billing Type', value: item.billingType ?? '' },
                          { name: 'standardCost', label: 'Standard Cost', value: item.standardCost != null ? String(item.standardCost) : '', type: 'number' },
                          { name: 'averageCost', label: 'Average Cost', value: item.averageCost != null ? String(item.averageCost) : '', type: 'number' },
                          { name: 'incomeAccountId', label: 'Income Account', value: item.incomeAccountId ?? '', type: 'select', placeholder: 'Select GL account', options: glOptions },
                          { name: 'deferredRevenueAccountId', label: 'Deferred Revenue Account', value: item.deferredRevenueAccountId ?? '', type: 'select', placeholder: 'Select GL account', options: glOptions },
                          { name: 'inventoryAccountId', label: 'Inventory Account', value: item.inventoryAccountId ?? '', type: 'select', placeholder: 'Select GL account', options: glOptions },
                          { name: 'cogsExpenseAccountId', label: 'COGS / Expense Account', value: item.cogsExpenseAccountId ?? '', type: 'select', placeholder: 'Select GL account', options: glOptions },
                          { name: 'deferredCostAccountId', label: 'Deferred Cost Account', value: item.deferredCostAccountId ?? '', type: 'select', placeholder: 'Select GL account', options: glOptions },
                          { name: 'directRevenuePosting', label: 'Direct Revenue Posting', value: item.directRevenuePosting ? 'true' : 'false', type: 'checkbox', placeholder: 'Direct Revenue Posting' },
                        ]}
                      />
                      <DeleteButton resource="items" id={item.id} />
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
