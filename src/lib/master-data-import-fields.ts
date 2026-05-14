import { CHART_OF_ACCOUNTS_FORM_FIELDS } from '@/lib/chart-of-accounts-form-customization'
import { CONTACT_FORM_FIELDS } from '@/lib/contact-form-customization'
import { CURRENCY_FORM_FIELDS } from '@/lib/currency-form-customization'
import { CUSTOMER_FORM_FIELDS } from '@/lib/customer-form-customization'
import { DEPARTMENT_FORM_FIELDS } from '@/lib/department-form-customization'
import { EMPLOYEE_FORM_FIELDS } from '@/lib/employee-form-customization'
import { ITEM_FORM_FIELDS } from '@/lib/item-form-customization'
import { LOCATION_FORM_FIELDS } from '@/lib/location-form-customization'
import { SUBSIDIARY_FORM_FIELDS } from '@/lib/subsidiary-form-customization'
import { VENDOR_FORM_FIELDS } from '@/lib/vendor-form-customization'
import type { SupportedEntity } from '@/lib/master-data-import-schema'

export type MasterDataImportFieldMeta = {
  key: string
  label: string
}

function toImportMeta(fields: Array<{ id: string; label: string }>): MasterDataImportFieldMeta[] {
  return fields.map((field) => ({ key: field.id, label: field.label }))
}

const ENTITY_FORM_FIELDS: Partial<Record<SupportedEntity, MasterDataImportFieldMeta[]>> = {
  currencies: toImportMeta(CURRENCY_FORM_FIELDS),
  locations: toImportMeta(LOCATION_FORM_FIELDS),
  subsidiaries: toImportMeta(SUBSIDIARY_FORM_FIELDS),
  'chart-of-accounts': toImportMeta(CHART_OF_ACCOUNTS_FORM_FIELDS),
  departments: toImportMeta(DEPARTMENT_FORM_FIELDS),
  items: toImportMeta(ITEM_FORM_FIELDS),
  employees: toImportMeta(EMPLOYEE_FORM_FIELDS),
  customers: toImportMeta(CUSTOMER_FORM_FIELDS),
  contacts: toImportMeta(CONTACT_FORM_FIELDS),
  vendors: toImportMeta(VENDOR_FORM_FIELDS),
}

const ENTITY_KEY_ALIASES: Partial<Record<SupportedEntity, Record<string, string[]>>> = {
  currencies: {
    active: ['inactive'],
  },
  locations: {
    locationId: ['locationNumber', 'location ID'],
    subsidiaryId: ['subsidiaryCode', 'subsidiary'],
    parentLocationId: ['parentLocationNumber', 'parent location'],
    active: ['inactive'],
  },
  subsidiaries: {
    code: ['subsidiaryId', 'subsidiaryCode', 'subsidiary ID'],
    localCurrencyCode: ['localCurrencyId', 'defaultCurrencyCode', 'currency'],
    active: ['inactive'],
  },
  'chart-of-accounts': {
    accountId: ['glAccountId', 'account ID'],
    accountNumber: ['number', 'GL account number'],
    category: ['accountCategory', 'Account Category', 'GL Account Category'],
    normalBalance: ['normal balance'],
    revalueOpenBalance: ['revalueOpenBalance', 'revalue open balance', 'remeasure open balance', 'remeasureOpenBalance'],
    monetaryClassification: ['monetary classification', 'fx treatment', 'accounting treatment'],
    translationTreatment: ['translation treatment', 'translation basis'],
    financialStatementSection: ['fsSection', 'FS Section'],
    financialStatementGroup: ['fsGroup', 'FS Group'],
    financialStatementCategory: ['fsCategory', 'FS Category'],
    rollforwardCategory: ['rollforward', 'Rollforward Category'],
    subsidiaryCodes: ['subsidiaryIds', 'subsidiaries'],
    parentSubsidiaryCode: ['parentSubsidiaryId', 'parent subsidiary'],
  },
  departments: {
    departmentId: ['code', 'departmentCode', 'department ID'],
    managerEmployeeNumber: ['managerEmployeeId', 'manager'],
    subsidiaryCode: ['subsidiaryId', 'subsidiary'],
    active: ['inactive'],
  },
  items: {
    itemId: ['itemNumber', 'item ID'],
    currencyCode: ['currencyId', 'currency'],
    subsidiaryCodes: ['subsidiaryIds', 'subsidiaries'],
    subsidiaryCode: ['subsidiaryId', 'subsidiary'],
    locationCode: ['locationId', 'location'],
    departmentId: ['departmentCode', 'department'],
    preferredVendorId: ['preferredVendorNumber', 'preferred vendor'],
    active: ['inactive'],
  },
  employees: {
    employeeId: ['employeeNumber', 'employee ID'],
    departmentCode: ['departmentId', 'department'],
    subsidiaryIds: ['subsidiaryCodes', 'subsidiaries'],
    managerEmployeeId: ['managerEmployeeNumber', 'manager'],
    active: ['inactive'],
  },
  customers: {
    customerNumber: ['customerId', 'customer ID'],
    arAccountNumber: ['arAccountId', 'arAccount', 'ar account', 'account', 'receivables account'],
    subsidiaryCode: ['primarySubsidiaryId', 'subsidiaryId', 'subsidiary'],
    currencyCode: ['primaryCurrencyId', 'currencyId', 'currency'],
    active: ['inactive'],
  },
  contacts: {
    contactNumber: ['contactId', 'contact ID'],
    customerNumber: ['customerId', 'customer'],
  },
  vendors: {
    vendorNumber: ['vendorId', 'vendor ID'],
    subsidiaryCode: ['primarySubsidiaryId', 'subsidiaryId', 'subsidiary'],
    currencyCode: ['primaryCurrencyId', 'currencyId', 'currency'],
    active: ['inactive'],
  },
}

export function normalizeImportHeader(value: string) {
  return value
    .trim()
    .replace(/\s*\((required|optional)\)\s*$/i, '')
    .replace(/\s*\*\s*$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function getMasterDataImportFieldMeta(entity: SupportedEntity) {
  return ENTITY_FORM_FIELDS[entity] ?? []
}

export function buildMasterDataImportHeaderMap(entity: SupportedEntity, technicalFields: string[]) {
  const headerMap = new Map<string, string>()

  function addAlias(alias: string, key: string) {
    const normalized = normalizeImportHeader(alias)
    if (normalized && !headerMap.has(normalized)) {
      headerMap.set(normalized, key)
    }
  }

  for (const key of technicalFields) {
    addAlias(key, key)
  }

  for (const field of getMasterDataImportFieldMeta(entity)) {
    addAlias(field.key, field.key)
    addAlias(field.label, field.key)
  }

  const aliases = ENTITY_KEY_ALIASES[entity] ?? {}
  for (const [key, values] of Object.entries(aliases)) {
    addAlias(key, key)
    for (const alias of values) {
      addAlias(alias, key)
    }
  }

  return headerMap
}

export function canonicalizeMasterDataImportRows(
  entity: SupportedEntity,
  rows: Array<Record<string, string>>,
  technicalFields: string[],
) {
  const headerMap = buildMasterDataImportHeaderMap(entity, technicalFields)
  return rows.map((row) => {
    const output: Record<string, string> = { ...row }
    for (const [key, value] of Object.entries(row)) {
      const canonicalKey = headerMap.get(normalizeImportHeader(key))
      if (canonicalKey && output[canonicalKey] === undefined) {
        output[canonicalKey] = value
      }
    }
    return output
  })
}
