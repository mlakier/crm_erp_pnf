import { fmtDocumentDate } from '@/lib/format'
import type { TransactionPageConfig, TransactionVisualTone } from '@/lib/transaction-page-config'

export type FulfillmentPageConfigRecord = {
  statusLabel: string
  statusTone?: TransactionVisualTone
  salesOrderId: string | null
  salesOrderNumber: string | null
  lineCount: number
  totalQuantity: number
  date: Date | null
  moneySettings?: Parameters<typeof fmtDocumentDate>[1]
}

export const fulfillmentPageConfig: TransactionPageConfig<FulfillmentPageConfigRecord> = {
  sectionDescriptions: {
    'Document Identity': 'Primary fulfillment identifier and customer context from the linked sales order.',
    'Source Context': 'Upstream sales documents that produced this fulfillment.',
    'Fulfillment Terms': 'Lifecycle status, fulfillment date, and warehouse notes for this document.',
    'Commercial Context': 'Subsidiary and currency context inherited from the sales flow.',
    'Record Keys': 'Internal database identifiers for this fulfillment.',
    'System Dates': 'System-managed timestamps for this fulfillment.',
  },
  stats: [
    {
      id: 'status',
      label: 'Status',
      getValue: (record) => record.statusLabel,
      getValueTone: (record) => record.statusTone ?? 'default',
    },
    {
      id: 'salesOrder',
      label: 'Sales Order',
      getValue: (record) => record.salesOrderNumber ?? '-',
      getHref: (record) => (record.salesOrderId ? `/sales-orders/${record.salesOrderId}` : null),
      getValueTone: () => 'accent',
    },
    {
      id: 'date',
      label: 'Fulfillment Date',
      getValue: (record) => (record.date ? fmtDocumentDate(record.date, record.moneySettings) : '-'),
    },
    {
      id: 'lineCount',
      label: 'Fulfillment Lines',
      getValue: (record) => record.lineCount,
    },
    {
      id: 'totalQuantity',
      label: 'Fulfilled Qty',
      accent: true,
      getValue: (record) => record.totalQuantity,
      getValueTone: () => 'teal',
    },
  ],
}
