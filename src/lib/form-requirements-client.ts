'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  FORM_REQUIREMENTS,
  LOCKED_FORM_REQUIREMENTS,
  type FormKey,
  type FormRequirements,
} from '@/lib/form-requirements'

function cloneRequirements(formKey: FormKey): FormRequirements {
  return JSON.parse(JSON.stringify(FORM_REQUIREMENTS[formKey])) as FormRequirements
}

export function getLockedFormRequirements(formKey: FormKey): FormRequirements {
  return { ...(LOCKED_FORM_REQUIREMENTS[formKey] ?? {}) }
}

export function useFormRequirementsState(formKey: FormKey) {
  const [requirements, setRequirements] = useState<FormRequirements>(() => cloneRequirements(formKey))
  const lockedRequirements = useMemo(() => getLockedFormRequirements(formKey), [formKey])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/api/config/form-requirements', { cache: 'no-store' })
        const body = (await response.json().catch(() => null)) as
          | { config?: Record<string, FormRequirements> | null }
          | null

        if (!response.ok || cancelled) return

        setRequirements({
          ...cloneRequirements(formKey),
          ...(body?.config?.[formKey] ?? {}),
          ...lockedRequirements,
        })
      } catch {
        if (cancelled) return
        setRequirements((current) => ({
          ...cloneRequirements(formKey),
          ...current,
          ...lockedRequirements,
        }))
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [formKey, lockedRequirements])

  function toggleRequired(fieldId: string) {
    if (lockedRequirements[fieldId]) return
    setRequirements((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }))
  }

  function req(fieldId: string) {
    return Boolean(requirements[fieldId])
  }

  function isLocked(fieldId: string) {
    return Boolean(lockedRequirements[fieldId])
  }

  return {
    requirements,
    lockedRequirements,
    setRequirements,
    toggleRequired,
    req,
    isLocked,
  }
}

export async function saveFormRequirementsForKey(formKey: FormKey, requirements: FormRequirements) {
  return fetch('/api/config/form-requirements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: { [formKey]: requirements } }),
  })
}

type EditableRequirementField = {
  key: string
  editable?: boolean
  required?: boolean
  requiredLocked?: boolean
}

export function applyRequirementsToEditableFields<T extends EditableRequirementField>(
  fields: Record<string, T>,
  req: (fieldId: string) => boolean,
  isLocked: (fieldId: string) => boolean,
) {
  for (const field of Object.values(fields)) {
    if (!field.editable) continue
    field.required = req(field.key)
    field.requiredLocked = isLocked(field.key)
  }

  return fields
}
