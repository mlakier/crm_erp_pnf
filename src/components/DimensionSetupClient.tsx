'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  DIMENSION_TARGETS,
  DIMENSION_TRANSACTION_FAMILIES,
  formatDimensionTransactionFamilyLabel,
  getDimensionTransactionFamilySourcingDescription,
  getDimensionValueFieldEntityType,
  type DimensionConfigurationRow,
  type DimensionTargetKey,
  type DimensionTransactionFamilyKey,
} from '@/lib/dimension-control-plane'
import { CUSTOM_FIELD_TYPES, normalizeCustomFieldName, type CustomFieldType } from '@/lib/custom-fields'

type StepKey =
  | 'define'
  | 'values'
  | 'fields'
  | 'application'
  | 'sourcing'
  | 'validation'
  | 'flow'
  | 'posting'
  | 'review'

type SetupValueField = {
  tempId: string
  label: string
  name: string
  type: CustomFieldType
  required: boolean
  defaultValue: string
  optionsText: string
}

type SetupState = {
  label: string
  dimensionKey: string
  description: string
  dimensionPurpose: 'financial_reporting' | 'operational_reporting' | 'both'
  valueModel: 'simple_managed_list' | 'managed_list_record' | 'custom_record_backed'
  selectionType: 'single_select' | 'multi_select'
  starterValues: string
  customFields: string
  valueFields: SetupValueField[]
  appliesToCustomer: boolean
  appliesToVendor: boolean
  appliesToItem: boolean
  appliesToProject: boolean
  appliesToSubscription: boolean
  appliesToGlAccount: boolean
  appliesToSubsidiary: boolean
  appliesToEmployeeUser: boolean
  appliesToCustomRecord: boolean
  familyAssignments: Record<DimensionTransactionFamilyKey, { header: boolean; line: boolean }>
  familySourcing: Record<DimensionTransactionFamilyKey, { header: string[]; line: string[] }>
  validationMode: 'optional' | 'required_header' | 'required_line' | 'required_posting_only'
  allowManualOverride: boolean
  failIfUnresolved: boolean
  postToGl: boolean
  requiresGlSplit: boolean
  allowsGlAssignment: boolean
  carryToRevenue: boolean
  carryToOpenItems: boolean
}

type SaveState = 'idle' | 'saving' | 'error'

