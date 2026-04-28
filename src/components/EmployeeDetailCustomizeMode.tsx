'use client'

import TransactionRecordDetailCustomizeMode from '@/components/TransactionRecordDetailCustomizeMode'
import {
  EMPLOYEE_STAT_CARDS,
  type EmployeeFormCustomizationConfig,
  type EmployeeFormFieldKey,
} from '@/lib/employee-form-customization'
import type { TransactionVisualTone } from '@/lib/transaction-page-config'

type CustomizeField = {
  id: EmployeeFormFieldKey
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue?: string
}

export default function EmployeeDetailCustomizeMode({
  detailHref,
  initialLayout,
  fields,
  sectionDescriptions,
  statPreviewCards,
}: {
  detailHref: string
  initialLayout: EmployeeFormCustomizationConfig
  initialRequirements: Record<string, boolean>
  fields: CustomizeField[]
  sectionDescriptions?: Record<string, string>
  statPreviewCards?: Array<{
    id: string
    label: string
    value: string | number
    href?: string | null
    accent?: true | 'teal' | 'yellow'
    valueTone?: TransactionVisualTone
    cardTone?: TransactionVisualTone
    supportsColorized?: boolean
    supportsLink?: boolean
  }>
}) {
  return (
    <TransactionRecordDetailCustomizeMode
      detailHref={detailHref}
      initialLayout={initialLayout}
      fields={fields}
      formKey="employeeCreate"
      saveEndpoint="/api/config/employee-form-customization"
      recordLabel="employee"
      sectionDescriptions={sectionDescriptions}
      statCardDefinitions={EMPLOYEE_STAT_CARDS}
      statPreviewCards={statPreviewCards}
      layoutErrorMessage="Unable to save employee form layout"
      requirementsErrorMessage="Unable to save employee form requirements"
      fallbackErrorMessage="Unable to save employee form customization"
    />
  )
}
