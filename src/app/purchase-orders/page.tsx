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

const PURCHASE_ORDER_COLUMNS = [
  { id: 'number', label: 'Purchase Order Id' },
  { id: 'vendor', label: 'Vendor' },
  { id: 'status', label: 'Status' },
  { id: 'total', label: 'Total' },
  { id: 'subsidiary', label: 'Subsidiary' },
  { id: 'currency', label: 'Currency' },
  { id: 'requisition', label: 'Requisition' },
  { id: 'db-id', label: 'DB Id' },
  { id: 'created', label: 'Created' },
  { id: 'last-modified', label: 'Last Modified' },
  { id: 'actions', label: 'Actions', locked: true },
]

export default async function PurchaseOrdersPage({
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
            { requisition: { number: { contains: query } } },
          ],
        }
      : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  }

  const [totalPurchaseOrders, totalSpendAgg, companySettings, cabinetFiles, statusValues] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.aggregate({ where, _sum: { total: true } }),
    loadCompanyInformationSettings(),
    loadCompanyCabinetFiles(),
    loadListValues('PO-STATUS'),
  ])

  const statusOptions = ['all', ...statusValues.map((value) => value.toLowerCase())]
  const statusLabelMap = createRecordLabelMapFromValues(statusValues)
  const exportAllUrl = buildMasterDataExportUrl('purchase-orders', query, undefined, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  const pagination = getPagination(totalPurchaseOrders, params.page)

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where,
    include: { vendor: true, subsidiary: true, currency: true, requisition: true },
    orderBy: [{ createdAt: 'desc' as const }],
    skip: pagination.skip,
    take: pagination.pageSize,
  })

  const totalSpend = totalSpendAgg._sum.total ?? 0

  const buildPageHref = (nextPage: number) => {
    const search = new URLSearchParams()
    if (params.q) search.set('q', params.q)
    if (statusFilter !== 'all') search.set('status', statusFilter)
    search.set('page', String(nextPage))
    return `/purchase-orders?${search.toString()}`
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
          <h1 className="text-xl font-semibold text-white">Purchase Orders</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Track procurement orders, status, and supplier relationships.
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {totalPurchaseOrders} orders, {fmtCurrency(totalSpend, undefined, moneySettings)} total spend
          </p>
        </div>
        <Link
          href="/purchase-orders/new"
          className="inline-flex items-center rounded-lg px-3.5 py-1.5 text-base font-semibold transition"
          style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}
        >
          <span className="mr-1.5 text-lg leading-none">+</span>
          New Purchase Order
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {statusOptions.map((status) => {
          const active = statusFilter === status
          const href = `/purchase-orders?${new URLSearchParams({
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
              placeholder="Search purchase order id, vendor, requisition, status"
              className="flex-1 min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
            <ExportButton tableId="purchase-orders-list" fileName="purchase-orders" exportAllUrl={exportAllUrl} />
            <ColumnSelector tableId="purchase-orders-list" columns={PURCHASE_ORDER_COLUMNS} />
          </div>
        </form>

        <div className="record-list-scroll-region overflow-x-auto" data-column-selector-table="purchase-orders-list">
          <table className="min-w-full" id="purchase-orders-list">
            <thead>
              <tr>
                {PURCHASE_ORDER_COLUMNS.map((column) => (
                  <th
                    key={column.id}
                    data-column={column.id}
                    className="sticky top-0 z-10 px-4 py-2 text-left text-xs font-medium uppercase tracking-wide"
                    style={{
                      color: 'var(--text-muted)',
                      borderBottom: '1px solid var(--border-muted)',
                      backgroundColor: 'var(--card)',
                    }}
                  >
                    <RecordListHeaderLabel label={column.label} tooltip={'tooltip' in column ? column.tooltip : undefined} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((purchaseOrder, index) => (
                  <tr
                    key={purchaseOrder.id}
                    style={index < purchaseOrders.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}
                  >
                    <td data-column="number" className="px-4 py-2 text-sm">
                      <Link
                        href={`/purchase-orders/${purchaseOrder.id}`}
                        className="font-medium hover:underline"
                        style={{ color: 'var(--accent-primary-strong)' }}
                      >
                        {purchaseOrder.number}
                      </Link>
                    </td>
                    <td data-column="vendor" className="px-4 py-2 text-sm">
                      <Link
                        href={`/vendors/${purchaseOrder.vendorId}`}
                        className="hover:underline"
                        style={{ color: 'var(--accent-primary-strong)' }}
                      >
                        {purchaseOrder.vendor.name}
                      </Link>
                    </td>
                    <td data-column="status" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {formatRecordLabel(purchaseOrder.status, statusLabelMap)}
                    </td>
                    <td data-column="total" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmtCurrency(purchaseOrder.total, undefined, moneySettings)}
                    </td>
                    <td data-column="subsidiary" className="px-4 py-2 text-sm">
                      {purchaseOrder.subsidiary && purchaseOrder.subsidiaryId ? (
                        <Link
                          href={`/subsidiaries/${purchaseOrder.subsidiaryId}`}
                          className="hover:underline"
                          style={{ color: 'var(--accent-primary-strong)' }}
                        >
                          {purchaseOrder.subsidiary.name}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>-</span>
                      )}
                    </td>
                    <td data-column="currency" className="px-4 py-2 text-sm">
                      {purchaseOrder.currency && purchaseOrder.currencyId ? (
                        <Link
                          href={`/currencies/${purchaseOrder.currencyId}`}
                          className="hover:underline"
                          style={{ color: 'var(--accent-primary-strong)' }}
                        >
                          {purchaseOrder.currency.code}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>-</span>
                      )}
                    </td>
                    <td data-column="requisition" className="px-4 py-2 text-sm">
                      {purchaseOrder.requisition && purchaseOrder.requisitionId ? (
                        <Link
                          href={`/purchase-requisitions/${purchaseOrder.requisitionId}`}
                          className="hover:underline"
                          style={{ color: 'var(--accent-primary-strong)' }}
                        >
                          {purchaseOrder.requisition.number}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>-</span>
                      )}
                    </td>
                    <td data-column="db-id" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {purchaseOrder.id}
                    </td>
                    <td data-column="created" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmtDocumentDate(purchaseOrder.createdAt, moneySettings)}
                    </td>
                    <td data-column="last-modified" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmtDocumentDate(purchaseOrder.updatedAt, moneySettings)}
                    </td>
                    <td data-column="actions" className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <EditButton
                          resource="purchase-orders"
                          id={purchaseOrder.id}
                          fields={[
                            {
                              name: 'status',
                              label: 'Status',
                              value: purchaseOrder.status ?? '',
                              type: 'select',
                              options: statusValues.map((value) => ({ value: value.toLowerCase(), label: value })),
                            },
                            { name: 'total', label: 'Total', value: purchaseOrder.total?.toString() ?? '', type: 'number' },
                          ]}
                        />
                        <DeleteButton resource="purchase-orders" id={purchaseOrder.id} />
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
          total={totalPurchaseOrders}
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
