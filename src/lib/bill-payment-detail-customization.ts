import type { TransactionStatCardSlot } from '@/lib/transaction-page-config'
import {
  type TransactionReferenceLayout,
} from '@/lib/transaction-reference-layouts'
import {
  type LinkedRecordReferenceSource,
  BILL_FULL_REFERENCE_FIELDS,
} from '@/lib/linked-record-reference-catalogs'

export type BillPaymentDetailFieldKey =
  | 'id'
  | 'number'
  | 'billId'
  | 'amount'
  | 'date'
  | 'method'
  | 'reference'
  | 'status'
  | 'notes'
  | 'createdAt'
  | 'updatedAt'

export type BillPaymentDetailFieldMeta = {
  id: BillPaymentDetailFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
}

export type BillPaymentDetailFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type BillPaymentDetailCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<BillPaymentDetailFieldKey, BillPaymentDetailFieldCustomization>
  referenceLayouts: TransactionReferenceLayout[]
  statCards?: Array<TransactionStatCardSlot<BillPaymentStatCardKey>>
}

export type BillPaymentStatCardKey = 'amount' | 'status' | 'date' | 'bill'

export const BILL_PAYMENT_STAT_CARDS: Array<{ id: BillPaymentStatCardKey; label: string }> = [
  { id: 'amount', label: 'Payment Amount' },
  { id: 'status', label: 'Status' },
  { id: 'date', label: 'Date' },
  { id: 'bill', label: 'Bill' },
]

export const BILL_PAYMENT_DETAIL_FIELDS: BillPaymentDetailFieldMeta[] = [
  { id: 'id', label: 'DB Id', fieldType: 'text', description: 'Internal database identifier for this bill payment.' },
  { id: 'number', label: 'Bill Payment Id', fieldType: 'text', description: 'Identifier for this bill payment.' },
  { id: 'billId', label: 'Bill', fieldType: 'text', source: 'Bill transaction', description: 'Linked bill for this payment.' },
  { id: 'amount', label: 'Amount', fieldType: 'currency', description: 'Payment amount applied to the bill.' },
  { id: 'date', label: 'Date', fieldType: 'date', description: 'Date the bill payment was recorded.' },
  { id: 'method', label: 'Method', fieldType: 'list', source: 'Payment method list', description: 'Payment method used for this bill payment.' },
  { id: 'reference', label: 'Reference', fieldType: 'text', description: 'Reference number or memo for this payment.' },
  { id: 'status', label: 'Status', fieldType: 'list', source: 'Bill payment status list', description: 'Status of this bill payment.' },
  { id: 'notes', label: 'Notes', fieldType: 'text', description: 'Free-form notes for this bill payment.' },
  { id: 'createdAt', label: 'Created', fieldType: 'date', description: 'Date/time the bill payment record was created.' },
  { id: 'updatedAt', label: 'Last Modified', fieldType: 'date', description: 'Date/time the bill payment record was last modified.' },
]

export const BILL_PAYMENT_REFERENCE_SOURCES: LinkedRecordReferenceSource[] = [
  {
    id: 'bill',
    label: 'Bill',
    linkedFieldLabel: 'Bill',
    description: 'Expand the linked bill context for this payment.',
    fields: BILL_FULL_REFERENCE_FIELDS,
    defaultVisibleFieldIds: ['billNumber', 'billStatus', 'billTotal'],
    defaultColumns: 2,
    defaultRows: 2,
  },
]

export function defaultBillPaymentDetailCustomization(): BillPaymentDetailCustomizationConfig {
  return {
    formColumns: 2,
    sections: ['Document Identity', 'Payment Terms', 'Record Keys', 'System Dates'],
    sectionRows: {
      'Document Identity': 1,
      'Payment Terms': 3,
      'Record Keys': 1,
      'System Dates': 1,
    },
    fields: {
      number: { visible: true, section: 'Document Identity', order: 0, column: 1 },
      billId: { visible: true, section: 'Document Identity', order: 0, column: 2 },
      amount: { visible: true, section: 'Payment Terms', order: 0, column: 1 },
      date: { visible: true, section: 'Payment Terms', order: 0, column: 2 },
      method: { visible: true, section: 'Payment Terms', order: 1, column: 1 },
      status: { visible: true, section: 'Payment Terms', order: 1, column: 2 },
      reference: { visible: true, section: 'Payment Terms', order: 2, column: 1 },
      notes: { visible: true, section: 'Payment Terms', order: 2, column: 2 },
      id: { visible: true, section: 'Record Keys', order: 0, column: 1 },
      createdAt: { visible: true, section: 'System Dates', order: 0, column: 1 },
      updatedAt: { visible: true, section: 'System Dates', order: 0, column: 2 },
    },
    referenceLayouts: [],
    statCards: [
      { id: 'bp-amount', metric: 'amount', visible: true, order: 0 },
      { id: 'bp-status', metric: 'status', visible: true, order: 1 },
      { id: 'bp-date', metric: 'date', visible: true, order: 2 },
      { id: 'bp-bill', metric: 'bill', visible: true, order: 3 },
    ],
  }
}
