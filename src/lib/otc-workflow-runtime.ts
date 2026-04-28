import { loadManagedListDetail } from '@/lib/manage-lists'
import type { TransactionStatusColorTone } from '@/lib/company-preferences-definitions'
import {
  loadOtcWorkflow,
  type OtcStep,
  type TransitionCondition,
  type OtcTransition,
  type OtcTrigger,
  type OtcWorkflowConfig,
} from '@/lib/otc-workflow-store'

export type OtcWorkflowStepId = OtcStep['id']

export type OtcWorkflowButtonTone = 'indigo' | 'emerald' | 'blue' | 'amber' | 'red' | 'gray'

export type OtcWorkflowStatusAction = {
  id: string
  label: string
  step: OtcWorkflowStepId
  fieldName: 'status' | 'stage'
  nextValue: string
  tone: OtcWorkflowButtonTone
}

export type OtcWorkflowDocumentAction = {
  id: string
  label: string
  fromStep: OtcWorkflowStepId
  toStep: OtcWorkflowStepId
  resultStatus: string
}

export type OtcWorkflowRuntime = {
  config: OtcWorkflowConfig
  statusOptionsByStep: Partial<Record<OtcWorkflowStepId, string[]>>
  colorToneByStep: Partial<Record<OtcWorkflowStepId, Record<string, TransactionStatusColorTone>>>
}

const STEP_TO_STATUS_FIELD: Record<OtcWorkflowStepId, 'status' | 'stage'> = {
  lead: 'status',
  opportunity: 'stage',
  quote: 'status',
  'sales-order': 'status',
  invoice: 'status',
  fulfillment: 'status',
  'invoice-receipt': 'status',
}

const STEP_TO_LIST_KEY: Record<OtcWorkflowStepId, string> = {
  lead: 'LEAD-STATUS',
  opportunity: 'OPP-STAGE',
  quote: 'QUOTE-STATUS',
  'sales-order': 'SO-STATUS',
  invoice: 'INV-STATUS',
  fulfillment: 'FULFILL-STATUS',
  'invoice-receipt': 'INV-RECEIPT-STATUS',
}

