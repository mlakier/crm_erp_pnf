import type { TransactionStatCardSlot } from '@/lib/transaction-page-config'

export type JournalDetailFieldKey =
  | 'number'
  | 'date'
  | 'description'
  | 'status'
  | 'subsidiaryId'
  | 'currencyId'
  | 'accountingPeriodId'
  | 'journalType'
  | 'total'
  | 'sourceType'
  | 'sourceId'
  | 'userId'
  | 'postedByEmployeeId'
  | 'approvedByEmployeeId'
  | 'createdAt'
  | 'updatedAt'

export type JournalStatCardKey =
  | 'totalDebits'
  | 'totalCredits'
  | 'balance'
  | 'journalLines'
  | 'status'
  | 'sourceId'

export type JournalLineColumnKey =
  | 'line'
  | 'accountId'
  | 'description'
  | 'debit'
  | 'credit'
  | 'subsidiaryId'
  | 'departmentId'
  | 'locationId'
  | 'projectId'
  | 'customerId'
  | 'vendorId'
  | 'itemId'
  | 'employeeId'
  | 'memo'

export type JournalGlImpactColumnKey =
  | 'line'
  | 'accountId'
  | 'description'
  | 'subsidiaryId'
  | 'departmentId'
  | 'locationId'
  | 'projectId'
  | 'customerId'
  | 'vendorId'
  | 'itemId'
  | 'employeeId'
  | 'debit'
  | 'credit'

export type JournalStatCardSlot = TransactionStatCardSlot<JournalStatCardKey>

export type JournalDetailFieldMeta = {
  id: JournalDetailFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
}

export type JournalDetailFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type JournalLineColumnMeta = {
  id: JournalLineColumnKey
  label: string
  description?: string
}

export type JournalLineFontSize = 'xs' | 'sm'

export type JournalLineWidthMode = 'auto' | 'compact' | 'normal' | 'wide'

export type JournalLineDisplayMode = 'label' | 'idAndLabel' | 'id'

export type JournalLineDropdownSortMode = 'id' | 'label'

export type JournalLineColumnCustomization = {
  visible: boolean
  order: number
  widthMode: JournalLineWidthMode
  editDisplay: JournalLineDisplayMode
  viewDisplay: JournalLineDisplayMode
  dropdownDisplay: JournalLineDisplayMode
  dropdownSort: JournalLineDropdownSortMode
}

export type JournalLineSettings = {
  fontSize: JournalLineFontSize
}

export type JournalGlImpactColumnCustomization = {
  visible: boolean
  order: number
  widthMode: JournalLineWidthMode
  viewDisplay: JournalLineDisplayMode
}

export type JournalGlImpactSettings = {
  fontSize: JournalLineFontSize
}

export type JournalGlImpactColumnMeta = {
  id: JournalGlImpactColumnKey
  label: string
  description?: string
}

export type JournalDetailCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<JournalDetailFieldKey, JournalDetailFieldCustomization>
  lineSettings: JournalLineSettings
  lineColumns: Record<JournalLineColumnKey, JournalLineColumnCustomization>
  glImpactSettings: JournalGlImpactSettings
  glImpactColumns: Record<JournalGlImpactColumnKey, JournalGlImpactColumnCustomization>
  statCards: JournalStatCardSlot[]
}

