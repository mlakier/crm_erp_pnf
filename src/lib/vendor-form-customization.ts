export type VendorFormFieldKey =
  | 'vendorNumber'
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'taxId'
  | 'primarySubsidiaryId'
  | 'primaryCurrencyId'
  | 'inactive'

export type VendorFormFieldMeta = {
  id: VendorFormFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
}

export type VendorFormFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type VendorFormCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<VendorFormFieldKey, VendorFormFieldCustomization>
}

export const VENDOR_FORM_FIELDS: VendorFormFieldMeta[] = [
  { id: 'vendorNumber', label: 'Vendor ID', fieldType: 'text', description: 'System-generated vendor identifier.' },
  { id: 'name', label: 'Name', fieldType: 'text', description: 'Primary vendor or supplier name.' },
  { id: 'email', label: 'Email', fieldType: 'text', description: 'Primary vendor email address.' },
  { id: 'phone', label: 'Phone', fieldType: 'text', description: 'Primary vendor phone number.' },
  { id: 'address', label: 'Address', fieldType: 'address', description: 'Mailing or remittance address for the vendor.' },
  { id: 'taxId', label: 'Tax ID', fieldType: 'text', description: 'Tax identifier for the vendor.' },
  { id: 'primarySubsidiaryId', label: 'Primary Subsidiary', fieldType: 'list', source: 'Subsidiaries master data', description: 'Default legal entity context for this vendor.' },
  { id: 'primaryCurrencyId', label: 'Primary Currency', fieldType: 'list', source: 'Currencies master data', description: 'Default transaction currency for this vendor.' },
  { id: 'inactive', label: 'Inactive', fieldType: 'boolean', description: 'Marks the vendor unavailable for new activity while preserving history.' },
]

export const DEFAULT_VENDOR_FORM_SECTIONS = [
  'Core',
  'Contact',
  'Financial',
  'Status',
] as const

export function defaultVendorFormCustomization(): VendorFormCustomizationConfig {
  const sectionMap: Record<VendorFormFieldKey, string> = {
    vendorNumber: 'Core',
    name: 'Core',
    email: 'Contact',
    phone: 'Contact',
    address: 'Contact',
    taxId: 'Financial',
    primarySubsidiaryId: 'Financial',
    primaryCurrencyId: 'Financial',
    inactive: 'Status',
  }

  const columnMap: Record<VendorFormFieldKey, number> = {
    vendorNumber: 1,
    name: 2,
    email: 1,
    phone: 2,
    address: 1,
    taxId: 1,
    primarySubsidiaryId: 2,
    primaryCurrencyId: 1,
    inactive: 1,
  }

  const rowMap: Record<VendorFormFieldKey, number> = {
    vendorNumber: 0,
    name: 0,
    email: 0,
    phone: 0,
    address: 1,
    taxId: 0,
    primarySubsidiaryId: 0,
    primaryCurrencyId: 1,
    inactive: 0,
  }

  return {
    formColumns: 2,
    sections: [...DEFAULT_VENDOR_FORM_SECTIONS],
    sectionRows: {
      Core: 1,
      Contact: 2,
      Financial: 2,
      Status: 1,
    },
    fields: Object.fromEntries(
      VENDOR_FORM_FIELDS.map((field) => [
        field.id,
        {
          visible: true,
          section: sectionMap[field.id],
          order: rowMap[field.id],
          column: columnMap[field.id],
        },
      ])
    ) as Record<VendorFormFieldKey, VendorFormFieldCustomization>,
  }
}
