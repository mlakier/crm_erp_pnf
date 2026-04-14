export type CountryConfig = {
  stateLabel: string
  postalLabel: string
  postalPlaceholder: string
  postalValidation?: (postal: string) => boolean
  postalError?: string
  stateRequired: boolean
  postalRequired: boolean
}

export const DEFAULT_COUNTRY_CODE = 'US'

export const COUNTRY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'AT', label: 'Austria' },
  { code: 'BE', label: 'Belgium' },
  { code: 'BR', label: 'Brazil' },
  { code: 'CN', label: 'China' },
  { code: 'DK', label: 'Denmark' },
  { code: 'EG', label: 'Egypt' },
  { code: 'FI', label: 'Finland' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' },
  { code: 'GH', label: 'Ghana' },
  { code: 'IN', label: 'India' },
  { code: 'ID', label: 'Indonesia' },
  { code: 'IE', label: 'Ireland' },
  { code: 'IL', label: 'Israel' },
  { code: 'IT', label: 'Italy' },
  { code: 'JP', label: 'Japan' },
  { code: 'KE', label: 'Kenya' },
  { code: 'KR', label: 'South Korea' },
  { code: 'LU', label: 'Luxembourg' },
  { code: 'MX', label: 'Mexico' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'NO', label: 'Norway' },
  { code: 'PK', label: 'Pakistan' },
  { code: 'PH', label: 'Philippines' },
  { code: 'PT', label: 'Portugal' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'SG', label: 'Singapore' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'ES', label: 'Spain' },
  { code: 'SE', label: 'Sweden' },
  { code: 'CH', label: 'Switzerland' },
  { code: 'TW', label: 'Taiwan' },
  { code: 'TH', label: 'Thailand' },
  { code: 'TR', label: 'Turkey' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'VN', label: 'Vietnam' },
  { code: 'OTHER', label: 'Other' },
]

