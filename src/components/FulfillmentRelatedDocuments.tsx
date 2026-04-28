'use client'

import SalesOrderRelatedDocuments from '@/components/SalesOrderRelatedDocuments'

type QuoteDoc = {
  id: string
  number: string
  status: string
  total: number
  validUntil: string | null
  opportunityName: string | null
}

type OpportunityDoc = {
  id: string
  number: string
  name: string
  status: string
  total: number
}

type FulfillmentDoc = {
  id: string
  number: string
  status: string
  date: string
  notes: string | null
}

type InvoiceDoc = {
  id: string
  number: string
  status: string
  total: number
  dueDate: string | null
  createdAt: string
}

type CashReceiptDoc = {
  id: string
  amount: number
  date: string
  method: string | null
  reference: string | null
  invoiceNumber: string
}

export default function FulfillmentRelatedDocuments({
  opportunities,
  quotes,
  fulfillments,
  invoices,
  cashReceipts,
}: {
  opportunities: OpportunityDoc[]
  quotes: QuoteDoc[]
  fulfillments: FulfillmentDoc[]
  invoices: InvoiceDoc[]
  cashReceipts: CashReceiptDoc[]
}) {
  return (
    <SalesOrderRelatedDocuments
      opportunities={opportunities}
      quotes={quotes}
      fulfillments={fulfillments}
      invoices={invoices}
      cashReceipts={cashReceipts}
      showFulfillments={false}
    />
  )
}
