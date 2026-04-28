import { cache } from 'react'
import { loadCompanyPreferencesSettings } from '@/lib/company-preferences-store'

export const loadCompanyDisplaySettings = cache(async () => {
  const { moneySettings, transactionStatusColors } = await loadCompanyPreferencesSettings()
  return { moneySettings, transactionStatusColors }
})
