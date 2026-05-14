export const SUPPORTED_ENTITIES = [
  'currencies',
  'locations',
  'subsidiaries',
  'chart-of-accounts',
  'departments',
  'items',
  'employees',
  'customers',
  'price-levels',
  'price-books',
  'billing-accounts',
  'billing-schedules',
  'subscription-plans',
  'contacts',
  'vendors',
] as const

export type SupportedEntity = (typeof SUPPORTED_ENTITIES)[number]

type FieldDefinition = {
  key: string
  required: boolean
  templateLabel?: string
}

type EntitySchema = {
  label: string
  fields: FieldDefinition[]
  sampleRows: string[][]
}

export const MASTER_DATA_IMPORT_SCHEMA: Record<SupportedEntity, EntitySchema> = {
  currencies: {
    label: 'Currencies',
    fields: [
      { key: 'code', required: true },
      { key: 'name', required: true },
      { key: 'symbol', required: false },
      { key: 'decimals', required: false },
      { key: 'isBase', required: false },
      { key: 'active', required: false },
    ],
    sampleRows: [
      ['USD', 'US Dollar', '$', '2', 'true', 'true'],
      ['EUR', 'Euro', 'EUR', '2', 'false', 'true'],
      ['GBP', 'British Pound', 'GBP', '2', 'false', 'true'],
    ],
  },
  'billing-schedules': {
    label: 'Billing Schedules',
    fields: [
      { key: 'billingScheduleId', required: false },
      { key: 'name', required: true },
      { key: 'description', required: false },
      { key: 'scheduleType', required: false },
      { key: 'frequency', required: false },
      { key: 'billingTiming', required: false },
      { key: 'billingAnchor', required: false },
      { key: 'billingDay', required: false },
      { key: 'prorationPolicy', required: false },
      { key: 'renewalMode', required: false },
      { key: 'invoiceGroupingPolicy', required: false },
      { key: 'graceDays', required: false },
      { key: 'minimumBillAmount', required: false },
      { key: 'currencyCode', required: false },
      { key: 'inactive', required: false },
    ],
    sampleRows: [
      ['BSCH-00001', 'Monthly in Advance', 'Monthly billing on the first day in advance', 'recurring', 'monthly', 'advance', 'calendar_month', '1', 'daily', 'auto', 'by_billing_account', '0', '', 'USD', 'false'],
    ],
  },
  'billing-accounts': {
    label: 'Billing Accounts',
    fields: [
      { key: 'billingAccountId', required: false },
      { key: 'name', required: true },
      { key: 'description', required: false },
      { key: 'customer', required: true },
      { key: 'accountType', required: false },
      { key: 'status', required: false },
      { key: 'subsidiary', required: false },
      { key: 'currencyCode', required: false },
      { key: 'defaultBillingSchedule', required: false },
      { key: 'defaultPriceBook', required: false },
      { key: 'defaultPriceLevel', required: false },
      { key: 'invoiceDeliveryMethod', required: false },
      { key: 'paymentTerms', required: false },
      { key: 'paymentMethod', required: false },
      { key: 'taxable', required: false },
      { key: 'taxCode', required: false },
      { key: 'inactive', required: false },
    ],
    sampleRows: [
      ['BA-00001', 'Acme Default Billing', 'Default consolidated billing account', 'Acme Corporation', 'consolidated', 'active', 'SUB-002', 'USD', 'Monthly in Advance', 'Global Standard', 'Standard', 'email', 'net_30', 'ach', 'true', 'AVATAX-SVC', 'false'],
    ],
  },
  'subscription-plans': {
    label: 'Subscription Plans',
    fields: [
      { key: 'subscriptionPlanId', required: false },
      { key: 'name', required: true },
      { key: 'description', required: false },
      { key: 'planType', required: false },
      { key: 'billingModel', required: false },
      { key: 'status', required: false },
      { key: 'item', required: false },
      { key: 'subsidiary', required: false },
      { key: 'currencyCode', required: false },
      { key: 'defaultBillingSchedule', required: false },
      { key: 'defaultPriceBook', required: false },
      { key: 'defaultPriceLevel', required: false },
      { key: 'termMonths', required: false },
      { key: 'autoRenew', required: false },
      { key: 'renewalMode', required: false },
      { key: 'usageRatingModel', required: false },
      { key: 'revenueRecognitionPolicy', required: false },
      { key: 'inactive', required: false },
    ],
    sampleRows: [
      ['SPLAN-00001', 'Digital Commerce Platform', 'Annual SaaS subscription plan', 'recurring', 'fixed_recurring', 'active', 'Digital Commerce Platform', 'SUB-002', 'USD', 'Annual Calendar Year Prorated', 'Global Standard', 'Standard', '12', 'true', 'auto', 'none', 'ratable', 'false'],
    ],
  },
  subsidiaries: {
    label: 'Subsidiaries',
    fields: [
      { key: 'code', required: true },
      { key: 'name', required: true },
      { key: 'legalName', required: false },
      { key: 'entityType', required: false },
      { key: 'taxId', required: false },
      { key: 'registrationNumber', required: false },
      { key: 'localCurrencyCode', required: false },
      { key: 'active', required: false },
    ],
    sampleRows: [
      ['SUB-001', 'Main Subsidiary', 'Main Corp Inc.', 'corporation', 'XX-1234567', 'REG-001', 'USD', 'true'],
      ['SUB-002', 'European Branch', 'European Operations Ltd.', 'branch', 'DE-9876543', 'REG-002', 'EUR', 'true'],
    ],
  },
  'chart-of-accounts': {
    label: 'Chart of Accounts',
    fields: [
      { key: 'accountId', required: false },
      { key: 'accountNumber', required: true },
      { key: 'name', required: true },
      { key: 'accountType', required: true },
      { key: 'category', required: false, templateLabel: 'Account Category' },
      { key: 'normalBalance', required: false, templateLabel: 'Normal Balance' },
      { key: 'description', required: false },
      { key: 'accountRole', required: false },
      { key: 'financialStatementSection', required: false, templateLabel: 'FS Section' },
      { key: 'financialStatementGroup', required: false, templateLabel: 'FS Group' },
      { key: 'financialStatementCategory', required: false, templateLabel: 'FS Category' },
      { key: 'rollforwardCategory', required: false, templateLabel: 'Rollforward Category' },
      { key: 'inventory', required: false },
      { key: 'revalueOpenBalance', required: false, templateLabel: 'Remeasure Open Balance' },
      { key: 'monetaryClassification', required: false, templateLabel: 'Monetary Classification' },
      { key: 'translationTreatment', required: false, templateLabel: 'Translation Treatment' },
      { key: 'eliminateIntercoTransactions', required: false },
      { key: 'summary', required: false },
      { key: 'scopeMode', required: false },
      { key: 'parentSubsidiaryCode', required: false },
      { key: 'includeChildren', required: false },
      { key: 'subsidiaryCodes', required: false },
    ],
    sampleRows: [
      ['GL-00001', '1000', 'Cash', 'Asset', 'Cash and Cash Equivalents', 'Debit', 'Cash and equivalents', 'Bank Account', 'Balance Sheet', 'Cash', 'Cash and Cash Equivalents', 'Cash and Cash Equivalents', 'false', 'true', 'monetary', 'closing_rate', 'false', 'false', 'selected', '', 'false', 'SUB-001,SUB-002'],
      ['GL-00002', '4000', 'Revenue', 'Revenue', 'Product Revenue', 'Credit', 'Sales revenue', 'Not Applicable', 'Income Statement', 'Revenue', 'Product Revenue', 'Not Applicable', 'false', 'false', 'p_and_l_flow', 'average_rate', 'false', 'false', 'parent', 'SUB-001', 'true', ''],
    ],
  },
  locations: {
    label: 'Locations',
    fields: [
      { key: 'locationId', required: false },
      { key: 'code', required: true },
      { key: 'name', required: true },
      { key: 'subsidiaryId', required: false },
      { key: 'parentLocationId', required: false },
      { key: 'locationType', required: false },
      { key: 'makeInventoryAvailable', required: false },
      { key: 'address', required: false },
      { key: 'active', required: false },
    ],
    sampleRows: [
      ['LOC-00001', 'HQ', 'Headquarters', 'SUB-001', '', 'Office', 'true', '100 Main St, Irvine, CA 92618', 'true'],
      ['', 'WH-01', 'Primary Warehouse', 'SUB-001', 'LOC-00001', 'Warehouse', 'true', '200 Distribution Way, Phoenix, AZ 85001', 'true'],
      ['', 'STORE-01', 'Retail Store 01', 'SUB-001', 'LOC-00001', 'Store', 'true', '300 Market St, San Diego, CA 92101', 'true'],
    ],
  },
  departments: {
    label: 'Departments',
    fields: [
      { key: 'departmentId', required: true },
      { key: 'name', required: true },
      { key: 'description', required: false },
      { key: 'division', required: false },
      { key: 'subsidiaryCode', required: false },
      { key: 'managerEmployeeNumber', required: false },
      { key: 'active', required: false },
    ],
    sampleRows: [
      ['SALES', 'Sales Department', 'Handles all sales operations', 'North America', 'SUB-001', 'EMP-001', 'true'],
      ['ENG', 'Engineering', 'Product development and support', 'Platform', 'SUB-001', 'EMP-002', 'true'],
      ['HR', 'Human Resources', 'HR and employee services', 'Corporate', '', '', 'true'],
    ],
  },
  items: {
    label: 'Items',
    fields: [
      { key: 'itemId', required: false },
      { key: 'externalId', required: false },
      { key: 'sku', required: false },
      { key: 'name', required: true },
      { key: 'description', required: false },
      { key: 'salesDescription', required: false },
      { key: 'purchaseDescription', required: false },
      { key: 'itemType', required: false },
      { key: 'itemCategory', required: false },
      { key: 'uom', required: false },
      { key: 'primaryPurchaseUnit', required: false },
      { key: 'primarySaleUnit', required: false },
      { key: 'primaryUnitsType', required: false },
      { key: 'listPrice', required: false },
      { key: 'currencyCode', required: false },
      { key: 'subsidiaryCodes', required: false },
      { key: 'includeChildren', required: false },
      { key: 'departmentId', required: false },
      { key: 'locationCode', required: false },
      { key: 'line', required: false },
      { key: 'productLine', required: false },
      { key: 'dropShipItem', required: false },
      { key: 'specialOrderItem', required: false },
      { key: 'canBeFulfilled', required: false },
      { key: 'preferredVendorId', required: false },
      { key: 'taxCode', required: false },
      { key: 'active', required: false },
    ],
    sampleRows: [
      ['ITEM-001', '', 'SKU-001', 'Product A', 'Premium product variant', 'Customer-facing description', 'Vendor-facing description', 'product', 'Software', 'EA', 'EA', 'EA', 'Each', '99.99', 'USD', 'SUB-001,SUB-002', 'false', 'DEPT-00001', 'LOC-001', 'Cloud', 'Subscriptions', 'false', 'false', 'true', 'VEND-000001', 'AVATAX-SW', 'true'],
      ['ITEM-002', '', 'SKU-002', 'Service B', 'Consulting services', 'Professional services', 'Contractor services', 'service', 'Services', 'HR', 'Hour', 'Hour', 'Time', '150.00', 'USD', 'SUB-001', 'false', 'DEPT-00002', 'LOC-001', 'Consulting', 'Implementation', 'false', 'false', 'false', 'VEND-000002', 'AVATAX-SVC', 'true'],
      ['', '', 'SKU-003', 'Product C', 'Entry level product', 'Starter product', 'Inventory replenishment description', 'product', 'Hardware', 'EA', 'EA', 'EA', 'Each', '49.99', 'EUR', 'SUB-002', 'true', '', '', 'Devices', 'Entry', 'true', 'false', 'false', '', 'AVATAX-HW', 'true'],
    ],
  },
  employees: {
    label: 'Employees',
    fields: [
      { key: 'employeeId', required: false },
      { key: 'eid', required: false },
      { key: 'firstName', required: true },
      { key: 'lastName', required: true },
      { key: 'email', required: false },
      { key: 'phone', required: false },
      { key: 'title', required: false },
      { key: 'laborType', required: false },
      { key: 'departmentCode', required: false },
      { key: 'subsidiaryIds', required: false },
      { key: 'includeChildren', required: false },
      { key: 'managerEmployeeId', required: false },
      { key: 'active', required: false },
    ],
    sampleRows: [
      ['EMP-001', 'EID-001', 'John', 'Smith', 'john.smith@company.com', '+1-555-0101', 'Sales Director', 'FTE', 'SALES', 'SUB-001', 'true', '', 'true'],
      ['EMP-002', 'EID-002', 'Jane', 'Doe', 'jane.doe@company.com', '+1-555-0102', 'Engineering Lead', 'FTE', 'ENG', 'SUB-001', 'true', '', 'true'],
      ['EMP-003', 'EID-003', 'Bob', 'Johnson', 'bob.johnson@company.com', '+1-555-0103', 'Sales Representative', 'PTE', 'SALES', 'SUB-001', 'true', 'EMP-001', 'true'],
    ],
  },
  customers: {
    label: 'Customers',
    fields: [
      { key: 'customerNumber', required: false },
      { key: 'name', required: true },
      { key: 'customerStatus', required: false },
      { key: 'customerType', required: false },
      { key: 'customerGroup', required: false },
      { key: 'territory', required: false },
      { key: 'salesManager', required: false },
      { key: 'projectManager', required: false },
      { key: 'email', required: false },
      { key: 'phone', required: false },
      { key: 'address', required: false },
      { key: 'industry', required: false },
      { key: 'arAccountNumber', required: false, templateLabel: 'AR Account Number' },
      { key: 'startDate', required: false },
      { key: 'endDate', required: false },
      { key: 'reminderDays', required: false },
      { key: 'priceLevel', required: false },
      { key: 'priceBook', required: false },
      { key: 'taxable', required: false },
      { key: 'taxItem', required: false, templateLabel: 'Tax Code' },
      { key: 'resaleNumber', required: false },
      { key: 'language', required: false },
      { key: 'numberFormat', required: false },
      { key: 'negativeNumberFormat', required: false },
      { key: 'shipComplete', required: false },
      { key: 'shippingCarrier', required: false },
      { key: 'shippingMethod', required: false },
      { key: 'blockCollectionEmail', required: false },
      { key: 'collectionsRep', required: false },
      { key: 'subsidiaryCode', required: false },
      { key: 'currencyCode', required: false },
      { key: 'includeChildren', required: false },
      { key: 'active', required: false },
    ],
    sampleRows: [
      ['CUST-000001', 'Acme Corporation', 'Active', 'Enterprise', 'Strategic', 'North America', 'EMP-000001', 'EMP-000002', 'contact@acme.com', '+1-555-0201', '123 Business St, New York, NY 10001', 'Technology', '12100', '2026-01-01', '', '30', 'Standard', 'US Commercial', 'true', 'AVATAX-CA', '', 'English', '1,234.56', '(1,234.56)', 'true', 'UPS', 'Ground', 'false', 'EMP-000003', 'SUB-001', 'USD', 'false', 'true'],
      ['CUST-000002', 'Global Enterprises', 'Active', 'Enterprise', 'Commercial', 'North America', '', '', 'info@global.com', '+1-555-0202', '456 Corporate Ave, Chicago, IL 60601', 'Finance', '12100', '2026-01-01', '', '45', 'Preferred', 'US Commercial', 'true', 'AVATAX-NY', '', 'English', '1,234.56', '-1,234.56', 'false', 'FedEx', '2 Day', 'false', '', 'SUB-001', 'USD', 'false', 'true'],
      ['', 'European Partners Ltd', 'Prospect', 'Distributor', 'International', 'EMEA', '', '', 'hello@eupartners.eu', '+49-30-12345678', 'Berlin, Germany', 'Manufacturing', '12100', '2026-02-01', '', '30', 'EMEA', 'EMEA Commercial', 'false', '', 'EU-RESALE-001', 'English', '1.234,56', '-1.234,56', 'false', 'DHL', 'International', 'true', '', 'SUB-002', 'EUR', 'true', 'true'],
    ],
  },
  'price-levels': {
    label: 'Price Levels',
    fields: [
      { key: 'priceLevelId', required: false },
      { key: 'name', required: true },
      { key: 'description', required: false },
      { key: 'levelType', required: false },
      { key: 'subsidiaryCode', required: false },
      { key: 'includeChildren', required: false },
      { key: 'defaultDiscountPct', required: false },
      { key: 'minimumMarginPct', required: false },
      { key: 'approvalRequired', required: false },
      { key: 'approvalWorkflow', required: false },
      { key: 'allowManualOverride', required: false },
      { key: 'effectiveStartDate', required: false },
      { key: 'effectiveEndDate', required: false },
      { key: 'active', required: false },
    ],
    sampleRows: [
      ['PL-00001', 'Standard', 'Default published customer pricing.', 'Standard', 'SUB-001', 'true', '0', '0', 'false', '', 'true', '2026-01-01', '', 'true'],
      ['PL-00002', 'Preferred', 'Preferred customer pricing.', 'Preferred', 'SUB-001', 'true', '5', '20', 'false', '', 'true', '2026-01-01', '', 'true'],
      ['PL-00003', 'Distributor', 'Distributor discount pricing.', 'Distributor', 'SUB-001', 'true', '15', '15', 'true', 'price-level-approval', 'true', '2026-01-01', '', 'true'],
    ],
  },
  'price-books': {
    label: 'Price Books',
    fields: [
      { key: 'priceBookId', required: false },
      { key: 'name', required: true },
      { key: 'description', required: false },
      { key: 'bookType', required: false },
      { key: 'subsidiaryCode', required: false },
      { key: 'includeChildren', required: false },
      { key: 'currencyCode', required: false },
      { key: 'defaultPriceLevel', required: false },
      { key: 'approvalRequired', required: false },
      { key: 'approvalWorkflow', required: false },
      { key: 'allowManualOverride', required: false },
      { key: 'effectiveStartDate', required: false },
      { key: 'effectiveEndDate', required: false },
      { key: 'active', required: false },
    ],
    sampleRows: [
      ['PB-00001', 'Global Standard', 'Default global commercial price book.', 'Standard', 'SUB-001', 'true', 'USD', 'Standard', 'false', '', 'true', '2026-01-01', '', 'true'],
      ['PB-00002', 'US Commercial', 'Default US commercial price book.', 'Regional', 'SUB-002', 'true', 'USD', 'Preferred', 'false', '', 'true', '2026-01-01', '', 'true'],
      ['PB-00003', 'EMEA Commercial', 'Default EMEA commercial price book.', 'Regional', 'SUB-003', 'true', 'EUR', 'Preferred', 'false', '', 'true', '2026-01-01', '', 'true'],
    ],
  },
  contacts: {
    label: 'Contacts',
    fields: [
      { key: 'contactNumber', required: false },
      { key: 'firstName', required: true },
      { key: 'lastName', required: true },
      { key: 'email', required: false },
      { key: 'phone', required: false },
      { key: 'position', required: false },
      { key: 'customerNumber', required: true },
    ],
    sampleRows: [
      ['CONT-000001', 'Alice', 'Williams', 'alice.williams@acme.com', '+1-555-0301', 'Procurement Manager', 'CUST-000001'],
      ['CONT-000002', 'Charlie', 'Brown', 'charlie.brown@acme.com', '+1-555-0302', 'Operations Director', 'CUST-000001'],
      ['', 'Diana', 'Prince', 'diana@global.com', '+1-555-0303', 'Finance Manager', 'CUST-000002'],
    ],
  },
  vendors: {
    label: 'Vendors',
    fields: [
      { key: 'vendorNumber', required: false },
      { key: 'name', required: true },
      { key: 'email', required: false },
      { key: 'phone', required: false },
      { key: 'address', required: false },
      { key: 'taxId', required: false },
      { key: 'subsidiaryCode', required: false },
      { key: 'currencyCode', required: false },
      { key: 'active', required: false },
    ],
    sampleRows: [
      ['VEND-000001', 'Widget Supplies Inc', 'sales@widgets.com', '+1-555-0401', '789 Supply Rd, Boston, MA 02101', 'XX-1111111', 'SUB-001', 'USD', 'true'],
      ['VEND-000002', 'Parts Distributor Co', 'orders@partsdist.com', '+1-555-0402', '321 Distribution Way, Atlanta, GA 30301', 'XX-2222222', 'SUB-001', 'USD', 'true'],
      ['', 'European Supplies GmbH', 'kontakt@eusupp.de', '+49-40-87654321', 'Hamburg, Germany', 'DE-3333333', 'SUB-002', 'EUR', 'true'],
    ],
  },
}

export const MASTER_DATA_ENTITY_OPTIONS = SUPPORTED_ENTITIES.map((entity) => ({
  value: entity,
  label: MASTER_DATA_IMPORT_SCHEMA[entity].label,
}))

export function isSupportedEntity(value: string): value is SupportedEntity {
  return SUPPORTED_ENTITIES.includes(value as SupportedEntity)
}

export function getTemplateRows(entity: SupportedEntity): string[][] {
  const schema = MASTER_DATA_IMPORT_SCHEMA[entity]
  const headers = schema.fields.map((field) => field.templateLabel ?? field.key)
  return [headers, ...schema.sampleRows]
}

export function getRequiredHeaders(entity: SupportedEntity): string[] {
  return MASTER_DATA_IMPORT_SCHEMA[entity].fields.filter((field) => field.required).map((field) => field.key)
}

export function getFieldNames(entity: SupportedEntity): string[] {
  return MASTER_DATA_IMPORT_SCHEMA[entity].fields.map((field) => field.key)
}
