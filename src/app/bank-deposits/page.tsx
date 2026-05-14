import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import ColumnSelector from '@/components/ColumnSelector'
import ExportButton from '@/components/ExportButton'
import PaginationFooter from '@/components/PaginationFooter'
import { RecordListHeaderLabel } from '@/components/RecordListHeaderLabel'
import { getPagination } from '@/lib/pagination'

const BANK_DEPOSIT_COLUMNS = [
  { id: 'deposit-number', label: 'Deposit Id' },
  { id: 'date', label: 'Date' },
  { id: 'bank-account', label: 'Bank Account' },
  { id: 'subsidiary', label: 'Subsidiary' },
  { id: 'offset-account', label: 'Offset Account' },
  { id: 'amount', label: 'Amount' },
  { id: 'status', label: 'Status' },
  { id: 'currency', label: 'Currency', defaultVisible: false },
  { id: 'bank-feed', label: 'Bank Feed Txn', defaultVisible: false },
  { id: 'journal', label: 'Journal', defaultVisible: false },
  { id: 'db-id', label: 'DB Id' },
  { id: 'actions', label: 'Actions', locked: true },
]

function formatDate(value: Date) {
  return value.toLocaleDateString('en-US')
}

function amountText(amount: unknown, currencyCode: string) {
  return `${currencyCode} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function buildHref(params: { q?: string; status?: string; page?: string }) {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.status && params.status !== 'all') search.set('status', params.status)
  if (params.page) search.set('page', params.page)
  const query = search.toString()
  return query ? `/bank-deposits?${query}` : '/bank-deposits'
}

export default async function BankDepositsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const query = (params.q ?? '').trim()
  const statusFilter = params.status ?? 'all'
  const where: Prisma.BankDepositWhereInput = {
    ...(query
      ? {
          OR: [
            { depositNumber: { contains: query } },
            { status: { contains: query } },
            { memo: { contains: query } },
            { bankAccount: { name: { contains: query } } },
            { bankAccount: { glAccount: { accountNumber: { contains: query } } } },
            { bankAccount: { glAccount: { name: { contains: query } } } },
            { subsidiary: { subsidiaryId: { contains: query } } },
            { offsetAccount: { is: { accountNumber: { contains: query } } } },
            { offsetAccount: { is: { name: { contains: query } } } },
          ],
        }
      : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  }

  const [totalDeposits, statusRows] = await Promise.all([
    prisma.bankDeposit.count({ where }),
    prisma.bankDeposit.findMany({ select: { status: true }, distinct: ['status'], orderBy: { status: 'asc' } }),
  ])
  const pagination = getPagination(totalDeposits, params.page)
  const deposits = await prisma.bankDeposit.findMany({
    where,
    include: {
      bankAccount: { include: { glAccount: true } },
      currency: true,
      subsidiary: true,
      offsetAccount: true,
    },
    orderBy: [{ depositDate: 'desc' }, { depositNumber: 'desc' }],
    skip: pagination.skip,
    take: pagination.pageSize,
  })
  const statusOptions = ['all', ...statusRows.map((row) => row.status)]

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Bank Deposits</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {totalDeposits} total
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Deposits posted or staged from bank activity and matched cash receipts.
          </p>
        </div>
        <Link
          href="/bank-matching?action=Post%20deposit"
          className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-base font-semibold transition"
          style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}
        >
          Open Matching
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {statusOptions.map((status) => {
          const active = statusFilter === status
          return (
            <Link
              key={status}
              href={buildHref({ q: params.q, status, page: '1' })}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={
                active
                  ? { backgroundColor: 'var(--accent-primary-strong)', color: '#fff' }
                  : { backgroundColor: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--border-muted)' }
              }
            >
              {status === 'all' ? 'All' : status}
            </Link>
          )
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <form className="border-b px-6 py-4" method="get" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="flex flex-nowrap items-center gap-3">
            <input
              type="text"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Search deposit, bank account, subsidiary, offset account"
              className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
            <input type="hidden" name="status" value={statusFilter} />
            <input type="hidden" name="page" value="1" />
            <ExportButton tableId="bank-deposits-list" fileName="bank-deposits" />
            <ColumnSelector tableId="bank-deposits-list" columns={BANK_DEPOSIT_COLUMNS} />
          </div>
        </form>

        <div className="record-list-scroll-region overflow-x-auto" data-column-selector-table="bank-deposits-list">
          <table className="min-w-full" id="bank-deposits-list">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                {BANK_DEPOSIT_COLUMNS.map((column) => (
                  <th key={column.id} data-column={column.id} className="sticky top-0 z-10 px-4 py-2 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--card)' }}>
                    <RecordListHeaderLabel label={column.label} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={BANK_DEPOSIT_COLUMNS.length} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No bank deposits yet.
                  </td>
                </tr>
              ) : (
                deposits.map((deposit, index) => (
                  <tr key={deposit.id} style={index < deposits.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}>
                    <td data-column="deposit-number" className="px-4 py-2 text-sm">
                      <Link href={`/bank-deposits/${deposit.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>{deposit.depositNumber}</Link>
                    </td>
                    <td data-column="date" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(deposit.depositDate)}</td>
                    <td data-column="bank-account" className="px-4 py-2 text-sm">
                      <Link href={`/bank-accounts/${deposit.bankAccountId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>{deposit.bankAccount.name}</Link>
                      <div style={{ color: 'var(--text-muted)' }}>{deposit.bankAccount.glAccount.accountNumber}</div>
                    </td>
                    <td data-column="subsidiary" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{deposit.subsidiary.subsidiaryId}</td>
                    <td data-column="offset-account" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{deposit.offsetAccount ? `${deposit.offsetAccount.accountNumber} - ${deposit.offsetAccount.name}` : '-'}</td>
                    <td data-column="amount" className="px-4 py-2 text-right text-sm font-semibold text-white">{amountText(deposit.amount, deposit.currency.code)}</td>
                    <td data-column="status" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{deposit.status}</td>
                    <td data-column="currency" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{deposit.currency.code}</td>
                    <td data-column="bank-feed" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{deposit.bankFeedTransactionId ?? '-'}</td>
                    <td data-column="journal" className="px-4 py-2 text-sm">{deposit.journalEntryId ? <Link href={`/journals/${deposit.journalEntryId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>Open</Link> : <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                    <td data-column="db-id" className="px-4 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{deposit.id}</td>
                    <td data-column="actions" className="px-4 py-2 text-sm">
                      <Link href={`/bank-deposits/${deposit.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>View</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter
          startRow={pagination.startRow}
          endRow={pagination.endRow}
          total={totalDeposits}
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          hasPrevPage={pagination.hasPrevPage}
          hasNextPage={pagination.hasNextPage}
          prevHref={buildHref({ q: params.q, status: statusFilter, page: String(pagination.currentPage - 1) })}
          nextHref={buildHref({ q: params.q, status: statusFilter, page: String(pagination.currentPage + 1) })}
        />
      </section>
    </div>
  )
}
