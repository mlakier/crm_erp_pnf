import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { fmtCurrency, fmtDocumentDate } from '@/lib/format'
import { loadCompanyDisplaySettings } from '@/lib/company-display-settings'
import ColumnSelector from '@/components/ColumnSelector'
import ExportButton from '@/components/ExportButton'
import PaginationFooter from '@/components/PaginationFooter'
import EditButton from '@/components/EditButton'
import DeleteButton from '@/components/DeleteButton'
import { RecordListHeaderLabel } from '@/components/RecordListHeaderLabel'
import { getPagination } from '@/lib/pagination'
import { loadCompanyInformationSettings } from '@/lib/company-information-settings-store'
import { loadCompanyCabinetFiles } from '@/lib/company-file-cabinet-store'
import { loadListValues } from '@/lib/load-list-values'
import { createRecordLabelMapFromValues, formatRecordLabel } from '@/lib/record-status-label'
import { buildMasterDataExportUrl } from '@/lib/master-data-export-url'

const BP_COLUMNS = [
  { id: 'number', label: 'Bill Payment Id' },
  { id: 'bill', label: 'Bill' },
  { id: 'vendor', label: 'Vendor' },
  { id: 'amount', label: 'Amount' },
  { id: 'date', label: 'Date' },
  { id: 'method', label: 'Method' },
  { id: 'reference', label: 'Reference' },
  { id: 'status', label: 'Status' },
  { id: 'notes', label: 'Notes' },
  { id: 'db-id', label: 'DB Id' },
  { id: 'created', label: 'Created' },
  { id: 'last-modified', label: 'Last Modified' },
  { id: 'actions', label: 'Actions', locked: true },
]

