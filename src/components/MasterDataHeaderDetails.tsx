'use client'

import RecordHeaderDetails, {
  type RecordHeaderField,
  type RecordHeaderSection,
} from '@/components/RecordHeaderDetails'
import type { RecordSystemInformationItem } from '@/components/RecordSystemInformationSection'
import type { InlineRecordSection } from '@/components/InlineRecordDetails'

function convertField(field: InlineRecordSection['fields'][number]): RecordHeaderField {
  return {
    key: field.name,
    label: field.label,
    value: field.value,
    displayValue: field.displayValue,
    editable: !field.readOnly,
    readOnly: field.readOnly,
    required: field.required,
    disabled: false,
    type: field.type === 'password' ? 'text' : field.type,
    multiple: field.multiple,
    options: field.options,
    column: field.column,
    order: field.order,
    helpText: field.helpText,
    fieldType:
      field.type === 'select'
        ? 'list'
        : field.type === 'checkbox'
          ? 'checkbox'
          : field.type === 'number'
            ? 'number'
            : field.type === 'date'
              ? 'date'
              : field.type === 'email'
                ? 'email'
                : 'text',
    sourceText: field.sourceText,
    placeholder: field.placeholder,
  }
}

function convertSystemInformationItem(item: RecordSystemInformationItem, index: number, columns: number): RecordHeaderField {
  const fallbackValue =
    typeof item.value === 'string' || typeof item.value === 'number' ? String(item.value) : item.copyableText ?? ''
  const normalizedColumns = Math.max(1, columns)
  const column = (index % normalizedColumns) + 1
  const order = Math.floor(index / normalizedColumns)

  return {
    key: item.key,
    label: item.label,
    value: item.copyableText ?? fallbackValue,
    displayValue: item.value,
    readOnly: true,
    editable: false,
    column,
    order,
  }
}

export default function MasterDataHeaderDetails({
  resource,
  id,
  title,
  sections,
  editing,
  columns,
  formId,
  submitMode,
  onSubmit,
  systemInformationItems,
}: {
  resource: string
  id: string
  title: string
  sections: InlineRecordSection[]
  editing: boolean
  columns: number
  formId?: string
  submitMode?: 'update' | 'controlled'
  onSubmit?: (values: Record<string, string>) => Promise<{ ok?: boolean; error?: string } | void>
  systemInformationItems?: RecordSystemInformationItem[]
}) {
  const recordSections: RecordHeaderSection[] = [
    ...sections.map((section) => ({
      title: section.title,
      description: section.description,
      fields: section.fields.map(convertField),
    })),
    ...(systemInformationItems?.length
      ? [{
          title: 'System Information',
          fields: systemInformationItems.map((item, index) =>
            convertSystemInformationItem(item, index, columns)
          ),
        }]
      : []),
  ]

  return (
    <RecordHeaderDetails
      editing={editing}
      sections={recordSections}
      columns={columns}
      containerTitle={title}
      showSubsections={false}
      submitMode={submitMode ?? 'update'}
      updateUrl={submitMode === 'controlled' ? undefined : `/api/${resource}?id=${encodeURIComponent(id)}`}
      onSubmit={onSubmit}
      formId={formId}
    />
  )
}
