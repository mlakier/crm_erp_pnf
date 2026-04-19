'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isFieldRequired } from '@/lib/form-requirements'
import {
  defaultChartOfAccountsFormCustomization,
  CHART_OF_ACCOUNTS_FORM_FIELDS,
  type ChartOfAccountsFormCustomizationConfig,
  type ChartOfAccountsFormFieldKey,
} from '@/lib/chart-of-accounts-form-customization'

type Subsidiary = {
  id: string
  subsidiaryId: string
  name: string
}

type ChartOfAccountsFormCustomizationResponse = {
  config?: ChartOfAccountsFormCustomizationConfig
}

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'Other']

export default function ChartOfAccountCreateForm({
  subsidiaries,
  accountOptions,
  onSuccess,
  onCancel,
}: {
  subsidiaries: Subsidiary[]
  accountOptions: Array<{ id: string; accountId: string; name: string }>
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const [accountId, setAccountId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [accountType, setAccountType] = useState(ACCOUNT_TYPES[0])
  const [inventory, setInventory] = useState(false)
  const [revalueOpenBalance, setRevalueOpenBalance] = useState(false)
  const [eliminateIntercoTransactions, setEliminateIntercoTransactions] = useState(false)
  const [summary, setSummary] = useState(false)
  const [normalBalance, setNormalBalance] = useState('')
  const [financialStatementSection, setFinancialStatementSection] = useState('')
  const [financialStatementGroup, setFinancialStatementGroup] = useState('')
  const [isPosting, setIsPosting] = useState(true)
  const [isControlAccount, setIsControlAccount] = useState(false)
  const [allowsManualPosting, setAllowsManualPosting] = useState(true)
  const [requiresSubledgerType, setRequiresSubledgerType] = useState('')
  const [cashFlowCategory, setCashFlowCategory] = useState('')
  const [parentAccountId, setParentAccountId] = useState('')
  const [closeToAccountId, setCloseToAccountId] = useState('')
  const [scopeMode, setScopeMode] = useState<'selected' | 'parent'>('selected')
  const [selectedSubsidiaryIds, setSelectedSubsidiaryIds] = useState<string[]>([])
  const [parentSubsidiaryId, setParentSubsidiaryId] = useState(subsidiaries[0]?.id ?? '')
  const [includeChildren, setIncludeChildren] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [runtimeRequirements, setRuntimeRequirements] = useState<Record<string, boolean> | null>(null)
  const [layoutConfig, setLayoutConfig] = useState<ChartOfAccountsFormCustomizationConfig>(() => defaultChartOfAccountsFormCustomization())
  const router = useRouter()

  const sortedSubsidiaries = useMemo(
    () => [...subsidiaries].sort((a, b) => a.subsidiaryId.localeCompare(b.subsidiaryId)),
    [subsidiaries]
  )

  useEffect(() => {
    let mounted = true

    async function loadConfig() {
      try {
        const [requirementsResponse, layoutResponse] = await Promise.all([
          fetch('/api/config/form-requirements', { cache: 'no-store' }),
          fetch('/api/config/chart-of-accounts-form-customization', { cache: 'no-store' }),
        ])

        const requirementsBody = await requirementsResponse.json()
        const layoutBody = (await layoutResponse.json()) as ChartOfAccountsFormCustomizationResponse

        if (!mounted) return

        if (requirementsResponse.ok) {
          setRuntimeRequirements(requirementsBody?.config?.chartOfAccountCreate ?? null)
        }

        if (layoutResponse.ok && layoutBody.config) {
          setLayoutConfig(layoutBody.config)
        }
      } catch {
        // Keep static defaults when config APIs are unavailable.
      }
    }

    loadConfig()
    return () => {
      mounted = false
    }
  }, [])

  function req(field: string): boolean {
    if (runtimeRequirements && Object.prototype.hasOwnProperty.call(runtimeRequirements, field)) {
      return Boolean(runtimeRequirements[field])
    }
    return isFieldRequired('chartOfAccountCreate', field)
  }

  function requiredLabel(text: string, required: boolean) {
    if (!required) return <>{text}</>
    return (
      <>
        {text} <span style={{ color: 'var(--danger)' }}>*</span>
      </>
    )
  }

  const groupedVisibleFields = useMemo(() => {
    return layoutConfig.sections
      .map((section) => ({
        section,
        fields: CHART_OF_ACCOUNTS_FORM_FIELDS
          .filter((field) => {
            const config = layoutConfig.fields[field.id]
            return config?.visible !== false && config?.section === section
          })
          .sort((a, b) => {
            const left = layoutConfig.fields[a.id]
            const right = layoutConfig.fields[b.id]
            if ((left?.column ?? 1) !== (right?.column ?? 1)) return (left?.column ?? 1) - (right?.column ?? 1)
            return (left?.order ?? 0) - (right?.order ?? 0)
          }),
      }))
      .filter((group) => group.fields.length > 0)
  }, [layoutConfig])

  const formColumns = Math.min(4, Math.max(1, layoutConfig.formColumns || 2))

  function getSectionGridStyle(): React.CSSProperties {
    return { gridTemplateColumns: `repeat(${formColumns}, minmax(0, 1fr))` }
  }

  function getFieldPlacementStyle(fieldId: ChartOfAccountsFormFieldKey): React.CSSProperties {
    const config = layoutConfig.fields[fieldId]
    return {
      gridColumnStart: Math.min(formColumns, Math.max(1, config?.column ?? 1)),
      gridRowStart: Math.max(1, (config?.order ?? 0) + 1),
    }
  }

  function toggleSubsidiary(id: string) {
    setSelectedSubsidiaryIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    )
  }

  function renderField(fieldId: ChartOfAccountsFormFieldKey) {
    switch (fieldId) {
      case 'accountId':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Account Id', req('accountId'))}</span>
            <input value={accountId} onChange={(event) => setAccountId(event.target.value)} required={req('accountId')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} placeholder="1000" />
          </label>
        )
      case 'name':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Name', req('name'))}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required={req('name')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} placeholder="Cash" />
          </label>
        )
      case 'description':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Description', req('description'))}</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} required={req('description')} rows={3} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'accountType':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Account Type', req('accountType'))}</span>
            <select value={accountType} onChange={(event) => setAccountType(event.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }}>
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
        )
      case 'normalBalance':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Normal Balance', req('normalBalance'))}</span>
            <select value={normalBalance} onChange={(event) => setNormalBalance(event.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="">None</option>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </label>
        )
      case 'financialStatementSection':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('FS Section', req('financialStatementSection'))}</span>
            <input value={financialStatementSection} onChange={(event) => setFinancialStatementSection(event.target.value)} required={req('financialStatementSection')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'financialStatementGroup':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('FS Group', req('financialStatementGroup'))}</span>
            <input value={financialStatementGroup} onChange={(event) => setFinancialStatementGroup(event.target.value)} required={req('financialStatementGroup')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'parentAccountId':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Parent Account', req('parentAccountId'))}</span>
            <select value={parentAccountId} onChange={(event) => setParentAccountId(event.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="">None</option>
              {accountOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.accountId} - {option.name}</option>
              ))}
            </select>
          </label>
        )
      case 'closeToAccountId':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Close To Account', req('closeToAccountId'))}</span>
            <select value={closeToAccountId} onChange={(event) => setCloseToAccountId(event.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="">None</option>
              {accountOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.accountId} - {option.name}</option>
              ))}
            </select>
          </label>
        )
      case 'requiresSubledgerType':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Requires Subledger Type', req('requiresSubledgerType'))}</span>
            <input value={requiresSubledgerType} onChange={(event) => setRequiresSubledgerType(event.target.value)} required={req('requiresSubledgerType')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'cashFlowCategory':
        return (
          <label key={fieldId} className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Cash Flow Category', req('cashFlowCategory'))}</span>
            <input value={cashFlowCategory} onChange={(event) => setCashFlowCategory(event.target.value)} required={req('cashFlowCategory')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'isPosting':
        return <CheckboxField key={fieldId} label={requiredLabel('Posting Account', req('isPosting'))} checked={isPosting} onChange={setIsPosting} />
      case 'isControlAccount':
        return <CheckboxField key={fieldId} label={requiredLabel('Control Account', req('isControlAccount'))} checked={isControlAccount} onChange={setIsControlAccount} />
      case 'allowsManualPosting':
        return <CheckboxField key={fieldId} label={requiredLabel('Allow Manual Posting', req('allowsManualPosting'))} checked={allowsManualPosting} onChange={setAllowsManualPosting} />
      case 'inventory':
        return <CheckboxField key={fieldId} label={requiredLabel('Inventory', req('inventory'))} checked={inventory} onChange={setInventory} />
      case 'revalueOpenBalance':
        return <CheckboxField key={fieldId} label={requiredLabel('Revalue Open Balance', req('revalueOpenBalance'))} checked={revalueOpenBalance} onChange={setRevalueOpenBalance} />
      case 'eliminateIntercoTransactions':
        return <CheckboxField key={fieldId} label={requiredLabel('Eliminate Interco Transactions', req('eliminateIntercoTransactions'))} checked={eliminateIntercoTransactions} onChange={setEliminateIntercoTransactions} />
      case 'summary':
        return <CheckboxField key={fieldId} label={requiredLabel('Summary', req('summary'))} checked={summary} onChange={setSummary} />
      default:
        return null
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    if (scopeMode === 'selected' && selectedSubsidiaryIds.length === 0) {
      setError('Select at least one subsidiary, or switch to Parent mode.')
      setSaving(false)
      return
    }

    if (scopeMode === 'parent' && !parentSubsidiaryId) {
      setError('Select a parent subsidiary.')
      setSaving(false)
      return
    }

    const missing: string[] = []
    const requiredFields = [
      ['accountId', accountId],
      ['name', name],
      ['description', description],
      ['accountType', accountType],
      ['normalBalance', normalBalance],
      ['financialStatementSection', financialStatementSection],
      ['financialStatementGroup', financialStatementGroup],
      ['parentAccountId', parentAccountId],
      ['closeToAccountId', closeToAccountId],
      ['requiresSubledgerType', requiresSubledgerType],
      ['cashFlowCategory', cashFlowCategory],
    ] as const

    for (const [fieldName, fieldValue] of requiredFields) {
      if (req(fieldName) && !String(fieldValue ?? '').trim()) {
        missing.push(fieldName)
      }
    }

    if (missing.length > 0) {
      setError(`Missing required fields: ${missing.join(', ')}`)
      setSaving(false)
      return
    }

    try {
      const response = await fetch('/api/chart-of-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          name,
          description,
          accountType,
          inventory,
          revalueOpenBalance,
          eliminateIntercoTransactions,
          summary,
          normalBalance,
          financialStatementSection,
          financialStatementGroup,
          isPosting,
          isControlAccount,
          allowsManualPosting,
          requiresSubledgerType,
          cashFlowCategory,
          parentAccountId,
          closeToAccountId,
          scopeMode,
          subsidiaryIds: scopeMode === 'selected' ? selectedSubsidiaryIds : [],
          parentSubsidiaryId: scopeMode === 'parent' ? parentSubsidiaryId : null,
          includeChildren: scopeMode === 'parent' ? includeChildren : false,
        }),
      })

      const body = await response.json()
      if (!response.ok) {
        setError(body.error || 'Unable to create chart account')
        setSaving(false)
        return
      }

      setAccountId('')
      setName('')
      setDescription('')
      setAccountType(ACCOUNT_TYPES[0])
      setInventory(false)
      setRevalueOpenBalance(false)
      setEliminateIntercoTransactions(false)
      setSummary(false)
      setNormalBalance('')
      setFinancialStatementSection('')
      setFinancialStatementGroup('')
      setIsPosting(true)
      setIsControlAccount(false)
      setAllowsManualPosting(true)
      setRequiresSubledgerType('')
      setCashFlowCategory('')
      setParentAccountId('')
      setCloseToAccountId('')
      setScopeMode('selected')
      setSelectedSubsidiaryIds([])
      setParentSubsidiaryId(subsidiaries[0]?.id ?? '')
      setIncludeChildren(true)
      setSaving(false)
      router.refresh()
      onSuccess?.()
    } catch {
      setError('Unable to create chart account')
      setSaving(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {groupedVisibleFields.map(({ section, fields }) => (
        <section key={section} className="rounded-lg border p-4" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">{section}</h3>
          </div>
          <div className="grid gap-4" style={getSectionGridStyle()}>
            {fields.map((field) => (
              <div key={field.id} style={getFieldPlacementStyle(field.id)}>
                {renderField(field.id)}
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)' }}>
        <p className="text-sm font-semibold text-white">Subsidiary Scope</p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="scopeMode" checked={scopeMode === 'selected'} onChange={() => setScopeMode('selected')} />
            Select Multiple Subsidiaries
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="scopeMode" checked={scopeMode === 'parent'} onChange={() => setScopeMode('parent')} />
            Select Parent Subsidiary
          </label>
        </div>

        {scopeMode === 'selected' ? (
          <div className="mt-3 max-h-44 overflow-y-auto rounded-md border p-3" style={{ borderColor: 'var(--border-muted)' }}>
            {sortedSubsidiaries.map((subsidiary) => (
              <label key={subsidiary.id} className="mb-2 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={selectedSubsidiaryIds.includes(subsidiary.id)} onChange={() => toggleSubsidiary(subsidiary.id)} />
                <span>{subsidiary.subsidiaryId} - {subsidiary.name}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <select value={parentSubsidiaryId} onChange={(event) => setParentSubsidiaryId(event.target.value)} className="block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }}>
              {sortedSubsidiaries.map((subsidiary) => (
                <option key={subsidiary.id} value={subsidiary.id}>
                  {subsidiary.subsidiaryId} - {subsidiary.name}
                </option>
              ))}
            </select>
            <CheckboxField label="Include Children" checked={includeChildren} onChange={setIncludeChildren} />
          </div>
        )}
      </div>

      {error ? <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p> : null}
      <div className="flex items-center justify-end gap-3">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border px-4 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed"
          style={{ backgroundColor: saving ? '#64748b' : 'var(--accent-primary-strong)' }}
        >
          {saving ? 'Saving...' : 'Create Account'}
        </button>
      </div>
    </form>
  )
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: React.ReactNode
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 pt-7 text-sm" style={{ color: 'var(--text-secondary)' }}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