export const JOURNAL_DETAIL_FIELDS: JournalDetailFieldMeta[] = [
  { id: 'number', label: 'Journal Id', fieldType: 'text', description: 'Unique journal identifier.' },
  { id: 'date', label: 'Date', fieldType: 'date', description: 'Posting date for the journal entry.' },
  { id: 'description', label: 'Description', fieldType: 'text', description: 'Header description for the journal entry.' },
  { id: 'status', label: 'Status', fieldType: 'list', source: 'Journal status list', description: 'Current lifecycle stage of the journal.' },
  { id: 'subsidiaryId', label: 'Subsidiary', fieldType: 'list', source: 'Subsidiaries master data', description: 'Default subsidiary context for the journal.' },
  { id: 'currencyId', label: 'Currency', fieldType: 'list', source: 'Currencies master data', description: 'Currency used for the journal header total display.' },
  { id: 'accountingPeriodId', label: 'Accounting Period', fieldType: 'list', source: 'Accounting periods', description: 'Accounting period that owns the journal.' },
  { id: 'journalType', label: 'Journal Type', fieldType: 'text', description: 'Standard or intercompany journal classification.' },
  { id: 'total', label: 'Total', fieldType: 'currency', description: 'Persisted journal total stored on the journal header.' },
  { id: 'sourceType', label: 'Source Type', fieldType: 'list', source: 'Journal source type list', description: 'Origin or purpose classification for the journal.' },
  { id: 'sourceId', label: 'Source Id', fieldType: 'text', description: 'Identifier from the originating source record.' },
  { id: 'userId', label: 'Created By', fieldType: 'list', source: 'Users', description: 'User account that created the journal entry.' },
  { id: 'postedByEmployeeId', label: 'Prepared By', fieldType: 'list', source: 'Employees master data', description: 'Employee that prepared the journal.' },
  { id: 'approvedByEmployeeId', label: 'Approved By', fieldType: 'list', source: 'Employees master data', description: 'Employee that approved the journal.' },
  { id: 'createdAt', label: 'Date Created', fieldType: 'date', description: 'Timestamp when the journal was created.' },
  { id: 'updatedAt', label: 'Last Modified', fieldType: 'date', description: 'Timestamp of the most recent journal update.' },
]

export const DEFAULT_JOURNAL_DETAIL_SECTIONS = ['Journal Entry', 'Source And Approval'] as const

export const JOURNAL_STAT_CARDS: Array<{ id: JournalStatCardKey; label: string }> = [
  { id: 'totalDebits', label: 'Total Debits' },
  { id: 'totalCredits', label: 'Total Credits' },
  { id: 'balance', label: 'Balance' },
  { id: 'journalLines', label: 'Journal Lines' },
  { id: 'status', label: 'Status' },
  { id: 'sourceId', label: 'Source Id' },
]

export const JOURNAL_LINE_COLUMNS: JournalLineColumnMeta[] = [
  { id: 'line', label: 'Line', description: 'Row number for each journal line.' },
  { id: 'accountId', label: 'GL Account', description: 'Posting account for the journal line.' },
  { id: 'description', label: 'Description', description: 'Line description shown on the journal entry.' },
  { id: 'debit', label: 'Debit', description: 'Debit amount for the journal line.' },
  { id: 'credit', label: 'Credit', description: 'Credit amount for the journal line.' },
  { id: 'subsidiaryId', label: 'Subsidiary', description: 'Intercompany subsidiary assigned to the line.' },
  { id: 'departmentId', label: 'Department', description: 'Department classification on the line.' },
  { id: 'locationId', label: 'Location', description: 'Location classification on the line.' },
  { id: 'projectId', label: 'Project', description: 'Project associated with the line.' },
  { id: 'customerId', label: 'Customer', description: 'Customer associated with the line.' },
  { id: 'vendorId', label: 'Vendor', description: 'Vendor associated with the line.' },
  { id: 'itemId', label: 'Item', description: 'Item associated with the line.' },
  { id: 'employeeId', label: 'Employee', description: 'Employee associated with the line.' },
  { id: 'memo', label: 'Memo', description: 'Internal memo stored on the journal line.' },
] as const

