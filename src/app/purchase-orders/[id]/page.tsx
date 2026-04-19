import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { fmtPhone } from '@/lib/format'
import DeleteButton from '@/components/DeleteButton'
import InlineRecordDetails, { type InlineRecordSection } from '@/components/InlineRecordDetails'
import PurchaseOrderLineItemForm from '@/components/PurchaseOrderLineItemForm'
import PurchaseOrderLineItemsSection from '@/components/PurchaseOrderLineItemsSection'
import PurchaseOrderRelatedDocuments from '@/components/PurchaseOrderRelatedDocuments'
import PurchaseOrderReceiptForm from '@/components/PurchaseOrderReceiptForm'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import { RecordDetailSection } from '@/components/RecordDetailPanels'
import TransactionFieldSummarySection from '@/components/TransactionFieldSummarySection'
import { buildReceiptDisplayNumberMap } from '@/lib/receipt-display-number'

const PURCHASE_ORDER_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default async function PurchaseOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { id } = await params
  const { edit } = await searchParams
  const isEditing = edit === '1'

  const [po, vendors, allReceiptIds] = await Promise.all([
    prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        lineItems: {
          orderBy: { createdAt: 'asc' },
          include: {
            item: {
              select: { itemId: true },
            },
          },
        },
        vendor: true,
        receipts: { orderBy: { date: 'desc' } },
        requisition: true,
        bills: {
          orderBy: { date: 'desc' },
          include: {
            billPayments: {
              orderBy: { date: 'desc' },
            },
          },
        },
      },
    }),
    prisma.vendor.findMany({
      orderBy: { vendorNumber: 'asc' },
      select: { id: true, vendorNumber: true, name: true },
    }),
    prisma.receipt.findMany({
      select: { id: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    }),
  ])

  if (!po) notFound()

  const orderedQuantity = po.lineItems.reduce((sum, item) => sum + item.quantity, 0)
  const receivedQuantity = po.receipts.reduce((sum, receipt) => sum + receipt.quantity, 0)
  const openQuantity = Math.max(orderedQuantity - receivedQuantity, 0)
  const detailHref = `/purchase-orders/${po.id}`
  const receiptNumberMap = buildReceiptDisplayNumberMap(allReceiptIds)
  const derivedLineRows = po.lineItems.reduce<Array<{
    id: string
    itemId: string | null
    description: string
    quantity: number
    receivedQuantity: number
    openQuantity: number
    unitPrice: number
    lineTotal: number
  }>>((acc, item) => {
    const allocatedReceived = acc.reduce((sum, row) => sum + row.receivedQuantity, 0)
    const remainingReceived = Math.max(0, receivedQuantity - allocatedReceived)
    const lineReceivedQuantity = Math.min(item.quantity, remainingReceived)

    acc.push({
      id: item.id,
      itemId: item.item?.itemId ?? null,
      description: item.description,
      quantity: item.quantity,
      receivedQuantity: lineReceivedQuantity,
      openQuantity: Math.max(0, item.quantity - lineReceivedQuantity),
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })

    return acc
  }, [])

  const detailSections: InlineRecordSection[] = [
    {
      title: 'Purchase Order Details',
      description: 'Core purchase order fields and procurement lifecycle status.',
      fields: [
        {
          name: 'number',
          label: 'Purchase Order #',
          value: po.number,
          helpText: 'Unique document number used to identify the purchase order across procurement workflows and reporting.',
          column: 1,
          order: 0,
        },
        {
          name: 'vendorId',
          label: 'Vendor',
          value: po.vendorId,
          type: 'select',
          options: vendors.map((vendor) => ({
            value: vendor.id,
            label: `${vendor.vendorNumber} - ${vendor.name}`,
          })),
          helpText: 'Vendor record linked to this purchase order.',
          sourceText: 'Vendors master data',
          column: 2,
          order: 0,
        },
        {
          name: 'status',
          label: 'Status',
          value: po.status ?? '',
          type: 'select',
          options: PURCHASE_ORDER_STATUS_OPTIONS,
          helpText: 'Current lifecycle stage of the purchase order.',
          sourceText: 'System purchase order statuses',
          column: 1,
          order: 1,
        },
        {
          name: 'total',
          label: 'Total',
          value: po.total.toString(),
          type: 'number',
          helpText: 'Current document total based on all purchase order line amounts.',
          column: 2,
          order: 1,
        },
      ],
    },
  ]

  return (
    <RecordDetailPageShell
      backHref="/purchase-orders"
      backLabel="<- Back to Purchase Orders"
      meta={po.number}
      title={po.vendor.name}
      badge={
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={po.status} />
          <span
            className="inline-block rounded-full px-3 py-0.5 text-sm"
            style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}
          >
            Purchase Order
          </span>
        </div>
      }
      widthClassName="max-w-4xl"
      actions={
        <>
          {!isEditing ? (
            <Link
              href={`${detailHref}?edit=1`}
              className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: 'var(--accent-primary-strong)' }}
            >
              Edit
            </Link>
          ) : null}
          {isEditing ? <DeleteButton resource="purchase-orders" id={po.id} /> : null}
        </>
      }
    >
      <InlineRecordDetails
        resource="purchase-orders"
        id={po.id}
        title="Purchase Order Details"
        sections={detailSections}
        editing={isEditing}
        columns={2}
      />

      <TransactionFieldSummarySection
        title="Vendor"
        count={4}
        fields={[
          {
            label: 'Vendor #',
            value: po.vendor.vendorNumber ?? '-',
            helpText: 'Internal vendor identifier from the vendor master record.',
            fieldId: 'vendor.vendorNumber',
            fieldType: 'text',
          },
          {
            label: 'Email',
            value: po.vendor.email ?? '-',
            helpText: 'Primary email address for the linked vendor.',
            fieldId: 'vendor.email',
            fieldType: 'email',
          },
          {
            label: 'Phone',
            value: fmtPhone(po.vendor.phone),
            helpText: 'Primary phone number for the linked vendor.',
            fieldId: 'vendor.phone',
            fieldType: 'text',
          },
          {
            label: 'Tax ID',
            value: po.vendor.taxId ?? '-',
            helpText: 'Tax registration or identification number stored on the vendor record.',
            fieldId: 'vendor.taxId',
            fieldType: 'text',
          },
        ]}
      />

      <TransactionFieldSummarySection
        title="Receiving Summary"
        count={4}
        fields={[
          {
            label: 'Ordered Quantity',
            value: String(orderedQuantity),
            helpText: 'Sum of quantities across all purchase order lines.',
            fieldId: 'orderedQuantity',
            fieldType: 'number',
          },
          {
            label: 'Received Quantity',
            value: String(receivedQuantity),
            helpText: 'Total quantity already received against this purchase order.',
            fieldId: 'receivedQuantity',
            fieldType: 'number',
          },
          {
            label: 'Open Quantity',
            value: String(openQuantity),
            helpText: 'Remaining quantity still expected to be received.',
            fieldId: 'openQuantity',
            fieldType: 'number',
          },
          {
            label: 'Created',
            value: new Date(po.createdAt).toLocaleDateString(),
            helpText: 'Date the purchase order record was created.',
            fieldId: 'createdAt',
            fieldType: 'date',
          },
        ]}
      />

      <PurchaseOrderLineItemsSection
        editing={isEditing}
        rows={derivedLineRows}
      />

      <PurchaseOrderRelatedDocuments
        requisitions={
          po.requisition
            ? [
                {
                  id: po.requisition.id,
                  number: po.requisition.number,
                  status: po.requisition.status,
                  total: po.requisition.total,
                  title: po.requisition.title ?? null,
                  priority: po.requisition.priority ?? null,
                  createdAt: po.requisition.createdAt.toISOString(),
                },
              ]
            : []
        }
        receipts={po.receipts.map((receipt) => ({
          id: receipt.id,
          number: receiptNumberMap.get(receipt.id) ?? receipt.id,
          date: receipt.date.toISOString(),
          status: receipt.status,
          quantity: receipt.quantity,
          createdAt: receipt.createdAt.toISOString(),
          notes: receipt.notes ?? null,
        }))}
        bills={po.bills.map((bill) => ({
          id: bill.id,
          number: bill.number,
          status: bill.status,
          total: bill.total,
          date: bill.date.toISOString(),
          dueDate: bill.dueDate ? bill.dueDate.toISOString() : null,
          notes: bill.notes ?? null,
        }))}
        billPayments={po.bills.flatMap((bill) =>
          bill.billPayments.map((payment) => ({
            id: payment.id,
            number: payment.number,
            amount: payment.amount,
            date: payment.date.toISOString(),
            method: payment.method ?? null,
            status: payment.status,
            billNumber: bill.number,
            reference: payment.reference ?? null,
          }))
        )}
      />

      {isEditing ? (
        <RecordDetailSection title="Add Activity" count={2}>
          <div className="grid gap-4 px-6 py-6 lg:grid-cols-2">
            <PurchaseOrderLineItemForm purchaseOrderId={po.id} userId={po.userId} />
            <PurchaseOrderReceiptForm purchaseOrderId={po.id} userId={po.userId} />
          </div>
        </RecordDetailSection>
      ) : null}
    </RecordDetailPageShell>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    received: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  const key = (status ?? '').toLowerCase()
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-sm font-medium ${colors[key] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {status ?? 'Unknown'}
    </span>
  )
}
