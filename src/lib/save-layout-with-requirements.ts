'use client'

import type { FormKey, FormRequirements } from '@/lib/form-requirements'
import { saveFormRequirementsForKey } from '@/lib/form-requirements-client'

export async function saveLayoutWithRequirements<T>({
  layoutEndpoint,
  layout,
  formKey,
  requirements,
  layoutErrorMessage,
  requirementsErrorMessage,
  fallbackErrorMessage,
}: {
  layoutEndpoint: string
  layout: T
  formKey: FormKey
  requirements: FormRequirements
  layoutErrorMessage: string
  requirementsErrorMessage: string
  fallbackErrorMessage: string
}) {
  try {
    const [layoutResponse, requirementsResponse] = await Promise.all([
      fetch(layoutEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: layout }),
      }),
      saveFormRequirementsForKey(formKey, requirements),
    ])

    const layoutBody = await layoutResponse.json().catch(() => null) as { error?: string } | null
    const requirementsBody = await requirementsResponse.json().catch(() => null) as { error?: string } | null

    if (!layoutResponse.ok) {
      return { error: layoutBody?.error ?? layoutErrorMessage }
    }

    if (!requirementsResponse.ok) {
      return { error: requirementsBody?.error ?? requirementsErrorMessage }
    }

    return { error: null }
  } catch {
    return { error: fallbackErrorMessage }
  }
}
