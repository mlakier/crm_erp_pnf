'use client'

import Link from 'next/link'
import { fmtCurrency } from '@/lib/format'
import TransactionRelatedDocumentsTabs, {
  RelatedDocumentsStatusBadge,
} from '@/components/TransactionRelatedDocumentsTabs'

export default function InvoiceReceiptRelatedDocuments({
  invoice,
  salesOrder,
  quote,
  opportunity,
  moneySettings,
}: {
  invoice: { id: string; number: string; status: string; total: number } | null
  salesOrder: { id: string; number: string; status: string; total: number } | null
  quote: { id: string; number: string; status: string; total: number } | null
  opportunity: { id: string; number: string; name: string; status: string; total: number } | null
  moneySettings?: Parameters<typeof import('@/lib/format').fmtCurrency>[2]
}) {
  return (
    <TransactionRelatedDocumentsTabs
      defaultActiveKey="opportunities"
      tabs={[
        {
          key: 'opportunities',
          label: 'Opportunities',
          count: opportunity ? 1 : 0,
          tone: 'upstream',
          emptyMessage: 'No source opportunity is linked to this invoice receipt.',
          headers: ['TXN ID', 'NAME', 'STATUS', 'TOTAL'],
          rows: opportunity
            ? [
                {
                  id: opportunity.id,
                  cells: [
                    <Link
                      key="link"
                      href={`/opportunities/${opportunity.id}`}
                      className="hover:underline"
                      style={{ color: 'var(--accent-primary-strong)' }}
                    >
                      {opportunity.number}
                    </Link>,
                    opportunity.name,
                    <RelatedDocumentsStatusBadge key="status" status={opportunity.status} />,
                    fmtCurrency(opportunity.total, undefined, moneySettings),
                  ],
                },
              ]
            : [],
        },
        {
          key: 'quotes',
          label: 'Quotes',
          count: quote ? 1 : 0,
          tone: 'upstream',
          emptyMessage: 'No source quote is linked to this invoice receipt.',
          headers: ['TXN ID', 'STATUS', 'TOTAL'],
          rows: quote
            ? [
                {
                  id: quote.id,
                  cells: [
                    <Link
                      key="link"
                      href={`/quotes/${quote.id}`}
                      className="hover:underline"
                      style={{ color: 'var(--accent-primary-strong)' }}
                    >
                      {quote.number}
                    </Link>,
                    <RelatedDocumentsStatusBadge key="status" status={quote.status} />,
                    fmtCurrency(quote.total, undefined, moneySettings),
                  ],
                },
              ]
            : [],
        },
        {
          key: 'sales-orders',
          label: 'Sales Orders',
          count: salesOrder ? 1 : 0,
          tone: 'upstream',
          emptyMessage: 'No source sales order is linked to this invoice receipt.',
          headers: ['TXN ID', 'STATUS', 'TOTAL'],
          rows: salesOrder
            ? [
                {
                  id: salesOrder.id,
                  cells: [
                    <Link
                      key="link"
                      href={`/sales-orders/${salesOrder.id}`}
                      className="hover:underline"
                      style={{ color: 'var(--accent-primary-strong)' }}
                    >
                      {salesOrder.number}
                    </Link>,
                    <RelatedDocumentsStatusBadge key="status" status={salesOrder.status} />,
                    fmtCurrency(salesOrder.total, undefined, moneySettings),
                  ],
                },
              ]
            : [],
        },
        {
          key: 'invoices',
          label: 'Invoices',
          count: invoice ? 1 : 0,
          tone: 'upstream',
          emptyMessage: 'No invoice is linked to this invoice receipt.',
          headers: ['TXN ID', 'STATUS', 'TOTAL'],
          rows: invoice
            ? [
                {
                  id: invoice.id,
                  cells: [
                    <Link
                      key="link"
                      href={`/invoices/${invoice.id}`}
                      className="hover:underline"
                      style={{ color: 'var(--accent-primary-strong)' }}
                    >
                      {invoice.number}
                    </Link>,
                    <RelatedDocumentsStatusBadge key="status" status={invoice.status} />,
                    fmtCurrency(invoice.total, undefined, moneySettings),
                  ],
                },
              ]
            : [],
        },
      ]}
    />
  )
}
