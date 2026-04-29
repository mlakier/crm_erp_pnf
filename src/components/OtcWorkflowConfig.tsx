'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import SearchableSelect, { type SearchableSelectOption } from '@/components/SearchableSelect'
import type { TransactionStatusColorTone } from '@/lib/company-preferences-definitions'
import { parseMoneyValue } from '@/lib/money'
import type {
  ApprovalTier,
  OtcApproval,
  OtcStep,
  OtcTransition,
  OtcWorkflowConfig,
} from '@/lib/otc-workflow-store'

function Toggle({ enabled, disabled = false, onChange }: { enabled: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => {
        if (disabled) return
        onChange(!enabled)
      }}
      className="relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{ backgroundColor: enabled ? 'var(--accent-primary)' : 'var(--border-subtle)' }}
    >
      <span
        className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: enabled ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  )
}

function SearchableOptionInput({
  value,
  options,
  placeholder,
  disabled = false,
  onCommit,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  placeholder: string
  disabled?: boolean
  onCommit: (value: string) => void
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number | null>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return options.slice(0, 12)
    return options.filter((option) => option.label.toLowerCase().includes(normalized)).slice(0, 12)
  }, [options, query])

  function scheduleClose() {
    closeTimer.current = window.setTimeout(() => setOpen(false), 120)
  }

  function cancelClose() {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  return (
    <div className="relative" onBlur={scheduleClose}>
      <input
        type="text"
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            const match = filtered[0]
            onCommit(match?.value ?? query.trim())
            setQuery(match?.label ?? query.trim())
            setOpen(false)
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        style={{ borderColor: 'var(--border-muted)' }}
      />
      {open && filtered.length > 0 ? (
        <div
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border shadow-lg"
          style={{ backgroundColor: 'var(--card-elevated)', borderColor: 'var(--border-muted)' }}
          onMouseDown={cancelClose}
        >
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => {
                onCommit(option.value)
                setQuery(option.label)
                setOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ color: 'var(--text-primary)' }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function InlineSearchableSelect({
  value,
  options,
  placeholder,
  disabled = false,
  textClassName = 'text-sm',
  onChange,
}: {
  value: string
  options: SearchableSelectOption[]
  placeholder: string
  disabled?: boolean
  textClassName?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="w-full">
      <SearchableSelect
        selectedValue={value}
        options={options}
        placeholder={placeholder}
        searchPlaceholder={placeholder}
        disabled={disabled}
        textClassName={textClassName}
        onSelect={onChange}
      />
    </div>
  )
}

export default function OtcWorkflowConfig() {
  const [config, setConfig] = useState<OtcWorkflowConfig | null>(null)
  const [savedConfig, setSavedConfig] = useState<OtcWorkflowConfig | null>(null)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [statusOptions, setStatusOptions] = useState<Record<string, Array<{ id: string; value: string; colorTone?: TransactionStatusColorTone }>>>({})
  const [employees, setEmployees] = useState<{ id: string; firstName: string; lastName: string; employeeId: string | null }[]>([])
  const [roles, setRoles] = useState<{ id: string; roleId: string | null; name: string }[]>([])
  const [signatureIntegrations, setSignatureIntegrations] = useState<Array<{ key: string; label: string; provider: string }>>([])
  const [emailIntegrations, setEmailIntegrations] = useState<Array<{ key: string; label: string; provider: string }>>([])
  const [activeStepId, setActiveStepId] = useState<string>('lead')
  const [collapsedTransitions, setCollapsedTransitions] = useState<Record<string, boolean>>({})
  const [collapsedTransitionSteps, setCollapsedTransitionSteps] = useState<Record<string, boolean>>({})
  const nextClientId = useRef(1)

  useEffect(() => {
    fetch('/api/config/otc-workflow')
      .then((response) => response.json())
      .then((body) => {
        setConfig(body.config)
        setSavedConfig(structuredClone(body.config))
        const firstEnabled = Array.isArray(body.config?.steps)
          ? body.config.steps.find((step: { enabled?: boolean }) => step.enabled)
          : null
        if (firstEnabled?.id) {
          setActiveStepId(firstEnabled.id)
        }
      })
      .catch(() => {})
    fetch('/api/config/lists')
      .then((response) => response.json())
      .then((body) => setStatusOptions(body.rowsByKey || {}))
      .catch(() => {})
    fetch('/api/employees')
      .then((response) => response.json())
      .then((data) => setEmployees(data))
      .catch(() => {})
    fetch('/api/roles')
      .then((response) => response.json())
      .then((data) => setRoles(data))
      .catch(() => {})
    fetch('/api/integrations?capability=signature')
      .then((response) => response.json())
      .then((body) => {
        const configured = Array.isArray(body.integrations)
          ? body.integrations.filter((integration: { configured?: boolean }) => integration.configured)
          : []
        setSignatureIntegrations(configured)
      })
      .catch(() => {})
    fetch('/api/integrations?capability=email')
      .then((response) => response.json())
      .then((body) => {
        const configured = Array.isArray(body.integrations)
          ? body.integrations.filter((integration: { configured?: boolean }) => integration.configured)
          : []
        setEmailIntegrations(configured)
      })
      .catch(() => {})
  }, [])

  async function save(next: OtcWorkflowConfig) {
    setSaving(true)
    setToast('')
    try {
      const response = await fetch('/api/config/otc-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: next }),
      })
      const body = await response.json()
      if (response.ok) {
        setConfig(body.config)
        setSavedConfig(structuredClone(body.config))
        setToast('Saved')
        setTimeout(() => setToast(''), 2000)
      }
    } catch {
      // ignore
    }
    setSaving(false)
  }

  const stepToListKey: Record<string, string> = {
    lead: 'LEAD-STATUS',
    opportunity: 'OPP-STAGE',
    quote: 'QUOTE-STATUS',
    'sales-order': 'SO-STATUS',
    invoice: 'INV-STATUS',
    fulfillment: 'FULFILL-STATUS',
    'invoice-receipt': 'INV-RECEIPT-STATUS',
  }

  const recipientSourceOptions = [
    { value: '', label: 'None' },
    { value: 'specific_email', label: 'Specific Email Address' },
    { value: 'lead_email', label: 'Lead Email' },
    { value: 'record_owner_email', label: 'Record Owner Email' },
    { value: 'customer_primary_contact', label: 'Customer Primary Contact' },
    { value: 'customer_email', label: 'Customer Email' },
    { value: 'billing_contact', label: 'Billing Contact' },
    { value: 'record_owner', label: 'Record Owner' },
  ]

  const integrationOptions = [
    { value: '', label: 'None' },
    ...signatureIntegrations.map((integration) => ({
      value: integration.key,
      label: `${integration.provider} · ${integration.label}`,
    })),
  ]

  void integrationOptions

  const externalEventOptions = [
    { value: '', label: 'None' },
    { value: 'envelope_completed', label: 'Envelope Completed' },
    { value: 'envelope_declined', label: 'Envelope Declined' },
    { value: 'envelope_voided', label: 'Envelope Voided' },
    { value: 'envelope_expired', label: 'Envelope Expired' },
  ]

  const leadAutoRuleFieldOptions = [
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'company', label: 'Company' },
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'title', label: 'Title' },
    { value: 'website', label: 'Website' },
    { value: 'industry', label: 'Industry' },
    { value: 'address', label: 'Address' },
    { value: 'source', label: 'Source' },
    { value: 'rating', label: 'Rating' },
  ]

  function getIntegrationOptions(actionType: OtcTransition['actionType']) {
    const source = actionType === 'send_approval_email' ? emailIntegrations : signatureIntegrations
    return [
      { value: '', label: 'None' },
      ...source.map((integration) => ({
        value: integration.key,
        label: `${integration.provider} - ${integration.label}`,
      })),
    ]
  }

  const employeeApproverOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.id,
        label: `${employee.lastName}, ${employee.firstName}${employee.employeeId ? ` (${employee.employeeId})` : ''}`,
      })),
    [employees],
  )

  const roleApproverOptions = useMemo(
    () =>
      roles.map((role) => ({
        value: role.id,
        label: `${role.name}${role.roleId ? ` (${role.roleId})` : ''}`,
      })),
    [roles],
  )

  function getApproverOptions(type: ApprovalTier['approverType']) {
    return type === 'employee' ? employeeApproverOptions : roleApproverOptions
  }

  function getApproverDisplayValue(type: ApprovalTier['approverType'], storedValue: string) {
    const match = getApproverOptions(type).find((option) => option.value === storedValue)
    return match?.label ?? storedValue
  }

  const stepLabelById = useMemo(() => {
    const entries = (config?.steps ?? []).map((step) => [step.id, step.label])
    return Object.fromEntries(entries)
  }, [config?.steps])

  const enabledSteps = useMemo(
    () => (config?.steps ?? []).filter((step) => step.enabled).sort((left, right) => left.order - right.order),
    [config?.steps],
  )

  const visibleStepId = useMemo(() => {
    if (enabledSteps.some((step) => step.id === activeStepId)) return activeStepId
    return enabledSteps[0]?.id ?? config?.steps[0]?.id ?? 'lead'
  }, [activeStepId, config?.steps, enabledSteps])

  const approvalByStep = useMemo(() => {
    const grouped = new Map<string, OtcApproval>()
    for (const approval of config?.approvals ?? []) {
      if (!grouped.has(approval.step)) {
        grouped.set(approval.step, approval)
      }
    }
    return grouped
  }, [config?.approvals])

  const transitionsByStep = useMemo(() => {
    const grouped = new Map<string, OtcTransition[]>()
    for (const transition of config?.transitions ?? []) {
      const current = grouped.get(transition.step) ?? []
      current.push(transition)
      grouped.set(transition.step, current)
    }
    return grouped
  }, [config?.transitions])

  if (!config) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
  }

  const workflowConfig = config

  function replaceConfig(next: OtcWorkflowConfig) {
    setConfig(next)
  }

  function getToneChipStyle(colorTone?: TransactionStatusColorTone) {
    switch (colorTone) {
      case 'accent':
        return { backgroundColor: 'rgba(59,130,246,0.18)', borderColor: 'rgba(96,165,250,0.35)', color: '#93c5fd' }
      case 'green':
        return { backgroundColor: 'rgba(34,197,94,0.18)', borderColor: 'rgba(74,222,128,0.35)', color: '#86efac' }
      case 'yellow':
        return { backgroundColor: 'rgba(234,179,8,0.16)', borderColor: 'rgba(250,204,21,0.35)', color: '#fde047' }
      case 'red':
        return { backgroundColor: 'rgba(239,68,68,0.16)', borderColor: 'rgba(248,113,113,0.35)', color: '#fca5a5' }
      case 'purple':
        return { backgroundColor: 'rgba(168,85,247,0.16)', borderColor: 'rgba(196,181,253,0.35)', color: '#d8b4fe' }
      case 'teal':
        return { backgroundColor: 'rgba(20,184,166,0.16)', borderColor: 'rgba(94,234,212,0.35)', color: '#99f6e4' }
      case 'orange':
        return { backgroundColor: 'rgba(249,115,22,0.16)', borderColor: 'rgba(251,146,60,0.35)', color: '#fdba74' }
      case 'pink':
        return { backgroundColor: 'rgba(236,72,153,0.16)', borderColor: 'rgba(244,114,182,0.35)', color: '#f9a8d4' }
      case 'gray':
      case 'default':
      default:
        return { backgroundColor: 'rgba(148,163,184,0.14)', borderColor: 'rgba(148,163,184,0.28)', color: 'var(--text-muted)' }
    }
  }

  function toggleTransitionCollapsed(id: string) {
    setCollapsedTransitions((current) => ({
      ...current,
      [id]: !current[id],
    }))
  }

  function toggleTransitionStepCollapsed(id: string) {
    setCollapsedTransitionSteps((current) => ({
      ...current,
      [id]: !current[id],
    }))
  }

  function setAllTransitionsCollapsed(stepId: string, collapsed: boolean) {
    const transitionIds = workflowConfig.transitions
      .filter((transition) => transition.step === stepId)
      .map((transition) => transition.id)
    setCollapsedTransitions((current) => {
      const next = { ...current }
      for (const id of transitionIds) {
        next[id] = collapsed
      }
      return next
    })
  }

  function createClientId(prefix: string) {
    const value = nextClientId.current
    nextClientId.current += 1
    return `${prefix}-${value}`
  }

  function updateStep(id: string, patch: Partial<OtcStep>) {
    replaceConfig({
      ...workflowConfig,
      steps: workflowConfig.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    })
  }

  function updateTransition(id: string, patch: Partial<OtcTransition>) {
    replaceConfig({
      ...workflowConfig,
      transitions: workflowConfig.transitions.map((transition) => (
        transition.id === id ? { ...transition, ...patch } : transition
      )),
    })
  }

  function updateTransitionCondition(
    transitionId: string,
    conditionIndex: number,
    patch: Partial<NonNullable<OtcTransition['conditions']>[number]>,
  ) {
    replaceConfig({
      ...workflowConfig,
      transitions: workflowConfig.transitions.map((transition) => {
        if (transition.id !== transitionId) return transition
        const conditions = transition.conditions ?? []
        return {
          ...transition,
          conditions: conditions.map((condition, index) => (
            index === conditionIndex ? { ...condition, ...patch } : condition
          )),
        }
      }),
    })
  }

  function addTransitionCondition(transitionId: string) {
    replaceConfig({
      ...workflowConfig,
      transitions: workflowConfig.transitions.map((transition) => (
        transition.id === transitionId
          ? {
              ...transition,
              conditions: [
                ...(transition.conditions ?? []),
                { field: 'email', operator: 'not_empty', value: '', joinOperator: 'and', openParen: false, closeParen: false },
              ],
            }
          : transition
      )),
    })
  }

  function removeTransitionCondition(transitionId: string, conditionIndex: number) {
    replaceConfig({
      ...workflowConfig,
      transitions: workflowConfig.transitions.map((transition) => (
        transition.id === transitionId
          ? {
              ...transition,
              conditions: (transition.conditions ?? []).filter((_, index) => index !== conditionIndex),
            }
          : transition
      )),
    })
  }

  function addTransition(stepId: string) {
    const options = statusOptions[stepToListKey[stepId]] ?? []
    const first = options[0]?.value ?? ''
    replaceConfig({
      ...workflowConfig,
      transitions: [
        ...workflowConfig.transitions,
        {
          id: createClientId(`${stepId}-transition`),
          label: 'Custom Transition',
          step: stepId,
          enabled: true,
          systemProvided: false,
          fromStatus: first,
          toStatus: first,
          actionLabel: 'New Action',
          triggerType: 'manual_action',
          actionType: 'status_change',
          conditions: [],
          integrationKey: '',
          templateKey: '',
          recipientSource: '',
          recipientAddress: '',
          externalEvent: '',
          successStatus: '',
          declineStatus: '',
          voidStatus: '',
          lockRecordWhilePending: false,
          autoCreateNextRecord: false,
          autoCreateToStep: '',
          autoCreateResultStatus: '',
        },
      ],
    })
  }

  function removeTransition(id: string) {
    replaceConfig({
      ...workflowConfig,
      transitions: workflowConfig.transitions.filter((transition) => transition.id !== id),
    })
  }

  function updateTier(approvalId: string, tierIndex: number, patch: Partial<ApprovalTier>) {
    replaceConfig({
      ...workflowConfig,
      approvals: workflowConfig.approvals.map((approval) => {
        if (approval.id !== approvalId) return approval
        return {
          ...approval,
          tiers: approval.tiers.map((tier, index) => (index === tierIndex ? { ...tier, ...patch } : tier)),
        }
      }),
    })
  }

  function addTier(approvalId: string) {
    replaceConfig({
      ...workflowConfig,
      approvals: workflowConfig.approvals.map((approval) => {
        if (approval.id !== approvalId) return approval
        const maxLevel = approval.tiers.length > 0 ? Math.max(...approval.tiers.map((tier) => tier.level)) : 0
        return {
          ...approval,
          tiers: [
            ...approval.tiers,
            { level: maxLevel + 1, operator: '>=', value: 0, approverType: 'role', approverValue: 'manager' },
          ],
        }
      }),
    })
  }

  function removeTier(approvalId: string, tierIndex: number) {
    replaceConfig({
      ...workflowConfig,
      approvals: workflowConfig.approvals.map((approval) => {
        if (approval.id !== approvalId) return approval
        return {
          ...approval,
          tiers: approval.tiers.filter((_, index) => index !== tierIndex),
        }
      }),
    })
  }

  function addApproval(stepId: string) {
    if (workflowConfig.approvals.some((approval) => approval.step === stepId)) return
    const stepLabel = stepLabelById[stepId] ?? stepId
    replaceConfig({
      ...workflowConfig,
      approvals: [
        ...workflowConfig.approvals,
        {
          id: createClientId(`${stepId}-approval`),
          label: `${stepLabel} Approval`,
          step: stepId,
          enabled: true,
          tiers: [
            {
              level: 1,
              operator: '>=',
              value: 0,
              approverType: 'role',
              approverValue: 'manager',
            },
          ],
        },
      ],
    })
  }

  function resetStepRules(stepId: string) {
    if (!savedConfig) return
    const baseline = savedConfig
    replaceConfig({
      ...workflowConfig,
      transitions: [
        ...workflowConfig.transitions.filter((transition) => transition.step !== stepId),
        ...baseline.transitions.filter((transition) => transition.step === stepId),
      ],
      approvals: [
        ...workflowConfig.approvals.filter((approval) => approval.step !== stepId),
        ...baseline.approvals.filter((approval) => approval.step === stepId),
      ],
    })
    setCollapsedTransitions((current) => {
      const next = { ...current }
      for (const key of Object.keys(next)) {
        if ((baseline.transitions.some((transition) => transition.id === key && transition.step === stepId)) || (workflowConfig.transitions.some((transition) => transition.id === key && transition.step === stepId))) {
          delete next[key]
        }
      }
      return next
    })
  }

  function isStepDirty(stepId: string) {
    if (!savedConfig) return false
    const current = {
      transitions: workflowConfig.transitions.filter((transition) => transition.step === stepId),
      approvals: workflowConfig.approvals.filter((approval) => approval.step === stepId),
    }
    const saved = {
      transitions: savedConfig.transitions.filter((transition) => transition.step === stepId),
      approvals: savedConfig.approvals.filter((approval) => approval.step === stepId),
    }
    return JSON.stringify(current) !== JSON.stringify(saved)
  }

  function cancelStepEditing(stepId: string) {
    if (!savedConfig) return
    setConfig({
      ...workflowConfig,
      transitions: [
        ...workflowConfig.transitions.filter((transition) => transition.step !== stepId),
        ...savedConfig.transitions.filter((transition) => transition.step === stepId),
      ],
      approvals: [
        ...workflowConfig.approvals.filter((approval) => approval.step !== stepId),
        ...savedConfig.approvals.filter((approval) => approval.step === stepId),
      ],
    })
    setEditingStepId(null)
    setToast('Canceled')
    setTimeout(() => setToast(''), 1500)
  }

  return (
    <div className="workflow-editor space-y-8">
      <style jsx>{`
        .workflow-editor :global(fieldset[disabled] input),
        .workflow-editor :global(fieldset[disabled] select),
        .workflow-editor :global(fieldset[disabled] textarea) {
          border-color: transparent !important;
          background: transparent !important;
          box-shadow: none !important;
          padding-left: 0.25rem;
          padding-right: 0.25rem;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
        }

        .workflow-editor :global(fieldset[disabled] select) {
          background-image: none !important;
        }
      `}</style>
      {toast ? (
        <div className="fixed right-4 top-4 z-50 rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: 'var(--success)' }}>
          {toast}
        </div>
      ) : null}
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Workflow Steps
        </h2>
        <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Toggle which stages are active in the Lead-to-Cash flow.
        </p>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          {enabledSteps.map((step, index) => (
            <span key={step.id} className="flex items-center gap-2">
              <span
                className="rounded-md px-3 py-1.5 text-xs font-medium"
                style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
              >
                {step.label}
              </span>
              {index < enabledSteps.length - 1 ? (
                <span style={{ color: 'var(--text-muted)' }}>{'->'}</span>
              ) : null}
            </span>
          ))}
        </div>

        <div className="rounded-lg border" style={{ borderColor: 'var(--border-muted)' }}>
          {workflowConfig.steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center justify-between px-4 py-3"
              style={index < workflowConfig.steps.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}
            >
              <div>
                <span className="text-sm font-medium text-white">{step.label}</span>
                <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{step.href}</span>
              </div>
              <Toggle enabled={step.enabled} onChange={(value) => updateStep(step.id, { enabled: value })} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Workflow Rules
        </h2>
        <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Configure all workflow behavior for the selected step in one place: status actions, next-record creation, and approvals.
        </p>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
          Status Actions
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {enabledSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStepId(step.id)}
              className="rounded-md px-3 py-1.5 text-xs font-medium"
              style={
                visibleStepId === step.id
                  ? { backgroundColor: 'var(--accent-primary)', color: '#fff' }
                  : { backgroundColor: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)' }
              }
            >
              {step.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {workflowConfig.steps
            .filter((step) => step.id === visibleStepId)
            .map((step) => {
            const stepStatusOptions = statusOptions[stepToListKey[step.id]] ?? []
            const transitions = transitionsByStep.get(step.id) ?? []
            const stepEditing = editingStepId === step.id
            const stepControlsDisabled = !stepEditing || saving
            const stepDirty = isStepDirty(step.id)
            const allTransitionsCollapsed = transitions.length > 0 && transitions.every((transition) => collapsedTransitions[transition.id])
            return (
              <div key={step.id} className="rounded-lg border" style={{ borderColor: 'var(--border-muted)' }}>
                <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border-muted)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTransitionStepCollapsed(step.id)}
                        className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded border text-xs"
                        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
                        aria-label={collapsedTransitionSteps[step.id] ? `Expand ${step.label} transitions` : `Collapse ${step.label} transitions`}
                        aria-expanded={!collapsedTransitionSteps[step.id]}
                      >
                        {collapsedTransitionSteps[step.id] ? '+' : '-'}
                      </button>
                      <div>
                        <div className="text-sm font-medium text-white">{step.label}</div>
                        <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          Buttons and status progression for {step.label.toLowerCase()} records.
                        </div>
                        {stepStatusOptions.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {stepStatusOptions.map((option) => (
                              <span
                                key={option.id}
                                className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                                style={getToneChipStyle(option.colorTone)}
                              >
                                {option.value}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {stepDirty ? (
                        <span className="text-xs font-medium" style={{ color: '#fcd34d' }}>
                          Unsaved changes
                        </span>
                      ) : null}
                      {!stepEditing ? (
                        <button
                          type="button"
                          onClick={() => setEditingStepId(step.id)}
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                          style={{ backgroundColor: 'var(--accent-primary)' }}
                        >
                          Edit
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => cancelStepEditing(step.id)}
                            className="rounded-md border px-3 py-1.5 text-xs font-medium"
                            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!stepDirty) return
                              void save(workflowConfig)
                            }}
                            disabled={!stepDirty || saving}
                            className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ backgroundColor: 'var(--accent-primary)' }}
                          >
                            Save
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => resetStepRules(step.id)}
                        disabled={stepControlsDisabled}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllTransitionsCollapsed(step.id, !allTransitionsCollapsed)}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium"
                        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                      >
                        {allTransitionsCollapsed ? 'Expand All' : 'Collapse All'}
                      </button>
                      <button
                        type="button"
                        onClick={() => addTransition(step.id)}
                        disabled={stepControlsDisabled}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ backgroundColor: 'var(--accent-primary)' }}
                      >
                        + Add Transition
                      </button>
                    </div>
                  </div>
                </div>
                {collapsedTransitionSteps[step.id] ? (
                  <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {transitions.length} transition{transitions.length === 1 ? '' : 's'}
                  </div>
                ) : (
                <div className="space-y-3 px-4 py-4">
                  {transitions.map((transition) => (
                    <div key={transition.id} className="space-y-3 rounded-md border px-4 py-4" style={{ borderColor: 'var(--border-muted)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleTransitionCollapsed(transition.id)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded border text-xs"
                            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
                            aria-label={collapsedTransitions[transition.id] ? 'Expand transition' : 'Collapse transition'}
                            aria-expanded={!collapsedTransitions[transition.id]}
                          >
                            {collapsedTransitions[transition.id] ? '+' : '-'}
                          </button>
                          <div className="text-sm font-medium text-white">{transition.label}</div>
                          {transition.systemProvided !== false ? (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: 'rgba(148,163,184,0.14)', color: 'var(--text-muted)' }}>
                              System
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          {transition.systemProvided === false ? (
                            <button
                              type="button"
                              onClick={() => removeTransition(transition.id)}
                              disabled={stepControlsDisabled}
                              className="rounded-md border px-2.5 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                              style={{ borderColor: 'rgba(239,68,68,0.35)', color: '#fca5a5' }}
                            >
                              Remove
                            </button>
                          ) : null}
                          <Toggle enabled={transition.enabled} disabled={stepControlsDisabled || transition.triggerType === 'approval_workflow'} onChange={(value) => updateTransition(transition.id, { enabled: value })} />
                        </div>
                      </div>
                      {collapsedTransitions[transition.id] ? (
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {transition.fromStatus || 'No from status'} {'->'} {transition.toStatus || 'No to status'}
                          {transition.actionLabel ? ` · ${transition.actionLabel}` : ''}
                        </div>
                      ) : (
                        <>
                      <fieldset disabled={stepControlsDisabled} className="space-y-3 border-0 p-0 m-0 min-w-0">
                      <div className={`grid gap-3 ${transition.triggerType === 'auto_rule' ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
                        <div>
                          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                            Rule Label
                          </label>
                          <input
                            type="text"
                            value={transition.label}
                            onChange={(event) => updateTransition(transition.id, { label: event.target.value })}
                            className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm text-white"
                            style={{ borderColor: 'var(--border-muted)' }}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                            From Status
                          </label>
                          <InlineSearchableSelect
                            value={transition.fromStatus}
                            onChange={(value) => updateTransition(transition.id, { fromStatus: value })}
                            options={[
                              { value: '', label: '-- select --' },
                              ...stepStatusOptions.map((option) => ({ value: option.value, label: option.value })),
                            ]}
                            placeholder="Select from status"
                            disabled={stepControlsDisabled}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                            To Status
                          </label>
                          <InlineSearchableSelect
                            value={transition.toStatus}
                            onChange={(value) => updateTransition(transition.id, { toStatus: value })}
                            options={[
                              { value: '', label: '-- select --' },
                              ...stepStatusOptions.map((option) => ({ value: option.value, label: option.value })),
                            ]}
                            placeholder="Select to status"
                            disabled={stepControlsDisabled}
                          />
                        </div>
                      </div>
                      <div className={`grid gap-3 ${transition.triggerType === 'approval_workflow' ? 'sm:grid-cols-1' : transition.actionType === 'send_for_signature' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                        <div>
                          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                            Trigger Type
                          </label>
                          <InlineSearchableSelect
                            value={transition.triggerType}
                            onChange={(value) =>
                              updateTransition(transition.id, {
                                triggerType: value as OtcTransition['triggerType'],
                                ...(value === 'approval_workflow'
                                  ? {
                                      actionType: 'status_change' as const,
                                      autoCreateNextRecord: false,
                                      autoCreateToStep: '',
                                      autoCreateResultStatus: '',
                                    }
                                  : value === 'auto_create'
                                    ? {
                                        autoCreateNextRecord: true,
                                      }
                                    : transition.triggerType === 'auto_create'
                                      ? {
                                          autoCreateNextRecord: false,
                                          autoCreateToStep: '',
                                          autoCreateResultStatus: '',
                                        }
                                      : {}),
                              })
                            }
                            options={[
                              { value: 'manual_action', label: 'Manual Button' },
                              { value: 'approval_workflow', label: 'Approval Workflow' },
                              { value: 'auto_create', label: 'Auto Create' },
                              { value: 'external_event', label: 'External Event' },
                              ...(step.id === 'lead' ? [{ value: 'auto_rule', label: 'Auto Rule' }] : []),
                            ]}
                            placeholder="Select trigger type"
                            disabled={stepControlsDisabled}
                          />
                        </div>
                        {transition.triggerType === 'approval_workflow' || transition.triggerType === 'auto_create' ? null : (
                          <>
                            <div>
                              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Action Type
                              </label>
                              <InlineSearchableSelect
                                value={transition.actionType}
                                onChange={(value) => {
                                  const nextActionType = value as OtcTransition['actionType']
                                  const actionLabel =
                                    nextActionType === 'send_for_signature'
                                      ? 'Send for Signature'
                                      : nextActionType === 'send_approval_email'
                                        ? 'Send Approval Email'
                                        : transition.actionLabel
                                  updateTransition(transition.id, {
                                    actionType: nextActionType,
                                    actionLabel,
                                    integrationKey:
                                      nextActionType === 'send_approval_email'
                                        ? (transition.integrationKey || emailIntegrations[0]?.key || '')
                                        : transition.integrationKey,
                                  })
                                }}
                                options={[
                                  { value: 'status_change', label: 'Status Change' },
                                  { value: 'send_for_signature', label: 'Send for Signature' },
                                  { value: 'send_approval_email', label: 'Send Approval Email' },
                                ]}
                                placeholder="Select action type"
                                disabled={stepControlsDisabled}
                              />
                            </div>
                            {transition.actionType === 'send_for_signature' ? (
                              <div>
                                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                  Integration
                                </label>
                                <InlineSearchableSelect
                                  value={transition.integrationKey}
                                  onChange={(value) => updateTransition(transition.id, { integrationKey: value })}
                                  options={getIntegrationOptions(transition.actionType)}
                                  placeholder="Select integration"
                                  disabled={stepControlsDisabled}
                                />
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                      {transition.triggerType === 'manual_action' ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                              Action Label
                            </label>
                            <input
                              type="text"
                              value={transition.actionLabel}
                              onChange={(event) => updateTransition(transition.id, { actionLabel: event.target.value })}
                              className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm text-white"
                              style={{ borderColor: 'var(--border-muted)' }}
                            />
                          </div>
                        </div>
                      ) : null}
                      {transition.triggerType === 'approval_workflow' ? (
                        <div className="space-y-3 rounded-md border px-3 py-3" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                            Approval Workflow
                          </div>
                          {approvalByStep.get(step.id) ? (
                            (() => {
                              const approval = approvalByStep.get(step.id)!
                              return (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
                                    <div>
                                      <div className="text-sm font-medium text-white">{approval.label}</div>
                                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        Configure the approval path used before this rule completes.
                                      </div>
                                    </div>
                                  </div>
                                  {(
                                    <>
                                      <div className="space-y-2">
                                        <div className="grid grid-cols-[60px_80px_1fr_100px_1fr_32px] gap-2">
                                          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Level</span>
                                          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Operator</span>
                                          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Amount</span>
                                          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Approver</span>
                                          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>&nbsp;</span>
                                          <span />
                                        </div>
                                        {approval.tiers.map((tier, tierIndex) => (
                                          <div key={`${approval.id}-${tierIndex}`} className="grid grid-cols-[60px_80px_1fr_100px_1fr_32px] items-center gap-2">
                                            <input
                                              type="number"
                                              min={1}
                                              value={tier.level}
                                              onChange={(event) => updateTier(approval.id, tierIndex, { level: Number(event.target.value) || 1 })}
                                              className="w-full rounded-md border bg-transparent px-2 py-1.5 text-center text-sm text-white"
                                              style={{ borderColor: 'var(--border-muted)' }}
                                            />
                                            <InlineSearchableSelect
                                              value={tier.operator}
                                              onChange={(value) => updateTier(approval.id, tierIndex, { operator: value })}
                                              options={[
                                                { value: '>=', label: '>=' },
                                                { value: '>', label: '>' },
                                                { value: '=', label: '=' },
                                                { value: '<', label: '<' },
                                                { value: '<=', label: '<=' },
                                              ]}
                                              placeholder="Select operator"
                                              disabled={stepControlsDisabled}
                                            />
                                            <input
                                              type="number"
                                              value={tier.value}
                                              onChange={(event) => updateTier(approval.id, tierIndex, { value: parseMoneyValue(event.target.value) })}
                                              className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm text-white"
                                              style={{ borderColor: 'var(--border-muted)' }}
                                            />
                                            <InlineSearchableSelect
                                              value={tier.approverType}
                                              onChange={(value) => updateTier(approval.id, tierIndex, {
                                                approverType: value as 'role' | 'employee',
                                                approverValue: value === 'role' ? 'manager' : '',
                                              })}
                                              options={[
                                                { value: 'role', label: 'Role' },
                                                { value: 'employee', label: 'Employee' },
                                              ]}
                                              placeholder="Select approver"
                                              disabled={stepControlsDisabled}
                                            />
                                            <SearchableOptionInput
                                              value={getApproverDisplayValue(tier.approverType, tier.approverValue)}
                                              options={getApproverOptions(tier.approverType)}
                                              placeholder={tier.approverType === 'employee' ? 'Search employee' : 'Search role'}
                                              onCommit={(value) => updateTier(approval.id, tierIndex, { approverValue: value })}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => removeTier(approval.id, tierIndex)}
                                              className="flex h-6 w-6 items-center justify-center rounded text-xs hover:bg-red-900/30"
                                              style={{ color: '#ef4444' }}
                                              title="Remove row"
                                            >
                                              x
                                            </button>
                                          </div>
                                        ))}
                                        <button
                                          type="button"
                                          onClick={() => addTier(approval.id)}
                                          className="mt-1 flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-80"
                                          style={{ color: 'var(--accent-primary)', border: '1px dashed var(--border-muted)' }}
                                        >
                                          + Add Approval Row
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )
                            })()
                          ) : (
                            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs" style={{ borderColor: 'rgba(245,158,11,0.35)', backgroundColor: 'rgba(245,158,11,0.08)', color: '#fcd34d' }}>
                              <span>No approval workflow is configured for this step yet.</span>
                              <button
                                type="button"
                                onClick={() => addApproval(step.id)}
                                className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                                style={{ backgroundColor: 'var(--accent-primary)' }}
                              >
                                Create Approval Workflow
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null}
                      {transition.triggerType === 'auto_create' ? (
                        <div className="space-y-3 rounded-md border px-3 py-3" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                            Auto Create Next Record
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Auto Create Step
                              </label>
                              <InlineSearchableSelect
                                value={transition.autoCreateToStep ?? ''}
                                onChange={(value) => updateTransition(transition.id, { autoCreateToStep: value, autoCreateResultStatus: '' })}
                                options={[
                                  { value: '', label: '-- select --' },
                                  ...workflowConfig.steps
                                    .filter((candidate) => candidate.order > step.order)
                                    .map((candidate) => ({ value: candidate.id, label: candidate.label })),
                                ]}
                                placeholder="Select step"
                                disabled={stepControlsDisabled}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                New Record Status
                              </label>
                              <InlineSearchableSelect
                                value={transition.autoCreateResultStatus ?? ''}
                                onChange={(value) => updateTransition(transition.id, { autoCreateResultStatus: value })}
                                options={[
                                  { value: '', label: '-- select --' },
                                  ...(transition.autoCreateToStep
                                    ? (statusOptions[stepToListKey[transition.autoCreateToStep]] ?? []).map((option) => ({ value: option.value, label: option.value }))
                                    : []),
                                ]}
                                placeholder="Select status"
                                disabled={stepControlsDisabled}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {step.id === 'lead' && transition.triggerType === 'auto_rule' ? (
                        <div className="space-y-3 rounded-md border px-3 py-3" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                                Auto Rule Conditions
                              </div>
                              <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                Apply this transition automatically when the lead matches these field conditions.
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => addTransitionCondition(transition.id)}
                              className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                              style={{ backgroundColor: 'var(--accent-primary)' }}
                            >
                              + Add Condition
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(transition.conditions ?? []).length === 0 ? (
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                No conditions yet. Add at least one condition for this auto rule.
                              </div>
                            ) : (
                              (transition.conditions ?? []).map((condition, conditionIndex) => (
                                <div key={`${transition.id}-condition-${conditionIndex}`} className="grid gap-2 sm:grid-cols-[72px_88px_1.2fr_1fr_1.1fr_72px_56px_auto]">
                                  <button
                                    type="button"
                                    onClick={() => updateTransitionCondition(transition.id, conditionIndex, { openParen: !condition.openParen })}
                                    className="rounded-md border px-2 py-1 text-xs font-medium"
                                    style={{ borderColor: condition.openParen ? 'var(--accent-primary)' : 'var(--border-muted)', color: condition.openParen ? '#fff' : 'var(--text-muted)', backgroundColor: condition.openParen ? 'var(--accent-primary)' : 'transparent' }}
                                  >
                                    (
                                  </button>
                                  <InlineSearchableSelect
                                    value={conditionIndex === 0 ? 'and' : (condition.joinOperator ?? 'and')}
                                    onChange={(value) => updateTransitionCondition(transition.id, conditionIndex, { joinOperator: value as 'and' | 'or' })}
                                    disabled={conditionIndex === 0}
                                    options={[
                                      { value: 'and', label: 'AND' },
                                      { value: 'or', label: 'OR' },
                                    ]}
                                    placeholder="Select join"
                                  />
                                  <InlineSearchableSelect
                                    value={condition.field}
                                    onChange={(value) => updateTransitionCondition(transition.id, conditionIndex, { field: value })}
                                    options={leadAutoRuleFieldOptions}
                                    placeholder="Select field"
                                  />
                                  <InlineSearchableSelect
                                    value={condition.operator}
                                    onChange={(value) => updateTransitionCondition(transition.id, conditionIndex, { operator: value as 'not_empty' | 'equals' })}
                                    options={[
                                      { value: 'not_empty', label: 'is not empty' },
                                      { value: 'equals', label: 'equals' },
                                    ]}
                                    placeholder="Select operator"
                                  />
                                  <input
                                    type="text"
                                    value={condition.value}
                                    onChange={(event) => updateTransitionCondition(transition.id, conditionIndex, { value: event.target.value })}
                                    disabled={condition.operator === 'not_empty'}
                                    placeholder={condition.operator === 'equals' ? 'Value' : 'Not used'}
                                    className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm text-white disabled:opacity-50"
                                    style={{ borderColor: 'var(--border-muted)' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateTransitionCondition(transition.id, conditionIndex, { closeParen: !condition.closeParen })}
                                    className="rounded-md border px-2 py-1 text-xs font-medium"
                                    style={{ borderColor: condition.closeParen ? 'var(--accent-primary)' : 'var(--border-muted)', color: condition.closeParen ? '#fff' : 'var(--text-muted)', backgroundColor: condition.closeParen ? 'var(--accent-primary)' : 'transparent' }}
                                  >
                                    )
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeTransitionCondition(transition.id, conditionIndex)}
                                    className="rounded-md border px-2.5 py-1 text-xs font-medium"
                                    style={{ borderColor: 'rgba(239,68,68,0.35)', color: '#fca5a5' }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ) : null}
                      {transition.actionType === 'send_for_signature' || transition.actionType === 'send_approval_email' || transition.triggerType === 'external_event' ? (
                        <div className="space-y-3 rounded-md border px-3 py-3" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                            {transition.actionType === 'send_approval_email' ? 'Approval Email Setup' : 'External Setup'}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                {transition.actionType === 'send_approval_email' ? 'Template / Subject Key' : 'Template'}
                              </label>
                              <input
                                type="text"
                                value={transition.templateKey}
                                onChange={(event) => updateTransition(transition.id, { templateKey: event.target.value })}
                                placeholder="sales-order-signature"
                                className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm text-white"
                                style={{ borderColor: 'var(--border-muted)' }}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Recipient Source
                              </label>
                              <InlineSearchableSelect
                                value={transition.recipientSource}
                                onChange={(value) => updateTransition(transition.id, { recipientSource: value })}
                                options={recipientSourceOptions}
                                placeholder="Select recipient source"
                                disabled={stepControlsDisabled}
                              />
                            </div>
                            {transition.triggerType === 'external_event' ? (
                              <div>
                                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                  External Event
                                </label>
                                <InlineSearchableSelect
                                  value={transition.externalEvent}
                                  onChange={(value) => updateTransition(transition.id, { externalEvent: value })}
                                  options={externalEventOptions}
                                  placeholder="Select external event"
                                  disabled={stepControlsDisabled}
                                />
                              </div>
                            ) : (
                              <div>
                                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                  Recipient Address
                                </label>
                                <input
                                  type="email"
                                  value={transition.recipientAddress}
                                  onChange={(event) => updateTransition(transition.id, { recipientAddress: event.target.value })}
                                  disabled={transition.recipientSource !== 'specific_email'}
                                  placeholder={transition.recipientSource === 'specific_email' ? 'approver@example.com' : 'Used only for Specific Email Address'}
                                  className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm text-white disabled:opacity-50"
                                  style={{ borderColor: 'var(--border-muted)' }}
                                />
                              </div>
                            )}
                          </div>
                          {transition.actionType === 'send_for_signature' && signatureIntegrations.length === 0 ? (
                            <div className="rounded-md border px-3 py-2 text-xs" style={{ borderColor: 'rgba(245,158,11,0.35)', backgroundColor: 'rgba(245,158,11,0.08)', color: '#fcd34d' }}>
                              No configured signature integrations were found in Manage Integrations. Add and configure DocuSign first, then it will appear here as an option.
                            </div>
                          ) : null}
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                On Success
                              </label>
                              <InlineSearchableSelect
                                value={transition.successStatus}
                                onChange={(value) => updateTransition(transition.id, { successStatus: value })}
                                options={[
                                  { value: '', label: '-- select --' },
                                  ...stepStatusOptions.map((option) => ({ value: option.value, label: option.value })),
                                ]}
                                placeholder="Select success status"
                                disabled={stepControlsDisabled}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                On Decline
                              </label>
                              <InlineSearchableSelect
                                value={transition.declineStatus}
                                onChange={(value) => updateTransition(transition.id, { declineStatus: value })}
                                options={[
                                  { value: '', label: '-- select --' },
                                  ...stepStatusOptions.map((option) => ({ value: option.value, label: option.value })),
                                ]}
                                placeholder="Select decline status"
                                disabled={stepControlsDisabled}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                {transition.actionType === 'send_approval_email' ? 'On Cancel / Expire' : 'On Void / Expire'}
                              </label>
                              <InlineSearchableSelect
                                value={transition.voidStatus}
                                onChange={(value) => updateTransition(transition.id, { voidStatus: value })}
                                options={[
                                  { value: '', label: '-- select --' },
                                  ...stepStatusOptions.map((option) => ({ value: option.value, label: option.value })),
                                ]}
                                placeholder="Select void status"
                                disabled={stepControlsDisabled}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
                            <div>
                              <div className="text-sm font-medium text-white">Lock Record While Pending</div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Keep the record read-only while the external workflow is waiting for completion.
                              </div>
                            </div>
                            <Toggle
                              enabled={transition.lockRecordWhilePending}
                              onChange={(value) => updateTransition(transition.id, { lockRecordWhilePending: value })}
                            />
                          </div>
                        </div>
                      ) : null}
                      <div className="rounded-md border px-3 py-2 text-xs" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                        {transition.triggerType === 'approval_workflow'
                          ? 'Approval Workflow transitions use the level-based approver flow below. Email approvals stay separate under Action Type: Send Approval Email.'
                          : transition.triggerType === 'manual_action'
                          ? transition.actionType === 'send_approval_email'
                            ? 'Manual Button transitions send an approval email, move the record into the pending status, and wait for an approve or reject click from the email.'
                            : 'Manual Button transitions appear as clickable actions on the record detail page.'
                          : transition.triggerType === 'auto_rule'
                            ? 'Auto Rule transitions run during lead save when their conditions match.'
                            : transition.triggerType === 'auto_create'
                              ? 'Auto Create rules define which downstream record should be created automatically from this status.'
                            : 'External Event transitions do not show a user button. They are intended for callbacks from integrations like DocuSign.'}
                      </div>
                      </fieldset>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {saving ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Saving...</p>
      ) : null}
    </div>
  )
}
