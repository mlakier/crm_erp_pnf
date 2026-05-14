export const BANK_CONNECTION_CATEGORY_OPTIONS = [
  { value: 'bank_feed', label: 'Bank Feed Aggregator' },
  { value: 'direct_bank', label: 'Direct Bank Connectivity' },
  { value: 'treasury_system', label: 'Treasury Management System' },
  { value: 'payment_processor', label: 'Payment Processor' },
  { value: 'ap_payment_platform', label: 'AP Payment Platform' },
  { value: 'corporate_card', label: 'Corporate Card / Expense' },
  { value: 'payroll_funding', label: 'Payroll Funding' },
  { value: 'statement_file', label: 'Statement File' },
  { value: 'payment_file', label: 'Payment File' },
] as const

export const BANK_CONNECTION_PROVIDER_OPTIONS = [
  { value: 'manual', label: 'Manual / File Upload' },
  { value: 'plaid', label: 'Plaid' },
  { value: 'finicity', label: 'Finicity' },
  { value: 'teller', label: 'Teller' },
  { value: 'yodlee', label: 'Yodlee' },
  { value: 'bank_api', label: 'Direct Bank API' },
  { value: 'sftp', label: 'Bank SFTP' },
  { value: 'bai2', label: 'BAI2' },
  { value: 'mt940', label: 'MT940' },
  { value: 'camt053', label: 'CAMT.053' },
  { value: 'kyriba', label: 'Kyriba' },
  { value: 'tis', label: 'TIS' },
  { value: 'gtreasury', label: 'GTreasury' },
  { value: 'fis', label: 'FIS' },
  { value: 'coupa_treasury', label: 'Coupa Treasury' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'adyen', label: 'Adyen' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'bill_com', label: 'Bill.com' },
  { value: 'tipalti', label: 'Tipalti' },
  { value: 'brex', label: 'Brex' },
  { value: 'ramp', label: 'Ramp' },
  { value: 'concur', label: 'Concur' },
  { value: 'adp', label: 'ADP' },
  { value: 'gusto', label: 'Gusto' },
] as const

export function bankConnectionCategoryLabel(value: string | null | undefined) {
  return BANK_CONNECTION_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value ?? '-'
}

export function bankConnectionProviderLabel(value: string | null | undefined) {
  return BANK_CONNECTION_PROVIDER_OPTIONS.find((option) => option.value === value)?.label ?? value ?? '-'
}
