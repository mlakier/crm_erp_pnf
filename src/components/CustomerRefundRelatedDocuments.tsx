'use client'

import { fmtCurrency } from '@/lib/format'
import RelatedRecordsSection from '@/components/RelatedRecordsSection'

export default function CustomerRefundRelatedDocuments({
  customer,
  opportunity,
  quote,
  salesOrder,
  invoice,
  receipt,
  moneySettings,
  embedded = false,
  showDisplayControl = true,
}: {
  customer: { id: string; number: string; name: string; email?: string | null } | null
  opportunity: { id: string; number: string; name: string; status: string; total: number } | null
  quote: { id: string; number: string; status: string; total: number } | null
  salesOrder: { id: string; number: string; status: string; total: number } | null
  invoice: { id: string; number: string; status: string; total: number } | null
  receipt: { id: string; number: string; status: string; amount: number } | null
  moneySettings?: Parameters<typeof import('@/lib/format').fmtCurrency>[2]
  embedded?: boolean
  showDisplayControl?: boolean
}) {
  const tabs = [
    {
      key: 'master-data',
      label: 'Master Data',
      count: customer ? 1 : 0,
      emptyMessage: 'No related master data records are linked to this refund.',
      rows: customer
        ? [
            {
              id: customer.id,
              type: 'Customer',
              reference: customer.number,
              name: customer.name,
              details: customer.email ?? '-',
              href: `/customers/${customer.id}`,
            },
          ]
        : [],
    },
    {
      key: 'transactions',
      label: 'Transactions',
      count:
        (opportunity ? 1 : 0) +
        (quote ? 1 : 0) +
        (salesOrder ? 1 : 0) +
        (invoice ? 1 : 0) +
        (receipt ? 1 : 0),
      emptyMessage: 'No related transactions are linked to this refund.',
      rows: [
        ...(opportunity
          ? [{
              id: opportunity.id,
              type: 'Opportunity',
              reference: opportunity.number,
              name: opportunity.name,
              details: `${opportunity.status} | ${fmtCurrency(opportunity.total, undefined, moneySettings)}`,
              href: `/opportunities/${opportunity.id}`,
            }]
          : []),
        ...(quote
          ? [{
              id: quote.id,
              type: 'Quote',
              reference: quote.number,
              name: quote.status,
              details: fmtCurrency(quote.total, undefined, moneySettings),
              href: `/quotes/${quote.id}`,
            }]
          : []),
        ...(salesOrder
          ? [{
              id: salesOrder.id,
              type: 'Sales Order',
              reference: salesOrder.number,
              name: salesOrder.status,
              details: fmtCurrency(salesOrder.total, undefined, moneySettings),
              href: `/sales-orders/${salesOrder.id}`,
            }]
          : []),
        ...(invoice
          ? [{
              id: invoice.id,
              type: 'Invoice',
              reference: invoice.number,
              name: invoice.status,
              details: fmtCurrency(invoice.total, undefined, moneySettings),
              href: `/invoices/${invoice.id}`,
            }]
          : []),
        ...(receipt
          ? [{
              id: receipt.id,
              type: 'Invoice Receipt',
              reference: receipt.number,
              name: receipt.status,
              details: fmtCurrency(receipt.amount, undefined, moneySettings),
              href: `/invoice-receipts/${receipt.id}`,
            }]
          : []),
      ],
    },
  ]

  return (
    <RelatedRecordsSection embedded={embedded} showDisplayControl={showDisplayControl} tabs={tabs} />
  )
}
