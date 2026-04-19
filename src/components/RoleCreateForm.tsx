'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isFieldRequired } from '@/lib/form-requirements'
import {
  defaultRoleFormCustomization,
  ROLE_FORM_FIELDS,
  type RoleFormCustomizationConfig,
  type RoleFormFieldKey,
} from '@/lib/role-form-customization'

type RoleFormCustomizationResponse = {
  config?: RoleFormCustomizationConfig
}

export default function RoleCreateForm({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runtimeRequirements, setRuntimeRequirements] = useState<Record<string, boolean> | null>(null)
  const [layoutConfig, setLayoutConfig] = useState<RoleFormCustomizationConfig>(() => defaultRoleFormCustomization())

  useEffect(() => {
    let mounted = true
    async function loadConfig() {
      try {
        const [requirementsResponse, layoutResponse] = await Promise.all([
          fetch('/api/config/form-requirements', { cache: 'no-store' }),
          fetch('/api/config/role-form-customization', { cache: 'no-store' }),
        ])
        const requirementsBody = await requirementsResponse.json()
        const layoutBody = (await layoutResponse.json()) as RoleFormCustomizationResponse
        if (!mounted) return
        if (requirementsResponse.ok) setRuntimeRequirements(requirementsBody?.config?.roleCreate ?? null)
        if (layoutResponse.ok && layoutBody.config) setLayoutConfig(layoutBody.config)
      } catch {
        // Keep defaults when config APIs are unavailable.
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
    return isFieldRequired('roleCreate', field)
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
        fields: ROLE_FORM_FIELDS
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

  function getFieldPlacementStyle(fieldId: RoleFormFieldKey): React.CSSProperties {
    const config = layoutConfig.fields[fieldId]
    return {
      gridColumnStart: Math.min(formColumns, Math.max(1, config?.column ?? 1)),
      gridRowStart: Math.max(1, (config?.order ?? 0) + 1),
    }
  }

  function renderField(fieldId: RoleFormFieldKey) {
    switch (fieldId) {
      case 'roleId':
        return (
          <FieldInput label={requiredLabel('Role ID', req('roleId'))}>
            <input value="Generated automatically" readOnly disabled className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white opacity-80" style={{ borderColor: 'var(--border-muted)' }} />
          </FieldInput>
        )
      case 'name':
        return (
          <FieldInput label={requiredLabel('Role Name', req('name'))}>
            <input required={req('name')} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </FieldInput>
        )
      case 'description':
        return (
          <FieldInput label={requiredLabel('Description', req('description'))}>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }} />
          </FieldInput>
        )
      case 'inactive':
        return (
          <FieldInput label={requiredLabel('Inactive', req('inactive'))}>
            <select value="false" disabled className="mt-1 block w-full rounded-md border bg-transparent py-2 px-3 text-sm opacity-80" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)', backgroundColor: 'var(--card)' }}>
              <option value="false">No</option>
            </select>
          </FieldInput>
        )
      default:
        return null
    }
  }

  async function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, inactive: false }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Create failed')
      router.refresh()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submitForm} className="space-y-4">
      {error && <div className="rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-300">{error}</div>}
      {groupedVisibleFields.map(({ section, fields }) => (
        <section key={section} className="rounded-lg border p-4" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="mb-4"><h3 className="text-sm font-semibold text-white">{section}</h3></div>
          <div className="grid gap-4" style={getSectionGridStyle()}>
            {fields.map((field) => <div key={field.id} style={getFieldPlacementStyle(field.id)}>{renderField(field.id)}</div>)}
          </div>
        </section>
      ))}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>Cancel</button>
        <button type="submit" disabled={saving} className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>{saving ? 'Creating...' : 'Create Role'}</button>
      </div>
    </form>
  )
}

function FieldInput({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
      <span>{label}</span>
      {children}
    </label>
  )
}
