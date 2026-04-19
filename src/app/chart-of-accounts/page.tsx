import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import CreateModalButton from '@/components/CreateModalButton'
import ChartOfAccountCreateForm from '@/components/ChartOfAccountCreateForm'
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
import { chartOfAccountsListDefinition } from '@/lib/master-data-list-definitions'

export default async function ChartOfAccountsPage({
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
          { accountId: { contains: query } },
          { name: { contains: query } },
          { accountType: { contains: query } },
          { description: { contains: query } },
        ],
      }
    : {}

  const total = await prisma.chartOfAccounts.count({ where })
  const pagination = getPagination(total, params.page)

  const [accounts, subsidiaries, accountOptions, companyLogoPages] = await Promise.all([
    prisma.chartOfAccounts.findMany({
      where,
      include: {
        parentSubsidiary: { select: { id: true, subsidiaryId: true, name: true } },
        subsidiaryAssignments: {
          include: { subsidiary: { select: { id: true, subsidiaryId: true, name: true } } },
          orderBy: { subsidiary: { subsidiaryId: 'asc' } },
        },
      },
      orderBy:
        sort === 'oldest'
          ? [{ createdAt: 'asc' as const }]
          : sort === 'account'
            ? [{ accountId: 'asc' as const }]
            : [{ createdAt: 'desc' as const }],
      skip: pagination.skip,
      take: pagination.pageSize,
    }),
    prisma.entity.findMany({ orderBy: { subsidiaryId: 'asc' }, select: { id: true, subsidiaryId: true, name: true } }),
    prisma.chartOfAccounts.findMany({ orderBy: { accountId: 'asc' }, select: { id: true, accountId: true, name: true } }),
    loadCompanyPageLogo(),
  ])

  const buildPageHref = (nextPage: number) => {
    const search = new URLSearchParams()
    if (params.q) search.set('q', params.q)
    search.set('page', String(nextPage))
    return `/chart-of-accounts?${search.toString()}`
  }

  return (
    <div className="min-h-full px-8 py-8">
      <MasterDataPageHeader
        title="Chart of Accounts"
        total={total}
        logoUrl={companyLogoPages?.url}
        actions={
          <CreateModalButton buttonLabel="New Account" title="New Chart Account" modalWidthClassName="max-w-3xl">
            <ChartOfAccountCreateForm subsidiaries={subsidiaries} accountOptions={accountOptions} />
          </CreateModalButton>
        }
      />

      <MasterDataListSection
        query={params.q}
        searchPlaceholder={chartOfAccountsListDefinition.searchPlaceholder}
        tableId={chartOfAccountsListDefinition.tableId}
        exportFileName={chartOfAccountsListDefinition.exportFileName}
        columns={chartOfAccountsListDefinition.columns}
        sort={sort}
        sortOptions={chartOfAccountsListDefinition.sortOptions}
      >
        <table className="min-w-full" id={chartOfAccountsListDefinition.tableId}>
          <thead>
            <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
              <MasterDataHeaderCell columnId="account-id">Account Id</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="name">Name</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="type">Account Type</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="normal-balance">Normal Balance</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="fs-group">FS Group</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="posting">Posting</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="control">Control</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="inventory">Inventory</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="summary">Summary</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="subsidiaries">Subsidiaries</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="created">Created</MasterDataHeaderCell>
              <MasterDataHeaderCell columnId="actions">Actions</MasterDataHeaderCell>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <MasterDataEmptyStateRow colSpan={chartOfAccountsListDefinition.columns.length}>No chart accounts found</MasterDataEmptyStateRow>
            ) : (
              accounts.map((account, index) => (
                <tr key={account.id} style={getMasterDataRowStyle(index, accounts.length)}>
                  <MasterDataBodyCell columnId="account-id">
                    <Link href={`/chart-of-accounts/${account.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                      {account.accountId}
                    </Link>
                  </MasterDataBodyCell>
                  <MasterDataBodyCell columnId="name" className="px-4 py-2 text-sm text-white">{account.name}</MasterDataBodyCell>
                  <MasterDataMutedCell columnId="type">{account.accountType}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="normal-balance">{account.normalBalance ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="fs-group">{account.financialStatementGroup ?? '-'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="posting">{account.isPosting ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="control">{account.isControlAccount ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="inventory">{account.inventory ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="summary">{account.summary ? 'Yes' : 'No'}</MasterDataMutedCell>
                  <MasterDataMutedCell columnId="subsidiaries">
                    {account.parentSubsidiary
                      ? `${account.parentSubsidiary.subsidiaryId}${account.includeChildren ? ' (+children)' : ''}`
                      : account.subsidiaryAssignments.length > 0
                        ? account.subsidiaryAssignments.map((entry) => entry.subsidiary.subsidiaryId).join(', ')
                        : '-'}
                  </MasterDataMutedCell>
                  <MasterDataMutedCell columnId="created">{formatMasterDataDate(account.createdAt)}</MasterDataMutedCell>
                  <MasterDataBodyCell columnId="actions">
                    <div className="flex items-center gap-2">
                      <EditButton
                        resource="chart-of-accounts"
                        id={account.id}
                        fields={[
                          { name: 'accountId', label: 'Account Id', value: account.accountId },
                          { name: 'name', label: 'Name', value: account.name },
                          { name: 'description', label: 'Description', value: account.description ?? '' },
                          {
                            name: 'accountType',
                            label: 'Account Type',
                            value: account.accountType,
                            type: 'select',
                            options: [
                              { value: 'Asset', label: 'Asset' },
                              { value: 'Liability', label: 'Liability' },
                              { value: 'Equity', label: 'Equity' },
                              { value: 'Revenue', label: 'Revenue' },
                              { value: 'Expense', label: 'Expense' },
                              { value: 'Other', label: 'Other' },
                            ],
                          },
                          { name: 'normalBalance', label: 'Normal Balance', value: account.normalBalance ?? '', type: 'select', options: [{ value: 'debit', label: 'Debit' }, { value: 'credit', label: 'Credit' }] },
                          { name: 'financialStatementSection', label: 'FS Section', value: account.financialStatementSection ?? '' },
                          { name: 'financialStatementGroup', label: 'FS Group', value: account.financialStatementGroup ?? '' },
                          { name: 'isPosting', label: 'Posting Account', value: String(account.isPosting), type: 'checkbox' },
                          { name: 'isControlAccount', label: 'Control Account', value: String(account.isControlAccount), type: 'checkbox' },
                          { name: 'allowsManualPosting', label: 'Allow Manual Posting', value: String(account.allowsManualPosting), type: 'checkbox' },
                          { name: 'requiresSubledgerType', label: 'Requires Subledger Type', value: account.requiresSubledgerType ?? '' },
                          { name: 'cashFlowCategory', label: 'Cash Flow Category', value: account.cashFlowCategory ?? '' },
                          { name: 'parentAccountId', label: 'Parent Account', value: account.parentAccountId ?? '', type: 'select', placeholder: 'Select parent account', options: accountOptions.filter((option) => option.id !== account.id).map((option) => ({ value: option.id, label: `${option.accountId} - ${option.name}` })) },
                          { name: 'closeToAccountId', label: 'Close To Account', value: account.closeToAccountId ?? '', type: 'select', placeholder: 'Select close-to account', options: accountOptions.filter((option) => option.id !== account.id).map((option) => ({ value: option.id, label: `${option.accountId} - ${option.name}` })) },
                          { name: 'inventory', label: 'Inventory', value: String(account.inventory), type: 'checkbox' },
                          { name: 'revalueOpenBalance', label: 'Revalue Open Balance', value: String(account.revalueOpenBalance), type: 'checkbox' },
                          { name: 'eliminateIntercoTransactions', label: 'Eliminate Interco Transactions', value: String(account.eliminateIntercoTransactions), type: 'checkbox' },
                          { name: 'summary', label: 'Summary', value: String(account.summary), type: 'checkbox' },
                        ]}
                      />
                      <DeleteButton resource="chart-of-accounts" id={account.id} />
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
