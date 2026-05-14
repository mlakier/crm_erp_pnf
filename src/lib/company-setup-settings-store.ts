import { promises as fs } from 'fs'
import path from 'path'
import { loadCompanyInformationSettings } from '@/lib/company-information-settings-store'

export type CompanySetupSettings = {
  defaultApAccountId: string
  defaultArAccountId: string
  realizedFxGainAccountId: string
  realizedFxLossAccountId: string
  unrealizedFxGainAccountId: string
  unrealizedFxLossAccountId: string
  ctaAccountId: string
  defaultBankFeeExpenseAccountId: string
  defaultMerchantFeeExpenseAccountId: string
  defaultInterestIncomeAccountId: string
  defaultMiscBankIncomeAccountId: string
  bankFeeKeywords: string
  merchantFeeKeywords: string
  interestIncomeKeywords: string
  miscBankIncomeKeywords: string
  consolidationPolicies: ConsolidationPolicy[]
}

export type ConsolidationPolicy = {
  parentSubsidiaryCode: string
  reportingCurrencyCode: string
  defaultAmountLayer: 'functional' | 'group'
  includeChildrenByDefault: boolean
  translationPolicy: 'configured_rates'
  eliminationPolicy: 'planned_manual_review'
}

const STORE_PATH = path.join(process.cwd(), 'config', 'company-setup-settings.json')

const DEFAULT_SETTINGS: CompanySetupSettings = {
  defaultApAccountId: '',
  defaultArAccountId: '',
  realizedFxGainAccountId: '',
  realizedFxLossAccountId: '',
  unrealizedFxGainAccountId: '',
  unrealizedFxLossAccountId: '',
  ctaAccountId: '',
  defaultBankFeeExpenseAccountId: '',
  defaultMerchantFeeExpenseAccountId: '',
  defaultInterestIncomeAccountId: '',
  defaultMiscBankIncomeAccountId: '',
  bankFeeKeywords: 'bank fee, bank fees, service charge, monthly analysis fee, analysis fee, wire fee, ach fee, bank charge',
  merchantFeeKeywords: 'merchant fee, card fee, processor fee, stripe fee, paypal fee',
  interestIncomeKeywords: 'interest, int credit, earnings credit',
  miscBankIncomeKeywords: 'misc income, miscellaneous income, bank rebate, rewards credit, cash back',
  consolidationPolicies: [
    {
      parentSubsidiaryCode: 'SUB-001',
      reportingCurrencyCode: 'USD',
      defaultAmountLayer: 'group',
      includeChildrenByDefault: true,
      translationPolicy: 'configured_rates',
      eliminationPolicy: 'planned_manual_review',
    },
    {
      parentSubsidiaryCode: 'SUB-005',
      reportingCurrencyCode: 'EUR',
      defaultAmountLayer: 'functional',
      includeChildrenByDefault: true,
      translationPolicy: 'configured_rates',
      eliminationPolicy: 'planned_manual_review',
    },
  ],
}

function sanitize(input: unknown): CompanySetupSettings {
  if (!input || typeof input !== 'object') return DEFAULT_SETTINGS
  const root = input as Record<string, unknown>
  const str = (key: keyof CompanySetupSettings) => typeof root[key] === 'string' ? root[key] as string : ''
  const rawPolicies = Array.isArray(root.consolidationPolicies) ? root.consolidationPolicies : DEFAULT_SETTINGS.consolidationPolicies
  const consolidationPolicies = rawPolicies
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const policy = entry as Record<string, unknown>
      const defaultAmountLayer = policy.defaultAmountLayer === 'group' ? 'group' : 'functional'
      return {
        parentSubsidiaryCode: typeof policy.parentSubsidiaryCode === 'string' ? policy.parentSubsidiaryCode.trim().toUpperCase() : '',
        reportingCurrencyCode: typeof policy.reportingCurrencyCode === 'string' ? policy.reportingCurrencyCode.trim().toUpperCase() : '',
        defaultAmountLayer,
        includeChildrenByDefault: policy.includeChildrenByDefault !== false,
        translationPolicy: 'configured_rates' as const,
        eliminationPolicy: 'planned_manual_review' as const,
      }
    })
    .filter((entry): entry is ConsolidationPolicy => Boolean(entry?.parentSubsidiaryCode && entry.reportingCurrencyCode))

  return {
    defaultApAccountId: str('defaultApAccountId'),
    defaultArAccountId: str('defaultArAccountId'),
    realizedFxGainAccountId: str('realizedFxGainAccountId'),
    realizedFxLossAccountId: str('realizedFxLossAccountId'),
    unrealizedFxGainAccountId: str('unrealizedFxGainAccountId'),
    unrealizedFxLossAccountId: str('unrealizedFxLossAccountId'),
    ctaAccountId: str('ctaAccountId'),
    defaultBankFeeExpenseAccountId: str('defaultBankFeeExpenseAccountId'),
    defaultMerchantFeeExpenseAccountId: str('defaultMerchantFeeExpenseAccountId'),
    defaultInterestIncomeAccountId: str('defaultInterestIncomeAccountId'),
    defaultMiscBankIncomeAccountId: str('defaultMiscBankIncomeAccountId'),
    bankFeeKeywords: str('bankFeeKeywords') || DEFAULT_SETTINGS.bankFeeKeywords,
    merchantFeeKeywords: str('merchantFeeKeywords') || DEFAULT_SETTINGS.merchantFeeKeywords,
    interestIncomeKeywords: str('interestIncomeKeywords') || DEFAULT_SETTINGS.interestIncomeKeywords,
    miscBankIncomeKeywords: str('miscBankIncomeKeywords') || DEFAULT_SETTINGS.miscBankIncomeKeywords,
    consolidationPolicies,
  }
}

export async function loadCompanySetupSettings(): Promise<CompanySetupSettings> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    return sanitize(JSON.parse(raw))
  } catch {
    const companyInformation = await loadCompanyInformationSettings()
    return {
      ...DEFAULT_SETTINGS,
      defaultApAccountId: companyInformation.defaultApAccountId,
      defaultArAccountId: companyInformation.defaultArAccountId,
    }
  }
}

export async function saveCompanySetupSettings(input: unknown): Promise<CompanySetupSettings> {
  const settings = sanitize(input)
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
  return settings
}
