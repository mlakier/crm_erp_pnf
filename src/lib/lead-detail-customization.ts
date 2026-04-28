import type { TransactionStatCardSlot } from '@/lib/transaction-page-config'
import {
  buildDefaultTransactionReferenceLayout,
  type TransactionReferenceLayout,
} from '@/lib/transaction-reference-layouts'
import {
  type LinkedRecordReferenceSource,
  CONTACT_FULL_REFERENCE_FIELDS,
  CUSTOMER_FULL_REFERENCE_FIELDS,
  CURRENCY_FULL_REFERENCE_FIELDS,
  OPPORTUNITY_FULL_REFERENCE_FIELDS,
  SUBSIDIARY_FULL_REFERENCE_FIELDS,
  USER_FULL_REFERENCE_FIELDS,
} from '@/lib/linked-record-reference-catalogs'

export type LeadDetailFieldKey =
  | 'id'
  | 'leadNumber'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'company'
  | 'title'
  | 'status'
  | 'source'
  | 'rating'
  | 'expectedValue'
  | 'subsidiaryId'
  | 'currencyId'
  | 'website'
  | 'industry'
  | 'address'
  | 'notes'
  | 'lastContactedAt'
  | 'qualifiedAt'
  | 'convertedAt'
  | 'inactive'
  | 'createdBy'
  | 'createdAt'
  | 'updatedAt'

export type LeadDetailFieldMeta = {
  id: LeadDetailFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
}

export type LeadDetailFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type LeadStatCardKey =
  | 'company'
  | 'source'
  | 'expectedValue'
  | 'status'
  | 'createdAt'

export type LeadStatCardSlot = TransactionStatCardSlot<LeadStatCardKey>

export type LeadDetailCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<LeadDetailFieldKey, LeadDetailFieldCustomization>
  referenceLayouts: TransactionReferenceLayout[]
  statCards: LeadStatCardSlot[]
}

export const LEAD_DETAIL_FIELDS: LeadDetailFieldMeta[] = [
  { id: 'id', label: 'DB Id', fieldType: 'text', description: 'Internal database identifier for the lead record.' },
  { id: 'leadNumber', label: 'Lead Id', fieldType: 'text', description: 'Generated lead number used across the Lead-to-Cash flow.' },
  { id: 'firstName', label: 'First Name', fieldType: 'text', description: 'Lead contact first name.' },
  { id: 'lastName', label: 'Last Name', fieldType: 'text', description: 'Lead contact last name.' },
  { id: 'email', label: 'Email', fieldType: 'email', description: 'Primary email address for the lead.' },
  { id: 'phone', label: 'Phone', fieldType: 'text', description: 'Primary phone number for the lead.' },
  { id: 'company', label: 'Company', fieldType: 'text', description: 'Company or organization associated with the lead.' },
  { id: 'title', label: 'Title', fieldType: 'text', description: 'Job title of the lead contact.' },
  { id: 'status', label: 'Status', fieldType: 'list', source: 'Lead status list', description: 'Current lifecycle stage of the lead.' },
  { id: 'source', label: 'Source', fieldType: 'list', source: 'Lead source list', description: 'How the lead was sourced.' },
  { id: 'rating', label: 'Rating', fieldType: 'list', source: 'Lead rating list', description: 'Qualification rating assigned to the lead.' },
  { id: 'expectedValue', label: 'Expected Value', fieldType: 'currency', description: 'Estimated commercial value associated with the lead.' },
  { id: 'subsidiaryId', label: 'Subsidiary', fieldType: 'list', source: 'Subsidiaries master data', description: 'Owning subsidiary for the lead.' },
  { id: 'currencyId', label: 'Currency', fieldType: 'list', source: 'Currencies master data', description: 'Preferred currency associated with the lead.' },
  { id: 'website', label: 'Website', fieldType: 'text', description: 'Website for the lead or associated company.' },
  { id: 'industry', label: 'Industry', fieldType: 'text', description: 'Industry associated with the lead.' },
  { id: 'address', label: 'Address', fieldType: 'text', description: 'Primary address recorded for the lead.' },
  { id: 'notes', label: 'Notes', fieldType: 'text', description: 'Freeform notes recorded against the lead.' },
  { id: 'lastContactedAt', label: 'Last Contacted', fieldType: 'date', description: 'Most recent contact date for the lead.' },
  { id: 'qualifiedAt', label: 'Qualified At', fieldType: 'date', description: 'Date the lead was qualified.' },
  { id: 'convertedAt', label: 'Converted At', fieldType: 'date', description: 'Date the lead was converted.' },
  { id: 'inactive', label: 'Inactive', fieldType: 'boolean', description: 'Whether the lead is inactive.' },
  { id: 'createdBy', label: 'Created By', fieldType: 'text', source: 'Users master data', description: 'User who created the lead.' },
  { id: 'createdAt', label: 'Created', fieldType: 'date', description: 'Date/time the lead record was created.' },
  { id: 'updatedAt', label: 'Last Modified', fieldType: 'date', description: 'Date/time the lead record was last modified.' },
]

export const LEAD_STAT_CARDS: Array<{ id: LeadStatCardKey; label: string }> = [
  { id: 'company', label: 'Company' },
  { id: 'source', label: 'Source' },
  { id: 'expectedValue', label: 'Expected Value' },
  { id: 'status', label: 'Status' },
  { id: 'createdAt', label: 'Created' },
]

