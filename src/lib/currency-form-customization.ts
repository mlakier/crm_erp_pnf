export type CurrencyFormFieldKey =
  | 'currencyId'
  | 'name'
  | 'symbol'
  | 'decimals'
  | 'isBase'
  | 'inactive'

export type CurrencyFormFieldMeta = {
  id: CurrencyFormFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
}

export type CurrencyFormFieldCustomization = {
  visible: boolean
  section: string
  order: number
  column: number
}

export type CurrencyFormCustomizationConfig = {
  formColumns: number
  sections: string[]
  sectionRows: Record<string, number>
  fields: Record<CurrencyFormFieldKey, CurrencyFormFieldCustomization>
}

export const CURRENCY_FORM_FIELDS: CurrencyFormFieldMeta[] = [
  { id: 'currencyId', label: 'Currency ID', fieldType: 'text', description: 'Unique ISO or internal code for the currency.' },
  { id: 'name', label: 'Name', fieldType: 'text', description: 'Display name for the currency.' },
  { id: 'symbol', label: 'Symbol', fieldType: 'text', description: 'Printed symbol used on forms and reports.' },
  { id: 'decimals', label: 'Decimal Places', fieldType: 'number', description: 'Number of decimal places used for amounts in this currency.' },
  { id: 'isBase', label: 'Base Currency', fieldType: 'boolean', description: 'Marks whether this is the primary company currency.' },
  { id: 'inactive', label: 'Inactive', fieldType: 'list', source: 'System status values', description: 'Marks the currency unavailable for new records while preserving history.' },
]

export const DEFAULT_CURRENCY_FORM_SECTIONS = [
  'Core',
  'Settings',
] as const

export function defaultCurrencyFormCustomization(): CurrencyFormCustomizationConfig {
  const sectionMap: Record<CurrencyFormFieldKey, string> = {
    currencyId: 'Core',
    name: 'Core',
    symbol: 'Core',
    decimals: 'Settings',
    isBase: 'Settings',
    inactive: 'Settings',
  }

  const columnMap: Record<CurrencyFormFieldKey, number> = {
    currencyId: 1,
    name: 2,
    symbol: 1,
    decimals: 1,
    isBase: 2,
    inactive: 1,
  }

  const rowMap: Record<CurrencyFormFieldKey, number> = {
    currencyId: 0,
    name: 0,
    symbol: 1,
    decimals: 0,
    isBase: 0,
    inactive: 1,
  }

  return {
    formColumns: 2,
    sections: [...DEFAULT_CURRENCY_FORM_SECTIONS],
    sectionRows: {
      Core: 2,
      Settings: 2,
    },
    fields: Object.fromEntries(
      CURRENCY_FORM_FIELDS.map((field) => [
        field.id,
        {
          visible: true,
          section: sectionMap[field.id],
          order: rowMap[field.id],
          column: columnMap[field.id],
        },
      ])
    ) as Record<CurrencyFormFieldKey, CurrencyFormFieldCustomization>,
  }
}
