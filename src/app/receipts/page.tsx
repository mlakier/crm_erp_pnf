import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtDocumentDate } from '@/lib/format'
import DeleteButton from '@/components/DeleteButton'
import EditButton from '@/components/EditButton'
import ColumnSelector from '@/components/ColumnSelector'
import ExportButton from '@/components/ExportButton'
import PaginationFooter from '@/components/PaginationFooter'
import { getPagination } from '@/lib/pagination'
import { loadListValues } from '@/lib/load-list-values'
import { loadCompanyInformationSettings } from '@/lib/company-information-settings-store'
import { loadCompanyCabinetFiles } from '@/lib/company-file-cabinet-store'
import { buildReceiptDisplayNumberMap } from '@/lib/receipt-display-number'
import { RecordListHeaderLabel } from '@/components/RecordListHeaderLabel'
import { loadCompanyDisplaySettings } from '@/lib/company-display-settings'
import { createRecordLabelMapFromValues, formatRecordLabel } from '@/lib/record-status-label'
import { buildMasterDataExportUrl } from '@/lib/master-data-export-url'

const RECEIPT_COLUMNS = [
  { id: 'receipt-number', label: 'Receipt Id' },
  { id: 'purchase-order', label: 'Purchase Order' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'date', label: 'Date' },
  { id: 'status', label: 'Status' },
  { id: 'notes', label: 'Notes' },
  { id: 'db-id', label: 'DB Id' },
  { id: 'created', label: 'Created' },
  { id: 'last-modified', label: 'Last Modified' },
  { id: 'actions', label: 'Actions', locked: true },
]

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}) {
  const params = await searchParams
  const { moneySettings } = await loadCompanyDisplaySettings()
  const statusFilter = params.status ?? 'all'
  const query = (params.q ?? '').trim()

  const statusValues = await loadListValues('RECEIPT-STATUS')
  const statusOptions = ['all', ...statusValues.map((value) => value.toLowerCase())]
  const statusLabelMap = createRecordLabelMapFromValues(statusValues)
  const exportAllUrl = buildMasterDataExportUrl('receipts', query, undefined, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  const where = {
    ...(query
      ? {
          OR: [
            { status: { contains: query } },
            { notes: { contains: query } },
            { purchaseOrder: { number: { contains: query } } },
            { id: { contains: query } },
          ],
        }
      : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  }

  const totalReceipts = await prisma.receipt.count({ where })
  const pagination = getPagination(totalReceipts, params.page)

  const receipts = await prisma.receipt.findMany({
    where,
    include: { purchaseOrder: true },
    orderBy: [{ createdAt: 'desc' as const }],
    skip: pagination.skip,
    take: pagination.pageSize,
  })
  const allReceiptIds = await prisma.receipt.findMany({
    select: { id: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  const receiptNumberMap = buildReceiptDisplayNumberMap(allReceiptIds)

  const buildPageHref = (nextPage: number) => {
    const search = new URLSearchParams()
    if (params.q) search.set('q', params.q)
    if (statusFilter !== 'all') search.set('status', statusFilter)
    search.set('page', String(nextPage))
    return `/receipts?${search.toString()}`
  }

  const settings = await loadCompanyInformationSettings()
  const logoFileId = settings.companyLogoPagesFileId
  const cabinetFiles = await loadCompanyCabinetFiles()
  const companyLogoPages = logoFileId ? cabinetFiles.find((file) => file.id === logoFileId) : null

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        {companyLogoPages ? (
          <Image src={companyLogoPages.url} alt="Company logo" width={160} height={64} className="h-16 w-auto rounded" unoptimized />
        ) : null}
        <div>
          <h1 className="text-xl font-semibold text-white">Receipts</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {totalReceipts} total
          </p>
        </div>
        <Link
          href="/receipts/new"
          className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-base font-semibold transition"
          style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}
        >
          <span className="mr-1.5 text-lg leading-none">+</span>
          New Receipt
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {statusOptions.map((status) => {
          const active = statusFilter === status
          const href = `/receipts?${new URLSearchParams({
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
          <div className="flex items-center gap-3 flex-nowrap">
            <input
              type="text"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Search receipt id, purchase order id, status, notes"
              className="flex-1 min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
            <ExportButton tableId="receipts-list" fileName="receipts" exportAllUrl={exportAllUrl} />
            <ColumnSelector tableId="receipts-list" columns={RECEIPT_COLUMNS} />
          </div>
        </form>

        <div className="record-list-scroll-region overflow-x-auto" data-column-selector-table="receipts-list">
          <table className="min-w-full" id="receipts-list">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                {RECEIPT_COLUMNS.map((column) => (
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
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No receipts found.
                  </td>
                </tr>
              ) : (
                receipts.map((receipt, index) => (
                  <tr
                    key={receipt.id}
                    style={index < receipts.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}
                  >
                    <td data-column="receipt-number" className="px-4 py-2 text-sm">
                      <Link
                        href={`/receipts/${receipt.id}`}
                        className="font-medium hover:underline"
                        style={{ color: 'var(--accent-primary-strong)' }}
                      >
                        {receiptNumberMap.get(receipt.id) ?? receipt.id}
                      </Link>
                    </td>
                    <td data-column="purchase-order" className="px-4 py-2 text-sm">
                      <Link
                        href={`/purchase-orders/${receipt.purchaseOrderId}`}
                        className="font-medium hover:underline"
                        style={{ color: 'var(--accent-primary-strong)' }}
                      >
                        {receipt.purchaseOrder.number}
                      </Link>
                    </td>
                    <td data-column="quantity" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {receipt.quantity}
                    </td>
                    <td data-column="date" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmtDocumentDate(receipt.date, moneySettings)}
                    </td>
                    <td data-column="status" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {formatRecordLabel(receipt.status, statusLabelMap)}
                    </td>
                    <td data-column="notes" className="max-w-[200px] truncate px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {receipt.notes ?? '-'}
                    </td>
                    <td data-column="db-id" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {receipt.id}
                    </td>
                    <td data-column="created" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmtDocumentDate(receipt.createdAt, moneySettings)}
                    </td>
                    <td data-column="last-modified" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmtDocumentDate(receipt.updatedAt, moneySettings)}
                    </td>
                    <td data-column="actions" className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <EditButton
                          resource="receipts"
                          id={receipt.id}
                          fields={[
                            { name: 'quantity', label: 'Quantity', value: String(receipt.quantity), type: 'number' },
                            { name: 'date', label: 'Date', value: new Date(receipt.date).toISOString().split('T')[0], type: 'date' },
                            {
                              name: 'status',
                              label: 'Status',
                              value: receipt.status,
                              type: 'select',
                              options: statusValues.map((value) => ({ value: value.toLowerCase(), label: value })),
                            },
                            { name: 'notes', label: 'Notes', value: receipt.notes ?? '' },
                          ]}
                        />
                        <DeleteButton resource="receipts" id={receipt.id} />
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
          total={totalReceipts}
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
