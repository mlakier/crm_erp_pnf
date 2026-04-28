'use client'

import Link from 'next/link'
import { fmtCurrency, fmtDocumentDate } from '@/lib/format'
import TransactionRelatedDocumentsTabs, {
  RelatedDocumentsStatusBadge,
} from '@/components/TransactionRelatedDocumentsTabs'

type QuoteRow = {
  id: string
  href: string
  number: string
  status: string
  total: number
}

type ContactRow = {
  id: string
  href: string
  number: string
  name: string
  email: string
  position: string
}

type SalesOrderRow = {
  id: string
  href: string
  number: string
  status: string
  total: number
}

type FulfillmentRow = {
  id: string
  href: string
  number: string
  status: string
  date: string
  notes: string | null
}

type InvoiceRow = {
  id: string
  href: string
  number: string
  status: string
  total: number
  dueDate: string | null
  createdAt: string
}

type InvoiceReceiptRow = {
  id: string
  href: string
  number: string
  amount: number
  date: string
  method: string | null
  reference: string | null
}

export default function OpportunityRelatedDocumentsSection({
  quote,
  contacts,
  salesOrders,
  fulfillments,
  invoices,
  invoiceReceipts,
}: {
  quote: QuoteRow | null
  contacts: ContactRow[]
  salesOrders: SalesOrderRow[]
  fulfillments: FulfillmentRow[]
  invoices: InvoiceRow[]
  invoiceReceipts: InvoiceReceiptRow[]
}) {
  const quoteRows = quote ? [quote] : []

  return (
    <TransactionRelatedDocumentsTabs
      defaultActiveKey="quotes"
      tabs={[
        {
          key: 'quotes',
          label: 'Quotes',
          count: quoteRows.length,
          tone: 'downstream',
          emptyMessage: 'No related quotes yet.',
          headers: ['Txn ID', 'Status', 'Total'],
          rows: quoteRows.map((row) => ({
            id: row.id,
            cells: [
              <Link key="link" href={row.href} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                {row.number}
              </Link>,
              <RelatedDocumentsStatusBadge key="status" status={row.status} />,
              fmtCurrency(row.total),
            ],
          })),
        },
        {
          key: 'sales-orders',
          label: 'Sales Orders',
          count: salesOrders.length,
          tone: 'downstream',
          emptyMessage: 'No sales orders are linked downstream from this opportunity yet.',
          headers: ['Txn ID', 'Status', 'Total'],
          rows: salesOrders.map((salesOrder) => ({
            id: salesOrder.id,
            cells: [
              <Link key="link" href={salesOrder.href} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                {salesOrder.number}
              </Link>,
              <RelatedDocumentsStatusBadge key="status" status={salesOrder.status} />,
              fmtCurrency(salesOrder.total),
            ],
          })),
        },
        {
          key: 'fulfillments',
          label: 'Fulfillments',
          count: fulfillments.length,
          tone: 'downstream',
          emptyMessage: 'No fulfillments are linked downstream from this opportunity yet.',
          headers: ['Txn ID', 'Date', 'Status', 'Notes'],
          rows: fulfillments.map((fulfillment) => ({
            id: fulfillment.id,
            cells: [
              <Link key="link" href={fulfillment.href} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                {fulfillment.number}
              </Link>,
              fmtDocumentDate(fulfillment.date),
              <RelatedDocumentsStatusBadge key="status" status={fulfillment.status} />,
              fulfillment.notes ?? '-',
            ],
          })),
        },
        {
          key: 'invoices',
          label: 'Invoices',
          count: invoices.length,
          tone: 'downstream',
          emptyMessage: 'No invoices are linked downstream from this opportunity yet.',
          headers: ['Txn ID', 'Created', 'Due Date', 'Status', 'Total'],
          rows: invoices.map((invoice) => ({
            id: invoice.id,
            cells: [
              <Link key="link" href={invoice.href} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                {invoice.number}
              </Link>,
              fmtDocumentDate(invoice.createdAt),
              invoice.dueDate ? fmtDocumentDate(invoice.dueDate) : '-',
              <RelatedDocumentsStatusBadge key="status" status={invoice.status} />,
              fmtCurrency(invoice.total),
            ],
          })),
        },
        {
          key: 'invoice-receipts',
          label: 'Invoice Receipts',
          count: invoiceReceipts.length,
          tone: 'downstream',
          emptyMessage: 'No invoice receipts are linked downstream from this opportunity yet.',
          headers: ['Txn ID', 'Date', 'Method', 'Reference', 'Amount'],
          rows: invoiceReceipts.map((receipt) => ({
            id: receipt.id,
            cells: [
              <Link key="link" href={receipt.href} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                {receipt.number}
              </Link>,
              fmtDocumentDate(receipt.date),
              receipt.method ?? '-',
              receipt.reference ?? '-',
              fmtCurrency(receipt.amount),
            ],
          })),
        },
        {
          key: 'contacts',
          label: 'Customer Contacts',
          count: contacts.length,
          tone: 'upstream',
          emptyMessage: 'No related customer contacts.',
          headers: ['Contact #', 'Name', 'Details'],
          rows: contacts.map((contact) => ({
            id: contact.id,
            cells: [
              <Link key="link" href={contact.href} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                {contact.number}
              </Link>,
              contact.name,
              `${contact.email} · ${contact.position}`,
            ],
          })),
        },
      ]}
    />
  )
}