export default async function BillPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const { moneySettings } = await loadCompanyDisplaySettings()
  const query = (params.q ?? '').trim()
  const statusFilter = params.status ?? 'all'
  const where: Prisma.BillPaymentWhereInput = {
    ...(query
      ? {
          OR: [
            { number: { contains: query } },
            { status: { contains: query } },
            { reference: { contains: query } },
            { bill: { number: { contains: query } } },
          ],
        }
      : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  }

  const [totalRows, companySettings, cabinetFiles, statusValues] = await Promise.all([
    prisma.billPayment.count({ where }),
    loadCompanyInformationSettings(),
    loadCompanyCabinetFiles(),
    loadListValues('BILL-PAYMENT-STATUS'),
  ])
  const statusOptions = ['all', ...statusValues.map((value) => value.toLowerCase())]
  const statusLabelMap = createRecordLabelMapFromValues(statusValues)
  const exportAllUrl = buildMasterDataExportUrl('bill-payments', query, undefined, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })
  const editStatusOptions = statusValues.map((value) => ({ value: value.toLowerCase(), label: value }))

  const pagination = getPagination(totalRows, params.page)
  const rows = await prisma.billPayment.findMany({
    where,
    include: { bill: { include: { vendor: true } } },
    orderBy: [{ createdAt: 'desc' as const }],
    skip: pagination.skip,
    take: pagination.pageSize,
  })

  const buildPageHref = (page: number) => {
    const search = new URLSearchParams()
    if (params.q) search.set('q', params.q)
    if (statusFilter !== 'all') search.set('status', statusFilter)
    search.set('page', String(page))
    return `/bill-payments?${search.toString()}`
  }

  const selectedLogoValue = companySettings.companyLogoPagesFileId
  const companyLogoPages =
    cabinetFiles.find((file) => file.id === selectedLogoValue) ??
    cabinetFiles.find((file) => file.originalName === selectedLogoValue) ??
    cabinetFiles.find((file) => file.storedName === selectedLogoValue) ??
    (!selectedLogoValue ? cabinetFiles[0] : undefined)

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        {companyLogoPages ? <img src={companyLogoPages.url} alt="Company logo" className="h-16 w-auto rounded" /> : null}
        <div>
          <h1 className="text-xl font-semibold text-white">Bill Payments</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {totalRows} total
          </p>
        </div>
        <Link
          href="/bill-payments/new"
          className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-base font-semibold transition"
          style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}
        >
          <span className="mr-1.5 text-lg leading-none">+</span>
          New Bill Payment
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {statusOptions.map((status) => {
          const active = statusFilter === status
          const href = `/bill-payments?${new URLSearchParams({
            ...(params.q ? { q: params.q } : {}),
            status,
            page: '1',
          }).toString()}`
          return (
            <Link
              key={status}
              href={href}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={
                active
                  ? { backgroundColor: 'var(--accent-primary-strong)', color: '#fff' }
                  : {
                      backgroundColor: 'var(--card)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-muted)',
                    }
              }
            >
              {status === 'all' ? 'All' : formatRecordLabel(status, statusLabelMap)}
            </Link>
          )
        })}
      </div>

      <section
        className="overflow-hidden rounded-2xl border"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
      >
        <form
          className="border-b px-6 py-4"
          method="get"
          data-disable-live-search="true"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="status" value={statusFilter} />
          <div className="flex gap-3 items-center flex-nowrap">
            <input
              type="text"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Search bill payment id, bill, status, reference"
              className="flex-1 min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
            <ExportButton tableId="bill-payments-list" fileName="bill-payments" exportAllUrl={exportAllUrl} />
            <ColumnSelector tableId="bill-payments-list" columns={BP_COLUMNS} enableReordering={false} />
          </div>
        </form>

        <div className="record-list-scroll-region overflow-x-auto" data-column-selector-table="bill-payments-list">
          <table className="min-w-full" id="bill-payments-list" data-disable-filter-sort="true">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                {BP_COLUMNS.map((column) => (
                  <th
                    key={column.id}
                    data-column={column.id}
                    className="sticky top-0 z-10 px-4 py-2 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)', backgroundColor: 'var(--card)' }}
                  >
                    <RecordListHeaderLabel label={column.label} tooltip={'tooltip' in column ? column.tooltip : undefined} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No bill payments yet.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} style={index < rows.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}>
                    <td data-column="number" className="px-4 py-2 text-sm">
                      <Link href={`/bill-payments/${row.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {row.number}
                      </Link>
                    </td>
                    <td data-column="bill" className="px-4 py-2 text-sm">
                      {row.bill ? (
                        <Link href={`/bills/${row.billId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                          {row.bill.number}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>-</span>
                      )}
                    </td>
                    <td data-column="vendor" className="px-4 py-2 text-sm">
                      {row.bill?.vendor ? (
                        <Link href={`/vendors/${row.bill.vendorId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                          {row.bill.vendor.name}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>-</span>
                      )}
                    </td>
                    <td data-column="amount" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmtCurrency(row.amount, undefined, moneySettings)}
                    </td>
                    <td data-column="date" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmtDocumentDate(row.date, moneySettings)}
                    </td>
                    <td data-column="method" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {row.method ?? '-'}
                    </td>
                    <td data-column="reference" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {row.reference ?? '-'}
                    </td>
                    <td data-column="status" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {formatRecordLabel(row.status, statusLabelMap)}
                    </td>
                    <td data-column="notes" className="max-w-[200px] truncate px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {row.notes ?? '-'}
                    </td>
                    <td data-column="db-id" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {row.id}
                    </td>
                    <td data-column="created" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmtDocumentDate(row.createdAt, moneySettings)}
                    </td>
                    <td data-column="last-modified" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmtDocumentDate(row.updatedAt, moneySettings)}
                    </td>
                    <td data-column="actions" className="px-4 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <EditButton
                          id={row.id}
                          endpoint="/api/bill-payments"
                          fields={[
                            { name: 'status', label: 'Status', type: 'select', value: row.status, options: editStatusOptions },
                            { name: 'amount', label: 'Amount', type: 'number', value: String(row.amount) },
                            { name: 'notes', label: 'Notes', type: 'text', value: row.notes ?? '' },
                          ]}
                        />
                        <DeleteButton id={row.id} endpoint="/api/bill-payments" label={row.number} />
                      </span>
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
          total={totalRows}
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          hasPrevPage={pagination.hasPrevPage}
          hasNextPage={pagination.hasNextPage}
          prevHref={buildPageHref(pagination.currentPage - 1)}
          nextHref={buildPageHref(pagination.currentPage + 1)}
        />
      </section>
    </div>
  )
}
