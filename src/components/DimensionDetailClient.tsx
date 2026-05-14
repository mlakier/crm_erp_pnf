'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import HelpTooltipIcon from '@/components/HelpTooltipIcon'

import type {
  DimensionConfigurationRow,
  DimensionTargetKey,
  DimensionTransactionFamilyKey,
} from '@/lib/dimension-control-plane'
import {
  DIMENSION_SOURCING_TARGETS,
  DIMENSION_TARGETS,
  formatDimensionSelectionTypeLabel,
  formatDimensionTargetLabel,
  formatDimensionTransactionFamilyLabel,
  formatDimensionTypeLabel,
  formatDimensionValueModelLabel,
  formatDimensionValueSourceLabel,
  getDimensionTransactionFamilySourcingDescription,
  getDimensionValueFieldEntityType,
} from '@/lib/dimension-control-plane'
import {
  CUSTOM_FIELD_TYPES,
  formatCustomFieldValue,
  normalizeCustomFieldName,
  parseCustomFieldOptions,
  type CustomFieldType,
} from '@/lib/custom-fields'

type Props =
  | {
      mode: 'create'
      initialRow?: undefined
    }
  | {
      mode: 'edit'
      initialRow: DimensionConfigurationRow
    }

type EditableDimension = DimensionConfigurationRow
type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type DetailTab = 'values' | 'fields' | 'applicability' | 'sourcing' | 'enforcement' | 'propagation' | 'posting' | 'preview'

const VALUE_SOURCE_OPTIONS = [
  { value: 'department', label: 'Departments' },
  { value: 'location', label: 'Locations' },
  { value: 'class', label: 'Classes' },
  { value: 'generic', label: 'Generic Values' },
]

const DIMENSION_TYPE_OPTIONS = [
  { value: 'internal', label: 'Internal Dimension' },
  { value: 'custom', label: 'Custom Dimension' },
]

const VALUE_MODEL_OPTIONS = [
  { value: 'managed_list_record', label: 'Managed List Record' },
  { value: 'simple_managed_list', label: 'Simple Managed List' },
  { value: 'custom_record_backed', label: 'Custom Record-Backed' },
]

const SELECTION_TYPE_OPTIONS = [
  { value: 'single_select', label: 'Single Select' },
  { value: 'multi_select', label: 'Multi Select' },
]

const INHERITANCE_MODE_OPTIONS = [
  'inherit_only',
  'inherit_with_override',
  'manual_only',
  'system_derived',
]

const OVERRIDE_MODE_OPTIONS = ['allowed', 'locked', 'system_only']
const VALIDATION_MODE_OPTIONS = ['optional', 'required_header', 'required_line', 'required_posting_only']

const NON_TRANSACTION_APPLICABILITY_COLUMNS: Array<{
  key: DimensionTargetKey
  shortLabel: string
  description: string
}> = [
  { key: 'gl_line', shortLabel: 'GL Line', description: 'Dimension use on GL and posting lines.' },
  { key: 'project_header', shortLabel: 'Project', description: 'Dimension use on projects.' },
  { key: 'subscription_header', shortLabel: 'Subscription', description: 'Dimension use on subscriptions.' },
]

const MASTER_DATA_EXTENSION_COLUMNS: Array<{
  key: DimensionTargetKey
  shortLabel: string
  description: string
  state: 'configurable' | 'planned'
}> = [
  { key: 'customer_record', shortLabel: 'Customer', description: 'Allows customer records to carry a default value for LTC, billing, and revenue sourcing.', state: 'configurable' },
  { key: 'vendor_record', shortLabel: 'Vendor', description: 'Allows vendor records to carry a default value for PTP sourcing.', state: 'configurable' },
  { key: 'item_record', shortLabel: 'Item', description: 'Allows item, product, or service records to carry line-level defaults.', state: 'configurable' },
  { key: 'gl_account_record', shortLabel: 'GL Account', description: 'Allows GL accounts to carry posting-line defaults.', state: 'configurable' },
  { key: 'employee_record', shortLabel: 'Employee', description: 'Allows employee records to carry defaults for workflow, expense, and operational sourcing.', state: 'configurable' },
  { key: 'user_record', shortLabel: 'User', description: 'Allows user records to carry defaults for ownership and entry-context sourcing.', state: 'planned' },
  { key: 'subsidiary_record', shortLabel: 'Subsidiary', description: 'Allows subsidiary records to carry entity-level defaults and validation context.', state: 'configurable' },
  { key: 'contact_record', shortLabel: 'Contact', description: 'Allows contacts to carry defaults for CRM and relationship-driven sourcing.', state: 'planned' },
  { key: 'custom_record', shortLabel: 'Custom Record', description: 'Allows future custom records to carry dimension defaults.', state: 'planned' },
]

const TAB_CONFIG: Array<{ key: DetailTab; label: string; state: 'live' | 'configurable' | 'planned' }> = [
  { key: 'values', label: 'Values', state: 'configurable' },
  { key: 'fields', label: 'Fields', state: 'configurable' },
  { key: 'applicability', label: 'Where It Applies', state: 'live' },
  { key: 'sourcing', label: 'Sourcing', state: 'configurable' },
  { key: 'enforcement', label: 'Enforcement', state: 'configurable' },
  { key: 'propagation', label: 'Propagation', state: 'planned' },
  { key: 'posting', label: 'Posting', state: 'configurable' },
  { key: 'preview', label: 'Preview', state: 'live' },
]

const SOURCE_OPTIONS = [
  { key: 'upstream_source_document', label: 'Upstream source header', definition: 'Use the header value from the document that created this record, if one exists.' },
  { key: 'upstream_source_line', label: 'Upstream source line', definition: 'Use the line value from the source line that created this line, if one exists.' },
  { key: 'customer_defaults', label: 'Customer default', definition: 'Use the dimension value stored on the customer record.' },
  { key: 'vendor_defaults', label: 'Vendor default', definition: 'Use the dimension value stored on the vendor record.' },
  { key: 'item_defaults', label: 'Item default', definition: 'Use the dimension value stored on the item, product, or service record.' },
  { key: 'gl_account_defaults', label: 'GL account default', definition: 'Use the dimension value stored on the selected GL account.' },
  { key: 'project_defaults', label: 'Project default', definition: 'Use the dimension value stored on the linked project.' },
  { key: 'subscription_defaults', label: 'Subscription default', definition: 'Use the dimension value stored on the linked subscription.' },
  { key: 'subscription_plan_defaults', label: 'Subscription plan default', definition: 'Use the dimension value stored on the linked subscription plan.' },
  { key: 'billable_charge', label: 'Billable charge', definition: 'Use the value from the charge or usage record being invoiced.' },
  { key: 'header_inheritance', label: 'Header value', definition: 'Use the current transaction header value as the default for lines.' },
  { key: 'explicit_user_entry', label: 'Explicit header entry', definition: 'Let the user enter or override the header value manually.' },
  { key: 'explicit_line_entry', label: 'Explicit line entry', definition: 'Let the user enter or override the line value manually.' },
  { key: 'revenue_element', label: 'Revenue element', definition: 'Use the value stored on the revenue element or performance obligation.', advanced: true },
  { key: 'posting_policy_override', label: 'Posting policy override', definition: 'Use a system posting policy value when the posting rule explicitly sets one.', advanced: true },
  { key: 'subsidiary_defaults', label: 'Subsidiary default', definition: 'Use the dimension value stored on the subsidiary record.', advanced: true },
  { key: 'counterparty_defaults', label: 'Counterparty default', definition: 'Use the value from the related customer, vendor, employee, or other counterparty.', advanced: true },
  { key: 'employee_defaults', label: 'Employee / user default', definition: 'Use the dimension value stored on the employee or user record.', advanced: true },
  { key: 'custom_record_defaults', label: 'Custom record default', definition: 'Use the value stored on an admin-configured custom record source.', advanced: true },
  { key: 'source_transaction_header', label: 'Source transaction header', definition: 'Use a specific referenced transaction header, separate from normal upstream inheritance.', advanced: true },
  { key: 'source_transaction_line', label: 'Source transaction line', definition: 'Use a specific referenced transaction line, separate from normal upstream inheritance.', advanced: true },
]

const SOURCE_EXTENSION_DEPENDENCIES: Record<string, DimensionTargetKey[]> = {
  customer_defaults: ['customer_record'],
  vendor_defaults: ['vendor_record'],
  item_defaults: ['item_record'],
  gl_account_defaults: ['gl_account_record'],
  project_defaults: ['project_header'],
  subscription_defaults: ['subscription_header'],
  subscription_plan_defaults: ['subscription_header'],
  subsidiary_defaults: ['subsidiary_record'],
  counterparty_defaults: ['customer_record', 'vendor_record', 'employee_record', 'contact_record'],
  employee_defaults: ['employee_record', 'user_record'],
  custom_record_defaults: ['custom_record'],
}

const TARGETS: DimensionTargetKey[] = [...DIMENSION_TARGETS]
const SOURCING_TARGETS = [...DIMENSION_SOURCING_TARGETS]

const TRANSACTION_FAMILIES: DimensionTransactionFamilyKey[] = ['crm', 'p2p', 'rtr', 'billing_revenue']

