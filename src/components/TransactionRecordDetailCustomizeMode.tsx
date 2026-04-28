'use client'

import type { ComponentProps } from 'react'
import RecordDetailCustomizeMode from '@/components/RecordDetailCustomizeMode'
import { useFormRequirementsState } from '@/lib/form-requirements-client'
import type { FormKey } from '@/lib/form-requirements'
import { saveLayoutWithRequirements } from '@/lib/save-layout-with-requirements'

const SHARED_LINE_FONT_SIZE_OPTIONS = [
  { value: 'xs', label: 'Compact' },
  { value: 'sm', label: 'Standard' },
] as const

const SHARED_LINE_WIDTH_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' },
] as const

const SHARED_LINE_DISPLAY_OPTIONS = [
  { value: 'label', label: 'Desc Only' },
  { value: 'idAndLabel', label: 'Id + Desc' },
  { value: 'id', label: 'Id Only' },
] as const

const SHARED_LINE_DROPDOWN_SORT_OPTIONS = [
  { value: 'id', label: 'Id/Num' },
  { value: 'label', label: 'Description' },
] as const

const DEFAULT_LINE_SECTION_SETTING_DEFINITIONS = [
  { id: 'fontSize', label: 'Font Size', options: [...SHARED_LINE_FONT_SIZE_OPTIONS] },
] as const

const DEFAULT_LINE_COLUMN_SETTING_DEFINITIONS = [
  { id: 'widthMode', label: 'Width', options: [...SHARED_LINE_WIDTH_OPTIONS] },
  { id: 'dropdownDisplay', label: 'Dropdown', options: [...SHARED_LINE_DISPLAY_OPTIONS] },
  { id: 'dropdownSort', label: 'Sort', options: [...SHARED_LINE_DROPDOWN_SORT_OPTIONS] },
  { id: 'editDisplay', label: 'Edit', options: [...SHARED_LINE_DISPLAY_OPTIONS] },
  { id: 'viewDisplay', label: 'View', options: [...SHARED_LINE_DISPLAY_OPTIONS] },
] as const

const DEFAULT_SECONDARY_SECTION_SETTING_DEFINITIONS = [
  { id: 'fontSize', label: 'Font Size', options: [...SHARED_LINE_FONT_SIZE_OPTIONS] },
] as const

const DEFAULT_SECONDARY_COLUMN_SETTING_DEFINITIONS = [
  { id: 'widthMode', label: 'Width', options: [...SHARED_LINE_WIDTH_OPTIONS] },
  { id: 'viewDisplay', label: 'View', options: [...SHARED_LINE_DISPLAY_OPTIONS] },
] as const

type Props = Omit<
  ComponentProps<typeof RecordDetailCustomizeMode>,
  | 'extraFieldCheckboxLabel'
  | 'extraFieldCheckboxValues'
  | 'extraFieldCheckboxDisabledValues'
  | 'onToggleExtraFieldCheckbox'
  | 'onSaveCustomization'
> & {
  formKey: FormKey
  layoutErrorMessage?: string
  requirementsErrorMessage?: string
  fallbackErrorMessage?: string
}

export default function TransactionRecordDetailCustomizeMode({
  formKey,
  layoutErrorMessage,
  requirementsErrorMessage,
  fallbackErrorMessage,
  ...props
}: Props) {
  const { requirements, lockedRequirements, toggleRequired } = useFormRequirementsState(formKey)
  const hasLineColumns = Boolean(props.lineColumnDefinitions?.length)
  const hasSecondaryColumns = Boolean(props.secondaryColumnDefinitions?.length)

  return (
    <RecordDetailCustomizeMode
      {...props}
      lineSectionSettingDefinitions={
        props.lineSectionSettingDefinitions ??
        (hasLineColumns ? [...DEFAULT_LINE_SECTION_SETTING_DEFINITIONS] : undefined)
      }
      lineColumnSettingDefinitions={
        props.lineColumnSettingDefinitions ??
        (hasLineColumns ? [...DEFAULT_LINE_COLUMN_SETTING_DEFINITIONS] : undefined)
      }
      secondarySectionSettingDefinitions={
        props.secondarySectionSettingDefinitions ??
        (hasSecondaryColumns ? [...DEFAULT_SECONDARY_SECTION_SETTING_DEFINITIONS] : undefined)
      }
      secondaryColumnSettingDefinitions={
        props.secondaryColumnSettingDefinitions ??
        (hasSecondaryColumns ? [...DEFAULT_SECONDARY_COLUMN_SETTING_DEFINITIONS] : undefined)
      }
      extraFieldCheckboxLabel="Required"
      extraFieldCheckboxValues={requirements}
      extraFieldCheckboxDisabledValues={lockedRequirements}
      onToggleExtraFieldCheckbox={toggleRequired}
      onSaveCustomization={(layout) =>
        saveLayoutWithRequirements({
          layoutEndpoint: props.saveEndpoint,
          layout,
          formKey,
          requirements,
          layoutErrorMessage: layoutErrorMessage ?? 'Unable to save detail layout',
          requirementsErrorMessage: requirementsErrorMessage ?? 'Unable to save field requirements',
          fallbackErrorMessage: fallbackErrorMessage ?? 'Unable to save customization',
        })
      }
    />
  )
}