export const JOURNAL_GL_IMPACT_COLUMNS: JournalGlImpactColumnMeta[] = [
  { id: 'line', label: 'Line', description: 'Row number for each GL impact line.' },
  { id: 'accountId', label: 'Account', description: 'Posting account impacted by the journal line.' },
  { id: 'description', label: 'Description', description: 'Line description or memo contributing to the impact.' },
  { id: 'subsidiaryId', label: 'Subsidiary', description: 'Subsidiary context for the GL impact row.' },
  { id: 'departmentId', label: 'Department', description: 'Department classification on the GL impact row.' },
  { id: 'locationId', label: 'Location', description: 'Location classification on the GL impact row.' },
  { id: 'projectId', label: 'Project', description: 'Project associated with the GL impact row.' },
  { id: 'customerId', label: 'Customer', description: 'Customer associated with the GL impact row.' },
  { id: 'vendorId', label: 'Vendor', description: 'Vendor associated with the GL impact row.' },
  { id: 'itemId', label: 'Item', description: 'Item associated with the GL impact row.' },
  { id: 'employeeId', label: 'Employee', description: 'Employee associated with the GL impact row.' },
  { id: 'debit', label: 'Debit', description: 'Debit amount posted by the GL impact row.' },
  { id: 'credit', label: 'Credit', description: 'Credit amount posted by the GL impact row.' },
] as const

export const DEFAULT_JOURNAL_STAT_CARD_METRICS: JournalStatCardKey[] = [
  'totalDebits',
  'totalCredits',
  'balance',
  'journalLines',
]

const DEFAULT_JOURNAL_LINE_WIDTHS: Record<JournalLineColumnKey, JournalLineWidthMode> = {
  line: 'compact',
  accountId: 'wide',
  description: 'normal',
  debit: 'normal',
  credit: 'normal',
  subsidiaryId: 'normal',
  departmentId: 'compact',
  locationId: 'compact',
  projectId: 'compact',
  customerId: 'normal',
  vendorId: 'normal',
  itemId: 'normal',
  employeeId: 'normal',
  memo: 'normal',
}

const DEFAULT_JOURNAL_LINE_EDIT_DISPLAY: Record<JournalLineColumnKey, JournalLineDisplayMode> = {
  line: 'label',
  accountId: 'idAndLabel',
  description: 'label',
  debit: 'label',
  credit: 'label',
  subsidiaryId: 'label',
  departmentId: 'label',
  locationId: 'label',
  projectId: 'label',
  customerId: 'label',
  vendorId: 'label',
  itemId: 'label',
  employeeId: 'label',
  memo: 'label',
}

const DEFAULT_JOURNAL_LINE_VIEW_DISPLAY: Record<JournalLineColumnKey, JournalLineDisplayMode> = {
  ...DEFAULT_JOURNAL_LINE_EDIT_DISPLAY,
}

const DEFAULT_JOURNAL_LINE_DROPDOWN_DISPLAY: Record<JournalLineColumnKey, JournalLineDisplayMode> = {
  ...DEFAULT_JOURNAL_LINE_EDIT_DISPLAY,
}

const DEFAULT_JOURNAL_LINE_DROPDOWN_SORT: Record<JournalLineColumnKey, JournalLineDropdownSortMode> = {
  line: 'id',
  accountId: 'id',
  description: 'label',
  debit: 'id',
  credit: 'id',
  subsidiaryId: 'id',
  departmentId: 'id',
  locationId: 'id',
  projectId: 'label',
  customerId: 'id',
  vendorId: 'id',
  itemId: 'id',
  employeeId: 'id',
  memo: 'label',
}

const DEFAULT_JOURNAL_GL_IMPACT_WIDTHS: Record<JournalGlImpactColumnKey, JournalLineWidthMode> = {
  line: 'compact',
  accountId: 'wide',
  description: 'wide',
  subsidiaryId: 'normal',
  departmentId: 'compact',
  locationId: 'compact',
  projectId: 'normal',
  customerId: 'wide',
  vendorId: 'wide',
  itemId: 'wide',
  employeeId: 'normal',
  debit: 'normal',
  credit: 'normal',
}

const DEFAULT_JOURNAL_GL_IMPACT_VIEW_DISPLAY: Record<JournalGlImpactColumnKey, JournalLineDisplayMode> = {
  line: 'label',
  accountId: 'idAndLabel',
  description: 'label',
  subsidiaryId: 'idAndLabel',
  departmentId: 'idAndLabel',
  locationId: 'idAndLabel',
  projectId: 'idAndLabel',
  customerId: 'idAndLabel',
  vendorId: 'idAndLabel',
  itemId: 'idAndLabel',
  employeeId: 'idAndLabel',
  debit: 'label',
  credit: 'label',
}

