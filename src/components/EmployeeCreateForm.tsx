'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isValidEmail } from '@/lib/validation'
import { isFieldRequired } from '@/lib/form-requirements'
import {
  defaultEmployeeFormCustomization,
  EMPLOYEE_FORM_FIELDS,
  type EmployeeFormCustomizationConfig,
  type EmployeeFormFieldKey,
} from '@/lib/employee-form-customization'

type EmployeeFormCustomizationResponse = {
  config?: EmployeeFormCustomizationConfig
}

export default function EmployeeCreateForm({
  entities,
  departments,
  managers,
  users,
  onSuccess,
  onCancel,
}: {
  entities: Array<{ id: string; subsidiaryId: string; name: string }>
  departments: Array<{ id: string; departmentId: string; name: string }>
  managers?: Array<{ id: string; firstName: string; lastName: string; employeeId?: string | null }>
  users?: Array<{ id: string; name?: string | null; email: string; userId?: string | null }>
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [title, setTitle] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [entityId, setEntityId] = useState('')
  const [managerId, setManagerId] = useState('')
  const [userId, setUserId] = useState('')
  const [hireDate, setHireDate] = useState('')
  const [terminationDate, setTerminationDate] = useState('')
  const [inactive, setInactive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runtimeRequirements, setRuntimeRequirements] = useState<Record<string, boolean> | null>(null)
  const [layoutConfig, setLayoutConfig] = useState<EmployeeFormCustomizationConfig>(() => defaultEmployeeFormCustomization())

  useEffect(() => {
    let mounted = true
    async function loadConfig() {
      try {
        const [requirementsResponse, layoutResponse] = await Promise.all([
          fetch('/api/config/form-requirements', { cache: 'no-store' }),
          fetch('/api/config/employee-form-customization', { cache: 'no-store' }),
        ])
        const requirementsBody = await requirementsResponse.json()
        const layoutBody = (await layoutResponse.json()) as EmployeeFormCustomizationResponse
        if (!mounted) return
        if (requirementsResponse.ok) setRuntimeRequirements(requirementsBody?.config?.employeeCreate ?? null)
        if (layoutResponse.ok && layoutBody.config) setLayoutConfig(layoutBody.config)
      } catch {
        // Keep defaults.
      }
    }
    loadConfig()
    return () => { mounted = false }
  }, [])

  function req(field: string): boolean {
    if (runtimeRequirements && Object.prototype.hasOwnProperty.call(runtimeRequirements, field)) {
      return Boolean(runtimeRequirements[field])
    }
    return isFieldRequired('employeeCreate', field)
  }

  function requiredLabel(text: string, required: boolean) {
    if (!required) return <>{text}</>
    return <>{text} <span style={{ color: 'var(--danger)' }}>*</span></>
  }

  const groupedVisibleFields = useMemo(() => {
    return layoutConfig.sections
      .map((section) => ({
        section,
        fields: EMPLOYEE_FORM_FIELDS
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

  function getFieldPlacementStyle(fieldId: EmployeeFormFieldKey): React.CSSProperties {
    const config = layoutConfig.fields[fieldId]
    return {
      gridColumnStart: Math.min(formColumns, Math.max(1, config?.column ?? 1)),
      gridRowStart: Math.max(1, (config?.order ?? 0) + 1),
    }
  }

  function renderField(fieldId: EmployeeFormFieldKey) {
    switch (fieldId) {
      case 'employeeId':
        return <FieldInput label={requiredLabel('Employee Id', req('employeeId'))}><input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required={req('employeeId')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'firstName':
        return <FieldInput label={requiredLabel('First Name', req('firstName'))}><input value={firstName} onChange={(e) => setFirstName(e.target.value)} required={req('firstName')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'lastName':
        return <FieldInput label={requiredLabel('Last Name', req('lastName'))}><input value={lastName} onChange={(e) => setLastName(e.target.value)} required={req('lastName')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'email':
        return <FieldInput label={requiredLabel('Email', req('email'))}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required={req('email')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'phone':
        return <FieldInput label={requiredLabel('Phone', req('phone'))}><input value={phone} onChange={(e) => setPhone(e.target.value)} required={req('phone')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'title':
        return <FieldInput label={requiredLabel('Title', req('title'))}><input value={title} onChange={(e) => setTitle(e.target.value)} required={req('title')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'departmentId':
        return <FieldInput label={requiredLabel('Department', req('departmentId'))}><select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required={req('departmentId')} className={inputClass} style={inputStyle}><option value="">None</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.departmentId} - {department.name}</option>)}</select></FieldInput>
      case 'entityId':
        return <FieldInput label={requiredLabel('Subsidiary', req('entityId'))}><select value={entityId} onChange={(e) => setEntityId(e.target.value)} required={req('entityId')} className={inputClass} style={inputStyle}><option value="">None</option>{entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.subsidiaryId} - {entity.name}</option>)}</select></FieldInput>
      case 'managerId':
        return <FieldInput label={requiredLabel('Manager', req('managerId'))}><select value={managerId} onChange={(e) => setManagerId(e.target.value)} required={req('managerId')} className={inputClass} style={inputStyle}><option value="">None</option>{(managers ?? []).map((manager) => <option key={manager.id} value={manager.id}>{manager.firstName} {manager.lastName}{manager.employeeId ? ` (${manager.employeeId})` : ''}</option>)}</select></FieldInput>
      case 'userId':
        return <FieldInput label={requiredLabel('Linked User', req('userId'))}><select value={userId} onChange={(e) => setUserId(e.target.value)} required={req('userId')} className={inputClass} style={inputStyle}><option value="">None</option>{(users ?? []).map((user) => <option key={user.id} value={user.id}>{user.name ?? user.email}{user.userId ? ` (${user.userId})` : ''}</option>)}</select></FieldInput>
      case 'hireDate':
        return <FieldInput label={requiredLabel('Hire Date', req('hireDate'))}><input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} required={req('hireDate')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'terminationDate':
        return <FieldInput label={requiredLabel('Termination Date', req('terminationDate'))}><input type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} required={req('terminationDate')} className={inputClass} style={inputStyle} /></FieldInput>
      case 'inactive':
        return <FieldInput label={requiredLabel('Inactive', req('inactive'))}><select value={inactive ? 'true' : 'false'} onChange={(e) => setInactive(e.target.value === 'true')} className={inputClass} style={inputStyle}><option value="false">No</option><option value="true">Yes</option></select></FieldInput>
      default:
        return null
    }
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
        ['employeeId', employeeId],
        ['firstName', firstName],
        ['lastName', lastName],
        ['email', email],
        ['phone', phone],
        ['title', title],
        ['departmentId', departmentId],
        ['entityId', entityId],
        ['managerId', managerId],
        ['userId', userId],
        ['hireDate', hireDate],
        ['terminationDate', terminationDate],
      ] as const

      for (const [fieldName, fieldValue] of requiredFields) {
        if (req(fieldName) && !String(fieldValue ?? '').trim()) {
          missing.push(fieldName)
        }
      }
      if (missing.length > 0) throw new Error(`Missing required fields: ${missing.join(', ')}`)

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, firstName, lastName, email, phone, title, departmentId, entityId, managerId, userId, hireDate, terminationDate, inactive }),
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
          <div className="mb-4"><h3 className="text-sm font-semibold text-white">{section}</h3></div>
          <div className="grid gap-4" style={getSectionGridStyle()}>
            {fields.map((field) => <div key={field.id} style={getFieldPlacementStyle(field.id)}>{renderField(field.id)}</div>)}
          </div>
        </section>
      ))}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>Cancel</button>
        <button type="submit" disabled={saving} className="rounded-md px-3 py-2 text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent-primary-strong)' }}>{saving ? 'Saving...' : 'Create Employee'}</button>
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
