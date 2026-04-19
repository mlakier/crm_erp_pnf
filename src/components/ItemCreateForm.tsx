'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useListOptions } from '@/lib/list-options-client'
import { isFieldRequired } from '@/lib/form-requirements'
import {
  defaultItemFormCustomization,
  ITEM_FORM_FIELDS,
  type ItemFormCustomizationConfig,
  type ItemFormFieldKey,
} from '@/lib/item-form-customization'

type LookupOption = {
  id: string
  label: string
}

type ItemFormCustomizationResponse = {
  config?: ItemFormCustomizationConfig
}

export default function ItemCreateForm({
  entities,
  currencies,
  glAccounts,
  revRecTemplates,
  onSuccess,
  onCancel,
}: {
  entities: Array<{ id: string; subsidiaryId: string; name: string }>
  currencies: Array<{ id: string; currencyId: string; name: string }>
  glAccounts: Array<{ id: string; accountId: string; name: string }>
  revRecTemplates: Array<{ id: string; templateId: string; name: string }>
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [itemId, setItemId] = useState('')
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')
  const [inactive, setInactive] = useState(false)
  const [itemType, setItemType] = useState('service')
  const [uom, setUom] = useState('')
  const [listPrice, setListPrice] = useState('0')
  const [revenueStream, setRevenueStream] = useState('')
  const [recognitionMethod, setRecognitionMethod] = useState('')
  const [recognitionTrigger, setRecognitionTrigger] = useState('')
  const [defaultRevRecTemplateId, setDefaultRevRecTemplateId] = useState('')
  const [defaultTermMonths, setDefaultTermMonths] = useState('')
  const [standaloneSellingPrice, setStandaloneSellingPrice] = useState('')
  const [billingType, setBillingType] = useState('')
  const [standardCost, setStandardCost] = useState('')
  const [averageCost, setAverageCost] = useState('')
  const [entityId, setEntityId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [incomeAccountId, setIncomeAccountId] = useState('')
  const [deferredRevenueAccountId, setDeferredRevenueAccountId] = useState('')
  const [inventoryAccountId, setInventoryAccountId] = useState('')
  const [cogsExpenseAccountId, setCogsExpenseAccountId] = useState('')
  const [deferredCostAccountId, setDeferredCostAccountId] = useState('')
  const [directRevenuePosting, setDirectRevenuePosting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runtimeRequirements, setRuntimeRequirements] = useState<Record<string, boolean> | null>(null)
  const [layoutConfig, setLayoutConfig] = useState<ItemFormCustomizationConfig>(() => defaultItemFormCustomization())
  const itemTypeOptions = useListOptions('item', 'type')
  const deferredAccountsDisabled = directRevenuePosting

  const glOptions: LookupOption[] = glAccounts.map((account) => ({
    id: account.id,
    label: `${account.accountId} - ${account.name}`,
  }))

  useEffect(() => {
    let mounted = true

    async function loadConfig() {
      try {
        const [requirementsResponse, layoutResponse] = await Promise.all([
          fetch('/api/config/form-requirements', { cache: 'no-store' }),
          fetch('/api/config/item-form-customization', { cache: 'no-store' }),
        ])

        const requirementsBody = await requirementsResponse.json()
        const layoutBody = (await layoutResponse.json()) as ItemFormCustomizationResponse

        if (!mounted) return

        if (requirementsResponse.ok) {
          setRuntimeRequirements(requirementsBody?.config?.itemCreate ?? null)
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
    return isFieldRequired('itemCreate', field)
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
        fields: ITEM_FORM_FIELDS
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

  function getSectionGridClasses() {
    return 'grid gap-4'
  }

  function getFieldClasses() {
    return 'space-y-1 text-sm'
  }

  function getSectionGridStyle(): React.CSSProperties {
    return { gridTemplateColumns: `repeat(${formColumns}, minmax(0, 1fr))` }
  }

  function getFieldPlacementStyle(fieldId: ItemFormFieldKey): React.CSSProperties {
    const config = layoutConfig.fields[fieldId]
    return {
      gridColumnStart: Math.min(formColumns, Math.max(1, config?.column ?? 1)),
      gridRowStart: Math.max(1, (config?.order ?? 0) + 1),
    }
  }

  function renderField(fieldId: ItemFormFieldKey) {
    switch (fieldId) {
      case 'name':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Name', req('name'))}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required={req('name')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'itemId':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Item Id', req('itemId'))}</span>
            <input value={itemId} onChange={(e) => setItemId(e.target.value)} required={req('itemId')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'sku':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('SKU', req('sku'))}</span>
            <input value={sku} onChange={(e) => setSku(e.target.value)} required={req('sku')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'description':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Description', req('description'))}</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required={req('description')} rows={3} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'inactive':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Inactive', req('inactive'))}</span>
            <select value={inactive ? 'true' : 'false'} required={req('inactive')} onChange={(e) => setInactive(e.target.value === 'true')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>
        )
      case 'itemType':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Item Type', req('itemType'))}</span>
            <select value={itemType} required={req('itemType')} onChange={(e) => setItemType(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }}>
              {itemTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )
      case 'uom':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('UOM', req('uom'))}</span>
            <input value={uom} onChange={(e) => setUom(e.target.value)} required={req('uom')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'listPrice':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('List Price', req('listPrice'))}</span>
            <input type="number" step="0.01" value={listPrice} onChange={(e) => setListPrice(e.target.value)} required={req('listPrice')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'revenueStream':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Revenue Stream', req('revenueStream'))}</span>
            <input value={revenueStream} onChange={(e) => setRevenueStream(e.target.value)} required={req('revenueStream')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'recognitionMethod':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Recognition Method', req('recognitionMethod'))}</span>
            <select value={recognitionMethod} required={req('recognitionMethod')} onChange={(e) => setRecognitionMethod(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="">None</option>
              <option value="point_in_time">Point in Time</option>
              <option value="over_time">Over Time</option>
            </select>
          </label>
        )
      case 'recognitionTrigger':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Recognition Trigger', req('recognitionTrigger'))}</span>
            <input value={recognitionTrigger} onChange={(e) => setRecognitionTrigger(e.target.value)} required={req('recognitionTrigger')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'defaultRevRecTemplateId':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Rev Rec Template', req('defaultRevRecTemplateId'))}</span>
            <select value={defaultRevRecTemplateId} required={req('defaultRevRecTemplateId')} onChange={(e) => setDefaultRevRecTemplateId(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="">None</option>
              {revRecTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.templateId} - {template.name}
                </option>
              ))}
            </select>
          </label>
        )
      case 'defaultTermMonths':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Default Term Months', req('defaultTermMonths'))}</span>
            <input type="number" value={defaultTermMonths} onChange={(e) => setDefaultTermMonths(e.target.value)} required={req('defaultTermMonths')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'standaloneSellingPrice':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Standalone Selling Price', req('standaloneSellingPrice'))}</span>
            <input type="number" step="0.01" value={standaloneSellingPrice} onChange={(e) => setStandaloneSellingPrice(e.target.value)} required={req('standaloneSellingPrice')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'billingType':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Billing Type', req('billingType'))}</span>
            <input value={billingType} onChange={(e) => setBillingType(e.target.value)} required={req('billingType')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'standardCost':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Standard Cost', req('standardCost'))}</span>
            <input type="number" step="0.01" value={standardCost} onChange={(e) => setStandardCost(e.target.value)} required={req('standardCost')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'averageCost':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Average Cost', req('averageCost'))}</span>
            <input type="number" step="0.01" value={averageCost} onChange={(e) => setAverageCost(e.target.value)} required={req('averageCost')} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </label>
        )
      case 'entityId':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Subsidiary', req('entityId'))}</span>
            <select value={entityId} required={req('entityId')} onChange={(e) => setEntityId(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="">None</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.subsidiaryId} - {entity.name}
                </option>
              ))}
            </select>
          </label>
        )
      case 'currencyId':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Currency', req('currencyId'))}</span>
            <select value={currencyId} required={req('currencyId')} onChange={(e) => setCurrencyId(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="">None</option>
              {currencies.map((currency) => (
                <option key={currency.id} value={currency.id}>
                  {currency.currencyId} - {currency.name}
                </option>
              ))}
            </select>
          </label>
        )
      case 'incomeAccountId':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Income Account', req('incomeAccountId'))}</span>
            <select value={incomeAccountId} required={req('incomeAccountId')} onChange={(e) => setIncomeAccountId(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="">None</option>
              {glOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )
      case 'deferredRevenueAccountId':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Deferred Revenue Account', req('deferredRevenueAccountId'))}</span>
            <select value={deferredRevenueAccountId} required={req('deferredRevenueAccountId') && !deferredAccountsDisabled} disabled={deferredAccountsDisabled} onChange={(e) => setDeferredRevenueAccountId(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="">None</option>
              {glOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {deferredAccountsDisabled ? <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>Disabled because Direct Revenue Posting is enabled.</span> : null}
          </label>
        )
      case 'inventoryAccountId':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Inventory Account', req('inventoryAccountId'))}</span>
            <select value={inventoryAccountId} required={req('inventoryAccountId')} onChange={(e) => setInventoryAccountId(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="">None</option>
              {glOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )
      case 'cogsExpenseAccountId':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('COGS / Expense Account', req('cogsExpenseAccountId'))}</span>
            <select value={cogsExpenseAccountId} required={req('cogsExpenseAccountId')} onChange={(e) => setCogsExpenseAccountId(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-white" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="">None</option>
              {glOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )
      case 'deferredCostAccountId':
        return (
          <label key={fieldId} className={getFieldClasses()} style={{ color: 'var(--text-secondary)' }}>
            <span>{requiredLabel('Deferred Cost Account', req('deferredCostAccountId'))}</span>
            <select value={deferredCostAccountId} required={req('deferredCostAccountId') && !deferredAccountsDisabled} disabled={deferredAccountsDisabled} onChange={(e) => setDeferredCostAccountId(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: 'var(--border-muted)' }}>
              <option value="">None</option>
              {glOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {deferredAccountsDisabled ? <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>Disabled because Direct Revenue Posting is enabled.</span> : null}
          </label>
        )
      case 'directRevenuePosting':
        return (
          <label key={fieldId} className={`${getFieldClasses()} flex items-center gap-2 pt-7`} style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={directRevenuePosting}
              onChange={(e) => {
                const checked = e.target.checked
                setDirectRevenuePosting(checked)
                if (checked) {
                  setDeferredRevenueAccountId('')
                  setDeferredCostAccountId('')
                }
              }}
              className="h-4 w-4 rounded"
            />
            <span>{requiredLabel('Direct Revenue Posting', req('directRevenuePosting'))}</span>
          </label>
        )
      default:
        return null
    }
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const missing: string[] = []
      const requiredFields = [
        ['name', name],
        ['itemId', itemId],
        ['sku', sku],
        ['description', description],
        ['inactive', inactive ? 'true' : 'false'],
        ['itemType', itemType],
        ['uom', uom],
        ['listPrice', listPrice],
        ['revenueStream', revenueStream],
        ['recognitionMethod', recognitionMethod],
        ['recognitionTrigger', recognitionTrigger],
        ['defaultRevRecTemplateId', defaultRevRecTemplateId],
        ['defaultTermMonths', defaultTermMonths],
        ['standaloneSellingPrice', standaloneSellingPrice],
        ['billingType', billingType],
        ['standardCost', standardCost],
        ['averageCost', averageCost],
        ['entityId', entityId],
        ['currencyId', currencyId],
        ['incomeAccountId', incomeAccountId],
        ['inventoryAccountId', inventoryAccountId],
        ['cogsExpenseAccountId', cogsExpenseAccountId],
      ] as const

      for (const [fieldName, fieldValue] of requiredFields) {
        if (req(fieldName) && !String(fieldValue ?? '').trim()) {
          missing.push(fieldName)
        }
      }

      if (req('deferredRevenueAccountId') && !directRevenuePosting && !deferredRevenueAccountId.trim()) {
        missing.push('deferredRevenueAccountId')
      }

      if (req('deferredCostAccountId') && !directRevenuePosting && !deferredCostAccountId.trim()) {
        missing.push('deferredCostAccountId')
      }

      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`)
      }

      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          itemId,
          sku,
          description,
          itemType,
          uom,
          listPrice: Number(listPrice),
          revenueStream,
          recognitionMethod,
          recognitionTrigger,
          defaultRevRecTemplateId,
          defaultTermMonths,
          standaloneSellingPrice,
          billingType,
          standardCost,
          averageCost,
          entityId,
          currencyId,
          incomeAccountId,
          deferredRevenueAccountId: directRevenuePosting ? '' : deferredRevenueAccountId,
          inventoryAccountId,
          cogsExpenseAccountId,
          deferredCostAccountId: directRevenuePosting ? '' : deferredCostAccountId,
          directRevenuePosting,
          inactive,
        }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.error ?? 'Create failed')
      router.refresh()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={submitForm}>
      {groupedVisibleFields.map(({ section, fields }) => (
        <section key={section} className="rounded-lg border p-4" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">{section}</h3>
          </div>
          <div className={getSectionGridClasses()} style={getSectionGridStyle()}>
            {fields.map((field) => (
              <div key={field.id} style={getFieldPlacementStyle(field.id)}>
                {renderField(field.id)}
              </div>
            ))}
          </div>
        </section>
      ))}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>Cancel</button>
        <button type="submit" disabled={saving} className="rounded-md px-3 py-2 text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>{saving ? 'Saving...' : 'Create Item'}</button>
      </div>
    </form>
  )
}
