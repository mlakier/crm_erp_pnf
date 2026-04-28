import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtCurrency, fmtDocumentDate } from '@/lib/format'
import { loadCompanyDisplaySettings } from '@/lib/company-display-settings'
import DeleteButton from '@/components/DeleteButton'
import EditButton from '@/components/EditButton'
import ColumnSelector from '@/components/ColumnSelector'
import ExportButton from '@/components/ExportButton'
import PaginationFooter from '@/components/PaginationFooter'
import { RecordListHeaderLabel } from '@/components/RecordListHeaderLabel'
import { getPagination } from '@/lib/pagination'
import { loadCompanyInformationSettings } from '@/lib/company-information-settings-store'
import { loadCompanyCabinetFiles } from '@/lib/company-file-cabinet-store'
import { loadListValues } from '@/lib/load-list-values'
import { createRecordLabelMapFromValues, formatRecordLabel } from '@/lib/record-status-label'
import { buildMasterDataExportUrl } from '@/lib/master-data-export-url'

const BILL_COLUMNS = [
  { id: 'bill-number', label: 'Bill Id' },
  { id: 'vendor', label: 'Vendor' },
  { id: 'status', label: 'Status' },
  { id: 'total', label: 'Total' },
  { id: 'bill-date', label: 'Bill Date' },
  { id: 'due-date', label: 'Due Date' },
  { id: 'db-id', label: 'DB Id' },
  { id: 'created', label: 'Created' },
  { id: 'last-modified', label: 'Last Modified' },
  { id: 'actions', label: 'Actions', locked: true },
]

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const { moneySettings } = await loadCompanyDisplaySettings()
  const query = (params.q ?? '').trim()
  const statusFilter = params.status ?? 'all'

  const where = {
    ...(query
      ? {
          OR: [
            { number: { contains: query } },
            { status: { contains: query } },
            { vendor: { name: { contains: query } } },
            { notes: { contains: query } },
          ],
        }
      : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  }

  const [totalBills, vendors, totalAmountAgg, companySettings, cabinetFiles, statusValues] = await Promise.all([
    prisma.bill.count({ where }),
    prisma.vendor.findMany({ orderBy: { name: 'asc' }, where: { inactive: false } }),
    prisma.bill.aggregate({ where, _sum: { total: true } }),
    loadCompanyInformationSettings(),
    loadCompanyCabinetFiles(),
    loadListValues('BILL-STATUS'),
  ])

  const statusOptions = ['all', ...statusValues.map((value) => value.toLowerCase())]
  const statusLabelMap = createRecordLabelMapFromValues(statusValues)
  const exportAllUrl = buildMasterDataExportUrl('bills', query, undefined, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  const pagination = getPagination(totalBills, params.page)

  const bills = await prisma.bill.findMany({
    where,
    include: { vendor: true },
    orderBy: [{ createdAt: 'desc' as const }],
    skip: pagination.skip,
    take: pagination.pageSize,
  })

  const buildPageHref = (nextPage: number) => {
    const search = new URLSearchParams()
    if (params.q) search.set('q', params.q)
    if (statusFilter !== 'all') search.set('status', statusFilter)
    search.set('page', String(nextPage))
    return `/bills?${search.toString()}`
  }

  const selectedLogoValue = companySettings.companyLogoPagesFileId
  const companyLogoPages =
    cabinetFiles.find((file) => file.id === selectedLogoValue) ??
    cabinetFiles.find((file) => file.originalName === selectedLogoValue) ??
    cabinetFiles.find((file) => file.storedName === selectedLogoValue) ??
    cabinetFiles.find((file) => file.url === selectedLogoValue) ??
    (!selectedLogoValue ? cabinetFiles[0] : undefined)

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        {companyLogoPages ? <img src={companyLogoPages.url} alt="Company logo" className="h-16 w-auto rounded" /> : null}
        <div>
          <h1 className="text-xl font-semibold text-white">Bills</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {totalBills} total, {fmtCurrency(totalAmountAgg._sum.total ?? 0, undefined, moneySettings)} total payable
          </p>
        </div>
        <Link
          href="/bills/new"
          className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-base font-semibold transition"
          style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}
        >
          <span className="mr-1.5 text-lg leading-none">+</span>
          New Bill
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {statusOptions.map((status) => {
          const active = statusFilter === status
          const href = `/bills?${new URLSearchParams({
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
        <form className="border-b px-6 py-4" method="get" style={{ borderColor: 'var(--border-muted)' }}>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="status" value={statusFilter} />
          <div className="flex gap-3 items-center flex-nowrap">
            <input
              type="text"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Search bill id, vendor, status, notes"
              className="flex-1 min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
            <ExportButton tableId="bills-list" fileName="bills" exportAllUrl={exportAllUrl} />
            <ColumnSelector tableId="bills-list" columns={BILL_COLUMNS} />
          </div>
        </form>

        <div className="record-list-scroll-region overflow-x-auto" data-column-selector-table="bills-list">
          <table className="min-w-full" id="bills-list">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                {BILL_COLUMNS.map((column) => (
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
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No bills found
                  </td>
                </tr>
              ) : (
                bills.map((bill, index) => (
                  <tr key={bill.id} style={index < bills.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}>
                    <td data-column="bill-number" className="px-4 py-2 text-sm">
                      <Link href={`/bills/${bill.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {bill.number}
                      </Link>
                    </td>
                    <td data-column="vendor" className="px-4 py-2 text-sm">
                      <Link href={`/vendors/${bill.vendorId}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {bill.vendor.name}
                      </Link>
                    </td>
                    <td data-column="status" className="px-4 py-2 text-sm">
                      <BillStatusBadge status={bill.status} label={formatRecordLabel(bill.status, statusLabelMap)} />
                    </td>
                    <td data-column="total" className="px-4 py-2 text-sm text-white">
                      {fmtCurrency(bill.total, undefined, moneySettings)}
                    </td>
                    <td data-column="bill-date" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmtDocumentDate(bill.date, moneySettings)}
                    </td>
                    <td data-column="due-date" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {bill.dueDate ? fmtDocumentDate(bill.dueDate, moneySettings) : '-'}
                    </td>
                    <td data-column="db-id" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {bill.id}
                    </td>
                    <td data-column="created" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmtDocumentDate(bill.createdAt, moneySettings)}
                    </td>
                    <td data-column="last-modified" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmtDocumentDate(bill.updatedAt, moneySettings)}
                    </td>
                    <td data-column="actions" className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <EditButton
                          resource="bills"
                          id={bill.id}
                          fields={[
                            {
                              name: 'vendorId',
                              label: 'Vendor',
                              value: bill.vendorId,
                              type: 'select',
                              options: vendors.map((vendor) => ({ value: vendor.id, label: vendor.name })),
                            },
                            { name: 'total', label: 'Total', value: String(bill.total), type: 'number' },
                            { name: 'date', label: 'Bill Date', value: new Date(bill.date).toISOString().split('T')[0], type: 'date' },
                            {
                              name: 'dueDate',
                              label: 'Due Date',
                              value: bill.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : '',
                              type: 'date',
                            },
                            {
                              name: 'status',
                              label: 'Status',
                              value: bill.status,
                              type: 'select',
                              options: [
                                { value: 'received', label: 'Received' },
                                { value: 'pending approval', label: 'Pending Approval' },
                                { value: 'approved', label: 'Approved' },
                                { value: 'paid', label: 'Paid' },
                                { value: 'void', label: 'Void' },
                              ],
                            },
                            { name: 'notes', label: 'Notes', value: bill.notes ?? '' },
                          ]}
                        />
                        <DeleteButton resource="bills" id={bill.id} />
                      </div>
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
          total={totalBills}
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

function BillStatusBadge({ status, label }: { status: string; label: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    received: { bg: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' },
    'pending approval': { bg: 'rgba(245,158,11,0.18)', color: '#f59e0b' },
    approved: { bg: 'rgba(16,185,129,0.18)', color: '#10b981' },
    paid: { bg: 'rgba(34,197,94,0.18)', color: '#86efac' },
    void: { bg: 'rgba(107,114,128,0.18)', color: '#9ca3af' },
  }

  const style = styles[status] ?? { bg: 'rgba(107,114,128,0.18)', color: '#9ca3af' }

  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: style.bg, color: style.color }}>
      {label}
    </span>
  )
}