export default function DimensionDetailClient(props: Props) {
  const router = useRouter()
  const [baselineRow, setBaselineRow] = useState<EditableDimension>(() =>
    cloneRow(props.mode === 'edit' ? props.initialRow : createEmptyRow()),
  )
  const [row, setRow] = useState<EditableDimension>(() => cloneRow(props.mode === 'edit' ? props.initialRow : createEmptyRow()))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [tab, setTab] = useState<DetailTab>('applicability')
  const [isEditing, setIsEditing] = useState(props.mode === 'create')
  const readOnly = props.mode === 'edit' && !isEditing

  const title = props.mode === 'create' ? 'New Dimension' : row.label
  const subtitle =
    props.mode === 'create'
      ? 'Create a new dimension, then configure applicability, sourcing, posting, and the planned downstream policy layers.'
      : row.description || 'Edit the dimension definition and its downstream policy tabs.'

  const valueSourceSummary = useMemo(() => formatDimensionValueSourceLabel(row.valueSourceType), [row.valueSourceType])
  const dimensionTypeSummary = useMemo(() => formatDimensionTypeLabel(row.dimensionType), [row.dimensionType])
  const valueModelSummary = useMemo(() => formatDimensionValueModelLabel(row.valueModel), [row.valueModel])
  const selectionTypeSummary = useMemo(() => formatDimensionSelectionTypeLabel(row.selectionType), [row.selectionType])
  const policyIssues = useMemo(() => getPolicyIssues(row), [row])

  function updateRow(updates: Partial<EditableDimension>) {
    setRow((current) => ({ ...current, ...updates }))
  }

  function updateApplicability(targetKey: DimensionTargetKey, updates: Partial<EditableDimension['applicabilities'][number]>) {
    setRow((current) => ({
      ...current,
      ...(targetKey === 'gl_line' && typeof updates.isVisible === 'boolean' ? { allowsGlAssignment: updates.isVisible } : {}),
      ...(targetKey === 'project_header' && typeof updates.isVisible === 'boolean' ? { allowsProjectAssignment: updates.isVisible } : {}),
      ...(targetKey === 'subscription_header' && typeof updates.isVisible === 'boolean' ? { allowsSubscriptionAssignment: updates.isVisible } : {}),
      applicabilities: current.applicabilities.map((entry) =>
        entry.targetKey === targetKey ? { ...entry, ...updates } : entry,
      ),
    }))
  }

  function updateTransactionFamilyAssignment(
    familyKey: DimensionTransactionFamilyKey,
    updates: Partial<EditableDimension['transactionFamilyAssignments'][number]>,
  ) {
    setRow((current) => ({
      ...syncTransactionApplicability({
        ...current,
        transactionFamilyAssignments: current.transactionFamilyAssignments.map((entry) =>
          entry.familyKey === familyKey ? { ...entry, ...updates } : entry,
        ),
      }),
    }))
  }

  function updateTransactionFamilySourcingPolicy(
    familyKey: DimensionTransactionFamilyKey,
    updates: Partial<EditableDimension['transactionFamilySourcingPolicies'][number]>,
  ) {
    setRow((current) => ({
      ...current,
      transactionFamilySourcingPolicies: current.transactionFamilySourcingPolicies.map((entry) =>
        entry.familyKey === familyKey ? { ...entry, ...updates } : entry,
      ),
    }))
  }

  function addFamilySource(familyKey: DimensionTransactionFamilyKey, scope: 'header' | 'line', sourceKey: string) {
    if (!sourceKey) return
    if (!getSourceEligibility(row, sourceKey).eligible) return
    const current = row.transactionFamilySourcingPolicies.find((entry) => entry.familyKey === familyKey)
    if (!current) return
    const key = scope === 'header' ? 'headerSourcePriority' : 'lineSourcePriority'
    const currentValues = current[key]
    if (currentValues.includes(sourceKey)) return
    updateTransactionFamilySourcingPolicy(familyKey, { [key]: [...currentValues, sourceKey] })
  }

  function removeFamilySource(familyKey: DimensionTransactionFamilyKey, scope: 'header' | 'line', sourceKey: string) {
    const current = row.transactionFamilySourcingPolicies.find((entry) => entry.familyKey === familyKey)
    if (!current) return
    const key = scope === 'header' ? 'headerSourcePriority' : 'lineSourcePriority'
    updateTransactionFamilySourcingPolicy(familyKey, {
      [key]: current[key].filter((entry) => entry !== sourceKey),
    })
  }

  function moveFamilySource(
    familyKey: DimensionTransactionFamilyKey,
    scope: 'header' | 'line',
    sourceKey: string,
    direction: 'up' | 'down',
  ) {
    const current = row.transactionFamilySourcingPolicies.find((entry) => entry.familyKey === familyKey)
    if (!current) return
    const key = scope === 'header' ? 'headerSourcePriority' : 'lineSourcePriority'
    const values = current[key]
    const index = values.indexOf(sourceKey)
    if (index === -1) return
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= values.length) return
    const next = [...values]
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    updateTransactionFamilySourcingPolicy(familyKey, { [key]: next })
  }

  async function saveDimensionValue(value: {
    valueId?: string
    businessId?: string
    code: string
    name: string
    description: string
    isActive: boolean
    customFieldValues?: Record<string, string>
  }) {
    if (row.id === 'new-dimension') {
      throw new Error('Save the dimension first before maintaining values.')
    }

    const response = await fetch('/api/config/dimensions/values', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dimensionId: row.id,
        valueId: value.valueId,
        businessId: value.businessId,
        code: value.code,
        name: value.name,
        description: value.description,
        isActive: value.isActive,
      }),
    })

    const body = (await response.json().catch(() => null)) as
      | { row?: DimensionConfigurationRow | null; error?: string | null }
      | null

    if (!response.ok || !body?.row) {
      throw new Error(body?.error || 'Failed to save dimension value.')
    }

    const customFields = row.valueFields.filter((field) => field.source === 'custom')
    const targetValue = body.row.values.find((entry) => {
      if (value.valueId) return entry.id === value.valueId
      return entry.businessId === (value.businessId || value.code) || entry.code === value.code
    })

    if (targetValue && customFields.length > 0 && value.customFieldValues) {
      for (const field of customFields) {
        await fetch('/api/custom-field-values', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fieldId: field.id,
            recordId: targetValue.id,
            entityType: getDimensionValueFieldEntityType(row.dimensionKey),
            value: value.customFieldValues[field.id] ?? '',
          }),
        })
      }

      const rowsResponse = await fetch('/api/config/dimensions', { cache: 'no-store' })
      const rowsBody = (await rowsResponse.json().catch(() => null)) as
        | { rows?: DimensionConfigurationRow[] | null; error?: string | null }
        | null
      const refreshed = rowsBody?.rows?.find((entry) => entry.id === row.id)
      if (!rowsResponse.ok || !refreshed) {
        throw new Error(rowsBody?.error || 'Value was saved, but custom value fields could not be refreshed.')
      }
      const nextRow = cloneRow(refreshed)
      setRow(nextRow)
      setBaselineRow(nextRow)
      return
    }

    const nextRow = cloneRow(body.row)
    setRow(nextRow)
    setBaselineRow(nextRow)
  }

  async function deleteDimensionValue(valueId: string) {
    if (row.id === 'new-dimension') {
      throw new Error('Save the dimension first before maintaining values.')
    }

    const response = await fetch('/api/config/dimensions/values', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dimensionId: row.id,
        valueId,
      }),
    })

    const body = (await response.json().catch(() => null)) as
      | { row?: DimensionConfigurationRow | null; error?: string | null }
      | null

    if (!response.ok || !body?.row) {
      throw new Error(body?.error || 'Failed to delete dimension value.')
    }

    const nextRow = cloneRow(body.row)
    setRow(nextRow)
    setBaselineRow(nextRow)
  }

  async function saveDimensionValueField(field: {
    id?: string
    label: string
    name: string
    type: CustomFieldType
    required: boolean
    defaultValue: string
    options: string[]
  }) {
    if (row.id === 'new-dimension') {
      throw new Error('Save the dimension first before maintaining value fields.')
    }

    const response = await fetch('/api/custom-fields', {
      method: field.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: field.id,
        entityType: getDimensionValueFieldEntityType(row.dimensionKey),
        label: field.label,
        name: field.name,
        type: field.type,
        required: field.required,
        defaultValue: field.defaultValue,
        options: field.options,
      }),
    })

    const body = (await response.json().catch(() => null)) as { error?: string | null } | null
    if (!response.ok) {
      throw new Error(body?.error || 'Failed to save dimension value field.')
    }

    const rowsResponse = await fetch('/api/config/dimensions', { cache: 'no-store' })
    const rowsBody = (await rowsResponse.json().catch(() => null)) as
      | { rows?: DimensionConfigurationRow[] | null; error?: string | null }
      | null
    const refreshed = rowsBody?.rows?.find((entry) => entry.id === row.id)
    if (!rowsResponse.ok || !refreshed) {
      throw new Error(rowsBody?.error || 'Value field was created, but the dimension could not be refreshed.')
    }

    const nextRow = cloneRow(refreshed)
    setRow(nextRow)
    setBaselineRow(nextRow)
  }

  async function save() {
    setSaveState('saving')
    try {
      const response = await fetch('/api/config/dimensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimensionId: props.mode === 'edit' ? row.id : undefined,
          dimensionKey: row.dimensionKey,
          label: row.label,
          description: row.description,
          valueSourceType: row.valueSourceType,
          dimensionType: row.dimensionType,
          valueModel: row.valueModel,
          selectionType: row.selectionType,
          isActive: row.isActive,
          allowsHeaderAssignment: row.allowsHeaderAssignment,
          allowsLineAssignment: row.allowsLineAssignment,
          allowsGlAssignment: row.allowsGlAssignment,
          allowsProjectAssignment: row.allowsProjectAssignment,
          allowsSubscriptionAssignment: row.allowsSubscriptionAssignment,
          inheritanceMode: row.inheritanceMode,
          overrideMode: row.overrideMode,
          validationMode: row.validationMode,
          postToGl: row.postToGl,
          requiresGlSplit: row.requiresGlSplit,
          applicabilities: syncTransactionApplicability(row).applicabilities,
          sourcingPolicies: row.sourcingPolicies,
          transactionFamilyAssignments: row.transactionFamilyAssignments,
          transactionFamilySourcingPolicies: row.transactionFamilySourcingPolicies,
        }),
      })

      const body = (await response.json().catch(() => null)) as
        | { rows?: DimensionConfigurationRow[] | null; createdId?: string | null; error?: string | null }
        | null

      if (!response.ok) {
        throw new Error(body?.error || 'Failed to save dimension.')
      }

      const targetId = props.mode === 'create' ? body?.createdId : row.id
      const refreshedRow = body?.rows?.find((entry) => entry.id === targetId)
      if (refreshedRow) {
        const nextRow = cloneRow(refreshedRow)
        setRow(nextRow)
        setBaselineRow(nextRow)
      }

      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 1500)

      if (props.mode === 'create' && targetId) {
        router.replace(`/configuration/manage-dimensions/${targetId}`)
      } else {
        setIsEditing(false)
      }
    } catch (error) {
      console.error(error)
      setSaveState('error')
    }
  }

  function cancelEdit() {
    if (props.mode === 'create') {
      router.push('/configuration/manage-dimensions')
      return
    }

    setRow(cloneRow(baselineRow))
    setSaveState('idle')
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-2xl border p-8"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-white">{title}</h1>
              {row.isSeeded ? <Badge label="Seeded" tone="blue" /> : <Badge label="Custom" tone="slate" />}
              <Badge label={row.isActive ? 'Active' : 'Inactive'} tone={row.isActive ? 'green' : 'slate'} />
              <Badge label={policyIssues.length > 0 ? `${policyIssues.length} Review` : 'Policy Ready'} tone={policyIssues.length > 0 ? 'amber' : 'green'} />
            </div>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/configuration/manage-dimensions"
              className="rounded-md border px-3 py-2 text-sm font-medium"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
            >
              Back to Manage
            </Link>
            {props.mode === 'edit' && !isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-md px-3 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Edit
              </button>
            ) : (
              <>
                <SaveStateBadge state={saveState} />
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-md border px-3 py-2 text-sm font-medium"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  className="rounded-md px-3 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: 'var(--accent)' }}
                  disabled={saveState === 'saving'}
                >
                  {saveState === 'saving' ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white">Header</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Label" helpText="The business-facing name people will see on records, forms, and reports.">
                <input
                  value={row.label}
                  onChange={(event) => updateRow({ label: event.target.value })}
                  disabled={readOnly}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white disabled:opacity-60"
                  style={{ borderColor: 'var(--border-muted)' }}
                />
              </Field>
              <Field label="Dimension Key" helpText="The stable internal key for this dimension. Seeded keys stay fixed; custom keys should be short and system-friendly.">
                <input
                  value={row.dimensionKey}
                  onChange={(event) => updateRow({ dimensionKey: normalizeDimensionKey(event.target.value) })}
                  disabled={row.isSeeded || readOnly}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white disabled:opacity-60"
                  style={{ borderColor: 'var(--border-muted)' }}
                />
              </Field>
            </div>

            <Field label="Description" helpText="Use this to explain the intended business purpose of the dimension for future admins.">
              <textarea
                value={row.description}
                onChange={(event) => updateRow({ description: event.target.value })}
                disabled={readOnly}
                className="min-h-[88px] w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white disabled:opacity-60"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Dimension Type" helpText="Internal dimensions are platform-provided. Custom dimensions are admin-created.">
                <select
                  value={row.dimensionType}
                  onChange={(event) => updateRow({ dimensionType: event.target.value })}
                  disabled={row.isSeeded || readOnly}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white disabled:opacity-60"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  {DIMENSION_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Value Source" helpText="The base value list this dimension draws from, such as Departments, Locations, Classes, or a generic custom value pool.">
                <select
                  value={row.valueSourceType}
                  onChange={(event) => updateRow({ valueSourceType: event.target.value })}
                  disabled={readOnly}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white disabled:opacity-60"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  {VALUE_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Value Model" helpText="How the dimension’s values are modeled behind the scenes while the admin experience stays simple.">
                <select
                  value={row.valueModel}
                  onChange={(event) => updateRow({ valueModel: event.target.value })}
                  disabled={row.isSeeded || readOnly}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white disabled:opacity-60"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  {VALUE_MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Selection Type" helpText="How end users pick values for this dimension on records.">
                <select
                  value={row.selectionType}
                  onChange={(event) => updateRow({ selectionType: event.target.value })}
                  disabled={row.isSeeded || readOnly}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white disabled:opacity-60"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  {SELECTION_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white">Status And Review</h2>
            <Toggle label="Active" helpText="Turn the dimension on or off for future use. Inactive dimensions remain historical reference but should not be assigned to new records." checked={row.isActive} disabled={readOnly} onChange={(checked) => updateRow({ isActive: checked })} />

            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Summary
              </p>
              <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <p><span className="text-white">Value source:</span> {valueSourceSummary}</p>
                <p><span className="text-white">Dimension type:</span> {dimensionTypeSummary}</p>
                <p><span className="text-white">Value model:</span> {valueModelSummary}</p>
                <p><span className="text-white">Selection type:</span> {selectionTypeSummary}</p>
                <p><span className="text-white">Type:</span> {row.postToGl ? 'Financial + Reporting' : 'Operational / Reporting'}</p>
                <p><span className="text-white">Seeded:</span> {row.isSeeded ? 'Yes' : 'No'}</p>
              </div>
            </div>

            <div className="rounded-xl border p-4" style={{ borderColor: policyIssues.length > 0 ? 'rgba(253, 230, 138, 0.35)' : 'rgba(134, 239, 172, 0.35)' }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Policy Health
                </p>
                <Badge label={policyIssues.length > 0 ? 'Needs Review' : 'Ready'} tone={policyIssues.length > 0 ? 'amber' : 'green'} />
              </div>
              {policyIssues.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {policyIssues.map((issue) => (
                    <li key={issue} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
                      {issue}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No obvious setup conflicts detected.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        className="rounded-2xl border p-6"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
      >
        <div className="flex flex-wrap gap-3">
          {TAB_CONFIG.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
              style={
                tab === entry.key
                  ? { backgroundColor: 'rgba(59, 130, 246, 0.16)', color: '#ffffff' }
                  : { color: 'var(--text-secondary)' }
              }
            >
              <span>{entry.label}</span>
              <StatePill state={entry.state} />
            </button>
          ))}
        </div>

        <div className="mt-6">
        {tab === 'values' ? (
            <ValuesTab row={row} readOnly={readOnly} onSaveValue={saveDimensionValue} onDeleteValue={deleteDimensionValue} onReplaceRow={(nextRow) => {
              const cloned = cloneRow(nextRow)
              setRow(cloned)
              setBaselineRow(cloned)
            }} />
          ) : tab === 'fields' ? (
            <FieldsTab row={row} readOnly={readOnly} onSaveField={saveDimensionValueField} />
          ) : tab === 'applicability' ? (
            <ApplicabilityTab
              row={row}
              onUpdate={updateApplicability}
              onUpdateFamilyAssignment={updateTransactionFamilyAssignment}
              readOnly={readOnly}
            />
          ) : tab === 'sourcing' ? (
            <SourcingTab
              row={row}
              onAddFamilySource={addFamilySource}
              onMoveFamilySource={moveFamilySource}
              onRemoveFamilySource={removeFamilySource}
              onUpdateFamilyPolicy={updateTransactionFamilySourcingPolicy}
              readOnly={readOnly}
            />
          ) : tab === 'enforcement' ? (
            <EnforcementTab
              row={row}
              onUpdate={updateRow}
              onUpdateFamilyPolicy={updateTransactionFamilySourcingPolicy}
              readOnly={readOnly}
            />
          ) : tab === 'propagation' ? (
            <PropagationTab row={row} />
          ) : tab === 'posting' ? (
            <PostingTab row={row} onUpdate={updateRow} readOnly={readOnly} />
          ) : (
            <PreviewTab row={row} />
          )}
        </div>
      </section>
    </div>
  )
}

function ApplicabilityTab({
  row,
  onUpdate,
  onUpdateFamilyAssignment,
  readOnly,
}: {
  row: EditableDimension
  onUpdate: (targetKey: DimensionTargetKey, updates: Partial<EditableDimension['applicabilities'][number]>) => void
  onUpdateFamilyAssignment: (
    familyKey: DimensionTransactionFamilyKey,
    updates: Partial<EditableDimension['transactionFamilyAssignments'][number]>,
  ) => void
  readOnly: boolean
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Where It Applies</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Decide where this dimension can live before sourcing, validation, propagation, and posting rules use it.
        </p>
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">Master Data Extension</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              These records can carry a default value for this dimension. The sourcing tab decides when each one wins.
            </p>
          </div>
          <StatePill state="configurable" />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MASTER_DATA_EXTENSION_COLUMNS.map((column) => {
            const entry = row.applicabilities.find((item) => item.targetKey === column.key)
            return (
              <div
                key={column.key}
                className="rounded-xl border p-4"
                style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{column.shortLabel}</p>
                  <StatePill state={column.state} />
                </div>
                <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                  {column.description}
                </p>
                <div className="mt-4 space-y-3">
                  <Toggle
                    label="Extend to record"
                    helpText={`Allows ${column.shortLabel} records to hold this dimension value as a default/source.`}
                    checked={entry?.isVisible ?? false}
                    disabled={readOnly}
                    onChange={(checked) => onUpdate(column.key, { isVisible: checked })}
                  />
                  <Toggle
                    label="Required on record"
                    helpText={`Requires this dimension on ${column.shortLabel} records when that extension is active.`}
                    checked={entry?.isRequired ?? false}
                    disabled={readOnly || !(entry?.isVisible ?? false)}
                    onChange={(checked) => onUpdate(column.key, { isRequired: checked })}
                  />
                  <Toggle
                    label="Locked in customize"
                    helpText={`Prevents admins from hiding this dimension from the ${column.shortLabel} record customize page.`}
                    checked={entry?.isLockedInCustomize ?? false}
                    disabled={readOnly || !(entry?.isVisible ?? false)}
                    onChange={(checked) => onUpdate(column.key, { isLockedInCustomize: checked })}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">Transaction Family Applicability</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Set whether each business flow can carry the dimension on document headers and document lines.
            </p>
          </div>
          <StatePill state="configurable" />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {TRANSACTION_FAMILIES.map((familyKey) => {
            const assignment = row.transactionFamilyAssignments.find((entry) => entry.familyKey === familyKey)
            return (
              <div
                key={familyKey}
                className="rounded-xl border p-4"
                style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}
              >
                <p className="text-sm font-semibold text-white">{formatDimensionTransactionFamilyLabel(familyKey)}</p>
                <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                  {getDimensionTransactionFamilySourcingDescription(familyKey)}
                </p>
                <div className="mt-4 space-y-3">
                  <Toggle
                    label="Document header"
                    helpText="Allows this transaction family to carry the dimension on document headers."
                    checked={assignment?.allowsHeader ?? false}
                    disabled={readOnly}
                    onChange={(checked) => onUpdateFamilyAssignment(familyKey, { allowsHeader: checked })}
                  />
                  <Toggle
                    label="Document lines"
                    helpText="Allows this transaction family to carry the dimension on document lines."
                    checked={assignment?.allowsLine ?? false}
                    disabled={readOnly}
                    onChange={(checked) => onUpdateFamilyAssignment(familyKey, { allowsLine: checked })}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">Posting And Reporting Surfaces</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Configure remaining standalone surfaces that carry values outside the normal document-family path.
            </p>
          </div>
          <StatePill state="configurable" />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {NON_TRANSACTION_APPLICABILITY_COLUMNS.map((column) => {
          const entry = row.applicabilities.find((item) => item.targetKey === column.key)
          return (
            <div
              key={column.key}
              className="rounded-xl border p-4"
              style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}
            >
              <p className="text-sm font-semibold text-white">{column.shortLabel}</p>
              <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                {column.description}
              </p>
              <div className="mt-4 space-y-3">
                <Toggle label="Visible" helpText="Shows the dimension on this target surface." checked={entry?.isVisible ?? false} disabled={readOnly} onChange={(checked) => onUpdate(column.key, { isVisible: checked })} />
                <Toggle label="Required" helpText="Makes the dimension mandatory on this target surface." checked={entry?.isRequired ?? false} disabled={readOnly} onChange={(checked) => onUpdate(column.key, { isRequired: checked })} />
                <Toggle label="Locked" helpText="Keeps the field present in customize instead of letting users hide it." checked={entry?.isLockedInCustomize ?? false} disabled={readOnly} onChange={(checked) => onUpdate(column.key, { isLockedInCustomize: checked })} />
              </div>
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}

function ValuesTab({
  row,
  readOnly,
  onSaveValue,
  onDeleteValue,
  onReplaceRow,
}: {
  row: EditableDimension
  readOnly: boolean
  onSaveValue: (value: {
    valueId?: string
    businessId?: string
    code: string
    name: string
    description: string
    isActive: boolean
    customFieldValues: Record<string, string>
  }) => Promise<void>
  onDeleteValue: (valueId: string) => Promise<void>
  onReplaceRow: (row: EditableDimension) => void
}) {
  const [draft, setDraft] = useState<{
    valueId?: string
    businessId: string
    code: string
    name: string
    description: string
    isActive: boolean
    customFieldValues: Record<string, string>
  } | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'deleting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [valueSearch, setValueSearch] = useState('')
  const [valueFilter, setValueFilter] = useState<'all' | 'active' | 'inactive' | 'unused' | 'used'>('all')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<'add' | 'update' | 'addOrUpdate'>('update')
  const [importState, setImportState] = useState<'idle' | 'validating' | 'importing' | 'clean' | 'imported' | 'error'>('idle')
  const [importResult, setImportResult] = useState<{
    rows: number
    succeeded: number
    failed: number
    errors: Array<{ row: number; message: string }>
  } | null>(null)

  const canManageValues = row.id !== 'new-dimension'
  const usesGeneratedBusinessId = row.valueSourceType === 'department' || row.valueSourceType === 'location'
  const customValueFields = row.valueFields.filter((field) => field.source === 'custom')
  const activeValueCount = row.values.filter((value) => value.isActive).length
  const unusedValueCount = row.values.filter((value) => value.canDelete).length
  const filteredValues = useMemo(() => {
    const query = valueSearch.trim().toLowerCase()
    return row.values.filter((value) => {
      const matchesFilter =
        valueFilter === 'all' ||
        (valueFilter === 'active' && value.isActive) ||
        (valueFilter === 'inactive' && !value.isActive) ||
        (valueFilter === 'unused' && value.canDelete) ||
        (valueFilter === 'used' && !value.canDelete)
      if (!matchesFilter) return false
      if (!query) return true

      const searchable = [
        value.businessId,
        value.code,
        value.name,
        value.description,
        value.parentName,
        value.subsidiarySummary,
        value.dbId,
        ...value.deleteBlockers,
        ...Object.values(value.customFieldValues),
      ]
      return searchable.some((entry) => entry.toLowerCase().includes(query))
    })
  }, [row.values, valueFilter, valueSearch])
  const seededNote =
    row.valueSourceType === 'department'
      ? 'Department values are now surfaced here. This first pass manages core value fields; deeper department attributes can still be expanded later.'
      : row.valueSourceType === 'location'
        ? 'Location values are now surfaced here. This first pass manages the core code, name, description, and active status.'
        : row.valueSourceType === 'class'
          ? 'Class values are now surfaced here. This first pass manages the core class value fields.'
          : 'Custom dimension values are managed directly here.'

  async function handleSave() {
    if (!draft) return
    if (!draft.code.trim()) {
      setSaveState('error')
      setErrorMessage('Code is required.')
      return
    }
    if (!draft.name.trim()) {
      setSaveState('error')
      setErrorMessage('Name is required.')
      return
    }
    if (!usesGeneratedBusinessId && !draft.businessId.trim()) {
      setSaveState('error')
      setErrorMessage('Business ID is required.')
      return
    }

    setSaveState('saving')
    setErrorMessage(null)
    try {
      await onSaveValue(draft)
      setDraft(null)
      setSaveState('idle')
    } catch (error) {
      setSaveState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save value.')
    }
  }

  async function handleDelete(value: EditableDimension['values'][number]) {
    const confirmed = window.confirm(`Delete ${value.businessId} - ${value.name}? This is only allowed when the value is not used anywhere.`)
    if (!confirmed) return

    setSaveState('deleting')
    setErrorMessage(null)
    try {
      await onDeleteValue(value.id)
      setDraft(null)
      setSaveState('idle')
    } catch (error) {
      setSaveState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete value.')
    }
  }

  async function handleImport(dryRun: boolean) {
    if (!importFile) {
      setImportState('error')
      setImportResult({ rows: 0, succeeded: 0, failed: 1, errors: [{ row: 0, message: 'Choose a CSV or XLSX file first.' }] })
      return
    }

    setImportState(dryRun ? 'validating' : 'importing')
    setImportResult(null)
    setErrorMessage(null)

    const formData = new FormData()
    formData.set('dimensionId', row.id)
    formData.set('mode', importMode)
    formData.set('dryRun', String(dryRun))
    formData.set('file', importFile)

    try {
      const response = await fetch('/api/config/dimensions/values/import', {
        method: 'POST',
        body: formData,
      })
      const body = (await response.json().catch(() => null)) as
        | {
            rows?: number
            succeeded?: number
            failed?: number
            errors?: Array<{ row: number; message: string }>
            row?: EditableDimension | null
            error?: string | null
          }
        | null

      if (!response.ok) {
        throw new Error(body?.error || 'Failed to import dimension values.')
      }

      setImportResult({
        rows: body?.rows ?? 0,
        succeeded: body?.succeeded ?? 0,
        failed: body?.failed ?? 0,
        errors: body?.errors ?? [],
      })
      setImportState((body?.errors?.length ?? 0) > 0 ? 'error' : dryRun ? 'clean' : 'imported')
      if (!dryRun && body?.row) {
        setDraft(null)
        setValueSearch('')
        setValueFilter('all')
        onReplaceRow(body.row)
      }
    } catch (error) {
      setImportState('error')
      setImportResult({
        rows: 0,
        succeeded: 0,
        failed: 1,
        errors: [{ row: 0, message: error instanceof Error ? error.message : 'Failed to import dimension values.' }],
      })
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Values</h2>
          <StatePill state="configurable" />
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Maintain the allowed value set for this dimension here instead of jumping out to separate administration surfaces.
        </p>
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">Dimension Values</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {seededNote}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge label={`${row.values.length} values`} tone="blue" />
            <Badge label={`${activeValueCount} active`} tone="green" />
            <Badge label={`${unusedValueCount} unused`} tone="slate" />
            <a
              href={`/api/config/dimensions/values/template?dimensionId=${encodeURIComponent(row.id)}`}
              className="rounded-md border px-3 py-2 text-sm font-medium"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
            >
              Download Template
            </a>
            <button
              type="button"
              disabled={readOnly || !canManageValues}
              onClick={() =>
                setDraft({
                  businessId: '',
                  code: '',
                  name: '',
                  description: '',
                  isActive: true,
                  customFieldValues: Object.fromEntries(customValueFields.map((field) => [field.id, field.defaultValue])),
                })
              }
              className="rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Add Value
            </button>
          </div>
        </div>

        {!canManageValues ? (
          <div className="mt-5 rounded-xl border px-4 py-4 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
            Save the dimension first, then come back to maintain its values.
          </div>
        ) : null}

        {draft ? (
          <div className="mt-5 rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Business ID"
                helpText={
                  usesGeneratedBusinessId
                    ? 'System-generated from company ID preferences when a new value is saved.'
                    : 'Stable business identifier for this value. This is what downstream references should carry.'
                }
              >
                <input
                  value={draft.businessId}
                  disabled={usesGeneratedBusinessId}
                  placeholder={usesGeneratedBusinessId ? 'Auto generated on save' : undefined}
                  onChange={(event) => setDraft((current) => (current ? { ...current, businessId: event.target.value } : current))}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border-muted)' }}
                />
              </Field>
              <Field label="Code" helpText="Business-facing code or number. For Department, this is the department number.">
                <input
                  value={draft.code}
                  onChange={(event) => setDraft((current) => (current ? { ...current, code: event.target.value } : current))}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border-muted)' }}
                />
              </Field>
              <Field label="Name" helpText="Business-facing label for the value.">
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => (current ? { ...current, name: event.target.value } : current))}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border-muted)' }}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Description" helpText="Optional description or notes for the value.">
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft((current) => (current ? { ...current, description: event.target.value } : current))}
                  className="min-h-[88px] w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border-muted)' }}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Toggle
                label="Active"
                helpText="Inactive values remain historical reference but should not be selected for new records."
                checked={draft.isActive}
                onChange={(checked) => setDraft((current) => (current ? { ...current, isActive: checked } : current))}
              />
            </div>
            {customValueFields.length > 0 ? (
              <div className="mt-5 rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
                <h4 className="text-sm font-semibold text-white">Custom Value Fields</h4>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {customValueFields.map((field) => (
                    <DimensionValueCustomFieldInput
                      key={field.id}
                      field={field}
                      value={draft.customFieldValues[field.id] ?? ''}
                      onChange={(value) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                customFieldValues: {
                                  ...current.customFieldValues,
                                  [field.id]: value,
                                },
                              }
                            : current,
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {errorMessage ? (
              <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>
                {errorMessage}
              </p>
            ) : null}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSave()}
                className="rounded-md px-3 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--accent)' }}
                disabled={saveState === 'saving'}
              >
                {saveState === 'saving' ? 'Saving...' : 'Save Value'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(null)
                  setErrorMessage(null)
                  setSaveState('idle')
                }}
                className="rounded-md border px-3 py-2 text-sm font-medium"
                style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {canManageValues ? (
          <div className="mt-5 rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-white">Import Values</h4>
                <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                  Upload the current template to validate or import value changes. Required fields and custom value fields are read from this dimension.
                </p>
              </div>
              <ImportStateBadge state={importState} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px_auto_auto]">
              <Field label="File" helpText="CSV and XLSX are supported.">
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  disabled={readOnly}
                  onChange={(event) => {
                    setImportFile(event.target.files?.[0] ?? null)
                    setImportState('idle')
                    setImportResult(null)
                  }}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border-muted)' }}
                />
              </Field>
              <Field label="Mode" helpText="Update Only is safest; Add requires new records; Add Or Update does both.">
                <select
                  value={importMode}
                  disabled={readOnly}
                  onChange={(event) => setImportMode(event.target.value as typeof importMode)}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  <option value="update">Update Only</option>
                  <option value="add">Add Only</option>
                  <option value="addOrUpdate">Add Or Update</option>
                </select>
              </Field>
              <button
                type="button"
                disabled={readOnly || !importFile || importState === 'validating' || importState === 'importing'}
                onClick={() => void handleImport(true)}
                className="self-end rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-60"
                style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
              >
                {importState === 'validating' ? 'Validating...' : 'Validate'}
              </button>
              <button
                type="button"
                disabled={readOnly || !importFile || importState === 'validating' || importState === 'importing'}
                onClick={() => void handleImport(false)}
                className="self-end rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {importState === 'importing' ? 'Importing...' : 'Import'}
              </button>
            </div>
            {importResult ? (
              <div
                className="mt-4 rounded-lg border px-4 py-3 text-sm"
                style={{
                  borderColor: importResult.failed > 0 ? 'rgba(248, 113, 113, 0.45)' : 'rgba(74, 222, 128, 0.45)',
                  color: importResult.failed > 0 ? 'var(--danger)' : 'var(--success)',
                  backgroundColor: importResult.failed > 0 ? 'rgba(127, 29, 29, 0.18)' : 'rgba(20, 83, 45, 0.18)',
                }}
              >
                <p className="font-semibold">
                  {importResult.failed > 0
                    ? `${importResult.failed} issue${importResult.failed === 1 ? '' : 's'} found`
                    : importState === 'imported'
                      ? `Imported ${importResult.succeeded} row${importResult.succeeded === 1 ? '' : 's'}`
                      : `${importResult.rows} row${importResult.rows === 1 ? '' : 's'} validated cleanly`}
                </p>
                {importResult.errors.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {importResult.errors.slice(0, 12).map((entry, index) => (
                      <li key={`${entry.row}-${index}`}>
                        {entry.row > 0 ? `Row ${entry.row}: ` : ''}
                        {entry.message}
                      </li>
                    ))}
                    {importResult.errors.length > 12 ? <li>...and {importResult.errors.length - 12} more.</li> : null}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_220px]" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
          <Field label="Search Values" helpText="Find by Business ID, code, name, parent, subsidiary, custom value field, DB ID, or usage blocker.">
            <input
              value={valueSearch}
              onChange={(event) => setValueSearch(event.target.value)}
              placeholder="Search values..."
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </Field>
          <Field label="Filter" helpText="Narrow values by active status or whether they can be deleted.">
            <select
              value={valueFilter}
              onChange={(event) => setValueFilter(event.target.value as typeof valueFilter)}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            >
              <option value="all">All values</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
              <option value="unused">Unused / deletable</option>
              <option value="used">Used / protected</option>
            </select>
          </Field>
          <p className="text-xs md:col-span-2" style={{ color: 'var(--text-muted)' }}>
            Showing {filteredValues.length} of {row.values.length}. Values can be deleted only when they are not referenced by transactions, records, children, or custom value data.
          </p>
        </div>

        {errorMessage && !draft ? (
          <div className="mt-5 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(248, 113, 113, 0.45)', color: 'var(--danger)', backgroundColor: 'rgba(127, 29, 29, 0.18)' }}>
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-5 overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-muted)' }}>
          <table className="min-w-full">
            <thead style={{ backgroundColor: 'var(--card)' }}>
              <tr>
                {[
                  'Business ID',
                  'Code',
                  'Name',
                  'Parent',
                  'Subsidiaries',
                  'Include Children',
                  'Description',
                  ...customValueFields.map((field) => field.label),
                  'DB ID',
                  'Status',
                  'Used By',
                  'Action',
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredValues.length > 0 ? (
                filteredValues.map((value) => (
                  <tr key={value.id} style={{ borderTop: '1px solid var(--border-muted)' }}>
                    <td className="px-4 py-4 text-sm text-white">{value.businessId}</td>
                    <td className="px-4 py-4 text-sm text-white">{value.code}</td>
                    <td className="px-4 py-4 text-sm text-white">{value.name}</td>
                    <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{value.parentName}</td>
                    <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{value.subsidiarySummary}</td>
                    <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{value.includeChildren ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {value.description || '—'}
                    </td>
                    {customValueFields.map((field) => (
                      <td key={field.id} className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {formatCustomFieldValue(field.type as CustomFieldType, value.customFieldValues[field.id]) ?? '-'}
                      </td>
                    ))}
                    <td className="px-4 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>{value.dbId}</td>
                    <td className="px-4 py-4">
                      <Badge label={value.isActive ? 'Active' : 'Inactive'} tone={value.isActive ? 'green' : 'slate'} />
                    </td>
                    <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {value.canDelete ? (
                        <Badge label="Unused" tone="green" />
                      ) : (
                        <span title={value.deleteBlockers.join(', ')}>
                          {value.deleteBlockers.join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          setDraft({
                            valueId: value.id,
                            businessId: value.businessId,
                            code: value.code,
                            name: value.name,
                            description: value.description,
                            isActive: value.isActive,
                            customFieldValues: { ...value.customFieldValues },
                          })
                        }
                        className="rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-60"
                        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={readOnly || saveState === 'deleting' || !value.canDelete}
                        onClick={() => void handleDelete(value)}
                        className="rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-60"
                        style={{ borderColor: 'rgba(248, 113, 113, 0.45)', color: 'var(--danger)' }}
                        title={value.canDelete ? 'Delete this unused value.' : `Cannot delete while used by ${value.deleteBlockers.join(', ')}.`}
                      >
                        Delete
                      </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11 + customValueFields.length} className="px-4 py-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {row.values.length === 0 ? 'No values yet.' : 'No values match the current search and filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function DimensionValueCustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: EditableDimension['valueFields'][number]
  value: string
  onChange: (value: string) => void
}) {
  const type = field.type as CustomFieldType
  const label = `${field.label}${field.required ? ' *' : ''}`
  const helper = `Custom value field (${formatCustomFieldType(field.type)}).`

  if (type === 'checkbox') {
    return (
      <Toggle
        label={label}
        helpText={helper}
        checked={value === 'true'}
        onChange={(checked) => onChange(checked ? 'true' : 'false')}
      />
    )
  }

  if (type === 'select') {
    const options = parseCustomFieldOptions(field.options)
    return (
      <Field label={label} helpText={helper}>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          <option value="" className="bg-slate-900">
            Select...
          </option>
          {options.map((option) => (
            <option key={option} value={option} className="bg-slate-900">
              {option}
            </option>
          ))}
        </select>
      </Field>
    )
  }

  if (type === 'textarea' || type === 'address') {
    return (
      <Field label={label} helpText={helper}>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-[88px] w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
          style={{ borderColor: 'var(--border-muted)' }}
        />
      </Field>
    )
  }

  return (
    <Field label={label} helpText={helper}>
      <input
        type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
        style={{ borderColor: 'var(--border-muted)' }}
      />
    </Field>
  )
}

function FieldsTab({
  row,
  readOnly,
  onSaveField,
}: {
  row: EditableDimension
  readOnly: boolean
  onSaveField: (field: {
    id?: string
    label: string
    name: string
    type: CustomFieldType
    required: boolean
    defaultValue: string
    options: string[]
  }) => Promise<void>
}) {
  const [draft, setDraft] = useState<{
    id?: string
    label: string
    name: string
    type: CustomFieldType
    required: boolean
    defaultValue: string
    optionsText: string
  } | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canManageFields = row.id !== 'new-dimension'
  const coreFields = row.valueFields.filter((field) => field.source === 'core')
  const seededFields = row.valueFields.filter((field) => field.source === 'seeded')
  const customFields = row.valueFields.filter((field) => field.source === 'custom')

  async function handleSaveField() {
    if (!draft) return
    setSaveState('saving')
    setErrorMessage(null)
    try {
      await onSaveField({
        id: draft.id,
        label: draft.label,
        name: draft.name,
        type: draft.type,
        required: draft.required,
        defaultValue: draft.defaultValue,
        options: draft.optionsText
          .split('\n')
          .map((entry) => entry.trim())
          .filter(Boolean),
      })
      setDraft(null)
      setSaveState('idle')
    } catch (error) {
      setSaveState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save value field.')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Fields</h2>
          <StatePill state="configurable" />
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Define the fields that live on each dimension value record. Core and seeded fields are governed here; custom value fields can now be added to this dimension.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <FieldCatalogCard
          title="Common Value Core"
          description="Every dimension value should share these ERP-grade fields so sourcing, hierarchy, subsidiary scope, and reporting behave consistently."
          rows={coreFields}
        />
        <FieldCatalogCard
          title="Dimension-Specific Fields"
          description="These are seeded or planned fields for this dimension value record. Behavior-driving fields are called out explicitly."
          rows={seededFields.length > 0 ? seededFields : [{ id: 'no-seeded-fields', label: 'No seeded fields', name: 'none', type: 'n/a', required: false, defaultValue: '', options: '', entityType: '', status: 'planned', source: 'seeded' }]}
        />
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">Add Custom Value Field</h3>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Add fields like approver, planning category, region group, or inventory controls to this dimension's value record.
            </p>
          </div>
          <button
            type="button"
            disabled={readOnly || !canManageFields}
            onClick={() =>
              setDraft({
                label: '',
                name: '',
                type: 'text',
                required: false,
                defaultValue: '',
                optionsText: '',
              })
            }
            className="rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Add Field
          </button>
        </div>

        {!canManageFields ? (
          <div className="mt-5 rounded-xl border px-4 py-4 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
            Save the dimension first, then come back to add value fields.
          </div>
        ) : null}

        {draft ? (
          <div className="mt-5 rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Label" helpText="Business-facing field name.">
                <input
                  value={draft.label}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            label: event.target.value,
                            name: current.name || normalizeCustomFieldName(event.target.value),
                          }
                        : current,
                    )
                  }
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border-muted)' }}
                />
              </Field>
              <Field label="Field ID" helpText="Stable system identifier.">
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => (current ? { ...current, name: normalizeCustomFieldName(event.target.value) } : current))}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border-muted)' }}
                />
              </Field>
              <Field label="Field Type" helpText="The stored field type for this value attribute.">
                <select
                  value={draft.type}
                  onChange={(event) => setDraft((current) => (current ? { ...current, type: event.target.value as CustomFieldType } : current))}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  {CUSTOM_FIELD_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-slate-900">
                      {formatCustomFieldType(type)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Default Value" helpText="Optional default used when a value is created.">
                <input
                  value={draft.defaultValue}
                  onChange={(event) => setDraft((current) => (current ? { ...current, defaultValue: event.target.value } : current))}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border-muted)' }}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Options" helpText="For select fields, enter one option per line.">
                <textarea
                  value={draft.optionsText}
                  onChange={(event) => setDraft((current) => (current ? { ...current, optionsText: event.target.value } : current))}
                  className="min-h-[96px] w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border-muted)' }}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Toggle
                label="Required"
                helpText="Requires this field when maintaining dimension values."
                checked={draft.required}
                onChange={(checked) => setDraft((current) => (current ? { ...current, required: checked } : current))}
              />
            </div>
            {errorMessage ? (
              <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>
                {errorMessage}
              </p>
            ) : null}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSaveField()}
                disabled={saveState === 'saving'}
                className="rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {saveState === 'saving' ? 'Saving...' : 'Save Field'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(null)
                  setErrorMessage(null)
                  setSaveState('idle')
                }}
                className="rounded-md border px-3 py-2 text-sm font-medium"
                style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          <FieldCatalogCard
            title="Custom Value Fields"
            description="Admin-added fields stored on this dimension value record."
            rows={customFields.length > 0 ? customFields : [{ id: 'no-custom-fields', label: 'No custom fields yet', name: 'none', type: 'n/a', required: false, defaultValue: '', options: '', entityType: '', status: 'planned', source: 'custom' }]}
            onEdit={
              readOnly
                ? undefined
                : (field) =>
                    setDraft({
                      id: field.id,
                      label: field.label,
                      name: field.name,
                      type: field.type as CustomFieldType,
                      required: field.required,
                      defaultValue: field.defaultValue,
                      optionsText: parseFieldOptionsForEditor(field.options).join('\n'),
                    })
            }
          />
        </div>
      </div>
    </div>
  )
}

function FieldCatalogCard({
  title,
  description,
  rows,
  onEdit,
}: {
  title: string
  description: string
  rows: EditableDimension['valueFields']
  onEdit?: (field: EditableDimension['valueFields'][number]) => void
}) {
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      <div className="mt-5 overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-muted)' }}>
        <table className="min-w-full">
          <thead style={{ backgroundColor: 'var(--card)' }}>
            <tr>
              {['Field', 'Type', 'Role', 'Status', ...(onEdit ? ['Action'] : [])].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} style={{ borderTop: '1px solid var(--border-muted)' }}>
                <td className="px-4 py-3 text-sm text-white">{row.label}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatCustomFieldType(row.type)}</td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatValueFieldRole(row.source, row.required)}</td>
                <td className="px-4 py-3"><Badge label={row.status === 'live' ? 'Live' : 'Planned'} tone={row.status === 'live' ? 'green' : 'slate'} /></td>
                {onEdit ? (
                  <td className="px-4 py-3">
                    {row.source === 'custom' && row.status === 'live' ? (
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        className="rounded-md border px-3 py-1.5 text-xs font-semibold"
                        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                      >
                        Edit
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function parseFieldOptionsForEditor(value: string) {
  if (!value.trim()) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed)) return parsed.map((entry) => String(entry)).filter(Boolean)
  } catch {
    // Fall back to newline/comma parsing below.
  }
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function buildDimensionValueFieldShell(row: EditableDimension) {
  if (row.valueSourceType === 'department') {
    return [
      { label: 'Division', type: 'Text/List', role: 'Reporting attribute', status: 'Live' },
      { label: 'Planning Category', type: 'List/Record', role: 'Reporting attribute', status: 'Live' },
      { label: 'Manager', type: 'Employee', role: 'Workflow control', status: 'Live' },
      { label: 'Approver', type: 'Employee', role: 'Workflow control', status: 'Live' },
    ]
  }
  if (row.valueSourceType === 'location') {
    return [
      { label: 'Location Type', type: 'List/Record', role: 'Reporting attribute', status: 'Live' },
      { label: 'Address', type: 'Address', role: 'Informational', status: 'Live' },
      { label: 'Make Inventory Available', type: 'Checkbox', role: 'Operational control', status: 'Live' },
      { label: 'Approver', type: 'Employee', role: 'Workflow control', status: 'Planned' },
    ]
  }
  if (row.valueSourceType === 'class') {
    return [
      { label: 'Class Group', type: 'List/Record', role: 'Reporting attribute', status: 'Planned' },
      { label: 'Owner', type: 'Employee', role: 'Workflow control', status: 'Planned' },
    ]
  }
  return [
    { label: 'Custom fields', type: 'Configurable', role: 'Informational / reporting / behavior', status: 'Planned' },
  ]
}

function formatCustomFieldType(value: string) {
  return value
    .split('_')
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(' ')
}

function formatValueFieldRole(source: EditableDimension['valueFields'][number]['source'], required: boolean) {
  if (source === 'core') return required ? 'Required core field' : 'Common core field'
  if (source === 'seeded') return 'Seeded value attribute'
  return required ? 'Required custom field' : 'Custom value attribute'
}

function SourcingTab({
  row,
  onAddFamilySource,
  onMoveFamilySource,
  onRemoveFamilySource,
  onUpdateFamilyPolicy,
  readOnly,
}: {
  row: EditableDimension
  onAddFamilySource: (familyKey: DimensionTransactionFamilyKey, scope: 'header' | 'line', sourceKey: string) => void
  onMoveFamilySource: (
    familyKey: DimensionTransactionFamilyKey,
    scope: 'header' | 'line',
    sourceKey: string,
    direction: 'up' | 'down',
  ) => void
  onRemoveFamilySource: (familyKey: DimensionTransactionFamilyKey, scope: 'header' | 'line', sourceKey: string) => void
  onUpdateFamilyPolicy: (
    familyKey: DimensionTransactionFamilyKey,
    updates: Partial<EditableDimension['transactionFamilySourcingPolicies'][number]>,
  ) => void
  readOnly: boolean
}) {
  const [selectedSource, setSelectedSource] = useState<Record<string, string>>({})
  const [selectedScope, setSelectedScope] = useState<Record<string, 'header' | 'line' | 'both'>>({})
  const [showAdvancedSources, setShowAdvancedSources] = useState(false)
  const availableSourceOptions = SOURCE_OPTIONS.filter((option) => showAdvancedSources || !option.advanced)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Sourcing</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Set ordered sourcing by transaction family. Each row says which source wins first and whether it applies to headers, lines, or both.
        </p>
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">Transaction Family Sourcing Defaults</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Set the normal priority once per family. Example: LTC can prefer upstream source header, then customer default, then explicit header entry. PTP can prefer upstream source header, then vendor default.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Toggle
              label="Advanced sourcing"
              helpText="Shows system-level and less common source options like revenue element, posting policy override, counterparty, subsidiary, and custom record defaults."
              checked={showAdvancedSources}
              disabled={readOnly}
              onChange={setShowAdvancedSources}
            />
            <StatePill state="configurable" />
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {row.transactionFamilySourcingPolicies.map((policy) => {
            const selectedSourceKey = selectedSource[policy.familyKey] ?? ''
            const selectedEligibility = getSourceEligibility(row, selectedSourceKey)

            return (
            <div
              key={policy.familyKey}
              className="rounded-xl border p-4"
              style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{formatDimensionTransactionFamilyLabel(policy.familyKey)}</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {getDimensionTransactionFamilySourcingDescription(policy.familyKey)}
                  </p>
                  <p className="mt-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    Priority reads top to bottom: the first source with a value wins, then the next row is tried only if it is blank.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Source" helpText="Add a source to the ordered policy." compact>
                    <select
                      value={selectedSourceKey}
                      onChange={(event) =>
                        setSelectedSource((current) => ({
                          ...current,
                          [policy.familyKey]: event.target.value,
                        }))
                      }
                      disabled={readOnly}
                      className="min-w-[15rem] rounded-md border bg-transparent px-3 py-2 text-sm text-white disabled:opacity-60"
                      style={{ borderColor: 'var(--border-muted)' }}
                    >
                      <option value="" className="bg-slate-900">Select source...</option>
                      {availableSourceOptions.map((option) => {
                        const eligibility = getSourceEligibility(row, option.key)
                        return (
                        <option key={option.key} value={option.key} disabled={!eligibility.eligible} className="bg-slate-900">
                          {option.label}{eligibility.eligible ? '' : ` - ${eligibility.reason}`}
                        </option>
                        )
                      })}
                    </select>
                    <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Sources tied to master data unlock after that record type is enabled in Where It Applies.
                    </p>
                  </Field>
                  <Field label="Applies To" helpText="Scope for this source." compact>
                    <select
                      value={selectedScope[policy.familyKey] ?? 'both'}
                      onChange={(event) =>
                        setSelectedScope((current) => ({
                          ...current,
                          [policy.familyKey]: event.target.value as 'header' | 'line' | 'both',
                        }))
                      }
                      disabled={readOnly}
                      className="rounded-md border bg-transparent px-3 py-2 text-sm text-white disabled:opacity-60"
                      style={{ borderColor: 'var(--border-muted)' }}
                    >
                      <option value="both" className="bg-slate-900">Header + Line</option>
                      <option value="header" className="bg-slate-900">Header only</option>
                      <option value="line" className="bg-slate-900">Line only</option>
                    </select>
                  </Field>
                  <button
                    type="button"
                    onClick={() => {
                      const selected = selectedSourceKey
                      if (!selected) return
                      if (!getSourceEligibility(row, selected).eligible) return
                      const scope = selectedScope[policy.familyKey] ?? 'both'
                      if (scope === 'header' || scope === 'both') {
                        onAddFamilySource(policy.familyKey, 'header', selected)
                      }
                      if (scope === 'line' || scope === 'both') {
                        onAddFamilySource(policy.familyKey, 'line', selected)
                      }
                      setSelectedSource((current) => ({ ...current, [policy.familyKey]: '' }))
                    }}
                    disabled={readOnly || !selectedSourceKey || !selectedEligibility.eligible}
                    title={!selectedEligibility.eligible ? selectedEligibility.reason : undefined}
                    className="rounded-md px-3 py-2 text-sm font-medium text-white"
                    style={{ backgroundColor: 'var(--accent)', opacity: readOnly || !selectedSourceKey || !selectedEligibility.eligible ? 0.6 : 1 }}
                  >
                    Add Source
                  </button>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-muted)' }}>
                <table className="min-w-full">
                  <thead style={{ backgroundColor: 'var(--card-elevated)' }}>
                    <tr>
                      {['Priority', 'Source', 'What It Means', 'Applies To', 'Override', 'If Missing', 'Actions'].map((header) => (
                        <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {buildFamilySourcingRows(policy).length > 0 ? (
                      buildFamilySourcingRows(policy).map((sourceRow, index) => {
                        const eligibility = getSourceEligibility(row, sourceRow.sourceKey)

                        return (
                        <tr key={`${policy.familyKey}-${sourceRow.sourceKey}-${sourceRow.scope}`} style={{ borderTop: '1px solid var(--border-muted)' }}>
                          <td className="px-4 py-3 text-sm text-white">{index + 1}</td>
                          <td className="px-4 py-3 text-sm text-white">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{formatSourceLabel(sourceRow.sourceKey)}</span>
                              {!eligibility.eligible ? <Badge label="Blocked" tone="amber" /> : null}
                            </div>
                            {!eligibility.eligible ? (
                              <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                                {eligibility.reason}
                              </p>
                            ) : null}
                          </td>
                          <td className="max-w-md px-4 py-3 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>{formatSourceDefinition(sourceRow.sourceKey)}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatSourceScope(sourceRow.scope)}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{policy.allowManualOverride ? 'Manual override allowed' : 'Locked after sourcing'}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{policy.failIfUnresolved ? 'Fail if unresolved' : 'Allow unresolved'}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => moveFamilySourceRow(sourceRow, 'up')}
                                disabled={readOnly || index === 0}
                                className="rounded-md border px-2 py-1 text-xs font-medium"
                                style={{ borderColor: 'var(--border-muted)', color: index === 0 ? 'var(--text-muted)' : 'var(--text-secondary)' }}
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                onClick={() => moveFamilySourceRow(sourceRow, 'down')}
                                disabled={readOnly || index === buildFamilySourcingRows(policy).length - 1}
                                className="rounded-md border px-2 py-1 text-xs font-medium"
                                style={{ borderColor: 'var(--border-muted)', color: index === buildFamilySourcingRows(policy).length - 1 ? 'var(--text-muted)' : 'var(--text-secondary)' }}
                              >
                                Down
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFamilySourceRow(sourceRow)}
                                disabled={readOnly}
                                className="rounded-md border px-2 py-1 text-xs font-medium"
                                style={{ borderColor: 'var(--border-muted)', color: 'var(--danger)' }}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          No family defaults selected yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Toggle
                  label="Allow Project Inheritance"
                  helpText="Lets linked projects supply this dimension when they hold a value and the family sourcing order needs it."
                  checked={policy.allowProjectInheritance}
                  disabled={readOnly}
                  onChange={(checked) => onUpdateFamilyPolicy(policy.familyKey, { allowProjectInheritance: checked })}
                />
                <Toggle
                  label="Allow Subscription Inheritance"
                  helpText="Lets linked subscriptions supply this dimension when they hold a value and the family sourcing order needs it."
                  checked={policy.allowSubscriptionInheritance}
                  disabled={readOnly}
                  onChange={(checked) => onUpdateFamilyPolicy(policy.familyKey, { allowSubscriptionInheritance: checked })}
                />
                <Toggle
                  label="Allow Manual Override"
                  helpText="Lets users replace the sourced value manually instead of keeping the sourced result fixed."
                  checked={policy.allowManualOverride}
                  disabled={readOnly}
                  onChange={(checked) => onUpdateFamilyPolicy(policy.familyKey, { allowManualOverride: checked })}
                />
                <Toggle
                  label="Fail If Unresolved"
                  helpText="Stops the record from proceeding if no source can provide a value for this family."
                  checked={policy.failIfUnresolved}
                  disabled={readOnly}
                  onChange={(checked) => onUpdateFamilyPolicy(policy.familyKey, { failIfUnresolved: checked })}
                />
              </div>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  function moveFamilySourceRow(
    sourceRow: ReturnType<typeof buildFamilySourcingRows>[number],
    direction: 'up' | 'down',
  ) {
    if (sourceRow.scope === 'header' || sourceRow.scope === 'both') {
      onMoveFamilySource(sourceRow.familyKey, 'header', sourceRow.sourceKey, direction)
    }
    if (sourceRow.scope === 'line' || sourceRow.scope === 'both') {
      onMoveFamilySource(sourceRow.familyKey, 'line', sourceRow.sourceKey, direction)
    }
  }

  function removeFamilySourceRow(sourceRow: ReturnType<typeof buildFamilySourcingRows>[number]) {
    if (sourceRow.scope === 'header' || sourceRow.scope === 'both') {
      onRemoveFamilySource(sourceRow.familyKey, 'header', sourceRow.sourceKey)
    }
    if (sourceRow.scope === 'line' || sourceRow.scope === 'both') {
      onRemoveFamilySource(sourceRow.familyKey, 'line', sourceRow.sourceKey)
    }
  }
}

function buildFamilySourcingRows(policy: EditableDimension['transactionFamilySourcingPolicies'][number]) {
  const sourceKeys = Array.from(new Set([...policy.headerSourcePriority, ...policy.lineSourcePriority]))
  return sourceKeys
    .map((sourceKey) => {
      const headerIndex = policy.headerSourcePriority.indexOf(sourceKey)
      const lineIndex = policy.lineSourcePriority.indexOf(sourceKey)
      const inHeader = headerIndex >= 0
      const inLine = lineIndex >= 0
      const scope: 'header' | 'line' | 'both' = inHeader && inLine ? 'both' : inHeader ? 'header' : 'line'
      return {
        familyKey: policy.familyKey,
        sourceKey,
        scope,
        sortIndex: Math.min(inHeader ? headerIndex : Number.POSITIVE_INFINITY, inLine ? lineIndex : Number.POSITIVE_INFINITY),
      }
    })
    .sort((first, second) => first.sortIndex - second.sortIndex || formatSourceLabel(first.sourceKey).localeCompare(formatSourceLabel(second.sourceKey)))
}

function formatSourceScope(scope: 'header' | 'line' | 'both') {
  if (scope === 'both') return 'Header + Line'
  if (scope === 'header') return 'Header only'
  return 'Line only'
}

function formatModeLabel(value: string) {
  return value
    .split('_')
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(' ')
}

function formatFamilyScopes(assignment: EditableDimension['transactionFamilyAssignments'][number]) {
  const scopes = [
    assignment.allowsHeader ? 'Header' : '',
    assignment.allowsLine ? 'Line' : '',
  ].filter(Boolean)
  return scopes.length > 0 ? scopes.join(' + ') : 'Not Applied'
}

function formatPriorityList(sourceKeys: string[]) {
  if (sourceKeys.length === 0) return 'No sources configured'
  return sourceKeys.map((sourceKey, index) => `${index + 1}. ${formatSourceLabel(sourceKey)}`).join(' -> ')
}

function getPropagationNarrative(familyKey: DimensionTransactionFamilyKey) {
  switch (familyKey) {
    case 'crm':
      return 'Lead-to-cash carry from opportunity/quote through sales order, invoice, and revenue records.'
    case 'p2p':
      return 'Procure-to-pay carry from requisition through purchase order, receipt, bill, and settlement records.'
    case 'rtr':
      return 'Record-to-report carry into journals, clearing, intercompany, revaluation, and GL posting lines.'
    case 'billing_revenue':
      return 'Billing and revenue carry from subscriptions, usage, billable charges, arrangements, elements, and plans.'
    default:
      return 'Configured business flow propagation.'
  }
}

function getPropagationChainSteps(familyKey: DimensionTransactionFamilyKey) {
  switch (familyKey) {
    case 'crm':
      return ['Lead', 'Opportunity', 'Quote', 'Sales Order', 'Invoice', 'Revenue Arrangement', 'Revenue Element', 'Revenue Plan', 'Rev Rec Journal', 'GL']
    case 'p2p':
      return ['Purchase Requisition', 'Purchase Order', 'Receipt', 'Bill', 'Bill Credit', 'Vendor Refund', 'Clearing', 'GL']
    case 'rtr':
      return ['Journal', 'Intercompany Journal', 'Clearing', 'Revaluation', 'GL Line', 'Financial Reporting']
    case 'billing_revenue':
      return ['Subscription', 'Subscription Plan', 'Usage', 'Billable Charge', 'Invoice', 'Revenue Arrangement', 'Revenue Element', 'Revenue Plan', 'Rev Rec Journal', 'GL']
    default:
      return ['Source', 'Transaction', 'Posting', 'Reporting']
  }
}

function EnforcementTab({
  row,
  onUpdate,
  onUpdateFamilyPolicy,
  readOnly,
}: {
  row: EditableDimension
  onUpdate: (updates: Partial<EditableDimension>) => void
  onUpdateFamilyPolicy: (
    familyKey: DimensionTransactionFamilyKey,
    updates: Partial<EditableDimension['transactionFamilySourcingPolicies'][number]>,
  ) => void
  readOnly: boolean
}) {
  const enabledFamilies = row.transactionFamilyAssignments.filter((entry) => entry.allowsHeader || entry.allowsLine)

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Enforcement</h2>
          <StatePill state="configurable" />
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Decide when missing or manually changed values should be allowed, warned about, locked, or blocked.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border p-5 xl:col-span-2" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Baseline Rules</h3>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            These are the broad behavior defaults. Where It Applies owns surfaces, required flags, and customize locking.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Validation Mode" helpText="Controls the baseline requiredness posture for this dimension.">
              <select
                value={row.validationMode}
                onChange={(event) => onUpdate({ validationMode: event.target.value })}
                disabled={readOnly}
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white disabled:opacity-60"
                style={{ borderColor: 'var(--border-muted)' }}
              >
                {VALIDATION_MODE_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-slate-900">
                    {formatModeLabel(option)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Override Mode" helpText="Controls whether users can replace sourced values.">
              <select
                value={row.overrideMode}
                onChange={(event) => onUpdate({ overrideMode: event.target.value })}
                disabled={readOnly}
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white disabled:opacity-60"
                style={{ borderColor: 'var(--border-muted)' }}
              >
                {OVERRIDE_MODE_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-slate-900">
                    {formatModeLabel(option)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Inheritance Mode" helpText="Controls whether the system inherits, derives, or relies on manual entry.">
              <select
                value={row.inheritanceMode}
                onChange={(event) => onUpdate({ inheritanceMode: event.target.value })}
                disabled={readOnly}
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white disabled:opacity-60"
                style={{ borderColor: 'var(--border-muted)' }}
              >
                {INHERITANCE_MODE_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-slate-900">
                    {formatModeLabel(option)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Current Enforcement Read</h3>
          <ul className="mt-4 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
              Requiredness: {formatModeLabel(row.validationMode)}
            </li>
            <li className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
              Overrides: {formatModeLabel(row.overrideMode)}
            </li>
            <li className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
              Unresolved families that fail: {row.transactionFamilySourcingPolicies.filter((policy) => policy.failIfUnresolved).length}
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Business Flow Enforcement</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          These controls decide whether unresolved sourcing blocks the flow and whether users can override sourced values.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {enabledFamilies.length > 0 ? enabledFamilies.map((assignment) => {
            const policy = row.transactionFamilySourcingPolicies.find((entry) => entry.familyKey === assignment.familyKey)
            if (!policy) return null
            return (
              <div key={assignment.familyKey} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{formatDimensionTransactionFamilyLabel(assignment.familyKey)}</p>
                  <Badge label={formatFamilyScopes(assignment)} tone="blue" />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Toggle
                    label="Fail If Unresolved"
                    helpText="Blocks the family flow if no configured source can provide a value."
                    checked={policy.failIfUnresolved}
                    disabled={readOnly}
                    onChange={(checked) => onUpdateFamilyPolicy(policy.familyKey, { failIfUnresolved: checked })}
                  />
                  <Toggle
                    label="Allow Manual Override"
                    helpText="Allows users to change the value after sourcing resolves it."
                    checked={policy.allowManualOverride}
                    disabled={readOnly}
                    onChange={(checked) => onUpdateFamilyPolicy(policy.familyKey, { allowManualOverride: checked })}
                  />
                </div>
              </div>
            )
          }) : (
            <div className="rounded-xl border p-4 text-sm lg:col-span-2" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
              No transaction families are enabled yet.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Planned Runtime Enforcement</h3>
          <StatePill state="planned" />
        </div>
        <ul className="mt-4 grid gap-2 text-sm md:grid-cols-3" style={{ color: 'var(--text-secondary)' }}>
          {[
            'Account-range enforcement',
            'Posting-time substitution rules',
            'Billing and revenue hold rules',
          ].map((item) => (
            <li key={item} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function PropagationTab({ row }: { row: EditableDimension }) {
  const dependencyWarnings = getSourcingDependencyWarnings(row)
  const enabledMasterTargets = row.applicabilities.filter((entry) =>
    ['customer_record', 'vendor_record', 'item_record', 'gl_account_record', 'employee_record', 'user_record', 'subsidiary_record', 'contact_record', 'custom_record'].includes(entry.targetKey) && entry.isVisible,
  )
  const enabledFamilies = row.transactionFamilyAssignments.filter((entry) => entry.allowsHeader || entry.allowsLine)

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Propagation</h2>
          <StatePill state="planned" />
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Read-only map of how this dimension is expected to move from source records into downstream transactions, billing, revenue, and GL.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Source Records</h3>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            These master records can hold defaults that sourcing may pull from.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {enabledMasterTargets.length > 0 ? enabledMasterTargets.map((entry) => (
              <Badge key={entry.targetKey} label={formatDimensionTargetLabel(entry.targetKey)} tone="slate" />
            )) : (
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>No master-data default records enabled.</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-5 xl:col-span-2" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Family Carry Rules</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {enabledFamilies.length > 0 ? enabledFamilies.map((assignment) => {
              const policy = row.transactionFamilySourcingPolicies.find((entry) => entry.familyKey === assignment.familyKey)
              return (
                <div key={assignment.familyKey} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
                  <p className="text-sm font-semibold text-white">{formatDimensionTransactionFamilyLabel(assignment.familyKey)}</p>
                  <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                    {getPropagationNarrative(assignment.familyKey)}
                  </p>
                  <div className="mt-3 space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <p><span className="text-white">Header:</span> {formatPriorityList(policy?.headerSourcePriority ?? [])}</p>
                    <p><span className="text-white">Line:</span> {formatPriorityList(policy?.lineSourcePriority ?? [])}</p>
                  </div>
                </div>
              )
            }) : (
              <div className="rounded-xl border p-4 text-sm md:col-span-2" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
                No transaction families are enabled, so no propagation path is active yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Downstream Map</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Each chain shows where this dimension is expected to travel. Active means the family is enabled. Planned means runtime carry still needs deeper implementation. Blocked means a source dependency must be fixed first.
        </p>
        <div className="mt-4 grid gap-4">
          {TRANSACTION_FAMILIES.map((familyKey) => {
            const assignment = row.transactionFamilyAssignments.find((entry) => entry.familyKey === familyKey)
            const policy = row.transactionFamilySourcingPolicies.find((entry) => entry.familyKey === familyKey)
            const isEnabled = Boolean(assignment?.allowsHeader || assignment?.allowsLine)
            const familyWarnings = dependencyWarnings.filter((warning) => warning.startsWith(formatDimensionTransactionFamilyLabel(familyKey)))
            const status = familyWarnings.length > 0 ? 'blocked' : isEnabled ? 'active' : 'planned'

            return (
              <div key={familyKey} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">{formatDimensionTransactionFamilyLabel(familyKey)}</p>
                      <Badge
                        label={status === 'blocked' ? 'Blocked' : status === 'active' ? 'Active' : 'Planned'}
                        tone={status === 'blocked' ? 'amber' : status === 'active' ? 'green' : 'slate'}
                      />
                    </div>
                    <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                      {getPropagationNarrative(familyKey)}
                    </p>
                  </div>
                  <div className="min-w-[16rem] rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
                    <p><span className="text-white">Header control:</span> {formatPriorityList(policy?.headerSourcePriority ?? [])}</p>
                    <p className="mt-1"><span className="text-white">Line control:</span> {formatPriorityList(policy?.lineSourcePriority ?? [])}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {getPropagationChainSteps(familyKey).map((step, index, steps) => (
                    <div key={`${familyKey}-${step}`} className="flex items-center gap-2">
                      <span
                        className="rounded-full border px-3 py-1 text-xs font-medium"
                        style={{
                          borderColor: status === 'blocked' ? 'rgba(253, 230, 138, 0.35)' : 'var(--border-muted)',
                          color: status === 'active' ? '#ffffff' : 'var(--text-secondary)',
                          backgroundColor: status === 'active' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(148, 163, 184, 0.08)',
                        }}
                      >
                        {step}
                      </span>
                      {index < steps.length - 1 ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>-&gt;</span> : null}
                    </div>
                  ))}
                </div>

                {familyWarnings.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {familyWarnings.map((warning) => (
                      <li key={warning} className="rounded-lg border px-3 py-2" style={{ borderColor: 'rgba(253, 230, 138, 0.35)' }}>
                        {warning}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {dependencyWarnings.length > 0 ? (
        <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(253, 230, 138, 0.35)', backgroundColor: 'rgba(180, 83, 9, 0.08)' }}>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Propagation Blockers</h3>
            <Badge label={`${dependencyWarnings.length} Review`} tone="amber" />
          </div>
          <ul className="mt-4 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {dependencyWarnings.map((warning) => (
              <li key={warning} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function PostingTab({
  row,
  onUpdate,
  readOnly,
}: {
  row: EditableDimension
  onUpdate: (updates: Partial<EditableDimension>) => void
  readOnly: boolean
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Posting</h2>
          <StatePill state="configurable" />
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Posting controls are already partly configurable. Keep this page simple for management while the planned layers show what still needs runtime wiring.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Current Posting Controls</h3>
          <div className="mt-4 grid gap-3">
            <Toggle label="Post To GL" helpText="Treats the dimension as part of downstream accounting classification, not just operational reporting." checked={row.postToGl} disabled={readOnly} onChange={(checked) => onUpdate({ postToGl: checked })} />
            <Toggle label="Require GL Split" helpText="Prevents postings with different dimension values from being summarized into one GL line." checked={row.requiresGlSplit} disabled={readOnly} onChange={(checked) => onUpdate({ requiresGlSplit: checked })} />
            <Toggle label="Allow GL Assignment" helpText="Allows the dimension to appear directly on GL or journal lines." checked={row.allowsGlAssignment} disabled={readOnly} onChange={(checked) => onUpdate({ allowsGlAssignment: checked })} />
          </div>
        </div>
        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Planned Posting Layers</h3>
            <StatePill state="planned" />
          </div>
          <ul className="mt-4 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>Account-range enforcement</li>
            <li className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>Posting-critical vs reporting-only</li>
            <li className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>GL summarization vs split-by-dimension policy</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function PreviewTab({ row }: { row: EditableDimension }) {
  const policyIssues = getPolicyIssues(row)
  const dependencyWarnings = getSourcingDependencyWarnings(row)
  const activeValues = row.values.filter((value) => value.isActive).length
  const customValueFields = row.valueFields.filter((field) => field.source === 'custom').length
  const liveTargets = row.applicabilities.filter((entry) => entry.isVisible)
  const requiredTargets = row.applicabilities.filter((entry) => entry.isRequired)
  const lockedTargets = row.applicabilities.filter((entry) => entry.isLockedInCustomize)
  const configuredFamilies = row.transactionFamilyAssignments.filter((entry) => entry.allowsHeader || entry.allowsLine)
  const failingFamilies = row.transactionFamilySourcingPolicies.filter((policy) => policy.failIfUnresolved)
  const postingLines = [
    row.postToGl ? 'This dimension is intended to flow into GL posting context.' : 'This dimension is currently reporting-only and does not post to GL.',
    row.requiresGlSplit ? 'GL lines should split when values differ.' : 'GL summarization is allowed unless another rule requires a split.',
    row.allowsGlAssignment ? 'Journal/GL line assignment is allowed.' : 'Direct journal/GL line assignment is off.',
  ]

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Preview</h2>
          <StatePill state="live" />
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Plain-English summary of how this dimension is configured right now, including what is live, what is configurable, and what still needs runtime rollout.
        </p>
      </div>

      <div
        className="rounded-2xl border p-5"
        style={{
          borderColor: policyIssues.length > 0 ? 'rgba(253, 230, 138, 0.35)' : 'rgba(134, 239, 172, 0.35)',
          backgroundColor: policyIssues.length > 0 ? 'rgba(180, 83, 9, 0.08)' : 'rgba(34, 197, 94, 0.08)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">
              {policyIssues.length > 0 ? 'Review before relying on this dimension' : 'Dimension setup is clean'}
            </h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Preview is the final admin readout: definition, values, applicability, sourcing, enforcement, propagation, and posting in one place.
            </p>
          </div>
          <Badge label={policyIssues.length > 0 ? `${policyIssues.length} Review` : 'Ready'} tone={policyIssues.length > 0 ? 'amber' : 'green'} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <PreviewCard
          title="Definition"
          state="live"
          lines={[
            `${row.label || 'Unnamed dimension'} is a ${formatDimensionTypeLabel(row.dimensionType).toLowerCase()}.`,
            `Value model: ${formatDimensionValueModelLabel(row.valueModel)} using ${formatDimensionValueSourceLabel(row.valueSourceType)}.`,
            `Selection type: ${formatDimensionSelectionTypeLabel(row.selectionType)}.`,
            row.isSeeded ? 'Seeded dimension managed in the common dimension framework.' : 'Custom dimension created by admins.',
          ]}
        />
        <PreviewCard
          title="Values"
          state="configurable"
          lines={[
            `${row.values.length} total value${row.values.length === 1 ? '' : 's'}, ${activeValues} active.`,
            `${row.valueFields.length} value field${row.valueFields.length === 1 ? '' : 's'} available; ${customValueFields} custom.`,
            'Values can be maintained one-by-one or through the dimension value import template.',
          ]}
        />
        <PreviewCard
          title="Applicability"
          state="live"
          lines={[
            liveTargets.length
              ? `Visible on: ${liveTargets.map((entry) => formatDimensionTargetLabel(entry.targetKey)).join(', ')}.`
              : 'Not visible on any surface yet.',
            requiredTargets.length
              ? `Required on: ${requiredTargets.map((entry) => formatDimensionTargetLabel(entry.targetKey)).join(', ')}.`
              : 'Not globally required yet.',
            lockedTargets.length
              ? `Locked in customize on: ${lockedTargets.map((entry) => formatDimensionTargetLabel(entry.targetKey)).join(', ')}.`
              : 'Customize lock is not enabled for any target.',
          ]}
        />
        <PreviewCard
          title="Transaction Families"
          state="live"
          lines={row.transactionFamilyAssignments.map((assignment) => {
            const scopes = [
              assignment.allowsHeader ? 'Header' : '',
              assignment.allowsLine ? 'Line' : '',
            ].filter(Boolean)
            return `${formatDimensionTransactionFamilyLabel(assignment.familyKey)}: ${scopes.length ? scopes.join(' + ') : 'Not applied'}`
          })}
        />
        <PreviewCard
          title="Family Sourcing"
          state="configurable"
          lines={row.transactionFamilySourcingPolicies
            .filter((policy) => configuredFamilies.some((assignment) => assignment.familyKey === policy.familyKey))
            .map((policy) => {
            const headerLead = policy.headerSourcePriority[0] ? formatSourceLabel(policy.headerSourcePriority[0]) : 'None'
            const lineLead = policy.lineSourcePriority[0] ? formatSourceLabel(policy.lineSourcePriority[0]) : 'None'
            const controls = [
              policy.allowManualOverride ? 'manual override allowed' : 'locked after sourcing',
              policy.failIfUnresolved ? 'fail if unresolved' : 'unresolved allowed',
            ]
            return `${formatDimensionTransactionFamilyLabel(policy.familyKey)}: header starts with ${headerLead}; line starts with ${lineLead}; ${controls.join(', ')}.`
          })}
        />
        <PreviewCard
          title="Enforcement"
          state="configurable"
          lines={[
            `Requiredness: ${formatModeLabel(row.validationMode)}.`,
            `Override posture: ${formatModeLabel(row.overrideMode)}.`,
            `Inheritance posture: ${formatModeLabel(row.inheritanceMode)}.`,
            failingFamilies.length
              ? `Fails if unresolved for: ${failingFamilies.map((policy) => formatDimensionTransactionFamilyLabel(policy.familyKey)).join(', ')}.`
              : 'No business flow currently fails when sourcing is unresolved.',
          ]}
        />
        <PreviewCard
          title="Posting"
          state="configurable"
          lines={postingLines}
        />
        <PreviewCard
          title="Propagation"
          state="planned"
          lines={[
            configuredFamilies.length
              ? `Active flow map: ${configuredFamilies.map((assignment) => formatDimensionTransactionFamilyLabel(assignment.familyKey)).join(', ')}.`
              : 'No business flow propagation is active yet.',
            'Transaction-to-transaction carry is modeled by family sourcing and upstream source rules.',
            'Billing, subscription, revenue arrangement, revenue element, and rev rec journal propagation are planned runtime layers informed by this policy.',
            dependencyWarnings.length
              ? `${dependencyWarnings.length} sourcing dependency needs review before propagation is reliable.`
              : 'No blocked sourcing dependencies detected.',
          ]}
        />
        <PreviewCard
          title="Policy Health"
          state={policyIssues.length > 0 ? 'planned' : 'live'}
          lines={policyIssues.length > 0 ? policyIssues : ['No obvious policy gaps detected in the current shell.']}
        />
      </div>
    </div>
  )
}

function TabShell({
  title,
  state,
  description,
  items,
}: {
  title: string
  state: 'live' | 'configurable' | 'planned'
  description: string
  items: string[]
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <StatePill state={state} />
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>
      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {items.map((item) => (
            <li key={item} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function PreviewCard({ title, lines, state }: { title: string; lines: string[]; state?: 'live' | 'configurable' | 'planned' }) {
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {state ? <StatePill state={state} /> : null}
      </div>
      <ul className="mt-4 space-y-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
        {lines.length > 0 ? lines.map((line) => (
          <li key={line} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
            {line}
          </li>
        )) : (
          <li className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
            Nothing configured yet.
          </li>
        )}
      </ul>
    </div>
  )
}

function Field({
  label,
  children,
  compact = false,
  helpText,
}: {
  label: string
  children: React.ReactNode
  compact?: boolean
  helpText?: string
}) {
  return (
    <label className={`block ${compact ? '' : 'space-y-2'}`}>
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        <span>{label}</span>
        {helpText ? <HelpTooltipIcon content={helpText} /> : null}
      </span>
      <div className={compact ? 'mt-2' : ''}>{children}</div>
    </label>
  )
}

function Toggle({
  label,
  checked,
  disabled = false,
  onChange,
  helpText,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  helpText?: string
}) {
  return (
    <label
      className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
      aria-disabled={disabled}
      style={{ borderColor: 'var(--border-muted)' }}
    >
      <span className="inline-flex items-center gap-2 text-sm text-white" style={{ opacity: disabled ? 0.7 : 1 }}>
        <span>{label}</span>
        {helpText ? <HelpTooltipIcon content={helpText} /> : null}
      </span>
      <input disabled={disabled} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

function SaveStateBadge({ state }: { state: SaveState }) {
  const label =
    state === 'saving' ? 'Saving' : state === 'saved' ? 'Saved' : state === 'error' ? 'Error' : 'Idle'
  return <Badge label={label} tone={state === 'error' ? 'slate' : state === 'saved' ? 'green' : 'slate'} />
}

function ImportStateBadge({ state }: { state: 'idle' | 'validating' | 'importing' | 'clean' | 'imported' | 'error' }) {
  const label =
    state === 'validating'
      ? 'Validating'
      : state === 'importing'
        ? 'Importing'
        : state === 'clean'
          ? 'Clean'
          : state === 'imported'
            ? 'Imported'
            : state === 'error'
              ? 'Needs Cleanup'
              : 'Idle'
  return <Badge label={label} tone={state === 'clean' || state === 'imported' ? 'green' : state === 'error' ? 'amber' : 'slate'} />
}

function StatePill({ state }: { state: 'live' | 'configurable' | 'planned' }) {
  const label = state === 'live' ? 'Live' : state === 'configurable' ? 'Configurable' : 'Planned'
  return <Badge label={label} tone={state === 'live' ? 'green' : state === 'configurable' ? 'blue' : 'slate'} />
}

function Badge({
  label,
  tone,
}: {
  label: string
  tone: 'amber' | 'blue' | 'green' | 'slate'
}) {
  const toneMap = {
    amber: { color: '#fde68a', borderColor: 'rgba(253, 230, 138, 0.4)', backgroundColor: 'rgba(180, 83, 9, 0.14)' },
    blue: { color: '#93c5fd', borderColor: 'rgba(147, 197, 253, 0.35)', backgroundColor: 'rgba(59, 130, 246, 0.12)' },
    green: { color: '#86efac', borderColor: 'rgba(134, 239, 172, 0.35)', backgroundColor: 'rgba(34, 197, 94, 0.12)' },
    slate: { color: 'var(--text-secondary)', borderColor: 'var(--border-muted)', backgroundColor: 'rgba(148, 163, 184, 0.08)' },
  } as const

  return (
    <span
      className="rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
      style={toneMap[tone]}
    >
      {label}
    </span>
  )
}

function createEmptyRow(): EditableDimension {
  return {
    id: 'new-dimension',
    dimensionKey: '',
    label: '',
    description: '',
    dimensionType: 'custom',
    valueSourceType: 'generic',
    valueModel: 'simple_managed_list',
    selectionType: 'single_select',
    valueSourceCount: 0,
    isSeeded: false,
    isCustom: true,
    isActive: true,
    allowsHeaderAssignment: true,
    allowsLineAssignment: true,
    allowsGlAssignment: true,
    allowsProjectAssignment: false,
    allowsSubscriptionAssignment: false,
    inheritanceMode: 'inherit_with_override',
    overrideMode: 'allowed',
    validationMode: 'optional',
    postToGl: true,
    requiresGlSplit: false,
    values: [],
    valueFields: [],
    applicabilities: TARGETS.map((targetKey) => ({
      id: `new-${targetKey}-applicability`,
      targetKey,
      isVisible: targetKey !== 'subscription_header',
      isRequired: false,
      isLockedInCustomize: false,
    })),
    sourcingPolicies: SOURCING_TARGETS.map((targetKey) => ({
      id: `new-${targetKey}-policy`,
      targetKey,
      sourcePriority:
        targetKey === 'transaction_header'
          ? ['explicit_user_entry', 'customer_defaults', 'vendor_defaults', 'subsidiary_defaults']
          : targetKey === 'transaction_line'
            ? ['explicit_line_entry', 'item_defaults', 'header_inheritance', 'gl_account_defaults']
            : targetKey === 'gl_line'
              ? ['source_transaction_line', 'source_transaction_header', 'posting_policy_override']
              : ['explicit_user_entry'],
      allowHeaderInheritance: targetKey === 'transaction_line' || targetKey === 'gl_line',
      allowSourceLineInheritance: targetKey === 'transaction_line' || targetKey === 'gl_line',
      allowProjectInheritance: targetKey === 'transaction_header' || targetKey === 'transaction_line',
      allowSubscriptionInheritance: targetKey === 'transaction_header' || targetKey === 'transaction_line' || targetKey === 'subscription_header',
      allowManualOverride: true,
      failIfUnresolved: false,
    })),
    transactionFamilyAssignments: TRANSACTION_FAMILIES.map((familyKey) => ({
      id: `new-${familyKey}-family-assignment`,
      familyKey,
      allowsHeader: familyKey !== 'rtr',
      allowsLine: true,
    })),
    transactionFamilySourcingPolicies: TRANSACTION_FAMILIES.map((familyKey) => ({
      id: `new-${familyKey}-family-sourcing`,
      familyKey,
      headerSourcePriority:
        familyKey === 'crm'
          ? ['upstream_source_document', 'customer_defaults', 'explicit_user_entry']
          : familyKey === 'p2p'
            ? ['upstream_source_document', 'vendor_defaults', 'explicit_user_entry']
            : familyKey === 'billing_revenue'
              ? ['customer_defaults', 'subscription_defaults', 'explicit_user_entry']
              : ['explicit_user_entry', 'subsidiary_defaults'],
      lineSourcePriority:
        familyKey === 'crm'
          ? ['upstream_source_line', 'item_defaults', 'customer_defaults', 'explicit_line_entry']
          : familyKey === 'p2p'
            ? ['upstream_source_line', 'item_defaults', 'vendor_defaults', 'explicit_line_entry']
            : familyKey === 'billing_revenue'
              ? ['subscription_defaults', 'billable_charge', 'item_defaults', 'explicit_line_entry']
              : ['gl_account_defaults', 'explicit_line_entry'],
      allowProjectInheritance: familyKey === 'crm' || familyKey === 'p2p' || familyKey === 'billing_revenue',
      allowSubscriptionInheritance: familyKey === 'billing_revenue',
      allowManualOverride: true,
      failIfUnresolved: false,
    })),
  }
}

function cloneRow(row: DimensionConfigurationRow): EditableDimension {
  return syncTransactionApplicability({
    ...row,
    values: row.values.map((entry) => ({ ...entry })),
    valueFields: row.valueFields.map((entry) => ({ ...entry })),
    applicabilities: row.applicabilities.map((entry) => ({ ...entry })),
    sourcingPolicies: row.sourcingPolicies.map((entry) => ({ ...entry, sourcePriority: [...entry.sourcePriority] })),
    transactionFamilyAssignments: row.transactionFamilyAssignments.map((entry) => ({ ...entry })),
    transactionFamilySourcingPolicies: row.transactionFamilySourcingPolicies.map((entry) => ({
      ...entry,
      headerSourcePriority: [...entry.headerSourcePriority],
      lineSourcePriority: [...entry.lineSourcePriority],
    })),
  })
}

function syncTransactionApplicability(row: EditableDimension): EditableDimension {
  const hasHeaderFamily = row.transactionFamilyAssignments.some((entry) => entry.allowsHeader)
  const hasLineFamily = row.transactionFamilyAssignments.some((entry) => entry.allowsLine)
  const headerRequired = row.validationMode === 'required_header'
  const lineRequired = row.validationMode === 'required_line'

  return {
    ...row,
    allowsHeaderAssignment: hasHeaderFamily,
    allowsLineAssignment: hasLineFamily,
    applicabilities: row.applicabilities.map((entry) => {
      if (entry.targetKey === 'transaction_header') {
        return {
          ...entry,
          isVisible: hasHeaderFamily,
          isRequired: headerRequired,
          isLockedInCustomize: headerRequired,
        }
      }
      if (entry.targetKey === 'transaction_line') {
        return {
          ...entry,
          isVisible: hasLineFamily,
          isRequired: lineRequired,
          isLockedInCustomize: lineRequired,
        }
      }
      return entry
    }),
  }
}

function normalizeDimensionKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function formatSourceLabel(value: string) {
  const match = SOURCE_OPTIONS.find((option) => option.key === value)
  if (match) return match.label
  return value
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function formatSourceDefinition(value: string) {
  const match = SOURCE_OPTIONS.find((option) => option.key === value)
  return match?.definition ?? 'Use this source when it can provide a dimension value.'
}

function getSourceEligibility(row: EditableDimension, sourceKey: string): { eligible: boolean; reason?: string } {
  if (!sourceKey) return { eligible: true }

  const dependencies = SOURCE_EXTENSION_DEPENDENCIES[sourceKey] ?? []
  if (dependencies.length === 0) return { eligible: true }

  const hasRequiredExtension = dependencies.some((targetKey) =>
    row.applicabilities.some((entry) => entry.targetKey === targetKey && entry.isVisible),
  )
  if (hasRequiredExtension) return { eligible: true }

  return {
    eligible: false,
    reason: `Enable ${formatTargetList(dependencies)} in Where It Applies first.`,
  }
}

function getSourcingDependencyWarnings(row: EditableDimension) {
  const warnings = new Set<string>()

  for (const policy of row.transactionFamilySourcingPolicies) {
    for (const sourceKey of new Set([...policy.headerSourcePriority, ...policy.lineSourcePriority])) {
      const eligibility = getSourceEligibility(row, sourceKey)
      if (!eligibility.eligible && eligibility.reason) {
        warnings.add(`${formatDimensionTransactionFamilyLabel(policy.familyKey)} uses ${formatSourceLabel(sourceKey)}, but ${eligibility.reason.toLowerCase()}`)
      }
    }
  }

  return Array.from(warnings)
}

function formatTargetList(targetKeys: DimensionTargetKey[]) {
  const labels = targetKeys.map((targetKey) => formatDimensionTargetLabel(targetKey))
  if (labels.length <= 1) return labels[0] ?? 'the required target'
  if (labels.length === 2) return `${labels[0]} or ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, or ${labels[labels.length - 1]}`
}

function getPolicyIssues(row: EditableDimension) {
  const issues: string[] = []
  const enabledFamilies = row.transactionFamilyAssignments.filter((assignment) => assignment.allowsHeader || assignment.allowsLine)
  const familyPolicyByKey = new Map(row.transactionFamilySourcingPolicies.map((policy) => [policy.familyKey, policy]))

  if (row.isActive && enabledFamilies.length === 0) {
    issues.push('No transaction family application is enabled.')
  }

  for (const assignment of enabledFamilies) {
    const policy = familyPolicyByKey.get(assignment.familyKey)
    const familyLabel = formatDimensionTransactionFamilyLabel(assignment.familyKey)
    if (assignment.allowsHeader && (!policy || policy.headerSourcePriority.length === 0)) {
      issues.push(`${familyLabel} header has no sourcing priority.`)
    }
    if (assignment.allowsLine && (!policy || policy.lineSourcePriority.length === 0)) {
      issues.push(`${familyLabel} line has no sourcing priority.`)
    }
  }

  if (row.postToGl && !row.allowsGlAssignment) {
    issues.push('Posts to GL, but GL assignment is disabled.')
  }
  if (row.requiresGlSplit && !row.postToGl) {
    issues.push('Requires GL split, but Post to GL is disabled.')
  }
  if (row.validationMode !== 'optional' && !row.transactionFamilySourcingPolicies.some((policy) => policy.failIfUnresolved)) {
    issues.push('Dimension is required, but no family is set to fail if unresolved.')
  }

  issues.push(...getSourcingDependencyWarnings(row))

  return issues
}
