'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isValidEmail } from '@/lib/validation'
import { isFieldRequired } from '@/lib/form-requirements'
import {
  defaultUserFormCustomization,
  USER_FORM_FIELDS,
  type UserFormCustomizationConfig,
  type UserFormFieldKey,
} from '@/lib/user-form-customization'

type UserFormCustomizationResponse = {
  config?: UserFormCustomizationConfig
}

export default function UserCreateForm({
  roles,
  departments,
  employees,
  onSuccess,
  onCancel,
}: {
  roles: Array<{ id: string; name: string }>
  departments: Array<{ id: string; departmentId: string; name: string }>
  employees: Array<{ id: string; firstName: string; lastName: string; employeeId?: string | null }>
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [inactive, setInactive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runtimeRequirements, setRuntimeRequirements] = useState<Record<string, boolean> | null>(null)
  const [layoutConfig, setLayoutConfig] = useState<UserFormCustomizationConfig>(() => defaultUserFormCustomization())

  useEffect(() => {
    let mounted = true
    async function loadConfig() {
      try {
        const [requirementsResponse, layoutResponse] = await Promise.all([
          fetch('/api/config/form-requirements', { cache: 'no-store' }),
          fetch('/api/config/user-form-customization', { cache: 'no-store' }),
        ])
        const requirementsBody = await requirementsResponse.json()
        const layoutBody = (await layoutResponse.json()) as UserFormCustomizationResponse
        if (!mounted) return
        if (requirementsResponse.ok) setRuntimeRequirements(requirementsBody?.config?.userCreate ?? null)
        if (layoutResponse.ok && layoutBody.config) setLayoutConfig(layoutBody.config)
      } catch {
        // Keep defaults when config APIs are unavailable.
      }
    }
    loadConfig()
    return () => { mounted = false }
  }, [])

  function req(field: string): boolean {
    if (runtimeRequirements && Object.prototype.hasOwnProperty.call(runtimeRequirements, field)) {
      return Boolean(runtimeRequirements[field])
    }
    return isFieldRequired('userCreate', field)
  }

  function requiredLabel(text: string, required: boolean) {
    if (!required) return <>{text}</>
    return <>{text} <span style={{ color: 'var(--danger)' }}>*</span></>
  }

  const groupedVisibleFields = useMemo(() => {
    return layoutConfig.sections
      .map((section) => ({
        section,
        fields: USER_FORM_FIELDS
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

  function getFieldPlacementStyle(fieldId: UserFormFieldKey): React.CSSProperties {
    const config = layoutConfig.fields[fieldId]
    return {
      gridColumnStart: Math.min(formColumns, Math.max(1, config?.column ?? 1)),
      gridRowStart: Math.max(1, (config?.order ?? 0) + 1),
    }
  }

  function renderField(fieldId: UserFormFieldKey) {
    switch (fieldId) {
      case 'userId':
        return <FieldInput label={requiredLabel('User ID', req('userId'))}><input value="Generated automatically" readOnly disabled className={inputClass} style={inputStyle} /></FieldInput>
      case 'name':
        return <FieldInput label={requiredLabel('Name', req('name'))}><input value={name} onChange={(e) => setName(e.target.value)} required={req('name')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'email':
        return <FieldInput label={requiredLabel('Email', req('email'))}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required={req('email')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'roleId':
        return <FieldInput label={requiredLabel('Role', req('roleId'))}><select value={roleId} onChange={(e) => setRoleId(e.target.value)} required={req('roleId')} className={inputClass} style={inputStyle}><option value="">None</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></FieldInput>
      case 'departmentId':
        return <FieldInput label={requiredLabel('Department', req('departmentId'))}><select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required={req('departmentId')} className={inputClass} style={inputStyle}><option value="">None</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.departmentId} - {department.name}</option>)}</select></FieldInput>
      case 'employeeId':
        return <FieldInput label={requiredLabel('Linked Employee', req('employeeId'))}><select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required={req('employeeId')} className={inputClass} style={inputStyle}><option value="">None</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}{employee.employeeId ? ` (${employee.employeeId})` : ''}</option>)}</select></FieldInput>
      case 'inactive':
        return <FieldInput label={requiredLabel('Inactive', req('inactive'))}><select value={inactive ? 'true' : 'false'} onChange={(e) => setInactive(e.target.value === 'true')} className={inputClass} style={inputStyle}><option value="false">No</option><option value="true">Yes</option></select></FieldInput>
      default:
        return null
    }
  }

  async function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (email.trim() && !isValidEmail(email)) {
      setError('Please enter a valid email address')
      setSaving(false)
      return
    }

    try {
      const missing: string[] = []
      const requiredFields = [
        ['name', name],
        ['email', email],
        ['password', password],
        ['roleId', roleId],
        ['departmentId', departmentId],
        ['employeeId', employeeId],
      ] as const
      for (const [fieldName, fieldValue] of requiredFields) {
        if (req(fieldName) && !String(fieldValue ?? '').trim()) missing.push(fieldName)
      }
      if (missing.length > 0) throw new Error(`Missing required fields: ${missing.join(', ')}`)

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, roleId: roleId || null, departmentId: departmentId || null, employeeId: employeeId || null, inactive }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Create failed')
      router.refresh()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally { setSaving(false) }
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
      <section className="rounded-lg border p-4" style={{ borderColor: 'var(--border-muted)' }}>
        <div className="mb-4"><h3 className="text-sm font-semibold text-white">Security</h3></div>
        <FieldInput label={requiredLabel('Password', req('password'))}>
          <input required={req('password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} style={inputStyle} />
        </FieldInput>
      </section>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>Cancel</button>
        <button type="submit" disabled={saving} className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>{saving ? 'Creating...' : 'Create User'}</button>
      </div>
    </form>
  )
}

function FieldInput({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
      <span>{label}</span>
      {children}
    </label>
  )
}

const inputClass = 'w-full rounded-md border px-3 py-2 text-white bg-transparent'
const inputStyle = { borderColor: 'var(--border-muted)' } as const
