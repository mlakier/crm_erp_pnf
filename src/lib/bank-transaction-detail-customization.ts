import type { TransactionStatCardSlot } from '@/lib/transaction-page-config'
import {
  defaultTransactionGlImpactColumns,
  defaultTransactionGlImpactSettings,
  type TransactionGlImpactColumnCustomization,
  type TransactionGlImpactColumnKey,
  type TransactionGlImpactSettings,
} from '@/lib/transaction-gl-impact'

export type BankTransactionDetailType = 'deposit' | 'transfer' | 'check'

export type BankTransactionDetailFieldMeta = {
  id: string
  label: string
  fieldType: string
  source?: string
  description?: string
  section: string
}

export type BankTransactionDetailCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<string, { visible: boolean; section: string; order: number; column: number }>
  referenceLayouts: []
  glImpactSettings: TransactionGlImpactSettings
  glImpactColumns: Record<TransactionGlImpactColumnKey, TransactionGlImpactColumnCustomization>
  statCards?: Array<TransactionStatCardSlot<'amount' | 'status' | 'bank' | 'date'>>
}

const CURRENCY_SECTION = 'Currency Context'
const REFERENCE_SECTION = 'Reference Details'
const DETAILS_SECTION = 'Transaction Details'
const SYSTEM_SECTION = 'Record Keys and System Dates'

export const BANK_TRANSACTION_STAT_CARDS = [
  { id: 'amount', label: 'Amount' },
  { id: 'status', label: 'Status' },
  { id: 'bank', label: 'Bank Account' },
  { id: 'date', label: 'Transaction Date' },
]

const COMMON_CURRENCY_FIELDS: BankTransactionDetailFieldMeta[] = [
  { id: 'transactionAmount', label: 'TXN Amount', fieldType: 'currency', section: CURRENCY_SECTION },
  { id: 'localAmount', label: 'Local Amount', fieldType: 'currency', section: CURRENCY_SECTION },
  { id: 'functionalAmount', label: 'Functional Amount', fieldType: 'currency', section: CURRENCY_SECTION },
  { id: 'groupAmount', label: 'Group Amount', fieldType: 'currency', section: CURRENCY_SECTION },
  { id: 'fxRateAudit', label: 'FX Rate Audit', fieldType: 'text', section: CURRENCY_SECTION },
  { id: 'fxRateType', label: 'FX Rate Type', fieldType: 'list', section: CURRENCY_SECTION },
  { id: 'translationStatus', label: 'Translation Status', fieldType: 'text', section: CURRENCY_SECTION },
]

const COMMON_SYSTEM_FIELDS: BankTransactionDetailFieldMeta[] = [
  { id: 'bankFeedTransactionId', label: 'Bank Feed Transaction', fieldType: 'text', section: REFERENCE_SECTION },
  { id: 'journalEntryId', label: 'Journal Entry', fieldType: 'text', section: REFERENCE_SECTION },
  { id: 'createdAt', label: 'Created', fieldType: 'date', section: SYSTEM_SECTION },
  { id: 'updatedAt', label: 'Last Modified', fieldType: 'date', section: SYSTEM_SECTION },
]

export const BANK_DEPOSIT_DETAIL_FIELDS: BankTransactionDetailFieldMeta[] = [
  ...COMMON_CURRENCY_FIELDS,
  { id: 'depositNumber', label: 'Deposit #', fieldType: 'text', section: DETAILS_SECTION },
  { id: 'status', label: 'Status', fieldType: 'list', section: DETAILS_SECTION },
  { id: 'depositDate', label: 'Deposit Date', fieldType: 'date', section: DETAILS_SECTION },
  { id: 'amount', label: 'Amount', fieldType: 'currency', section: DETAILS_SECTION },
  { id: 'bankAccountId', label: 'Bank Account', fieldType: 'list', source: 'Bank accounts', section: DETAILS_SECTION },
  { id: 'cashGl', label: 'Cash GL', fieldType: 'list', source: 'Chart of accounts', section: DETAILS_SECTION },
  { id: 'offsetAccountId', label: 'Offset Account', fieldType: 'list', source: 'Chart of accounts', section: DETAILS_SECTION },
  { id: 'subsidiaryId', label: 'Subsidiary', fieldType: 'list', source: 'Subsidiaries', section: DETAILS_SECTION },
  { id: 'currencyId', label: 'Currency', fieldType: 'list', source: 'Currencies', section: DETAILS_SECTION },
  { id: 'memo', label: 'Memo', fieldType: 'text', section: DETAILS_SECTION },
  ...COMMON_SYSTEM_FIELDS,
]

