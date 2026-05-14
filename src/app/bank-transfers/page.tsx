import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import ColumnSelector from '@/components/ColumnSelector'
import ExportButton from '@/components/ExportButton'
import PaginationFooter from '@/components/PaginationFooter'
import { RecordListHeaderLabel } from '@/components/RecordListHeaderLabel'
import { getPagination } from '@/lib/pagination'

const BANK_TRANSFER_COLUMNS = [
  { id: 'transfer-number', label: 'Transfer Id' },
  { id: 'date', label: 'Date' },
  { id: 'from-bank', label: 'From Bank' },
  { id: 'to-bank', label: 'To Bank' },
  { id: 'subsidiary', label: 'Subsidiary' },
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
  return query ? `/bank-transfers?${query}` : '/bank-transfers'
}

export default async function BankTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const query = (params.q ?? '').trim()
  const statusFilter = params.status ?? 'all'
  const where: Prisma.BankTransferWhereInput = {
    ...(query
      ? {
          OR: [
            { transferNumber: { contains: query } },
            { status: { contains: query } },
            { memo: { contains: query } },
            { fromBankAccount: { name: { contains: query } } },
            { toBankAccount: { is: { name: { contains: query } } } },
            { fromBankAccount: { glAccount: { accountNumber: { contains: query } } } },
            { toBankAccount: { is: { glAccount: { accountNumber: { contains: query } } } } },
            { subsidiary: { subsidiaryId: { contains: query } } },
          ],
        }
      : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  }

  const [totalTransfers, statusRows] = await Promise.all([
    prisma.bankTransfer.count({ where }),
    prisma.bankTransfer.findMany({ select: { status: true }, distinct: ['status'], orderBy: { status: 'asc' } }),
  ])
  const pagination = getPagination(totalTransfers, params.page)
  const transfers = await prisma.bankTransfer.findMany({
    where,
    include: {
      fromBankAccount: { include: { glAccount: true } },
      toBankAccount: { include: { glAccount: true } },
      currency: true,
      subsidiary: true,
    },
    orderBy: [{ transferDate: 'desc' }, { transferNumber: 'desc' }],
    skip: pagination.skip,
    take: pagination.pageSize,
  })
  const statusOptions = ['all', ...statusRows.map((row) => row.status)]

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Bank Transfers</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {totalTransfers} total
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Bank-to-bank movements, including transfer postings and matched bank-feed sides.
          </p>
        </div>
        <Link href="/bank-matching?action=Post%20transfer" className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-base font-semibold transition" style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}>
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
              placeholder="Search transfer, bank account, subsidiary, memo"
              className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
            <input type="hidden" name="status" value={statusFilter} />
            <input type="hidden" name="page" value="1" />
            <ExportButton tableId="bank-transfers-list" fileName="bank-transfers" />
            <ColumnSelector tableId="bank-transfers-list" columns={BANK_TRANSFER_COLUMNS} />
          </div>
        </form>

        <div className="record-list-scroll-region overflow-x-auto" data-column-selector-table="bank-transfers-list">
          <table className="min-w-full" id="bank-transfers-list">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                {BANK_TRANSFER_COLUMNS.map((column) => (
                  <th key={column.id} data-column={column.id} className="sticky top-0 z-10 px-4 py-2 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--card)' }}>
                    <RecordListHeaderLabel label={column.label} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={BANK_TRANSFER_COLUMNS.length} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No bank transfers yet.
                  </td>
                </tr>
              ) : (
                transfers.map((transfer, index) => (
                  <tr key={transfer.id} style={index < transfers.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}>
                    <td data-column="transfer-number" className="px-4 py-2 text-sm">
                      <Link href={`/bank-transfers/${transfer.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>{transfer.transferNumber}</Link>
                    </td>
                    <td data-column="date" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(transfer.transferDate)}</td>
                    <td data-column="from-bank" className="px-4 py-2 text-sm">
                      <Link href={`/bank-accounts/${transfer.fromBankAccountId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>{transfer.fromBankAccount.name}</Link>
                      <div style={{ color: 'var(--text-muted)' }}>{transfer.fromBankAccount.glAccount.accountNumber}</div>
                    </td>
                    <td data-column="to-bank" className="px-4 py-2 text-sm">
                      {transfer.toBankAccount ? (
                        <>
                          <Link href={`/bank-accounts/${transfer.toBankAccount.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>{transfer.toBankAccount.name}</Link>
                          <div style={{ color: 'var(--text-muted)' }}>{transfer.toBankAccount.glAccount.accountNumber}</div>
                        </>
                      ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td data-column="subsidiary" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{transfer.subsidiary.subsidiaryId}</td>
                    <td data-column="amount" className="px-4 py-2 text-right text-sm font-semibold text-white">{amountText(transfer.amount, transfer.currency.code)}</td>
                    <td data-column="status" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{transfer.status}</td>
                    <td data-column="currency" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{transfer.currency.code}</td>
                    <td data-column="bank-feed" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{transfer.bankFeedTransactionId ?? '-'}</td>
                    <td data-column="journal" className="px-4 py-2 text-sm">{transfer.journalEntryId ? <Link href={`/journals/${transfer.journalEntryId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>Open</Link> : <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                    <td data-column="db-id" className="px-4 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{transfer.id}</td>
                    <td data-column="actions" className="px-4 py-2 text-sm">
                      <Link href={`/bank-transfers/${transfer.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>View</Link>
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
          total={totalTransfers}
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