const STEPS: Array<{ key: StepKey; label: string; helper: string }> = [
  { key: 'define', label: 'Define', helper: 'Name the dimension and choose the record model.' },
  { key: 'values', label: 'Values', helper: 'Add starter values or plan the value structure.' },
  { key: 'fields', label: 'Fields', helper: 'Capture extra fields that should live on each value.' },
  { key: 'application', label: 'Where It Applies', helper: 'Choose where the dimension can live before sourcing uses those records.' },
  { key: 'sourcing', label: 'Sourcing', helper: 'Choose ordered source priority by transaction family.' },
  { key: 'validation', label: 'Validation', helper: 'Choose when missing values should matter.' },
  { key: 'flow', label: 'Flow', helper: 'Preview where values should travel downstream.' },
  { key: 'posting', label: 'Posting', helper: 'Decide whether this reaches GL.' },
  { key: 'review', label: 'Review', helper: 'Review the generated configuration before creating it.' },
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

const INPUT_CLASS = 'w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white outline-none'

const DEFAULT_STATE: SetupState = {
  label: '',
  dimensionKey: '',
  description: '',
  dimensionPurpose: 'both',
  valueModel: 'simple_managed_list',
  selectionType: 'single_select',
  starterValues: '',
  customFields: '',
  valueFields: [],
  appliesToCustomer: true,
  appliesToVendor: false,
  appliesToItem: true,
  appliesToProject: false,
  appliesToSubscription: false,
  appliesToGlAccount: false,
  appliesToSubsidiary: false,
  appliesToEmployeeUser: false,
  appliesToCustomRecord: false,
  familyAssignments: {
    crm: { header: true, line: true },
    p2p: { header: false, line: false },
    rtr: { header: false, line: true },
    billing_revenue: { header: true, line: true },
  },
  familySourcing: {
    crm: {
      header: ['upstream_source_document', 'customer_defaults', 'explicit_user_entry'],
      line: ['upstream_source_line', 'item_defaults', 'header_inheritance', 'explicit_line_entry'],
    },
    p2p: {
      header: ['upstream_source_document', 'vendor_defaults', 'explicit_user_entry'],
      line: ['upstream_source_line', 'item_defaults', 'header_inheritance', 'explicit_line_entry'],
    },
    rtr: {
      header: ['explicit_user_entry'],
      line: ['gl_account_defaults', 'explicit_line_entry'],
    },
    billing_revenue: {
      header: ['customer_defaults', 'subscription_defaults', 'explicit_user_entry'],
      line: ['subscription_plan_defaults', 'billable_charge', 'item_defaults', 'explicit_line_entry'],
    },
  },
  validationMode: 'optional',
  allowManualOverride: true,
  failIfUnresolved: false,
  postToGl: true,
  requiresGlSplit: false,
  allowsGlAssignment: true,
  carryToRevenue: true,
  carryToOpenItems: true,
}

export default function DimensionSetupClient() {
  const router = useRouter()
  const [state, setState] = useState<SetupState>(DEFAULT_STATE)
  const [stepIndex, setStepIndex] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const step = STEPS[stepIndex]
  const parsedValues = useMemo(() => parseStarterValues(state.starterValues), [state.starterValues])
  const parsedFields = useMemo(() => state.valueFields.filter(isSetupValueFieldReady), [state.valueFields])
  const fieldSummaries = useMemo(() => state.valueFields.map(formatSetupValueField), [state.valueFields])
  const canCreate = state.label.trim().length > 0 && state.dimensionKey.trim().length > 0

  function update(updates: Partial<SetupState>) {
    setState((current) => ({ ...current, ...updates }))
  }

  function addValueField() {
    setState((current) => ({
      ...current,
      valueFields: [
        ...current.valueFields,
        {
          tempId: `field-${Date.now()}-${current.valueFields.length}`,
          label: '',
          name: '',
          type: 'text',
          required: false,
          defaultValue: '',
          optionsText: '',
        },
      ],
    }))
  }

  function updateValueField(tempId: string, updates: Partial<SetupValueField>) {
    setState((current) => ({
      ...current,
      valueFields: current.valueFields.map((field) =>
        field.tempId === tempId ? { ...field, ...updates } : field,
      ),
    }))
  }

  function removeValueField(tempId: string) {
    setState((current) => ({
      ...current,
      valueFields: current.valueFields.filter((field) => field.tempId !== tempId),
    }))
  }

  function updateFamilyAssignment(
    familyKey: DimensionTransactionFamilyKey,
    updates: Partial<SetupState['familyAssignments'][DimensionTransactionFamilyKey]>,
  ) {
    setState((current) => ({
      ...current,
      familyAssignments: {
        ...current.familyAssignments,
        [familyKey]: { ...current.familyAssignments[familyKey], ...updates },
      },
    }))
  }

  function updateFamilySource(familyKey: DimensionTransactionFamilyKey, scope: 'header' | 'line', sourceKey: string, checked: boolean) {
    setState((current) => {
      const values = current.familySourcing[familyKey][scope]
      const nextValues = checked ? [...values, sourceKey] : values.filter((entry) => entry !== sourceKey)
      return {
        ...current,
        familySourcing: {
          ...current.familySourcing,
          [familyKey]: {
            ...current.familySourcing[familyKey],
            [scope]: Array.from(new Set(nextValues)),
          },
        },
      }
    })
  }

  function addFamilySource(familyKey: DimensionTransactionFamilyKey, scope: 'header' | 'line' | 'both', sourceKey: string) {
    if (!sourceKey) return
    setState((current) => {
      const familySourcing = current.familySourcing[familyKey]
      return {
        ...current,
        familySourcing: {
          ...current.familySourcing,
          [familyKey]: {
            header:
              scope === 'header' || scope === 'both'
                ? Array.from(new Set([...familySourcing.header, sourceKey]))
                : familySourcing.header,
            line:
              scope === 'line' || scope === 'both'
                ? Array.from(new Set([...familySourcing.line, sourceKey]))
                : familySourcing.line,
          },
        },
      }
    })
  }

  function removeFamilySource(familyKey: DimensionTransactionFamilyKey, scope: 'header' | 'line' | 'both', sourceKey: string) {
    setState((current) => {
      const familySourcing = current.familySourcing[familyKey]
      return {
        ...current,
        familySourcing: {
          ...current.familySourcing,
          [familyKey]: {
            header:
              scope === 'header' || scope === 'both'
                ? familySourcing.header.filter((entry) => entry !== sourceKey)
                : familySourcing.header,
            line:
              scope === 'line' || scope === 'both'
                ? familySourcing.line.filter((entry) => entry !== sourceKey)
                : familySourcing.line,
          },
        },
      }
    })
  }

  function moveFamilySource(familyKey: DimensionTransactionFamilyKey, scope: 'header' | 'line' | 'both', sourceKey: string, direction: 'up' | 'down') {
    setState((current) => {
      const familySourcing = current.familySourcing[familyKey]
      return {
        ...current,
        familySourcing: {
          ...current.familySourcing,
          [familyKey]: {
            header:
              scope === 'header' || scope === 'both'
                ? moveSourceInList(familySourcing.header, sourceKey, direction)
                : familySourcing.header,
            line:
              scope === 'line' || scope === 'both'
                ? moveSourceInList(familySourcing.line, sourceKey, direction)
                : familySourcing.line,
          },
        },
      }
    })
  }

  async function createDimension() {
    if (!canCreate) {
      setErrorMessage('Label and dimension key are required.')
      return
    }
    const preflightIssues = getSetupCreatePreflightIssues(state, parsedValues, parsedFields)
    if (preflightIssues.length > 0) {
      setSaveState('error')
      setErrorMessage(preflightIssues.join(' '))
      return
    }

    setSaveState('saving')
    setErrorMessage(null)
    try {
      const response = await fetch('/api/config/dimensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCreatePayload(state)),
      })
      const body = (await response.json().catch(() => null)) as
        | { createdId?: string | null; rows?: DimensionConfigurationRow[] | null; error?: string | null }
        | null

      if (!response.ok || !body?.createdId) {
        throw new Error(body?.error || 'Failed to create dimension.')
      }

      for (const value of parsedValues) {
        const valueResponse = await fetch('/api/config/dimensions/values', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dimensionId: body.createdId,
            code: value.code,
            name: value.name,
            description: value.description,
            isActive: true,
          }),
        })
        if (!valueResponse.ok) {
          const valueBody = (await valueResponse.json().catch(() => null)) as { error?: string | null } | null
          throw new Error(valueBody?.error || 'Dimension was created, but one or more starter values could not be saved.')
        }
      }

      for (const field of parsedFields) {
        const fieldResponse = await fetch('/api/custom-fields', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: getDimensionValueFieldEntityType(state.dimensionKey),
            label: field.label,
            name: field.name,
            type: field.type,
            required: field.required,
            defaultValue: field.defaultValue,
            options: parseFieldOptions(field.optionsText),
          }),
        })
        if (!fieldResponse.ok) {
          const fieldBody = (await fieldResponse.json().catch(() => null)) as { error?: string | null } | null
          throw new Error(fieldBody?.error || 'Dimension was created, but one or more value fields could not be saved.')
        }
      }

      router.replace(`/configuration/manage-dimensions/${body.createdId}`)
    } catch (error) {
      setSaveState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create dimension.')
    }
  }

  return renderGuidedConsole()

  function renderGuidedConsole() {
    return (
      <div className="space-y-6">
        <section
          className="rounded-2xl border p-6"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>
                Guided Dimension Builder
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white">New Dimension Setup</h1>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                A guided setup console for admins: answer the business questions, see the policy take shape, then create an editable dimension record.
              </p>
            </div>
            <Link
              href="/configuration/manage-dimensions"
              className="rounded-md border px-3 py-2 text-sm font-medium"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
            >
              Back to Manage
            </Link>
          </div>
        </section>

        <section
          className="overflow-hidden rounded-2xl border"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
        >
          <div
            className="overflow-x-auto border-b p-3"
            style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}
          >
            <div className="flex min-w-max items-stretch gap-2">
              {STEPS.map((entry, index) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setStepIndex(index)}
                  className="min-w-[9.5rem] rounded-xl border px-4 py-3 text-left transition"
                  style={{
                    borderColor: index === stepIndex ? 'var(--accent)' : 'var(--border-muted)',
                    backgroundColor: index === stepIndex ? 'var(--accent-soft)' : 'transparent',
                    color: index === stepIndex ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                      style={{
                        backgroundColor: index === stepIndex ? 'var(--accent)' : 'rgba(148, 163, 184, 0.15)',
                        color: index === stepIndex ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {index + 1}
                    </span>
                    {index < stepIndex ? 'Done' : index === stepIndex ? 'Now' : 'Next'}
                  </span>
                  <span className="mt-2 block text-sm font-semibold">{entry.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="min-h-[34rem] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5" style={{ borderColor: 'var(--border-muted)' }}>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-white">{step.label}</h2>
                    <span
                      className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
                      style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                    >
                      Step {stepIndex + 1} of {STEPS.length}
                    </span>
                  </div>
                  <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {step.helper}
                  </p>
                </div>
              </div>

              <div className="mt-6">{renderStep(step.key)}</div>

              {errorMessage ? (
                <p
                  className="mt-5 rounded-xl border px-4 py-3 text-sm"
                  style={{ borderColor: 'rgba(248, 113, 113, 0.4)', color: 'var(--danger)' }}
                >
                  {errorMessage}
                </p>
              ) : null}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
                  disabled={stepIndex === 0}
                  className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                >
                  Previous
                </button>
                {step.key === 'review' ? (
                  <button
                    type="button"
                    onClick={() => void createDimension()}
                    disabled={!canCreate || saveState === 'saving'}
                    className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {saveState === 'saving' ? 'Creating...' : 'Create Dimension'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStepIndex((current) => Math.min(current + 1, STEPS.length - 1))}
                    className="rounded-md px-4 py-2 text-sm font-medium text-white"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    Next
                  </button>
                )}
              </div>
            </div>

            <aside
              className="border-t p-5 xl:border-l xl:border-t-0"
              style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}
            >
              <div className="sticky top-24 space-y-4">
                <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-white">Setup Assistant</h2>
                    <span
                      className="rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
                      style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                    >
                      Planned AI
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                    Later this can translate plain English, like "default Brand from item and carry it to revenue", into reviewed setup choices.
                  </p>
                  <div className="mt-4 rounded-xl border p-4 text-sm leading-6" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
                    <span className="font-semibold text-white">Current suggestion:</span> Start broad, keep manual override on, and tighten posting enforcement after previewing downstream impact.
                  </div>
                </section>

                <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
                  <h2 className="text-base font-semibold text-white">Live Policy Preview</h2>
                  <div className="mt-4 space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <PreviewLine label="Dimension" value={state.label || 'Not named yet'} />
                    <PreviewLine label="Key" value={state.dimensionKey || 'Not set'} />
                    <PreviewLine label="Values" value={`${parsedValues.length} starter value${parsedValues.length === 1 ? '' : 's'}`} />
                    <PreviewLine label="Fields" value={`${parsedFields.length} ready field${parsedFields.length === 1 ? '' : 's'}`} />
                    <PreviewLine label="Posting" value={state.postToGl ? (state.requiresGlSplit ? 'GL + split' : 'GL enabled') : 'Reporting only'} />
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border p-8" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>
              Guided Dimension Builder
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">New Dimension Setup</h1>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Walk through the business questions first. The setup assistant creates a governed dimension record that can be edited later on the full detail page.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/configuration/manage-dimensions"
              className="rounded-md border px-3 py-2 text-sm font-medium"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
            >
              Back to Manage
            </Link>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border p-2" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
          <div className="flex min-w-max items-stretch gap-2">
          {STEPS.map((entry, index) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setStepIndex(index)}
              className="min-w-[10rem] rounded-xl border px-4 py-3 text-left transition"
              style={{
                borderColor: index === stepIndex ? 'var(--accent)' : 'var(--border-muted)',
                backgroundColor: index === stepIndex ? 'var(--accent-soft)' : 'var(--card-elevated)',
                color: index === stepIndex ? 'white' : 'var(--text-secondary)',
              }}
            >
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                  style={{
                    backgroundColor: index === stepIndex ? 'var(--accent)' : 'rgba(148, 163, 184, 0.15)',
                    color: index === stepIndex ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {index + 1}
                </span>
                Step
              </span>
              <span className="mt-2 block text-sm font-semibold">{entry.label}</span>
            </button>
          ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5" style={{ borderColor: 'var(--border-muted)' }}>
            <div>
            <h2 className="text-xl font-semibold text-white">{step.label}</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {step.helper}
            </p>
            </div>
            <div className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
              {stepIndex + 1} of {STEPS.length}
            </div>
          </div>

          <div className="mt-6">{renderStep(step.key)}</div>

          {errorMessage ? (
            <p className="mt-5 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(248, 113, 113, 0.4)', color: 'var(--danger)' }}>
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
              disabled={stepIndex === 0}
              className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
            >
              Previous
            </button>
            {step.key === 'review' ? (
              <button
                type="button"
                onClick={() => void createDimension()}
                disabled={!canCreate || saveState === 'saving'}
                className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {saveState === 'saving' ? 'Creating...' : 'Create Dimension'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStepIndex((current) => Math.min(current + 1, STEPS.length - 1))}
                className="rounded-md px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Next
              </button>
            )}
          </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Setup Assistant</h2>
              <span className="rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
                Planned AI
              </span>
            </div>
            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              This panel is intentionally guidance-first for now. Later, the assistant can convert plain English like “default Brand from item and carry it to revenue” into reviewed setup choices.
            </p>
            <div className="mt-4 rounded-xl border p-4 text-sm leading-6" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
              <span className="font-semibold text-white">Current suggestion:</span> Start broad, keep manual override on, and tighten posting enforcement only after previewing downstream impact.
            </div>
          </section>

          <section className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
            <h2 className="text-base font-semibold text-white">Configuration Preview</h2>
            <div className="mt-4 space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <PreviewLine label="Dimension" value={state.label || 'Not named yet'} />
              <PreviewLine label="Key" value={state.dimensionKey || 'Not set'} />
              <PreviewLine label="Values" value={`${parsedValues.length} starter value${parsedValues.length === 1 ? '' : 's'}`} />
              <PreviewLine label="Fields" value={`${parsedFields.length} ready custom field${parsedFields.length === 1 ? '' : 's'}`} />
              <PreviewLine label="Posting" value={state.postToGl ? (state.requiresGlSplit ? 'GL + split' : 'GL enabled') : 'Reporting only'} />
            </div>
          </section>
      </div>
    </div>
  )

  function renderStep(stepKey: StepKey) {
    switch (stepKey) {
      case 'define':
        return (
          <div className="grid gap-5 lg:grid-cols-2">
            <Field label="Label" helper="Business-facing name users will see.">
              <input value={state.label} onChange={(event) => update({ label: event.target.value, dimensionKey: state.dimensionKey || normalizeKey(event.target.value) })} className={INPUT_CLASS} style={{ borderColor: 'var(--border-muted)' }} />
            </Field>
            <Field label="Dimension Key" helper="Stable system-friendly key.">
              <input value={state.dimensionKey} onChange={(event) => update({ dimensionKey: normalizeKey(event.target.value) })} className={INPUT_CLASS} style={{ borderColor: 'var(--border-muted)' }} />
            </Field>
            <Field label="Purpose" helper="This drives the first-pass posting posture.">
              <select value={state.dimensionPurpose} onChange={(event) => updatePurpose(event.target.value as SetupState['dimensionPurpose'])} className={INPUT_CLASS} style={{ borderColor: 'var(--border-muted)' }}>
                <option value="both" className="bg-slate-900">Financial and operational</option>
                <option value="financial_reporting" className="bg-slate-900">Financial/reporting</option>
                <option value="operational_reporting" className="bg-slate-900">Operational/reporting only</option>
              </select>
            </Field>
            <Field label="Value Record Model" helper="Start simple unless the value needs richer fields/behavior.">
              <select value={state.valueModel} onChange={(event) => update({ valueModel: event.target.value as SetupState['valueModel'] })} className={INPUT_CLASS} style={{ borderColor: 'var(--border-muted)' }}>
                <option value="simple_managed_list" className="bg-slate-900">Simple managed list</option>
                <option value="managed_list_record" className="bg-slate-900">Managed list record</option>
                <option value="custom_record_backed" className="bg-slate-900">Custom record-backed</option>
              </select>
            </Field>
            <Field label="Selection Type" helper="Most ERP dimensions should start as single-select.">
              <select value={state.selectionType} onChange={(event) => update({ selectionType: event.target.value as SetupState['selectionType'] })} className={INPUT_CLASS} style={{ borderColor: 'var(--border-muted)' }}>
                <option value="single_select" className="bg-slate-900">Single select</option>
                <option value="multi_select" className="bg-slate-900">Multi select</option>
              </select>
            </Field>
            <Field label="Description" helper="Explain what this dimension is for.">
              <textarea value={state.description} onChange={(event) => update({ description: event.target.value })} className={`${INPUT_CLASS} min-h-[96px]`} style={{ borderColor: 'var(--border-muted)' }} />
            </Field>
          </div>
        )
      case 'values':
        return (
          <div className="space-y-5">
            <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Add starter values one per line. Use either <span className="text-white">CODE - Name</span> or just <span className="text-white">Name</span>. You can maintain richer value records after setup.
            </p>
            <textarea value={state.starterValues} onChange={(event) => update({ starterValues: event.target.value })} className={`${INPUT_CLASS} min-h-[220px]`} style={{ borderColor: 'var(--border-muted)' }} placeholder={'BRAND - Brand\nREGION - Region\nCOHORT - Cohort'} />
            <SummaryList title="Parsed Starter Values" items={parsedValues.map((value) => `${value.code} - ${value.name}`)} emptyText="No starter values entered yet." />
          </div>
        )
      case 'fields':
        return (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <p className="max-w-3xl text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                Add structured fields that should live on every value for this dimension. These will be created as real value-field definitions after the dimension is saved.
              </p>
              <button
                type="button"
                onClick={addValueField}
                className="rounded-md px-3 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Add Field
              </button>
            </div>

            {state.valueFields.length > 0 ? (
              <div className="space-y-4">
                {state.valueFields.map((field, index) => (
                  <div
                    key={field.tempId}
                    className="rounded-xl border p-4"
                    style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-white">Value Field {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeValueField(field.tempId)}
                        className="rounded-md border px-3 py-2 text-sm font-medium"
                        style={{ borderColor: 'var(--border-muted)', color: 'var(--danger)' }}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <Field label="Label" helper="Business-facing field name.">
                        <input
                          value={field.label}
                          onChange={(event) =>
                            updateValueField(field.tempId, {
                              label: event.target.value,
                              name: field.name || normalizeCustomFieldName(event.target.value),
                            })
                          }
                          className={INPUT_CLASS}
                          style={{ borderColor: 'var(--border-muted)' }}
                        />
                      </Field>
                      <Field label="Field ID" helper="Stable system identifier.">
                        <input
                          value={field.name}
                          onChange={(event) => updateValueField(field.tempId, { name: normalizeCustomFieldName(event.target.value) })}
                          className={INPUT_CLASS}
                          style={{ borderColor: 'var(--border-muted)' }}
                        />
                      </Field>
                      <Field label="Type" helper="How the value field should be stored.">
                        <select
                          value={field.type}
                          onChange={(event) => updateValueField(field.tempId, { type: event.target.value as CustomFieldType })}
                          className={INPUT_CLASS}
                          style={{ borderColor: 'var(--border-muted)' }}
                        >
                          {CUSTOM_FIELD_TYPES.map((type) => (
                            <option key={type} value={type} className="bg-slate-900">
                              {formatCustomFieldType(type)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Default" helper="Optional default for new values.">
                        <input
                          value={field.defaultValue}
                          onChange={(event) => updateValueField(field.tempId, { defaultValue: event.target.value })}
                          className={INPUT_CLASS}
                          style={{ borderColor: 'var(--border-muted)' }}
                        />
                      </Field>
                      <Field label="Options" helper="For select fields, one option per line.">
                        <textarea
                          value={field.optionsText}
                          onChange={(event) => updateValueField(field.tempId, { optionsText: event.target.value })}
                          className={`${INPUT_CLASS} min-h-[86px]`}
                          style={{ borderColor: 'var(--border-muted)' }}
                        />
                      </Field>
                      <div className="flex items-end">
                        <Toggle
                          label="Required"
                          checked={field.required}
                          onChange={(checked) => updateValueField(field.tempId, { required: checked })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
                No value fields added yet. Use Add Field if this dimension needs richer attributes on each value.
              </div>
            )}

            <SummaryList title="Ready Value Fields" items={fieldSummaries} emptyText="No ready value fields yet." />
          </div>
        )
      case 'application':
        return (
          <div className="space-y-6">
            <section className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
              <h3 className="text-sm font-semibold text-white">Master Data Extension</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                Pick the record types that can store a default for this dimension. Sourcing can then pull from those records downstream.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <SetupSurfaceCard
                  title="Customer"
                  description="Stores customer-facing defaults for LTC documents and billing/revenue flows."
                  checked={state.appliesToCustomer}
                  status="configurable"
                  onChange={(checked) => update({ appliesToCustomer: checked })}
                />
                <SetupSurfaceCard
                  title="Vendor"
                  description="Stores supplier defaults for PTP requisitions, orders, receipts, bills, credits, and refunds."
                  checked={state.appliesToVendor}
                  status="configurable"
                  onChange={(checked) => update({ appliesToVendor: checked })}
                />
                <SetupSurfaceCard
                  title="Item"
                  description="Stores product/service defaults that can flow to transaction lines."
                  checked={state.appliesToItem}
                  status="configurable"
                  onChange={(checked) => update({ appliesToItem: checked })}
                />
                <SetupSurfaceCard
                  title="Project"
                  description="Stores project defaults for project billing, cost capture, and downstream reporting."
                  checked={state.appliesToProject}
                  status="configurable"
                  onChange={(checked) => update({ appliesToProject: checked })}
                />
                <SetupSurfaceCard
                  title="Subscription"
                  description="Stores subscription defaults for recurring billing, usage, arrangements, and revenue."
                  checked={state.appliesToSubscription}
                  status="configurable"
                  onChange={(checked) => update({ appliesToSubscription: checked })}
                />
                <SetupSurfaceCard
                  title="GL Account"
                  description="Allows account-level defaults for journal and posting-line sourcing."
                  checked={state.appliesToGlAccount}
                  status="planned"
                  onChange={(checked) => update({ appliesToGlAccount: checked })}
                />
                <SetupSurfaceCard
                  title="Subsidiary"
                  description="Allows entity-level defaults and subsidiary-aware validation."
                  checked={state.appliesToSubsidiary}
                  status="planned"
                  onChange={(checked) => update({ appliesToSubsidiary: checked })}
                />
                <SetupSurfaceCard
                  title="Employee / User"
                  description="Allows people, owners, approvers, and user context to seed dimension values."
                  checked={state.appliesToEmployeeUser}
                  status="planned"
                  onChange={(checked) => update({ appliesToEmployeeUser: checked })}
                />
                <SetupSurfaceCard
                  title="Custom Record"
                  description="Allows future custom records to carry dimension defaults without hard-coding new tables."
                  checked={state.appliesToCustomRecord}
                  status="planned"
                  onChange={(checked) => update({ appliesToCustomRecord: checked })}
                />
              </div>
            </section>

            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
              <h3 className="text-sm font-semibold text-white">Apply To Transaction Families</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                Choose which flows can carry the dimension on document headers and lines.
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                {DIMENSION_TRANSACTION_FAMILIES.map((familyKey) => (
                  <div key={familyKey} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}>
                    <h3 className="text-sm font-semibold text-white">{formatDimensionTransactionFamilyLabel(familyKey)}</h3>
                    <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                      {getDimensionTransactionFamilySourcingDescription(familyKey)}
                    </p>
                    <div className="mt-4 space-y-3">
                      <Toggle label="Document header" checked={state.familyAssignments[familyKey].header} onChange={(checked) => updateFamilyAssignment(familyKey, { header: checked })} />
                      <Toggle label="Document lines" checked={state.familyAssignments[familyKey].line} onChange={(checked) => updateFamilyAssignment(familyKey, { line: checked })} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
              <h3 className="text-sm font-semibold text-white">Posting And Reporting Surfaces</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                These determine whether the dimension can survive into accounting, revenue, and reporting layers.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SetupSurfaceCard
                  title="GL / Posting Lines"
                  description="Carries the dimension onto posting rows so accounting and reporting can use it."
                  checked={state.allowsGlAssignment}
                  status="configurable"
                  onChange={(checked) => update({ allowsGlAssignment: checked })}
                />
                <SetupSurfaceCard
                  title="Revenue Engine"
                  description="Carries values through arrangements, elements, plans, forecasts, and recognition journals."
                  checked={state.carryToRevenue}
                  status="planned"
                  onChange={(checked) => update({ carryToRevenue: checked })}
                />
                <SetupSurfaceCard
                  title="Open Items"
                  description="Keeps values available on receivables, payables, and clearing activity after posting."
                  checked={state.carryToOpenItems}
                  status="planned"
                  onChange={(checked) => update({ carryToOpenItems: checked })}
                />
                <SetupSurfaceCard
                  title="Reporting Layer"
                  description="Makes the dimension available for analytics, saved searches, and downstream reporting."
                  checked
                  status="planned"
                />
              </div>
            </div>
          </div>
        )
      case 'sourcing':
        return (
          <div className="space-y-4">
            <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Order sources by transaction family. Each source can apply to headers, lines, or both. This is the same management model used on the detail page.
            </p>
            {DIMENSION_TRANSACTION_FAMILIES.map((familyKey) => (
              <SetupSourcingFamilyCard
                key={familyKey}
                familyKey={familyKey}
                headerSources={state.familySourcing[familyKey].header}
                lineSources={state.familySourcing[familyKey].line}
                onAddSource={(scope, sourceKey) => addFamilySource(familyKey, scope, sourceKey)}
                onMoveSource={(scope, sourceKey, direction) => moveFamilySource(familyKey, scope, sourceKey, direction)}
                onRemoveSource={(scope, sourceKey) => removeFamilySource(familyKey, scope, sourceKey)}
              />
            ))}
          </div>
        )
      case 'validation':
        return (
          <div className="space-y-5">
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
              <h3 className="text-sm font-semibold text-white">When Should The System Care If This Is Blank?</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                Validation decides whether a missing value is just informational, blocks record entry, or blocks accounting/revenue posting.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ValidationModeCard
                  title="Informational"
                  description="Show the dimension, but allow records to continue if it is blank."
                  impact="Best for early rollout or pure reporting."
                  selected={state.validationMode === 'optional'}
                  onSelect={() => update({ validationMode: 'optional', failIfUnresolved: false })}
                />
                <ValidationModeCard
                  title="Required On Document Header"
                  description="Require the value on the document header when the dimension applies to that transaction family."
                  impact="Best when the whole transaction should share one value."
                  selected={state.validationMode === 'required_header'}
                  onSelect={() => update({ validationMode: 'required_header', failIfUnresolved: true })}
                />
                <ValidationModeCard
                  title="Required On Document Lines"
                  description="Require the value on lines so different products, services, or charges can carry different values."
                  impact="Best for item, project, subscription, or charge-level reporting."
                  selected={state.validationMode === 'required_line'}
                  onSelect={() => update({ validationMode: 'required_line', failIfUnresolved: true })}
                />
                <ValidationModeCard
                  title="Required Before Posting"
                  description="Let work continue operationally, but block GL/revenue posting until the value is resolved."
                  impact="Best for accounting-critical dimensions."
                  selected={state.validationMode === 'required_posting_only'}
                  onSelect={() => update({ validationMode: 'required_posting_only', failIfUnresolved: true })}
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
                <h3 className="text-sm font-semibold text-white">Override Behavior</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                  Decide whether users can change a sourced value after the sourcing priority has selected it.
                </p>
                <div className="mt-4">
                  <Toggle label="Allow Manual Override" checked={state.allowManualOverride} onChange={(checked) => update({ allowManualOverride: checked })} />
                </div>
              </div>
              <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
                <h3 className="text-sm font-semibold text-white">Unresolved Value Behavior</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                  Decide what happens when every source in the priority list is blank.
                </p>
                <div className="mt-4">
                  <Toggle label="Fail If Unresolved" checked={state.failIfUnresolved} onChange={(checked) => update({ failIfUnresolved: checked })} />
                </div>
              </div>
            </div>
          </div>
        )
      case 'flow':
        return (
          <div className="space-y-5">
            <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Flow policies are still planned, but the setup should capture intent now so admins understand the full lifecycle.
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              <Toggle label="Carry to revenue arrangements and plans" checked={state.carryToRevenue} onChange={(checked) => update({ carryToRevenue: checked })} />
              <Toggle label="Carry to open items and clearing" checked={state.carryToOpenItems} onChange={(checked) => update({ carryToOpenItems: checked })} />
            </div>
            <div className="rounded-xl border p-4 text-sm leading-6" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
              Example flow: Opportunity to Quote to Sales Order to Invoice to Revenue Arrangement to Recognition Journal to GL.
            </div>
          </div>
        )
      case 'posting':
        return (
          <div className="grid gap-3 lg:grid-cols-3">
            <Toggle label="Post to GL" checked={state.postToGl} onChange={(checked) => update({ postToGl: checked })} />
            <Toggle label="Require GL Split" checked={state.requiresGlSplit} onChange={(checked) => update({ requiresGlSplit: checked })} />
            <Toggle label="Allow GL Assignment" checked={state.allowsGlAssignment} onChange={(checked) => update({ allowsGlAssignment: checked })} />
          </div>
        )
      case 'review':
        const setupPolicyIssues = getSetupPolicyIssues(state)
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <ReviewCard title="Definition" lines={[`Label: ${state.label || '-'}`, `Key: ${state.dimensionKey || '-'}`, `Model: ${formatValueModel(state.valueModel)}`, `Selection: ${state.selectionType === 'single_select' ? 'Single select' : 'Multi select'}`]} />
            <ReviewCard title="Values and Fields" lines={[`${parsedValues.length} starter values`, `${parsedFields.length} ready value fields`, parsedFields.length > 0 ? 'Ready fields will be created on the dimension value record.' : 'No value fields ready yet.']} />
            <ReviewCard title="Application" lines={DIMENSION_TRANSACTION_FAMILIES.map((familyKey) => `${formatDimensionTransactionFamilyLabel(familyKey)}: ${state.familyAssignments[familyKey].header ? 'Header' : '-'} / ${state.familyAssignments[familyKey].line ? 'Line' : '-'}`)} />
            <ReviewCard title="Policy Health" lines={setupPolicyIssues.length > 0 ? setupPolicyIssues : ['No obvious setup conflicts detected.']} />
            <ReviewCard title="Posting" lines={[state.postToGl ? 'Posts to GL' : 'Reporting only', state.requiresGlSplit ? 'Requires GL split' : 'GL split not required', state.validationMode.replaceAll('_', ' ')]} />
          </div>
        )
    }
  }

  function updatePurpose(purpose: SetupState['dimensionPurpose']) {
    update({
      dimensionPurpose: purpose,
      postToGl: purpose !== 'operational_reporting',
      requiresGlSplit: purpose === 'financial_reporting' || purpose === 'both',
      allowsGlAssignment: purpose !== 'operational_reporting',
    })
  }
}

function buildCreatePayload(state: SetupState) {
  const applicabilities = DIMENSION_TARGETS.map((targetKey) => buildApplicability(targetKey, state))
  return {
    dimensionKey: state.dimensionKey,
    label: state.label,
    description: state.description,
    dimensionType: 'custom',
    valueSourceType: 'generic',
    valueModel: state.valueModel,
    selectionType: state.selectionType,
    isActive: true,
    allowsHeaderAssignment: Object.values(state.familyAssignments).some((entry) => entry.header),
    allowsLineAssignment: Object.values(state.familyAssignments).some((entry) => entry.line),
    allowsGlAssignment: state.allowsGlAssignment,
    allowsProjectAssignment: state.appliesToProject,
    allowsSubscriptionAssignment: state.appliesToSubscription,
    inheritanceMode: state.allowManualOverride ? 'inherit_with_override' : 'inherit_only',
    overrideMode: state.allowManualOverride ? 'allowed' : 'locked',
    validationMode: state.validationMode,
    postToGl: state.postToGl,
    requiresGlSplit: state.requiresGlSplit,
    applicabilities,
    sourcingPolicies: DIMENSION_TARGETS.map((targetKey) => ({
      targetKey,
      sourcePriority: targetKey === 'gl_line' ? ['source_transaction_line', 'source_transaction_header'] : ['explicit_user_entry'],
      allowHeaderInheritance: targetKey === 'gl_line',
      allowSourceLineInheritance: targetKey === 'gl_line',
      allowProjectInheritance: state.appliesToProject,
      allowSubscriptionInheritance: state.appliesToSubscription,
      allowManualOverride: state.allowManualOverride,
      failIfUnresolved: state.failIfUnresolved,
    })),
    transactionFamilyAssignments: DIMENSION_TRANSACTION_FAMILIES.map((familyKey) => ({
      familyKey,
      allowsHeader: state.familyAssignments[familyKey].header,
      allowsLine: state.familyAssignments[familyKey].line,
    })),
    transactionFamilySourcingPolicies: DIMENSION_TRANSACTION_FAMILIES.map((familyKey) => ({
      familyKey,
      headerSourcePriority: state.familySourcing[familyKey].header,
      lineSourcePriority: state.familySourcing[familyKey].line,
      allowProjectInheritance: state.appliesToProject,
      allowSubscriptionInheritance: state.appliesToSubscription,
      allowManualOverride: state.allowManualOverride,
      failIfUnresolved: state.failIfUnresolved,
    })),
  }
}

function buildApplicability(targetKey: DimensionTargetKey, state: SetupState) {
  const hasHeaderFamily = Object.values(state.familyAssignments).some((entry) => entry.header)
  const hasLineFamily = Object.values(state.familyAssignments).some((entry) => entry.line)
  const isProject = targetKey === 'project_header'
  const isSubscription = targetKey === 'subscription_header'
  const isGl = targetKey === 'gl_line'
  const isTransactionHeader = targetKey === 'transaction_header'
  const isTransactionLine = targetKey === 'transaction_line'
  const isHeaderRequired = state.validationMode === 'required_header' && isTransactionHeader
  const isLineRequired = state.validationMode === 'required_line' && isTransactionLine
  const isPostingRequired = state.validationMode === 'required_posting_only' && isGl

  return {
    targetKey,
    isVisible: isTransactionHeader
      ? hasHeaderFamily
      : isTransactionLine
        ? hasLineFamily
        : isProject
          ? state.appliesToProject
          : isSubscription
            ? state.appliesToSubscription
            : isGl
              ? state.allowsGlAssignment
              : false,
    isRequired: isHeaderRequired || isLineRequired || isPostingRequired,
    isLockedInCustomize: isHeaderRequired || isLineRequired || isPostingRequired,
  }
}

function Field({ label, helper, children, compact = false }: { label: string; helper: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      {children}
      {compact ? null : (
        <span className="block text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
          {helper}
        </span>
      )}
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
      <span className="text-sm text-white">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

function SetupSurfaceCard({
  title,
  description,
  checked,
  status,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  status: 'configurable' | 'planned'
  onChange?: (checked: boolean) => void
}) {
  return (
    <label
      className="block rounded-xl border p-4"
      style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card)' }}
    >
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm font-semibold text-white">{title}</span>
          <span className="mt-2 block text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </span>
        </span>
        <span className="flex flex-col items-end gap-2">
          <span
            className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              borderColor: status === 'configurable' ? 'rgba(96, 165, 250, 0.55)' : 'var(--border-muted)',
              color: status === 'configurable' ? '#bfdbfe' : 'var(--text-secondary)',
              backgroundColor: status === 'configurable' ? 'rgba(37, 99, 235, 0.18)' : 'rgba(148, 163, 184, 0.08)',
            }}
          >
            {status}
          </span>
          {onChange ? (
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
          ) : (
            <span className="text-xs" style={{ color: checked ? '#bbf7d0' : 'var(--text-muted)' }}>
              {checked ? 'Included' : 'Preview'}
            </span>
          )}
        </span>
      </span>
    </label>
  )
}

function ValidationModeCard({
  title,
  description,
  impact,
  selected,
  onSelect,
}: {
  title: string
  description: string
  impact: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-xl border p-4 text-left transition"
      style={{
        borderColor: selected ? 'rgba(96, 165, 250, 0.85)' : 'var(--border-muted)',
        backgroundColor: selected ? 'rgba(37, 99, 235, 0.22)' : 'var(--card)',
      }}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span
          className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            borderColor: selected ? 'rgba(147, 197, 253, 0.8)' : 'var(--border-muted)',
            color: selected ? '#bfdbfe' : 'var(--text-muted)',
          }}
        >
          {selected ? 'selected' : 'choose'}
        </span>
      </span>
      <span className="mt-3 block text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </span>
      <span className="mt-3 block text-xs font-medium leading-5" style={{ color: 'var(--text-muted)' }}>
        {impact}
      </span>
    </button>
  )
}

function SetupSourcingFamilyCard({
  familyKey,
  headerSources,
  lineSources,
  onAddSource,
  onMoveSource,
  onRemoveSource,
}: {
  familyKey: DimensionTransactionFamilyKey
  headerSources: string[]
  lineSources: string[]
  onAddSource: (scope: 'header' | 'line' | 'both', sourceKey: string) => void
  onMoveSource: (scope: 'header' | 'line' | 'both', sourceKey: string, direction: 'up' | 'down') => void
  onRemoveSource: (scope: 'header' | 'line' | 'both', sourceKey: string) => void
}) {
  const [selectedSource, setSelectedSource] = useState('')
  const [selectedScope, setSelectedScope] = useState<'header' | 'line' | 'both'>('both')
  const [showAdvancedSources, setShowAdvancedSources] = useState(false)
  const rows = buildSetupSourcingRows(familyKey, headerSources, lineSources)
  const availableSourceOptions = SOURCE_OPTIONS.filter((option) => showAdvancedSources || !option.advanced)

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{formatDimensionTransactionFamilyLabel(familyKey)}</h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {getDimensionTransactionFamilySourcingDescription(familyKey)}
          </p>
          <p className="mt-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Priority reads top to bottom: the first source with a value wins, then the next row is tried only if it is blank.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-white" style={{ borderColor: 'var(--border-muted)' }}>
            <input
              type="checkbox"
              checked={showAdvancedSources}
              onChange={(event) => setShowAdvancedSources(event.target.checked)}
            />
            Advanced sourcing
          </label>
          <Field label="Source" helper="Add a source to this family." compact>
            <select
              value={selectedSource}
              onChange={(event) => setSelectedSource(event.target.value)}
              className="min-w-[14rem] rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            >
              <option value="" className="bg-slate-900">Select source...</option>
              {availableSourceOptions.map((option) => (
                <option key={option.key} value={option.key} className="bg-slate-900">
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Applies To" helper="Choose header, line, or both." compact>
            <select
              value={selectedScope}
              onChange={(event) => setSelectedScope(event.target.value as 'header' | 'line' | 'both')}
              className="rounded-md border bg-transparent px-3 py-2 text-sm text-white"
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
              if (!selectedSource) return
              onAddSource(selectedScope, selectedSource)
              setSelectedSource('')
            }}
            className="rounded-md px-3 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Add Source
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-muted)' }}>
        <table className="min-w-full">
          <thead style={{ backgroundColor: 'var(--card)' }}>
            <tr>
              {['Priority', 'Source', 'What It Means', 'Applies To', 'Actions'].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={`${row.sourceKey}-${row.scope}`} style={{ borderTop: '1px solid var(--border-muted)' }}>
                  <td className="px-4 py-3 text-sm text-white">{index + 1}</td>
                  <td className="px-4 py-3 text-sm text-white">{formatSourceLabel(row.sourceKey)}</td>
                  <td className="max-w-md px-4 py-3 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>{formatSourceDefinition(row.sourceKey)}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatSourceScope(row.scope)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onMoveSource(row.scope, row.sourceKey, 'up')}
                        disabled={index === 0}
                        className="rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50"
                        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveSource(row.scope, row.sourceKey, 'down')}
                        disabled={index === rows.length - 1}
                        className="rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50"
                        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveSource(row.scope, row.sourceKey)}
                        className="rounded-md border px-2 py-1 text-xs font-medium"
                        style={{ borderColor: 'var(--border-muted)', color: 'var(--danger)' }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No sourcing defaults selected yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
      <span>{label}</span>
      <span className="text-right text-white">{value}</span>
    </div>
  )
}

function SummaryList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {items.map((item) => (
            <li key={item} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {emptyText}
        </p>
      )}
    </div>
  )
}

function ReviewCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--card-elevated)' }}>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {lines.map((line) => (
          <li key={line} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
            {line}
          </li>
        ))}
      </ul>
    </div>
  )
}

function parseStarterValues(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [first, ...rest] = line.split(/\s+-\s+/)
      const name = rest.join(' - ').trim()
      if (name) {
        return { code: first.trim(), name, description: '' }
      }
      return { code: normalizeKey(line).toUpperCase(), name: line, description: '' }
    })
    .filter((entry) => entry.code && entry.name)
}

function getDuplicateValues(values: string[]) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const value of values) {
    const normalized = value.trim().toLowerCase()
    if (!normalized) continue
    if (seen.has(normalized)) duplicates.add(value)
    seen.add(normalized)
  }
  return Array.from(duplicates)
}

function getSetupCreatePreflightIssues(
  state: SetupState,
  parsedValues: Array<{ code: string; name: string; description: string }>,
  parsedFields: SetupValueField[],
) {
  const issues: string[] = []
  const normalizedDimensionKey = normalizeKey(state.dimensionKey)

  if (state.dimensionKey !== normalizedDimensionKey) {
    issues.push(`Dimension key will be saved as ${normalizedDimensionKey || 'blank'}; update the key before creating so it is intentional.`)
  }

  const duplicateValueCodes = getDuplicateValues(parsedValues.map((value) => value.code))
  const duplicateValueNames = getDuplicateValues(parsedValues.map((value) => value.name))
  const duplicateFieldNames = getDuplicateValues(parsedFields.map((field) => normalizeCustomFieldName(field.name)))
  const duplicateFieldLabels = getDuplicateValues(parsedFields.map((field) => field.label))

  if (duplicateValueCodes.length > 0) {
    issues.push(`Starter value codes must be unique: ${duplicateValueCodes.join(', ')}.`)
  }
  if (duplicateValueNames.length > 0) {
    issues.push(`Starter value names are duplicated: ${duplicateValueNames.join(', ')}.`)
  }
  if (duplicateFieldNames.length > 0) {
    issues.push(`Value field names must be unique: ${duplicateFieldNames.join(', ')}.`)
  }
  if (duplicateFieldLabels.length > 0) {
    issues.push(`Value field labels must be unique: ${duplicateFieldLabels.join(', ')}.`)
  }

  return issues
}

function parseListLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function moveSourceInList(values: string[], sourceKey: string, direction: 'up' | 'down') {
  const index = values.indexOf(sourceKey)
  if (index === -1) return values
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= values.length) return values
  const next = [...values]
  ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  return next
}

function buildSetupSourcingRows(familyKey: DimensionTransactionFamilyKey, headerSources: string[], lineSources: string[]) {
  const sourceKeys = Array.from(new Set([...headerSources, ...lineSources]))
  return sourceKeys
    .map((sourceKey) => {
      const headerIndex = headerSources.indexOf(sourceKey)
      const lineIndex = lineSources.indexOf(sourceKey)
      const inHeader = headerIndex >= 0
      const inLine = lineIndex >= 0
      const scope: 'header' | 'line' | 'both' = inHeader && inLine ? 'both' : inHeader ? 'header' : 'line'
      return {
        familyKey,
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

function formatSourceLabel(value: string) {
  const match = SOURCE_OPTIONS.find((option) => option.key === value)
  return match?.label ?? value
}

function formatSourceDefinition(value: string) {
  const match = SOURCE_OPTIONS.find((option) => option.key === value)
  return match?.definition ?? 'Use this source when it can provide a dimension value.'
}

function isSetupValueFieldReady(field: SetupValueField) {
  if (!field.label.trim() || !field.name.trim()) return false
  if (field.type === 'select' && parseFieldOptions(field.optionsText).length === 0) return false
  return true
}

function parseFieldOptions(value: string) {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function formatSetupValueField(field: SetupValueField) {
  const base = field.label.trim() || 'Unnamed field'
  const type = formatCustomFieldType(field.type)
  const required = field.required ? 'required' : 'optional'
  const readiness = isSetupValueFieldReady(field) ? 'ready' : 'incomplete'
  return `${base} - ${type} - ${required} - ${readiness}`
}

function getSetupPolicyIssues(state: SetupState) {
  const issues: string[] = []
  const enabledFamilies = DIMENSION_TRANSACTION_FAMILIES.filter(
    (familyKey) => state.familyAssignments[familyKey].header || state.familyAssignments[familyKey].line,
  )

  if (enabledFamilies.length === 0) {
    issues.push('No transaction family application is enabled.')
  }

  for (const familyKey of enabledFamilies) {
    const assignment = state.familyAssignments[familyKey]
    const sourcing = state.familySourcing[familyKey]
    const familyLabel = formatDimensionTransactionFamilyLabel(familyKey)

    if (assignment.header && sourcing.header.length === 0) {
      issues.push(`${familyLabel} header has no sourcing priority.`)
    }
    if (assignment.line && sourcing.line.length === 0) {
      issues.push(`${familyLabel} line has no sourcing priority.`)
    }
  }

  if (state.postToGl && !state.allowsGlAssignment) {
    issues.push('Posts to GL, but GL assignment is disabled.')
  }
  if (state.requiresGlSplit && !state.postToGl) {
    issues.push('Requires GL split, but Post to GL is disabled.')
  }
  if (state.validationMode !== 'optional' && !state.failIfUnresolved) {
    issues.push('Dimension is required, but unresolved values will not fail.')
  }

  return issues
}

function formatCustomFieldType(value: string) {
  return value
    .split('_')
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(' ')
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function formatValueModel(value: SetupState['valueModel']) {
  switch (value) {
    case 'managed_list_record':
      return 'Managed list record'
    case 'custom_record_backed':
      return 'Custom record-backed'
    default:
      return 'Simple managed list'
  }
}
