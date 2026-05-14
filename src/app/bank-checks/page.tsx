import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import ColumnSelector from '@/components/ColumnSelector'
import ExportButton from '@/components/ExportButton'
import PaginationFooter from '@/components/PaginationFooter'
import { RecordListHeaderLabel } from '@/components/RecordListHeaderLabel'
import { getPagination } from '@/lib/pagination'

const BANK_CHECK_COLUMNS = [
  { id: 'check-transaction-number', label: 'Check Txn Id' },
  { id: 'check-number', label: 'Check #' },
  { id: 'date', label: 'Date' },
  { id: 'payee', label: 'Payee' },
  { id: 'bank-account', label: 'Bank Account' },
  { id: 'bill-payment', label: 'Bill Payment' },
  { id: 'amount', label: 'Amount' },
  { id: 'status', label: 'Status' },
  { id: 'subsidiary', label: 'Subsidiary', defaultVisible: false },
  { id: 'currency', label: 'Currency', defaultVisible: false },
  { id: 'bank-feed', label: 'Bank Feed Txn', defaultVisible: false },
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
  return query ? `/bank-checks?${query}` : '/bank-checks'
}

export default async function BankChecksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const query = (params.q ?? '').trim()
  const statusFilter = params.status ?? 'all'
  const where: Prisma.BankCheckWhereInput = {
    ...(query
      ? {
          OR: [
            { checkTransactionNumber: { contains: query } },
            { checkNumber: { contains: query } },
            { payeeName: { contains: query } },
            { status: { contains: query } },
            { memo: { contains: query } },
            { bankAccount: { name: { contains: query } } },
            { bankAccount: { glAccount: { accountNumber: { contains: query } } } },
            { subsidiary: { subsidiaryId: { contains: query } } },
            { vendor: { is: { vendorNumber: { contains: query } } } },
            { vendor: { is: { name: { contains: query } } } },
            { billPayment: { is: { number: { contains: query } } } },
          ],
        }
      : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  }

  const [totalChecks, statusRows] = await Promise.all([
    prisma.bankCheck.count({ where }),
    prisma.bankCheck.findMany({ select: { status: true }, distinct: ['status'], orderBy: { status: 'asc' } }),
  ])
  const pagination = getPagination(totalChecks, params.page)
  const checks = await prisma.bankCheck.findMany({
    where,
    include: {
      bankAccount: { include: { glAccount: true } },
      currency: true,
      subsidiary: true,
      vendor: true,
      billPayment: true,
    },
    orderBy: [{ checkDate: 'desc' }, { checkTransactionNumber: 'desc' }],
    skip: pagination.skip,
    take: pagination.pageSize,
  })
  const statusOptions = ['all', ...statusRows.map((row) => row.status)]

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Checks</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {totalChecks} total
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Check instruments that should clear through bank matching against bill payments or journal postings.
          </p>
        </div>
        <Link href="/bank-matching?action=Match%20check" className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-base font-semibold transition" style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}>
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
              placeholder="Search check, payee, bank account, vendor, bill payment"
              className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
            <input type="hidden" name="status" value={statusFilter} />
            <input type="hidden" name="page" value="1" />
            <ExportButton tableId="bank-checks-list" fileName="bank-checks" />
            <ColumnSelector tableId="bank-checks-list" columns={BANK_CHECK_COLUMNS} />
          </div>
        </form>

        <div className="record-list-scroll-region overflow-x-auto" data-column-selector-table="bank-checks-list">
          <table className="min-w-full" id="bank-checks-list">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                {BANK_CHECK_COLUMNS.map((column) => (
                  <th key={column.id} data-column={column.id} className="sticky top-0 z-10 px-4 py-2 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--card)' }}>
                    <RecordListHeaderLabel label={column.label} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {checks.length === 0 ? (
                <tr>
                  <td colSpan={BANK_CHECK_COLUMNS.length} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No checks yet.
                  </td>
                </tr>
              ) : (
                checks.map((check, index) => (
                  <tr key={check.id} style={index < checks.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}>
                    <td data-column="check-transaction-number" className="px-4 py-2 text-sm">
                      <Link href={`/bank-checks/${check.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>{check.checkTransactionNumber}</Link>
                    </td>
                    <td data-column="check-number" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{check.checkNumber}</td>
                    <td data-column="date" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(check.checkDate)}</td>
                    <td data-column="payee" className="px-4 py-2 text-sm">
                      <span className="text-white">{check.payeeName}</span>
                      <div style={{ color: 'var(--text-muted)' }}>{check.vendor?.vendorNumber ?? 'Manual payee'}</div>
                    </td>
                    <td data-column="bank-account" className="px-4 py-2 text-sm">
                      <Link href={`/bank-accounts/${check.bankAccountId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>{check.bankAccount.name}</Link>
                      <div style={{ color: 'var(--text-muted)' }}>{check.bankAccount.glAccount.accountNumber}</div>
                    </td>
                    <td data-column="bill-payment" className="px-4 py-2 text-sm">
                      {check.billPayment ? <Link href={`/bill-payments/${check.billPayment.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>{check.billPayment.number}</Link> : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td data-column="amount" className="px-4 py-2 text-right text-sm font-semibold text-white">{amountText(check.amount, check.currency.code)}</td>
                    <td data-column="status" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{check.status}</td>
                    <td data-column="subsidiary" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{check.subsidiary.subsidiaryId}</td>
                    <td data-column="currency" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{check.currency.code}</td>
                    <td data-column="bank-feed" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{check.bankFeedTransactionId ?? '-'}</td>
                    <td data-column="db-id" className="px-4 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{check.id}</td>
                    <td data-column="actions" className="px-4 py-2 text-sm">
                      <Link href={`/bank-checks/${check.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>View</Link>
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
          total={totalChecks}
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
