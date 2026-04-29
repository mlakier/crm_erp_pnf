import type { TransactionStatCardSlot } from '@/lib/transaction-page-config'
import {
  buildDefaultTransactionReferenceLayout,
  type TransactionReferenceLayout,
} from '@/lib/transaction-reference-layouts'
import {
  defaultTransactionGlImpactColumns,
  defaultTransactionGlImpactSettings,
  type TransactionGlImpactColumnCustomization,
  type TransactionGlImpactColumnKey,
  type TransactionGlImpactSettings,
} from '@/lib/transaction-gl-impact'
import {
  type LinkedRecordReferenceSource,
  INVOICE_FULL_REFERENCE_FIELDS,
} from '@/lib/linked-record-reference-catalogs'

export type InvoiceReceiptDetailFieldKey =
  | 'customerName'
  | 'customerNumber'
  | 'id'
  | 'number'
  | 'invoiceId'
  | 'bankAccountId'
  | 'amount'
  | 'date'
  | 'method'
  | 'reference'
  | 'createdAt'
  | 'updatedAt'

export type InvoiceReceiptDetailFieldMeta = {
  id: InvoiceReceiptDetailFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
}

export type InvoiceReceiptDetailFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type InvoiceReceiptDetailCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<InvoiceReceiptDetailFieldKey, InvoiceReceiptDetailFieldCustomization>
  referenceLayouts: TransactionReferenceLayout[]
  glImpactSettings: TransactionGlImpactSettings
  glImpactColumns: Record<TransactionGlImpactColumnKey, TransactionGlImpactColumnCustomization>
  statCards?: Array<TransactionStatCardSlot<InvoiceReceiptStatCardKey>>
}

export type InvoiceReceiptStatCardKey = 'amount' | 'date' | 'method' | 'invoice'

export const INVOICE_RECEIPT_STAT_CARDS: Array<{ id: InvoiceReceiptStatCardKey; label: string }> = [
  { id: 'amount', label: 'Receipt Amount' },
  { id: 'date', label: 'Receipt Date' },
  { id: 'method', label: 'Method' },
  { id: 'invoice', label: 'Invoice' },
]

export const INVOICE_RECEIPT_DETAIL_FIELDS: InvoiceReceiptDetailFieldMeta[] = [
  { id: 'customerName', label: 'Customer Name', fieldType: 'text', source: 'Customers master data', description: 'Display name from the linked invoice customer.' },
  { id: 'customerNumber', label: 'Customer #', fieldType: 'text', source: 'Customers master data', description: 'Internal customer identifier from the linked invoice customer.' },
  { id: 'id', label: 'DB Id', fieldType: 'text', description: 'Internal database identifier for this invoice receipt.' },
  { id: 'number', label: 'Invoice Receipt Id', fieldType: 'text', description: 'Unique identifier for this invoice receipt.' },
  { id: 'invoiceId', label: 'Invoice', fieldType: 'text', source: 'Invoice transaction', description: 'Linked invoice identifier for this cash receipt.' },
  { id: 'bankAccountId', label: 'Bank Account', fieldType: 'list', source: 'Chart of accounts', description: 'Cash or bank GL account that receives this receipt.' },
  { id: 'amount', label: 'Amount', fieldType: 'currency', description: 'Cash receipt amount applied to the invoice.' },
  { id: 'date', label: 'Receipt Date', fieldType: 'date', description: 'Date the receipt was recorded.' },
  { id: 'method', label: 'Method', fieldType: 'list', source: 'Payment method list', description: 'Method used to receive payment.' },
  { id: 'reference', label: 'Reference', fieldType: 'text', description: 'Reference number or memo for the receipt.' },
  { id: 'createdAt', label: 'Created', fieldType: 'date', description: 'Date/time the invoice receipt record was created.' },
  { id: 'updatedAt', label: 'Last Modified', fieldType: 'date', description: 'Date/time the invoice receipt record was last modified.' },
]

export const INVOICE_RECEIPT_REFERENCE_SOURCES: LinkedRecordReferenceSource[] = [
  {
    id: 'invoice',
    label: 'Invoice',
    linkedFieldLabel: 'Invoice',
    description: 'Expand the linked invoice context for this receipt.',
    fields: INVOICE_FULL_REFERENCE_FIELDS,
    defaultVisibleFieldIds: ['invoiceNumber', 'invoiceStatus', 'invoiceTotal'],
    defaultColumns: 2,
    defaultRows: 2,
  },
]

export function defaultInvoiceReceiptDetailCustomization(): InvoiceReceiptDetailCustomizationConfig {
  return {
    formColumns: 3,
    sections: [
      'Document Identity',
      'Customer Snapshot',
      'Receipt Terms',
      'Record Keys',
      'System Dates',
    ],
    sectionRows: {
      'Document Identity': 1,
      'Customer Snapshot': 1,
      'Receipt Terms': 2,
      'Record Keys': 1,
      'System Dates': 1,
    },
    fields: {
      number: { visible: true, section: 'Document Identity', order: 0, column: 1 },
      invoiceId: { visible: true, section: 'Document Identity', order: 0, column: 2 },
      customerNumber: { visible: true, section: 'Customer Snapshot', order: 0, column: 1 },
      customerName: { visible: true, section: 'Customer Snapshot', order: 0, column: 2 },
      bankAccountId: { visible: true, section: 'Receipt Terms', order: 0, column: 1 },
      amount: { visible: true, section: 'Receipt Terms', order: 0, column: 2 },
      date: { visible: true, section: 'Receipt Terms', order: 0, column: 3 },
      method: { visible: true, section: 'Receipt Terms', order: 1, column: 1 },
      reference: { visible: true, section: 'Receipt Terms', order: 1, column: 2 },
      id: { visible: true, section: 'Record Keys', order: 0, column: 1 },
      createdAt: { visible: true, section: 'System Dates', order: 0, column: 1 },
      updatedAt: { visible: true, section: 'System Dates', order: 0, column: 2 },
    },
    referenceLayouts: [buildDefaultTransactionReferenceLayout(INVOICE_RECEIPT_REFERENCE_SOURCES, 'invoice')],
    glImpactSettings: defaultTransactionGlImpactSettings(),
    glImpactColumns: defaultTransactionGlImpactColumns(),
    statCards: [
      { id: 'receipt-amount', metric: 'amount', visible: true, order: 0 },
      { id: 'receipt-date', metric: 'date', visible: true, order: 1 },
      { id: 'receipt-method', metric: 'method', visible: true, order: 2 },
      { id: 'linked-invoice', metric: 'invoice', visible: true, order: 3 },
    ],
  }
}