export const BANK_TRANSFER_DETAIL_FIELDS: BankTransactionDetailFieldMeta[] = [
  ...COMMON_CURRENCY_FIELDS,
  { id: 'transferNumber', label: 'Transfer #', fieldType: 'text', section: DETAILS_SECTION },
  { id: 'status', label: 'Status', fieldType: 'list', section: DETAILS_SECTION },
  { id: 'transferDate', label: 'Transfer Date', fieldType: 'date', section: DETAILS_SECTION },
  { id: 'amount', label: 'Amount', fieldType: 'currency', section: DETAILS_SECTION },
  { id: 'fromBankAccountId', label: 'From Bank Account', fieldType: 'list', source: 'Bank accounts', section: DETAILS_SECTION },
  { id: 'fromCashGl', label: 'From Cash GL', fieldType: 'list', source: 'Chart of accounts', section: DETAILS_SECTION },
  { id: 'toBankAccountId', label: 'To Bank Account', fieldType: 'list', source: 'Bank accounts', section: DETAILS_SECTION },
  { id: 'toCashGl', label: 'To Cash GL', fieldType: 'list', source: 'Chart of accounts', section: DETAILS_SECTION },
  { id: 'subsidiaryId', label: 'Subsidiary', fieldType: 'list', source: 'Subsidiaries', section: DETAILS_SECTION },
  { id: 'currencyId', label: 'Currency', fieldType: 'list', source: 'Currencies', section: DETAILS_SECTION },
  { id: 'memo', label: 'Memo', fieldType: 'text', section: DETAILS_SECTION },
  ...COMMON_SYSTEM_FIELDS,
]

export const BANK_CHECK_DETAIL_FIELDS: BankTransactionDetailFieldMeta[] = [
  ...COMMON_CURRENCY_FIELDS,
  { id: 'checkTransactionNumber', label: 'Check Txn #', fieldType: 'text', section: DETAILS_SECTION },
  { id: 'checkNumber', label: 'Check #', fieldType: 'text', section: DETAILS_SECTION },
  { id: 'status', label: 'Status', fieldType: 'list', section: DETAILS_SECTION },
  { id: 'checkDate', label: 'Check Date', fieldType: 'date', section: DETAILS_SECTION },
  { id: 'payeeName', label: 'Payee', fieldType: 'text', section: DETAILS_SECTION },
  { id: 'vendorId', label: 'Vendor', fieldType: 'list', source: 'Vendors', section: DETAILS_SECTION },
  { id: 'amount', label: 'Amount', fieldType: 'currency', section: DETAILS_SECTION },
  { id: 'currencyId', label: 'Currency', fieldType: 'list', source: 'Currencies', section: DETAILS_SECTION },
  { id: 'bankAccountId', label: 'Bank Account', fieldType: 'list', source: 'Bank accounts', section: DETAILS_SECTION },
  { id: 'cashGl', label: 'Cash GL', fieldType: 'list', source: 'Chart of accounts', section: DETAILS_SECTION },
  { id: 'billPaymentId', label: 'Bill Payment', fieldType: 'text', section: REFERENCE_SECTION },
  { id: 'subsidiaryId', label: 'Subsidiary', fieldType: 'list', source: 'Subsidiaries', section: DETAILS_SECTION },
  { id: 'memo', label: 'Memo', fieldType: 'text', section: DETAILS_SECTION },
  ...COMMON_SYSTEM_FIELDS,
]

export function getBankTransactionDetailFields(type: BankTransactionDetailType) {
  if (type === 'transfer') return BANK_TRANSFER_DETAIL_FIELDS
  if (type === 'check') return BANK_CHECK_DETAIL_FIELDS
  return BANK_DEPOSIT_DETAIL_FIELDS
}

export function defaultBankTransactionDetailCustomization(type: BankTransactionDetailType): BankTransactionDetailCustomizationConfig {
  const fields = getBankTransactionDetailFields(type)
  const sections = [CURRENCY_SECTION, REFERENCE_SECTION, DETAILS_SECTION, SYSTEM_SECTION]
  const visibleCounts: Record<string, number> = Object.fromEntries(sections.map((section) => [section, 0]))

  return {
    formColumns: 4,
    sections,
    sectionRows: {
      [CURRENCY_SECTION]: 2,
      [REFERENCE_SECTION]: 2,
      [DETAILS_SECTION]: Math.ceil(fields.filter((field) => field.section === DETAILS_SECTION).length / 4),
      [SYSTEM_SECTION]: 1,
    },
    fields: Object.fromEntries(
      fields.map((field) => {
        const index = visibleCounts[field.section] ?? 0
        visibleCounts[field.section] = index + 1
        return [
          field.id,
          {
            visible: true,
            section: field.section,
            order: Math.floor(index / 4),
            column: (index % 4) + 1,
          },
        ]
      }),
    ),
    referenceLayouts: [],
    glImpactSettings: defaultTransactionGlImpactSettings(),
    glImpactColumns: defaultTransactionGlImpactColumns(),
    statCards: [
      { id: 'amount-card', metric: 'amount', visible: true, order: 0 },
      { id: 'status-card', metric: 'status', visible: true, order: 1 },
      { id: 'bank-card', metric: 'bank', visible: true, order: 2 },
      { id: 'date-card', metric: 'date', visible: true, order: 3 },
    ],
  }
}

