'use client'

import Link from 'next/link'
import TransactionRelatedDocumentsTabs, {
  RelatedDocumentsStatusBadge,
  type TransactionRelatedDocumentsTab,
} from '@/components/TransactionRelatedDocumentsTabs'
import { fmtCurrency, fmtDocumentDate } from '@/lib/format'

export default function PurchaseRequisitionRelatedDocuments({
  purchaseOrders,
  receipts,
  bills,
  billPayments,
  moneySettings,
  embedded = false,
  showDisplayControl = true,
}: {
  purchaseOrders: Array<{
    id: string
    number: string
    status: string
    total: number
    createdAt: string
  }>
  receipts: Array<{
    id: string
    number: string
    date: string | Date
    status: string
    quantity: number
    notes: string | null
  }>
  bills: Array<{
    id: string
    number: string
    date: string | Date
    dueDate: string | Date | null
    status: string
    total: number
    notes: string | null
  }>
  billPayments: Array<{
    id: string
    number: string
    date: string | Date
    status: string
    amount: number
    reference: string | null
    billNumber: string
  }>
  moneySettings?: Parameters<typeof fmtCurrency>[2]
  embedded?: boolean
  showDisplayControl?: boolean
}) {
  const tabs: TransactionRelatedDocumentsTab[] = [
    {
      key: 'purchase-orders',
      label: 'Purchase Orders',
      count: purchaseOrders.length,
      tone: 'downstream',
      emptyMessage: 'No related purchase orders yet.',
      headers: ['TXN ID', 'STATUS', 'TOTAL', 'CREATED'],
      rows: purchaseOrders.map((purchaseOrder) => ({
        id: purchaseOrder.id,
        cells: [
          <Link
            key={`${purchaseOrder.id}-number`}
            href={`/purchase-orders/${purchaseOrder.id}`}
            className="hover:underline"
            style={{ color: 'var(--accent-primary-strong)' }}
          >
            {purchaseOrder.number}
          </Link>,
          <RelatedDocumentsStatusBadge key={`${purchaseOrder.id}-status`} status={purchaseOrder.status} />,
          fmtCurrency(purchaseOrder.total, undefined, moneySettings),
          fmtDocumentDate(purchaseOrder.createdAt, moneySettings),
        ],
        filterValues: [
          purchaseOrder.number,
          purchaseOrder.status,
          fmtCurrency(purchaseOrder.total, undefined, moneySettings),
          fmtDocumentDate(purchaseOrder.createdAt, moneySettings),
        ],
      })),
    },
    {
      key: 'receipts',
      label: 'Receipts',
      count: receipts.length,
      tone: 'downstream',
      emptyMessage: 'No receipts recorded yet.',
      headers: ['TXN ID', 'STATUS', 'DATE', 'QTY', 'NOTES'],
      rows: receipts.map((receipt) => ({
        id: receipt.id,
        cells: [
          <Link key={`${receipt.id}-number`} href={`/receipts/${receipt.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
            {receipt.number}
          </Link>,
          <RelatedDocumentsStatusBadge key={`${receipt.id}-status`} status={receipt.status} />,
          fmtDocumentDate(receipt.date, moneySettings),
          receipt.quantity,
          receipt.notes ?? '-',
        ],
        filterValues: [
          receipt.number,
          receipt.status,
          fmtDocumentDate(receipt.date, moneySettings),
          String(receipt.quantity),
          receipt.notes ?? '-',
        ],
      })),
    },
    {
      key: 'bills',
      label: 'Bills',
      count: bills.length,
      tone: 'downstream',
      emptyMessage: 'No bills are linked to this purchase requisition yet.',
      headers: ['TXN ID', 'STATUS', 'TOTAL', 'BILL DATE', 'DUE DATE', 'NOTES'],
      rows: bills.map((bill) => ({
        id: bill.id,
        cells: [
          <Link key={`${bill.id}-number`} href={`/bills/${bill.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
            {bill.number}
          </Link>,
          <RelatedDocumentsStatusBadge key={`${bill.id}-status`} status={bill.status} />,
          fmtCurrency(bill.total, undefined, moneySettings),
          fmtDocumentDate(bill.date, moneySettings),
          bill.dueDate ? fmtDocumentDate(bill.dueDate, moneySettings) : '-',
          bill.notes ?? '-',
        ],
        filterValues: [
          bill.number,
          bill.status,
          fmtCurrency(bill.total, undefined, moneySettings),
          fmtDocumentDate(bill.date, moneySettings),
          bill.dueDate ? fmtDocumentDate(bill.dueDate, moneySettings) : '-',
          bill.notes ?? '-',
        ],
      })),
    },
    {
      key: 'bill-payments',
      label: 'Bill Payments',
      count: billPayments.length,
      tone: 'downstream',
      emptyMessage: 'No bill payments are linked to bills for this purchase requisition yet.',
      headers: ['TXN ID', 'STATUS', 'AMOUNT', 'DATE', 'BILL', 'REFERENCE'],
      rows: billPayments.map((payment) => ({
        id: payment.id,
        cells: [
          <Link key={`${payment.id}-number`} href={`/bill-payments/${payment.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
            {payment.number}
          </Link>,
          <RelatedDocumentsStatusBadge key={`${payment.id}-status`} status={payment.status} />,
          fmtCurrency(payment.amount, undefined, moneySettings),
          fmtDocumentDate(payment.date, moneySettings),
          payment.billNumber,
          payment.reference ?? '-',
        ],
        filterValues: [
          payment.number,
          payment.status,
          fmtCurrency(payment.amount, undefined, moneySettings),
          fmtDocumentDate(payment.date, moneySettings),
          payment.billNumber,
          payment.reference ?? '-',
        ],
      })),
    },
  ]

  return <TransactionRelatedDocumentsTabs tabs={tabs} embedded={embedded} showDisplayControl={showDisplayControl} />
}