const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  US: {
    stateLabel: 'State',
    postalLabel: 'ZIP Code',
    postalPlaceholder: 'e.g. 90210 or 90210-1234',
    postalValidation: (postal) => /^\d{5}(-\d{4})?$/.test(postal),
    postalError: 'US ZIP Code must be 5 digits or ZIP+4 (e.g. 90210-1234)',
    stateRequired: true,
    postalRequired: true,
  },
  CA: {
    stateLabel: 'Province',
    postalLabel: 'Postal Code',
    postalPlaceholder: 'e.g. A1A 1A1',
    postalValidation: (postal) => /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(postal),
    postalError: 'Canadian Postal Code must match format A1A 1A1',
    stateRequired: true,
    postalRequired: true,
  },
  GB: {
    stateLabel: 'County / Region',
    postalLabel: 'Postcode',
    postalPlaceholder: 'e.g. SW1A 1AA',
    postalValidation: (postal) => /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(postal),
    postalError: 'UK postcode must match format SW1A 1AA',
    stateRequired: false,
    postalRequired: true,
  },
  AU: {
    stateLabel: 'State / Territory',
    postalLabel: 'Postcode',
    postalPlaceholder: 'e.g. 2000',
    postalValidation: (postal) => /^\d{4}$/.test(postal),
    postalError: 'Australian Postcode must be 4 digits',
    stateRequired: true,
    postalRequired: true,
  },
  DE: {
    stateLabel: 'State (Bundesland)',
    postalLabel: 'Postal Code (PLZ)',
    postalPlaceholder: 'e.g. 10115',
    postalValidation: (postal) => /^\d{5}$/.test(postal),
    postalError: 'German PLZ must be 5 digits',
    stateRequired: false,
    postalRequired: true,
  },
  FR: {
    stateLabel: 'Region / Department',
    postalLabel: 'Code Postal',
    postalPlaceholder: 'e.g. 75001',
    postalValidation: (postal) => /^\d{5}$/.test(postal),
    postalError: 'French Code Postal must be 5 digits',
    stateRequired: false,
    postalRequired: true,
  },
  MX: {
    stateLabel: 'State',
    postalLabel: 'Codigo Postal',
    postalPlaceholder: 'e.g. 06600',
    postalValidation: (postal) => /^\d{5}$/.test(postal),
    postalError: 'Mexican Codigo Postal must be 5 digits',
    stateRequired: true,
    postalRequired: true,
  },
  IN: {
    stateLabel: 'State / Union Territory',
    postalLabel: 'PIN Code',
    postalPlaceholder: 'e.g. 110001',
    postalValidation: (postal) => /^\d{6}$/.test(postal),
    postalError: 'Indian PIN Code must be 6 digits',
    stateRequired: true,
    postalRequired: true,
  },
  JP: {
    stateLabel: 'Prefecture',
    postalLabel: 'Postal Code',
    postalPlaceholder: 'e.g. 100-0001',
    postalValidation: (postal) => /^\d{3}-\d{4}$/.test(postal),
    postalError: 'Japanese Postal Code must match format 123-4567',
    stateRequired: true,
    postalRequired: true,
  },
  CN: {
    stateLabel: 'Province / Municipality',
    postalLabel: 'Postal Code',
    postalPlaceholder: 'e.g. 100000',
    postalValidation: (postal) => /^\d{6}$/.test(postal),
    postalError: 'Chinese Postal Code must be 6 digits',
    stateRequired: true,
    postalRequired: true,
  },
  BR: {
    stateLabel: 'State',
    postalLabel: 'CEP',
    postalPlaceholder: 'e.g. 01310-100',
    postalValidation: (postal) => /^\d{5}-?\d{3}$/.test(postal),
    postalError: 'Brazilian CEP must match format 01310-100',
    stateRequired: true,
    postalRequired: true,
  },
  NZ: {
    stateLabel: 'Region',
    postalLabel: 'Postcode',
    postalPlaceholder: 'e.g. 6011',
    postalValidation: (postal) => /^\d{4}$/.test(postal),
    postalError: 'NZ Postcode must be 4 digits',
    stateRequired: false,
    postalRequired: true,
  },
  SG: {
    stateLabel: 'District',
    postalLabel: 'Postal Code',
    postalPlaceholder: 'e.g. 018956',
    postalValidation: (postal) => /^\d{6}$/.test(postal),
    postalError: 'Singapore Postal Code must be 6 digits',
    stateRequired: false,
    postalRequired: true,
  },
  IT: {
    stateLabel: 'Province',
    postalLabel: 'CAP',
    postalPlaceholder: 'e.g. 00100',
    postalValidation: (postal) => /^\d{5}$/.test(postal),
    postalError: 'Italian CAP must be 5 digits',
    stateRequired: true,
    postalRequired: true,
  },
  ES: {
    stateLabel: 'Province',
    postalLabel: 'Codigo Postal',
    postalPlaceholder: 'e.g. 28001',
    postalValidation: (postal) => /^\d{5}$/.test(postal),
    postalError: 'Spanish Codigo Postal must be 5 digits',
    stateRequired: true,
    postalRequired: true,
  },
  AE: {
    stateLabel: 'Emirate',
    postalLabel: 'Postal Code',
    postalPlaceholder: 'Optional',
    stateRequired: false,
    postalRequired: false,
  },
  OTHER: {
    stateLabel: 'State / Province / Region',
    postalLabel: 'Postal Code',
    postalPlaceholder: 'Optional',
    stateRequired: false,
    postalRequired: false,
  },
}

const DEFAULT_CONFIG: CountryConfig = {
  stateLabel: 'State / Province / Region',
  postalLabel: 'Postal Code',
  postalPlaceholder: 'Optional',
  stateRequired: false,
  postalRequired: false,
}

export function normalizeCountryCode(country: string | undefined): string {
  const normalized = country?.trim()
  if (!normalized) return DEFAULT_COUNTRY_CODE

  const upper = normalized.toUpperCase()
  const exactCode = COUNTRY_OPTIONS.find((option) => option.code === upper)
  if (exactCode) return exactCode.code

  const matchedLabel = COUNTRY_OPTIONS.find((option) => option.label.toLowerCase() === normalized.toLowerCase())
  if (matchedLabel) return matchedLabel.code

  return upper
}

export function getCountryConfig(country: string | undefined): CountryConfig {
  return COUNTRY_CONFIGS[normalizeCountryCode(country)] ?? DEFAULT_CONFIG
}