function normalizeWorkflowValue(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function valuesMatch(left: string | null | undefined, right: string | null | undefined) {
  return normalizeWorkflowValue(left) === normalizeWorkflowValue(right)
}

function mapColorToneToButtonTone(tone: TransactionStatusColorTone | undefined): OtcWorkflowButtonTone {
  switch (tone) {
    case 'green':
      return 'emerald'
    case 'red':
      return 'red'
    case 'yellow':
    case 'orange':
      return 'amber'
    case 'gray':
      return 'gray'
    case 'teal':
      return 'blue'
    case 'accent':
    case 'purple':
    case 'pink':
    case 'default':
    default:
      return 'indigo'
  }
}

function resolveOptionValue(options: string[] | undefined, value: string | null | undefined) {
  if (!value) return null
  const match = options?.find((option) => valuesMatch(option, value))
  return match ?? value
}

export function getOtcWorkflowStepStatusField(step: OtcWorkflowStepId) {
  return STEP_TO_STATUS_FIELD[step]
}

export function getOtcWorkflowStepListKey(step: OtcWorkflowStepId) {
  return STEP_TO_LIST_KEY[step]
}

export async function loadOtcWorkflowRuntime(): Promise<OtcWorkflowRuntime> {
  const config = await loadOtcWorkflow()
  const stepIds = config.steps.map((step) => step.id as OtcWorkflowStepId)
  const listDetails = await Promise.all(stepIds.map((step) => loadManagedListDetail(getOtcWorkflowStepListKey(step))))

  const statusOptionsByStep: Partial<Record<OtcWorkflowStepId, string[]>> = {}
  const colorToneByStep: Partial<Record<OtcWorkflowStepId, Record<string, TransactionStatusColorTone>>> = {}

  stepIds.forEach((step, index) => {
    const detail = listDetails[index]
    statusOptionsByStep[step] = (detail?.rows ?? []).map((row) => row.value)
    colorToneByStep[step] = Object.fromEntries(
      (detail?.rows ?? []).map((row) => [normalizeWorkflowValue(row.value), row.colorTone ?? 'default']),
    )
  })

  return {
    config,
    statusOptionsByStep,
    colorToneByStep,
  }
}

export function getDefaultWorkflowStatus(
  runtime: OtcWorkflowRuntime,
  step: OtcWorkflowStepId,
  preferred?: string | null,
) {
  const options = runtime.statusOptionsByStep[step] ?? []
  const preferredValue = resolveOptionValue(options, preferred)
  if (preferredValue) return preferredValue
  return options[0] ?? preferred ?? ''
}

export function getAvailableWorkflowStatusActions(
  runtime: OtcWorkflowRuntime,
  step: OtcWorkflowStepId,
  currentValue: string | null | undefined,
) {
  const options = runtime.statusOptionsByStep[step] ?? []
  const toneMap = runtime.colorToneByStep[step] ?? {}
  const fieldName = getOtcWorkflowStepStatusField(step)

  return runtime.config.transitions
    .filter(
      (transition) =>
        transition.enabled &&
        transition.step === step &&
        (transition.triggerType === 'manual_action' || transition.triggerType === 'approval_workflow') &&
        valuesMatch(transition.fromStatus, currentValue),
    )
    .map((transition) => {
      const nextValue = resolveOptionValue(options, transition.toStatus) ?? transition.toStatus
      return {
        id: transition.id,
        label: transition.actionLabel,
        step,
        fieldName,
        nextValue,
        tone: mapColorToneToButtonTone(toneMap[normalizeWorkflowValue(nextValue)]),
      } satisfies OtcWorkflowStatusAction
    })
}

export function getWorkflowDocumentAction(
  runtime: OtcWorkflowRuntime,
  fromStep: OtcWorkflowStepId,
  toStep: OtcWorkflowStepId,
  currentValue: string | null | undefined,
) {
  const trigger = runtime.config.triggers.find(
    (candidate) =>
      candidate.enabled &&
      candidate.fromStep === fromStep &&
      candidate.toStep === toStep &&
      valuesMatch(candidate.condition.value, currentValue),
  )

  if (!trigger) return null

  return {
    id: trigger.id,
    label: trigger.label,
    fromStep,
    toStep,
    resultStatus: getDefaultWorkflowStatus(runtime, toStep, trigger.resultStatus),
  } satisfies OtcWorkflowDocumentAction
}

export function isWorkflowTransitionAllowed(
  runtime: OtcWorkflowRuntime,
  step: OtcWorkflowStepId,
  fromValue: string | null | undefined,
  toValue: string | null | undefined,
) {
  return runtime.config.transitions.some(
    (transition) =>
      transition.enabled &&
      transition.step === step &&
      valuesMatch(transition.fromStatus, fromValue) &&
      valuesMatch(transition.toStatus, toValue),
  )
}

export function isWorkflowActionIdAllowed(
  runtime: OtcWorkflowRuntime,
  step: OtcWorkflowStepId,
  actionId: string | null | undefined,
  fromValue: string | null | undefined,
  toValue: string | null | undefined,
) {
  if (!actionId) return false
  return runtime.config.transitions.some(
    (transition) =>
      transition.enabled &&
      transition.step === step &&
      transition.id === actionId &&
      valuesMatch(transition.fromStatus, fromValue) &&
      valuesMatch(transition.toStatus, toValue),
  )
}

export function isWorkflowTriggerAllowed(
  runtime: OtcWorkflowRuntime,
  fromStep: OtcWorkflowStepId,
  toStep: OtcWorkflowStepId,
  currentValue: string | null | undefined,
) {
  return Boolean(getWorkflowDocumentAction(runtime, fromStep, toStep, currentValue))
}

export function getWorkflowTransitionById(
  runtime: OtcWorkflowRuntime,
  id: string,
) {
  return runtime.config.transitions.find((transition) => transition.id === id) ?? null
}

export function getWorkflowTriggerById(
  runtime: OtcWorkflowRuntime,
  id: string,
) {
  return runtime.config.triggers.find((trigger) => trigger.id === id) ?? null
}

export function getWorkflowStepStatusOptions(
  runtime: OtcWorkflowRuntime,
  step: OtcWorkflowStepId,
) {
  return runtime.statusOptionsByStep[step] ?? []
}

export function coerceWorkflowValueForStep(
  runtime: OtcWorkflowRuntime,
  step: OtcWorkflowStepId,
  value: string | null | undefined,
) {
  return resolveOptionValue(runtime.statusOptionsByStep[step], value) ?? value ?? ''
}

export function getWorkflowTransitionsForStep(
  runtime: OtcWorkflowRuntime,
  step: OtcWorkflowStepId,
) {
  return runtime.config.transitions.filter((transition) => transition.step === step)
}

export function getWorkflowTriggersForStep(
  runtime: OtcWorkflowRuntime,
  step: OtcWorkflowStepId,
) {
  return runtime.config.triggers.filter((trigger) => trigger.fromStep === step)
}

export function getWorkflowTransitionTarget(
  runtime: OtcWorkflowRuntime,
  step: OtcWorkflowStepId,
  transition: OtcTransition,
) {
  return coerceWorkflowValueForStep(runtime, step, transition.toStatus)
}

function evaluateTransitionCondition(
  condition: TransitionCondition,
  record: Record<string, unknown>,
) {
  const rawValue = record[condition.field]
  switch (condition.operator) {
    case 'equals':
      return valuesMatch(typeof rawValue === 'string' ? rawValue : rawValue == null ? '' : String(rawValue), condition.value)
    case 'not_empty':
    default:
      return typeof rawValue === 'string'
        ? rawValue.trim().length > 0
        : rawValue != null && String(rawValue).trim().length > 0
  }
}

function evaluateTransitionConditionGroup(
  conditions: TransitionCondition[],
  record: Record<string, unknown>,
) {
  if (conditions.length === 0) return false

  const output: Array<boolean | 'and' | 'or'> = []
  const operators: Array<'and' | 'or' | '('> = []
  const precedence = { or: 1, and: 2 }

  const pushOperator = (operator: 'and' | 'or') => {
    while (operators.length > 0) {
      const top = operators[operators.length - 1]
      if (top === '(') break
      if (precedence[top] >= precedence[operator]) {
        output.push(operators.pop() as 'and' | 'or')
      } else {
        break
      }
    }
    operators.push(operator)
  }

  conditions.forEach((condition, index) => {
    if (condition.openParen) operators.push('(')
    output.push(evaluateTransitionCondition(condition, record))
    if (condition.closeParen) {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        output.push(operators.pop() as 'and' | 'or')
      }
      if (operators[operators.length - 1] === '(') operators.pop()
    }
    if (index < conditions.length - 1) {
      pushOperator(condition.joinOperator === 'or' ? 'or' : 'and')
    }
  })

  while (operators.length > 0) {
    const next = operators.pop()
    if (next && next !== '(') output.push(next)
  }

  const stack: boolean[] = []
  output.forEach((token) => {
    if (typeof token === 'boolean') {
      stack.push(token)
      return
    }
    const right = stack.pop() ?? false
    const left = stack.pop() ?? false
    stack.push(token === 'and' ? left && right : left || right)
  })

  return stack.pop() ?? false
}

export function getFirstMatchingAutoWorkflowTransition(
  runtime: OtcWorkflowRuntime,
  step: OtcWorkflowStepId,
  currentValue: string | null | undefined,
  record: Record<string, unknown>,
) {
  return runtime.config.transitions.find((transition) => {
    if (!transition.enabled || transition.step !== step || transition.triggerType !== 'auto_rule') return false
    if (!valuesMatch(transition.fromStatus, currentValue)) return false
    const conditions = transition.conditions ?? []
    if (conditions.length === 0) return false
    return evaluateTransitionConditionGroup(conditions, record)
  }) ?? null
}

export function getWorkflowTriggerResultStatus(
  runtime: OtcWorkflowRuntime,
  trigger: OtcTrigger,
) {
  return getDefaultWorkflowStatus(runtime, trigger.toStep as OtcWorkflowStepId, trigger.resultStatus)
}