export const LEAD_REFERENCE_SOURCES: LinkedRecordReferenceSource[] = [
  {
    id: 'customer',
    label: 'Customer',
    linkedFieldLabel: 'Customer',
    description: 'Expand the linked customer record created from this lead.',
    fields: CUSTOMER_FULL_REFERENCE_FIELDS,
    defaultVisibleFieldIds: ['customerNumber', 'customerName'],
    defaultColumns: 2,
    defaultRows: 1,
  },
  {
    id: 'contact',
    label: 'Contact',
    linkedFieldLabel: 'Contact',
    description: 'Expand the linked contact created from this lead.',
    fields: CONTACT_FULL_REFERENCE_FIELDS,
    defaultVisibleFieldIds: ['contactNumber', 'contactName', 'contactEmail'],
    defaultColumns: 2,
    defaultRows: 2,
  },
  {
    id: 'opportunity',
    label: 'Opportunity',
    linkedFieldLabel: 'Opportunity',
    description: 'Expand the linked opportunity created from this lead.',
    fields: OPPORTUNITY_FULL_REFERENCE_FIELDS,
    defaultVisibleFieldIds: ['opportunityNumber', 'opportunityName'],
    defaultColumns: 2,
    defaultRows: 1,
  },
  {
    id: 'owner',
    label: 'Created By',
    linkedFieldLabel: 'Created By',
    description: 'Expand the linked owner user record for this lead.',
    fields: USER_FULL_REFERENCE_FIELDS,
    defaultVisibleFieldIds: ['ownerUserId', 'ownerName', 'ownerEmail'],
    defaultColumns: 2,
    defaultRows: 2,
  },
  {
    id: 'subsidiary',
    label: 'Subsidiary',
    linkedFieldLabel: 'Subsidiary',
    description: 'Expand the linked subsidiary record for this lead.',
    fields: SUBSIDIARY_FULL_REFERENCE_FIELDS,
    defaultVisibleFieldIds: ['subsidiaryNumber', 'subsidiaryName'],
    defaultColumns: 2,
    defaultRows: 1,
  },
  {
    id: 'currency',
    label: 'Currency',
    linkedFieldLabel: 'Currency',
    description: 'Expand the linked currency record for this lead.',
    fields: CURRENCY_FULL_REFERENCE_FIELDS,
    defaultVisibleFieldIds: ['currencyCode', 'currencyName'],
    defaultColumns: 2,
    defaultRows: 1,
  },
]

const DEFAULT_LEAD_SECTIONS = [
  'Primary Contact',
  'Company Information',
  'Qualification',
  'System Information',
] as const
const DEFAULT_LEAD_STAT_CARD_METRICS: LeadStatCardKey[] = ['company', 'source', 'expectedValue', 'status']

export function defaultLeadDetailCustomization(): LeadDetailCustomizationConfig {
  const sectionMap: Record<LeadDetailFieldKey, string> = {
    id: 'System Information',
    leadNumber: 'System Information',
    firstName: 'Primary Contact',
    lastName: 'Primary Contact',
    email: 'Primary Contact',
    phone: 'Primary Contact',
    company: 'Company Information',
    title: 'Primary Contact',
    status: 'Qualification',
    source: 'Qualification',
    rating: 'Qualification',
    expectedValue: 'Qualification',
    subsidiaryId: 'Qualification',
    currencyId: 'Qualification',
    website: 'Company Information',
    industry: 'Company Information',
    address: 'Company Information',
    notes: 'Company Information',
    lastContactedAt: 'Qualification',
    qualifiedAt: 'Qualification',
    convertedAt: 'Qualification',
    inactive: 'System Information',
    createdBy: 'System Information',
    createdAt: 'System Information',
    updatedAt: 'System Information',
  }

  const columnMap: Record<LeadDetailFieldKey, number> = {
    id: 3, leadNumber: 1, firstName: 1, lastName: 2, email: 1, phone: 2, company: 1, title: 3,
    status: 1, source: 2, rating: 3, expectedValue: 1, subsidiaryId: 2, currencyId: 3,
    website: 2, industry: 3, address: 1, notes: 2, lastContactedAt: 1, qualifiedAt: 2, convertedAt: 3,
    inactive: 3, createdBy: 2, createdAt: 1, updatedAt: 2,
  }

  const rowMap: Record<LeadDetailFieldKey, number> = {
    id: 0, leadNumber: 0, firstName: 0, lastName: 0, email: 1, phone: 1, company: 0, title: 0,
    status: 0, source: 0, rating: 0, expectedValue: 1, subsidiaryId: 1, currencyId: 1,
    website: 0, industry: 0, address: 1, notes: 1, lastContactedAt: 2, qualifiedAt: 2, convertedAt: 2,
    inactive: 0, createdBy: 0, createdAt: 1, updatedAt: 1,
  }

  return {
    formColumns: 3,
    sections: [...DEFAULT_LEAD_SECTIONS],
    sectionRows: {
      'Primary Contact': 2,
      'Company Information': 2,
      Qualification: 3,
      'System Information': 2,
    },
    fields: Object.fromEntries(
      LEAD_DETAIL_FIELDS.map((field) => [
        field.id,
        {
          visible: !['id', 'inactive'].includes(field.id),
          section: sectionMap[field.id],
          order: rowMap[field.id],
          column: columnMap[field.id],
        },
      ])
    ) as Record<LeadDetailFieldKey, LeadDetailFieldCustomization>,
    referenceLayouts: [buildDefaultTransactionReferenceLayout(LEAD_REFERENCE_SOURCES, 'owner')],
    statCards: DEFAULT_LEAD_STAT_CARD_METRICS.map((metric, index) => ({
      id: `slot-${index + 1}`,
      metric,
      visible: true,
      order: index,
    })),
  }
}
