import type { MasterDataListSortOption } from '@/components/MasterDataListToolbar'
import {
  buildMasterDataColumns,
  type MasterDataColumn,
  withMasterDataDefaults,
} from '@/lib/master-data-columns'

export type MasterDataListDefinition = {
  columns: MasterDataColumn[]
  searchPlaceholder: string
  tableId: string
  exportFileName: string
  sortOptions: MasterDataListSortOption[]
  compactExport?: boolean
}

const NEWEST_OLDEST_NAME_SORT_OPTIONS: MasterDataListSortOption[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name', label: 'Name A-Z' },
]

export const currencyListDefinition: MasterDataListDefinition = {
  columns: [
    { id: 'currency-id', label: 'Currency Id' },
    { id: 'name', label: 'Name' },
    { id: 'symbol', label: 'Symbol' },
    { id: 'decimals', label: 'Decimals' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'created', label: 'Created' },
    { id: 'last-modified', label: 'Last Modified' },
    { id: 'actions', label: 'Actions', locked: true },
  ],
  searchPlaceholder: 'Search Currency Id or name',
  tableId: 'currencies-list',
  exportFileName: 'currencies',
  sortOptions: NEWEST_OLDEST_NAME_SORT_OPTIONS,
}

export const itemListDefinition: MasterDataListDefinition = {
  columns: [
    { id: 'item-id', label: 'Item Id' },
    { id: 'name', label: 'Name' },
    { id: 'sku', label: 'SKU' },
    { id: 'type', label: 'Item Type' },
    { id: 'price', label: 'Price' },
    { id: 'subsidiary', label: 'Subsidiary' },
    { id: 'currency', label: 'Currency' },
    { id: 'revenue-stream', label: 'Revenue Stream' },
    { id: 'recognition-method', label: 'Recognition Method' },
    { id: 'rev-rec-template', label: 'Rev Rec Template' },
    { id: 'ssp', label: 'SSP' },
    { id: 'standard-cost', label: 'Standard Cost' },
    { id: 'income-account', label: 'Income Account' },
    { id: 'deferred-revenue-account', label: 'Deferred Revenue Account' },
    { id: 'inventory-account', label: 'Inventory Account' },
    { id: 'cogs-expense-account', label: 'COGS / Expense Account' },
    { id: 'deferred-cost-account', label: 'Deferred Cost Account' },
    { id: 'direct-revenue-posting', label: 'Direct Revenue Posting' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'created', label: 'Created' },
    { id: 'last-modified', label: 'Last Modified' },
    { id: 'actions', label: 'Actions', locked: true },
  ],
  searchPlaceholder: 'Search name, Item Id, SKU',
  tableId: 'items-list',
  exportFileName: 'items',
  sortOptions: NEWEST_OLDEST_NAME_SORT_OPTIONS,
}

export const chartOfAccountsListDefinition: MasterDataListDefinition = {
  columns: [
    { id: 'account-id', label: 'Account Id' },
    { id: 'name', label: 'Name' },
    { id: 'type', label: 'Account Type' },
    { id: 'normal-balance', label: 'Normal Balance' },
    { id: 'fs-group', label: 'FS Group' },
    { id: 'posting', label: 'Posting' },
    { id: 'control', label: 'Control' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'summary', label: 'Summary' },
    { id: 'subsidiaries', label: 'Subsidiaries' },
    { id: 'created', label: 'Created' },
    { id: 'actions', label: 'Actions', locked: true },
  ],
  searchPlaceholder: 'Search Account Id, name, type',
  tableId: 'chart-of-accounts-list',
  exportFileName: 'chart_of_accounts',
  sortOptions: [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'account', label: 'Account #' },
  ],
}

export const departmentListDefinition: MasterDataListDefinition = {
  columns: [
    { id: 'department-id', label: 'Department Id' },
    { id: 'name', label: 'Name' },
    { id: 'description', label: 'Description' },
    { id: 'division', label: 'Division' },
    { id: 'subsidiary', label: 'Subsidiary' },
    { id: 'manager', label: 'Manager' },
    { id: 'status', label: 'Inactive' },
    { id: 'created', label: 'Created' },
    { id: 'last-modified', label: 'Last Modified' },
    { id: 'actions', label: 'Actions', locked: true },
  ],
  searchPlaceholder: 'Search Department Id, name, description, or division',
  tableId: 'departments-list',
  exportFileName: 'departments',
  sortOptions: NEWEST_OLDEST_NAME_SORT_OPTIONS,
}

export const departmentColumnLabels: Record<string, string> = {
  'department-id': 'Department Id',
  name: 'Name',
  description: 'Description',
  division: 'Division',
  subsidiary: 'Subsidiary',
  manager: 'Manager',
  status: 'Inactive',
  created: 'Created',
  'last-modified': 'Last Modified',
  actions: 'Actions',
}

