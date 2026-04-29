'use client'

import Link from 'next/link'
import { fmtCurrency, fmtDocumentDate } from '@/lib/format'
import TransactionRelatedDocumentsTabs, {
  RelatedDocumentsStatusBadge,
} from '@/components/TransactionRelatedDocumentsTabs'

type PurchaseOrderDoc = {
  id: string
  number: string
  status: string
  total: number
  createdAt: string
}

type PurchaseRequisitionDoc = {
  id: string
  number: string
  status: string
  total: number
  priority: string | null
  title: string | null
  createdAt: string
}

type BillDoc = {
  id: string
  number: string
  status: string
  total: number
  date: string
  dueDate: string | null
}

type ReceiptDoc = {
  id: string
  number: string
  date: string
  status: string
  quantity: number
  notes: string | null
  purchaseOrderNumber: string
}

type BillPaymentDoc = {
  id: string
  number: string
  amount: number
  date: string
  method: string | null
  reference: string | null
  status: string
  billNumber: string
}

export default function VendorRelatedDocuments({
  purchaseRequisitions,
  purchaseOrders,
  receipts,
  bills,
  billPayments,
  embedded = false,
  showDisplayControl = true,
}: {
  purchaseRequisitions: PurchaseRequisitionDoc[]
  purchaseOrders: PurchaseOrderDoc[]
  receipts: ReceiptDoc[]
  bills: BillDoc[]
  billPayments: BillPaymentDoc[]
  embedded?: boolean
  showDisplayControl?: boolean
}) {
  return (
    <TransactionRelatedDocumentsTabs
      embedded={embedded}
      showDisplayControl={showDisplayControl}
      defaultActiveKey="purchase-requisitions"
      tabs={[
        {
          key: 'purchase-requisitions',
          label: 'Purchase Requisitions',
          count: purchaseRequisitions.length,
          tone: 'upstream',
          emptyMessage: 'No purchase requisitions are linked to this vendor yet.',
          headers: ['Txn ID', 'Status', 'Total', 'Created', 'Priority', 'Title'],
          rows: purchaseRequisitions.map((requisition) => ({
            id: requisition.id,
            cells: [
              <Link key="link" href={`/purchase-requisitions/${requisition.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                {requisition.number}
              </Link>,
              <RelatedDocumentsStatusBadge key="status" status={requisition.status} />,
              fmtCurrency(requisition.total),
              fmtDocumentDate(requisition.createdAt),
              requisition.priority ? requisition.priority.charAt(0).toUpperCase() + requisition.priority.slice(1) : '-',
              requisition.title ?? '-',
            ],
            filterValues: [
              requisition.number,
              requisition.status,
              fmtCurrency(requisition.total),
              fmtDocumentDate(requisition.createdAt),
              requisition.priority ?? '-',
              requisition.title ?? '-',
            ],
          })),
        },
        {
          key: 'purchase-orders',
          label: 'Purchase Orders',
          count: purchaseOrders.length,
          tone: 'upstream',
          emptyMessage: 'No purchase orders are linked to this vendor yet.',
          headers: ['Txn ID', 'Status', 'Total', 'Created'],
          rows: purchaseOrders.map((purchaseOrder) => ({
            id: purchaseOrder.id,
            cells: [
              <Link key="link" href={`/purchase-orders/${purchaseOrder.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                {purchaseOrder.number}
              </Link>,
              <RelatedDocumentsStatusBadge key="status" status={purchaseOrder.status} />,
              fmtCurrency(purchaseOrder.total),
              fmtDocumentDate(purchaseOrder.createdAt),
            ],
            filterValues: [
              purchaseOrder.number,
              purchaseOrder.status,
              fmtCurrency(purchaseOrder.total),
              fmtDocumentDate(purchaseOrder.createdAt),
            ],
          })),
        },
        {
          key: 'receipts',
          label: 'Receipts',
          count: receipts.length,
          tone: 'downstream',
          emptyMessage: 'No receipts are linked to this vendor yet.',
          headers: ['Txn ID', 'Status', 'Date', 'Qty', 'Purchase Order', 'Notes'],
          rows: receipts.map((receipt) => ({
            id: receipt.id,
            cells: [
              <Link key="link" href={`/receipts/${receipt.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                {receipt.number}
              </Link>,
              <RelatedDocumentsStatusBadge key="status" status={receipt.status} />,
              fmtDocumentDate(receipt.date),
              receipt.quantity,
              receipt.purchaseOrderNumber,
              receipt.notes ?? '-',
            ],
            filterValues: [
              receipt.number,
              receipt.status,
              fmtDocumentDate(receipt.date),
              String(receipt.quantity),
              receipt.purchaseOrderNumber,
              receipt.notes ?? '-',
            ],
          })),
        },
        {
          key: 'bills',
          label: 'Bills',
          count: bills.length,
          tone: 'downstream',
          emptyMessage: 'No bills are linked to this vendor yet.',
          headers: ['Txn ID', 'Status', 'Total', 'Bill Date', 'Due Date'],
          rows: bills.map((bill) => ({
            id: bill.id,
            cells: [
              <Link key="link" href={`/bills/${bill.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                {bill.number}
              </Link>,
              <RelatedDocumentsStatusBadge key="status" status={bill.status} />,
              fmtCurrency(bill.total),
              fmtDocumentDate(bill.date),
              bill.dueDate ? fmtDocumentDate(bill.dueDate) : '-',
            ],
            filterValues: [
              bill.number,
              bill.status,
              fmtCurrency(bill.total),
              fmtDocumentDate(bill.date),
              bill.dueDate ? fmtDocumentDate(bill.dueDate) : '-',
            ],
          })),
        },
        {
          key: 'bill-payments',
          label: 'Bill Payments',
          count: billPayments.length,
          tone: 'downstream',
          emptyMessage: 'No bill payments are linked to this vendor yet.',
          headers: ['Txn ID', 'Status', 'Amount', 'Date', 'Bill', 'Method', 'Reference'],
          rows: billPayments.map((payment) => ({
            id: payment.id,
            cells: [
              <Link key="link" href={`/bill-payments/${payment.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                {payment.number}
              </Link>,
              <RelatedDocumentsStatusBadge key="status" status={payment.status} />,
              fmtCurrency(payment.amount),
              fmtDocumentDate(payment.date),
              payment.billNumber,
              payment.method ?? '-',
              payment.reference ?? '-',
            ],
            filterValues: [
              payment.number,
              payment.status,
              fmtCurrency(payment.amount),
              fmtDocumentDate(payment.date),
              payment.billNumber,
              payment.method ?? '-',
              payment.reference ?? '-',
            ],
          })),
        },
      ]}
    />
  )
}