export function defaultJournalDetailCustomization(): JournalDetailCustomizationConfig {
  const sectionMap: Record<JournalDetailFieldKey, string> = {
    number: 'Journal Entry',
    date: 'Journal Entry',
    description: 'Journal Entry',
    status: 'Journal Entry',
    subsidiaryId: 'Journal Entry',
    currencyId: 'Journal Entry',
    accountingPeriodId: 'Journal Entry',
    journalType: 'Journal Entry',
    total: 'Journal Entry',
    sourceType: 'Source And Approval',
    sourceId: 'Source And Approval',
    userId: 'Source And Approval',
    postedByEmployeeId: 'Source And Approval',
    approvedByEmployeeId: 'Source And Approval',
    createdAt: 'Source And Approval',
    updatedAt: 'Source And Approval',
  }

  const columnMap: Record<JournalDetailFieldKey, number> = {
    number: 1,
    date: 1,
    description: 1,
    status: 2,
    subsidiaryId: 2,
    currencyId: 2,
    accountingPeriodId: 3,
    journalType: 3,
    total: 4,
    sourceType: 1,
    sourceId: 1,
    userId: 3,
    postedByEmployeeId: 2,
    approvedByEmployeeId: 2,
    createdAt: 4,
    updatedAt: 4,
  }

  const rowMap: Record<JournalDetailFieldKey, number> = {
    number: 0,
    date: 1,
    description: 2,
    status: 0,
    subsidiaryId: 1,
    currencyId: 2,
    accountingPeriodId: 0,
    journalType: 2,
    total: 0,
    sourceType: 0,
    sourceId: 1,
    userId: 0,
    postedByEmployeeId: 0,
    approvedByEmployeeId: 1,
    createdAt: 0,
    updatedAt: 1,
  }

  return {
    formColumns: 4,
    sections: [...DEFAULT_JOURNAL_DETAIL_SECTIONS],
    sectionRows: {
      'Journal Entry': 3,
      'Source And Approval': 2,
    },
    lineSettings: {
      fontSize: 'xs',
    },
    glImpactSettings: {
      fontSize: 'xs',
    },
    fields: Object.fromEntries(
      JOURNAL_DETAIL_FIELDS.map((field) => [
        field.id,
        {
          visible: true,
          section: sectionMap[field.id],
          order: rowMap[field.id],
          column: columnMap[field.id],
        },
      ]),
    ) as Record<JournalDetailFieldKey, JournalDetailFieldCustomization>,
    lineColumns: Object.fromEntries(
      JOURNAL_LINE_COLUMNS.map((column, index) => [
        column.id,
        {
          visible: true,
          order: index,
          widthMode: DEFAULT_JOURNAL_LINE_WIDTHS[column.id],
          editDisplay: DEFAULT_JOURNAL_LINE_EDIT_DISPLAY[column.id],
          viewDisplay: DEFAULT_JOURNAL_LINE_VIEW_DISPLAY[column.id],
          dropdownDisplay: DEFAULT_JOURNAL_LINE_DROPDOWN_DISPLAY[column.id],
          dropdownSort: DEFAULT_JOURNAL_LINE_DROPDOWN_SORT[column.id],
        },
      ]),
    ) as Record<JournalLineColumnKey, JournalLineColumnCustomization>,
    glImpactColumns: Object.fromEntries(
      JOURNAL_GL_IMPACT_COLUMNS.map((column, index) => [
        column.id,
        {
          visible: true,
          order: index,
          widthMode: DEFAULT_JOURNAL_GL_IMPACT_WIDTHS[column.id],
          viewDisplay: DEFAULT_JOURNAL_GL_IMPACT_VIEW_DISPLAY[column.id],
        },
      ]),
    ) as Record<JournalGlImpactColumnKey, JournalGlImpactColumnCustomization>,
    statCards: DEFAULT_JOURNAL_STAT_CARD_METRICS.map((metric, index) => ({
      id: `slot-${index + 1}`,
      metric,
      visible: true,
      order: index,
    })),
  }
}