export const subsidiaryListDefinition: MasterDataListDefinition = {
  columns: [
    { id: 'subsidiary-id', label: 'Subsidiary Id' },
    { id: 'name', label: 'Name' },
    { id: 'country', label: 'Country' },
    { id: 'address', label: 'Address' },
    { id: 'tax-id', label: 'Tax ID' },
    { id: 'parent-subsidiary', label: 'Parent Subsidiary' },
    { id: 'legal-name', label: 'Legal Name' },
    { id: 'type', label: 'Type' },
    { id: 'default-currency', label: 'Primary Currency' },
    { id: 'functional-currency', label: 'Functional Currency' },
    { id: 'reporting-currency', label: 'Reporting Currency' },
    { id: 'consolidation-method', label: 'Consolidation Method' },
    { id: 'ownership-percent', label: 'Ownership %' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'created', label: 'Created' },
    { id: 'last-modified', label: 'Last Modified' },
    { id: 'actions', label: 'Actions', locked: true },
  ],
  searchPlaceholder: 'Search subsidiary id or name',
  tableId: 'subsidiaries-list',
  exportFileName: 'subsidiaries',
  sortOptions: NEWEST_OLDEST_NAME_SORT_OPTIONS,
  compactExport: true,
}

export const employeeListDefinition: MasterDataListDefinition = {
  columns: [
    { id: 'employee-id', label: 'Employee Id' },
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'title', label: 'Title' },
    { id: 'department', label: 'Department' },
    { id: 'subsidiary', label: 'Subsidiary' },
    { id: 'linked-user', label: 'Linked User' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'created', label: 'Created' },
    { id: 'last-modified', label: 'Last Modified' },
    { id: 'actions', label: 'Actions', locked: true },
  ],
  searchPlaceholder: 'Search name or email',
  tableId: 'employees-list',
  exportFileName: 'employees',
  sortOptions: NEWEST_OLDEST_NAME_SORT_OPTIONS,
}

export const userListDefinition: MasterDataListDefinition = {
  columns: withMasterDataDefaults([
    { id: 'id', label: 'User ID' },
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'role', label: 'Role' },
    { id: 'department', label: 'Department' },
    { id: 'employee', label: 'Linked Employee' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'created', label: 'Created' },
    { id: 'last-modified', label: 'Last Modified' },
    { id: 'actions', label: 'Actions', locked: true },
  ]),
  searchPlaceholder: 'Search user #, name, email or role',
  tableId: 'users-list',
  exportFileName: 'users',
  sortOptions: NEWEST_OLDEST_NAME_SORT_OPTIONS,
}

export const roleListDefinition: MasterDataListDefinition = {
  columns: withMasterDataDefaults([
    { id: 'role-id', label: 'Role Id' },
    { id: 'name', label: 'Name' },
    { id: 'description', label: 'Description' },
    { id: 'users', label: 'Users' },
    { id: 'inactive-users', label: 'Inactive Users' },
    { id: 'active-users', label: 'Active Users' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'created', label: 'Created' },
    { id: 'last-modified', label: 'Last Modified' },
    { id: 'actions', label: 'Actions', locked: true },
  ]),
  searchPlaceholder: 'Search role',
  tableId: 'roles-list',
  exportFileName: 'roles',
  sortOptions: NEWEST_OLDEST_NAME_SORT_OPTIONS,
}

export const contactListDefinition: MasterDataListDefinition = {
  columns: buildMasterDataColumns({
    idColumnId: 'contact-number',
    idLabel: 'Contact Id',
    extraColumns: [
      { id: 'customer', label: 'Customer' },
      { id: 'email', label: 'Email' },
      { id: 'phone', label: 'Phone' },
      { id: 'address', label: 'Address' },
      { id: 'position', label: 'Position' },
    ],
    includeActionsColumn: true,
  }),
  searchPlaceholder: 'Search contact ID, name, customer, email, phone',
  tableId: 'contacts-list',
  exportFileName: 'contacts',
  sortOptions: NEWEST_OLDEST_NAME_SORT_OPTIONS,
}

export const customerListDefinition: MasterDataListDefinition = {
  columns: withMasterDataDefaults([
    { id: 'number', label: 'Customer Id' },
    { id: 'name', label: 'Name' },
    { id: 'subsidiary', label: 'Primary Subsidiary' },
    { id: 'currency', label: 'Primary Currency' },
    { id: 'address', label: 'Billing Address' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'created', label: 'Created' },
    { id: 'last-modified', label: 'Last Modified' },
    { id: 'actions', label: 'Actions', locked: true },
  ]),
  searchPlaceholder: 'Search customer #, name, email, industry',
  tableId: 'customers-list',
  exportFileName: 'customers',
  sortOptions: NEWEST_OLDEST_NAME_SORT_OPTIONS,
}

export const vendorListDefinition: MasterDataListDefinition = {
  columns: [
    { id: 'vendor-number', label: 'Vendor Id' },
    { id: 'name', label: 'Name' },
    { id: 'subsidiary', label: 'Primary Subsidiary' },
    { id: 'currency', label: 'Primary Currency' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Phone' },
    { id: 'address', label: 'Address' },
    { id: 'tax-id', label: 'Tax ID' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'created', label: 'Created' },
    { id: 'last-modified', label: 'Last Modified' },
    { id: 'actions', label: 'Actions', locked: true },
  ],
  searchPlaceholder: 'Search vendor id, name, email, phone, tax id',
  tableId: 'vendors-list',
  exportFileName: 'vendors',
  sortOptions: NEWEST_OLDEST_NAME_SORT_OPTIONS,
}
