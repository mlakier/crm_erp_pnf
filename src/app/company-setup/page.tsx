'use client'

import { useEffect, useMemo, useState } from 'react'
import SearchableSelect from '@/components/SearchableSelect'

type AccountOption = {
  id: string
  accountId: string
  accountNumber: string
  name: string
  accountType: string
  category?: string | null
  accountRole?: string | null
  financialStatementCategory?: string | null
  financialStatementGroup?: string | null
  isPosting: boolean
  active: boolean
}

type SubsidiaryOption = {
  id: string
  subsidiaryId: string
  name: string
  parentSubsidiaryId?: string | null
  localCurrency?: { code: string } | null
  functionalCurrency?: { code: string } | null
  groupCurrency?: { code: string } | null
}

type ConsolidationPolicy = {
  parentSubsidiaryCode: string
  reportingCurrencyCode: string
  defaultAmountLayer: 'functional' | 'group'
  includeChildrenByDefault: boolean
  translationPolicy: 'configured_rates'
  eliminationPolicy: 'planned_manual_review'
}

type Settings = {
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

const DEFAULT_SETTINGS: Settings = {
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

function prioritizeAccounts(rows: AccountOption[], terms: string[]) {
  const normalizedTerms = terms.map((term) => term.toLowerCase())
  const scoreAccount = (account: AccountOption) => {
    const haystack = [
      account.accountId,
      account.accountNumber,
      account.name,
      account.accountType,
      account.category,
      account.accountRole,
      account.financialStatementCategory,
      account.financialStatementGroup,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return normalizedTerms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0)
  }

  return [...rows].sort((left, right) => {
    const scoreDifference = scoreAccount(right) - scoreAccount(left)
    if (scoreDifference !== 0) return scoreDifference
    return `${left.accountNumber} ${left.name}`.localeCompare(`${right.accountNumber} ${right.name}`, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  })
}

export default function CompanySetupPage() {
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [subsidiaries, setSubsidiaries] = useState<SubsidiaryOption[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [savedSettings, setSavedSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadPage() {
      const [settingsResponse, accountsResponse, subsidiariesResponse] = await Promise.all([
        fetch('/api/company-setup/settings', { cache: 'no-store' }),
        fetch('/api/chart-of-accounts', { cache: 'no-store' }),
        fetch('/api/subsidiaries', { cache: 'no-store' }),
      ])

      const settingsBody = settingsResponse.ok ? ((await settingsResponse.json()) as Partial<Settings>) : {}
      const accountsBody = accountsResponse.ok ? ((await accountsResponse.json()) as AccountOption[]) : []
      const subsidiariesBody = subsidiariesResponse.ok ? ((await subsidiariesResponse.json()) as SubsidiaryOption[]) : []

      if (!mounted) return

      setAccounts(accountsBody)
      setSubsidiaries(subsidiariesBody)
      const nextSettings = {
        defaultApAccountId: typeof settingsBody.defaultApAccountId === 'string' ? settingsBody.defaultApAccountId : '',
        defaultArAccountId: typeof settingsBody.defaultArAccountId === 'string' ? settingsBody.defaultArAccountId : '',
        realizedFxGainAccountId: typeof settingsBody.realizedFxGainAccountId === 'string' ? settingsBody.realizedFxGainAccountId : '',
        realizedFxLossAccountId: typeof settingsBody.realizedFxLossAccountId === 'string' ? settingsBody.realizedFxLossAccountId : '',
        unrealizedFxGainAccountId: typeof settingsBody.unrealizedFxGainAccountId === 'string' ? settingsBody.unrealizedFxGainAccountId : '',
        unrealizedFxLossAccountId: typeof settingsBody.unrealizedFxLossAccountId === 'string' ? settingsBody.unrealizedFxLossAccountId : '',
        ctaAccountId: typeof settingsBody.ctaAccountId === 'string' ? settingsBody.ctaAccountId : '',
        defaultBankFeeExpenseAccountId: typeof settingsBody.defaultBankFeeExpenseAccountId === 'string' ? settingsBody.defaultBankFeeExpenseAccountId : '',
        defaultMerchantFeeExpenseAccountId: typeof settingsBody.defaultMerchantFeeExpenseAccountId === 'string' ? settingsBody.defaultMerchantFeeExpenseAccountId : '',
        defaultInterestIncomeAccountId: typeof settingsBody.defaultInterestIncomeAccountId === 'string' ? settingsBody.defaultInterestIncomeAccountId : '',
        defaultMiscBankIncomeAccountId: typeof settingsBody.defaultMiscBankIncomeAccountId === 'string' ? settingsBody.defaultMiscBankIncomeAccountId : '',
        bankFeeKeywords: typeof settingsBody.bankFeeKeywords === 'string' ? settingsBody.bankFeeKeywords : DEFAULT_SETTINGS.bankFeeKeywords,
        merchantFeeKeywords: typeof settingsBody.merchantFeeKeywords === 'string' ? settingsBody.merchantFeeKeywords : DEFAULT_SETTINGS.merchantFeeKeywords,
        interestIncomeKeywords: typeof settingsBody.interestIncomeKeywords === 'string' ? settingsBody.interestIncomeKeywords : DEFAULT_SETTINGS.interestIncomeKeywords,
        miscBankIncomeKeywords: typeof settingsBody.miscBankIncomeKeywords === 'string' ? settingsBody.miscBankIncomeKeywords : DEFAULT_SETTINGS.miscBankIncomeKeywords,
        consolidationPolicies: Array.isArray(settingsBody.consolidationPolicies) ? settingsBody.consolidationPolicies : DEFAULT_SETTINGS.consolidationPolicies,
      }
      setSettings(nextSettings)
      setSavedSettings(nextSettings)
    }

    void loadPage()

    return () => {
      mounted = false
    }
  }, [])

  function updateSetting(field: keyof Settings, value: string) {
    const next = { ...settings, [field]: value }
    setSettings(next)
    setSaveMessage(null)
  }

  function updateConsolidationPolicy(index: number, field: keyof ConsolidationPolicy, value: string | boolean) {
    setSettings((current) => ({
      ...current,
      consolidationPolicies: current.consolidationPolicies.map((policy, policyIndex) => (
        policyIndex === index
          ? { ...policy, [field]: value }
          : policy
      )),
    }))
    setSaveMessage(null)
  }

  function addConsolidationPolicy() {
    const nextParent = subsidiaries.find((subsidiary) =>
      !settings.consolidationPolicies.some((policy) => policy.parentSubsidiaryCode === subsidiary.subsidiaryId),
    )
    const reportingCurrencyCode =
      nextParent?.groupCurrency?.code
      ?? nextParent?.functionalCurrency?.code
      ?? nextParent?.localCurrency?.code
      ?? 'USD'

    setSettings((current) => ({
      ...current,
      consolidationPolicies: [
        ...current.consolidationPolicies,
        {
          parentSubsidiaryCode: nextParent?.subsidiaryId ?? '',
          reportingCurrencyCode,
          defaultAmountLayer: 'group',
          includeChildrenByDefault: true,
          translationPolicy: 'configured_rates',
          eliminationPolicy: 'planned_manual_review',
        },
      ],
    }))
    setSaveMessage(null)
  }

  function removeConsolidationPolicy(index: number) {
    setSettings((current) => ({
      ...current,
      consolidationPolicies: current.consolidationPolicies.filter((_, policyIndex) => policyIndex !== index),
    }))
    setSaveMessage(null)
  }

  async function saveSettings() {
    setSaving(true)
    setSaveMessage(null)
    try {
      const response = await fetch('/api/company-setup/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!response.ok) {
        throw new Error('Failed to save company setup defaults')
      }
      const saved = (await response.json()) as Settings
      setSettings(saved)
      setSavedSettings(saved)
      setSaveMessage('Accounting defaults saved.')
    } catch {
      setSaveMessage('Unable to save accounting defaults right now.')
    } finally {
      setSaving(false)
    }
  }

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings)

  const postingAccounts = accounts.filter((account) => account.active !== false && account.isPosting !== false)
  const filterByRole = (roles: string[], fallback: (account: AccountOption) => boolean) => {
    const roleMatches = postingAccounts.filter((account) => roles.includes(account.accountRole ?? ''))
    return roleMatches.length > 0 ? roleMatches : postingAccounts.filter(fallback)
  }

  const liabilityAccounts = filterByRole(
    ['AP Trade'],
    (account) => account.accountType.toLowerCase().includes('liability'),
  )
  const assetAccounts = filterByRole(
    ['AR Trade'],
    (account) => account.accountType.toLowerCase().includes('asset'),
  )
  const profitAndLossAccounts = postingAccounts.filter((account) => {
    const accountType = account.accountType.toLowerCase()
    return (
      accountType.includes('revenue')
      || accountType.includes('income')
      || accountType.includes('expense')
      || accountType.includes('cost')
      || accountType.includes('other')
      || accountType.includes('gain')
      || accountType.includes('loss')
    )
  })
  const gainAccounts = filterByRole(
    ['FX Gain'],
    (account) => profitAndLossAccounts.includes(account),
  )
  const lossAccounts = filterByRole(
    ['FX Loss'],
    (account) => profitAndLossAccounts.includes(account),
  )

  const toOptions = (rows: AccountOption[]) =>
    rows.map((account) => ({
      value: account.id,
      label: `${account.accountNumber} - ${account.name}`,
      searchText: [
        account.accountId,
        account.accountNumber,
        account.name,
        account.accountType,
        account.category,
        account.accountRole,
        account.financialStatementCategory,
        account.financialStatementGroup,
      ]
        .filter(Boolean)
        .join(' '),
    }))

  const apOptions = useMemo(() => toOptions(liabilityAccounts), [liabilityAccounts])
  const arOptions = useMemo(() => toOptions(assetAccounts), [assetAccounts])
  const fallbackFxAccounts = profitAndLossAccounts.length ? profitAndLossAccounts : postingAccounts
  const realizedFxGainOptions = useMemo(() => toOptions(gainAccounts.length ? gainAccounts : fallbackFxAccounts), [gainAccounts, fallbackFxAccounts])
  const realizedFxLossOptions = useMemo(() => toOptions(lossAccounts.length ? lossAccounts : fallbackFxAccounts), [lossAccounts, fallbackFxAccounts])
  const unrealizedFxGainOptions = realizedFxGainOptions
  const unrealizedFxLossOptions = realizedFxLossOptions
  const ctaAccountOptions = useMemo(
    () => toOptions(prioritizeAccounts(
      postingAccounts.filter((account) => account.accountType.toLowerCase().includes('equity')),
      ['cta', 'currency translation', 'cumulative translation', 'equity'],
    )),
    [postingAccounts],
  )
  const defaultBankFeeOptions = useMemo(
    () => toOptions(prioritizeAccounts(postingAccounts, ['bank fee', 'bank charge', 'fee', 'charge', 'expense', 'cost'])),
    [postingAccounts],
  )
  const defaultMerchantFeeOptions = useMemo(
    () => toOptions(prioritizeAccounts(postingAccounts, ['merchant fee', 'processor fee', 'payment fee', 'fee', 'expense', 'cost'])),
    [postingAccounts],
  )
  const defaultInterestIncomeOptions = useMemo(
    () => toOptions(prioritizeAccounts(postingAccounts, ['interest income', 'interest', 'income', 'revenue', 'other income'])),
    [postingAccounts],
  )
  const defaultMiscBankIncomeOptions = useMemo(
    () => toOptions(prioritizeAccounts(postingAccounts, ['misc income', 'miscellaneous income', 'bank income', 'other income', 'income', 'revenue'])),
    [postingAccounts],
  )
  const subsidiaryOptions = subsidiaries.map((subsidiary) => ({
    value: subsidiary.subsidiaryId,
    label: `${subsidiary.subsidiaryId} - ${subsidiary.name}`,
    searchText: `${subsidiary.subsidiaryId} ${subsidiary.name}`,
  }))
  const currencyOptions = Array.from(new Set(
    subsidiaries
      .flatMap((subsidiary) => [
        subsidiary.localCurrency?.code,
        subsidiary.functionalCurrency?.code,
        subsidiary.groupCurrency?.code,
      ])
      .filter((code): code is string => Boolean(code)),
  ))
    .sort()
    .map((code) => ({ value: code, label: code, searchText: code }))
  const amountLayerOptions = [
    { value: 'functional', label: 'Functional currency layer', searchText: 'Functional' },
    { value: 'group', label: 'Group currency layer', searchText: 'Group' },
  ]

  return (
    <div className="min-h-full px-8 py-8">
      <div
        className="max-w-5xl rounded-2xl border p-8"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
      >
        <div>
          <h1 className="text-xl font-semibold text-white">Company Setup</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Maintain company-wide accounting defaults here instead of mixing them into legal company information or hardcoding them in transaction flows.
          </p>
        </div>

        <div
          className="mt-6 space-y-4 rounded-xl border p-5"
          style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}
        >
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Accounting Defaults
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              These defaults back core AR, AP, realized FX, and later unrealized FX / revaluation behavior across the ERP. If a setting is blank, the system may still use a bootstrap fallback, but the goal is for this page to become the explicit source of truth.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-muted)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Review your changes, then save them as the live company accounting defaults.
            </p>
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={!isDirty || saving}
              className="rounded-md px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {saving ? 'Saving...' : 'Save Defaults'}
            </button>
          </div>

          {saveMessage ? (
            <p className="text-sm" style={{ color: saveMessage.includes('Unable') ? '#fca5a5' : 'var(--text-secondary)' }}>
              {saveMessage}
            </p>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Default AP Account
            </span>
            <SearchableSelect
              selectedValue={settings.defaultApAccountId}
              onSelect={(value) => updateSetting('defaultApAccountId', value)}
              options={apOptions}
              placeholder="Select default AP account"
              searchPlaceholder="Search AP account"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Default AR Account
            </span>
            <SearchableSelect
              selectedValue={settings.defaultArAccountId}
              onSelect={(value) => updateSetting('defaultArAccountId', value)}
              options={arOptions}
              placeholder="Select default AR account"
              searchPlaceholder="Search AR account"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Realized FX Gain Account
            </span>
            <SearchableSelect
              selectedValue={settings.realizedFxGainAccountId}
              onSelect={(value) => updateSetting('realizedFxGainAccountId', value)}
              options={realizedFxGainOptions}
              placeholder="Select realized FX gain account"
              searchPlaceholder="Search gain account"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Realized FX Loss Account
            </span>
            <SearchableSelect
              selectedValue={settings.realizedFxLossAccountId}
              onSelect={(value) => updateSetting('realizedFxLossAccountId', value)}
              options={realizedFxLossOptions}
              placeholder="Select realized FX loss account"
              searchPlaceholder="Search loss account"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Unrealized FX Gain Account
            </span>
            <SearchableSelect
              selectedValue={settings.unrealizedFxGainAccountId}
              onSelect={(value) => updateSetting('unrealizedFxGainAccountId', value)}
              options={unrealizedFxGainOptions}
              placeholder="Select unrealized FX gain account"
              searchPlaceholder="Search gain account"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Unrealized FX Loss Account
            </span>
            <SearchableSelect
              selectedValue={settings.unrealizedFxLossAccountId}
              onSelect={(value) => updateSetting('unrealizedFxLossAccountId', value)}
              options={unrealizedFxLossOptions}
              placeholder="Select unrealized FX loss account"
              searchPlaceholder="Search loss account"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              CTA Account
            </span>
            <SearchableSelect
              selectedValue={settings.ctaAccountId}
              onSelect={(value) => updateSetting('ctaAccountId', value)}
              options={ctaAccountOptions.length ? ctaAccountOptions : toOptions(postingAccounts)}
              placeholder="Select CTA account"
              searchPlaceholder="Search CTA account"
            />
            <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
              Used by currency translation runs for the group-currency CTA offset. This is intentionally company setup, not hardcoded.
            </span>
          </label>
        </div>

        <div
          className="mt-6 space-y-4 rounded-xl border p-5"
          style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Consolidation Configuration
              </h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Define parent consolidation entities without posting directly to them. Each parent can have its own reporting currency layer, so mixed local-currency children roll up predictably.
              </p>
            </div>
            <button
              type="button"
              onClick={addConsolidationPolicy}
              className="rounded-md border px-3 py-2 text-xs font-semibold text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            >
              Add Parent
            </button>
          </div>

          <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-muted)' }}>
            <p className="text-sm font-semibold text-white">Accounting posture</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Parent entities are reporting scopes only. Child balances roll up through configured currency layers; CTA posts to the company CTA account; intercompany eliminations remain a reviewed close step, not an automatic silent adjustment.
            </p>
          </div>

          <div className="space-y-3">
            {settings.consolidationPolicies.map((policy, index) => {
              const parent = subsidiaries.find((subsidiary) => subsidiary.subsidiaryId === policy.parentSubsidiaryCode)
              const childCount = parent
                ? subsidiaries.filter((subsidiary) => subsidiary.parentSubsidiaryId === parent.id).length
                : 0
              return (
                <div
                  key={`${policy.parentSubsidiaryCode || 'new'}-${index}`}
                  className="rounded-xl border p-4"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  <div className="grid gap-3 md:grid-cols-4">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Parent Entity
                      </span>
                      <SearchableSelect
                        selectedValue={policy.parentSubsidiaryCode}
                        onSelect={(value) => updateConsolidationPolicy(index, 'parentSubsidiaryCode', value)}
                        options={subsidiaryOptions}
                        placeholder="Select parent"
                        searchPlaceholder="Search subsidiaries"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Reporting Currency
                      </span>
                      <SearchableSelect
                        selectedValue={policy.reportingCurrencyCode}
                        onSelect={(value) => updateConsolidationPolicy(index, 'reportingCurrencyCode', value)}
                        options={currencyOptions}
                        placeholder="Select currency"
                        searchPlaceholder="Search currencies"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Consolidated Amount Layer
                      </span>
                      <SearchableSelect
                        selectedValue={policy.defaultAmountLayer}
                        onSelect={(value) => updateConsolidationPolicy(index, 'defaultAmountLayer', value === 'group' ? 'group' : 'functional')}
                        options={amountLayerOptions}
                        placeholder="Select layer"
                        searchPlaceholder="Search layers"
                      />
                    </label>

                    <div className="flex items-end justify-between gap-2">
                      <label
                        className="flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-xs"
                        style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-muted)' }}
                      >
                        <input
                          type="checkbox"
                          checked={policy.includeChildrenByDefault}
                          onChange={(event) => updateConsolidationPolicy(index, 'includeChildrenByDefault', event.target.checked)}
                        />
                        Include children
                      </label>
                      <button
                        type="button"
                        onClick={() => removeConsolidationPolicy(index)}
                        className="rounded-md border px-3 py-2 text-xs font-semibold"
                        style={{ borderColor: 'var(--border-muted)', color: '#fca5a5' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs md:grid-cols-4" style={{ color: 'var(--text-secondary)' }}>
                    <div className="rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
                      Direct children: <span className="font-semibold text-white">{childCount}</span>
                    </div>
                    <div className="rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
                      Translation: <span className="font-semibold text-white">Configured rates</span>
                    </div>
                    <div className="rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
                      CTA: <span className="font-semibold text-white">Company CTA account</span>
                    </div>
                    <div className="rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
                      Eliminations: <span className="font-semibold text-white">Planned review step</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-muted)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Save consolidation policies before relying on parent reporting scopes.
            </p>
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={!isDirty || saving}
              className="rounded-md px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {saving ? 'Saving...' : 'Save Consolidation'}
            </button>
          </div>
        </div>

        <div
          className="mt-6 space-y-4 rounded-xl border p-5"
          style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}
        >
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Bank Activity Defaults
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              These accounts drive bank matching journal suggestions for bank fees, merchant fees, interest credits, and miscellaneous deposits. If a value is blank, the workbench will flag the line for review instead of pretending it knows the right posting account.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-muted)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Save these defaults to make bank activity matching use them immediately.
            </p>
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={!isDirty || saving}
              className="rounded-md px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {saving ? 'Saving...' : 'Save Bank Defaults'}
            </button>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Bank Fee Expense Account
            </span>
            <SearchableSelect
              selectedValue={settings.defaultBankFeeExpenseAccountId}
              onSelect={(value) => updateSetting('defaultBankFeeExpenseAccountId', value)}
              options={defaultBankFeeOptions}
              placeholder="Select bank fee expense account"
              searchPlaceholder="Search expense account"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Merchant Fee Expense Account
            </span>
            <SearchableSelect
              selectedValue={settings.defaultMerchantFeeExpenseAccountId}
              onSelect={(value) => updateSetting('defaultMerchantFeeExpenseAccountId', value)}
              options={defaultMerchantFeeOptions}
              placeholder="Select merchant fee expense account"
              searchPlaceholder="Search expense account"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Interest Income Account
            </span>
            <SearchableSelect
              selectedValue={settings.defaultInterestIncomeAccountId}
              onSelect={(value) => updateSetting('defaultInterestIncomeAccountId', value)}
              options={defaultInterestIncomeOptions}
              placeholder="Select interest income account"
              searchPlaceholder="Search income account"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Miscellaneous Bank Income Account
            </span>
            <SearchableSelect
              selectedValue={settings.defaultMiscBankIncomeAccountId}
              onSelect={(value) => updateSetting('defaultMiscBankIncomeAccountId', value)}
              options={defaultMiscBankIncomeOptions}
              placeholder="Select miscellaneous bank income account"
              searchPlaceholder="Search income account"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Bank Fee Keywords
              </span>
              <textarea
                value={settings.bankFeeKeywords}
                onChange={(event) => updateSetting('bankFeeKeywords', event.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm text-white"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-muted)' }}
                placeholder="bank fee, service charge, wire fee"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Merchant Fee Keywords
              </span>
              <textarea
                value={settings.merchantFeeKeywords}
                onChange={(event) => updateSetting('merchantFeeKeywords', event.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm text-white"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-muted)' }}
                placeholder="merchant fee, stripe fee, processor fee"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Interest Income Keywords
              </span>
              <textarea
                value={settings.interestIncomeKeywords}
                onChange={(event) => updateSetting('interestIncomeKeywords', event.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm text-white"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-muted)' }}
                placeholder="interest, earnings credit"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Miscellaneous Income Keywords
              </span>
              <textarea
                value={settings.miscBankIncomeKeywords}
                onChange={(event) => updateSetting('miscBankIncomeKeywords', event.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm text-white"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-muted)' }}
                placeholder="misc deposit, miscellaneous deposit"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
