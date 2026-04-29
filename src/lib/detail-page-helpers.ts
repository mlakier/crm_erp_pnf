import type { InlineRecordField, InlineRecordSection } from '@/components/InlineRecordDetails'

type FieldWithId<TKey extends string> = {
  id: TKey
  fieldType: string
  source?: string
  description?: string
}

type LayoutFieldConfig = {
  visible: boolean
  section: string
  order: number
  column: number
}

type LayoutConfig<TKey extends string> = {
  sections: string[]
  fields: Record<TKey, LayoutFieldConfig>
}

export type CustomizePreviewField<TKey extends string> = {
  id: TKey
  label: string
  fieldType: string
  source?: string
  description?: string
  previewValue: string
}

export function getInlineFieldPreviewValue(field: InlineRecordField): string {
  if (field.type === 'checkbox') {
    return field.value === 'true' ? 'Yes' : 'No'
  }

  return (
    field.options?.find((option) => option.value === field.value)?.label ??
    field.value ??
    ''
  )
}

export function buildCustomizePreviewFields<TKey extends string, TField extends FieldWithId<TKey>>(
  fields: TField[],
  fieldDefinitions: Record<TKey, InlineRecordField>
): CustomizePreviewField<TKey>[] {
  return fields.map((field) => ({
    id: field.id,
    label: fieldDefinitions[field.id].label,
    fieldType: field.fieldType,
    source: field.source,
    description: field.description,
    previewValue: getInlineFieldPreviewValue(fieldDefinitions[field.id]),
  }))
}

export function buildConfiguredInlineSections<TKey extends string, TField extends FieldWithId<TKey>>({
  fields,
  layout,
  fieldDefinitions,
  sectionDescriptions,
}: {
  fields: TField[]
  layout: LayoutConfig<TKey>
  fieldDefinitions: Record<TKey, InlineRecordField>
  sectionDescriptions?: Record<string, string>
}): InlineRecordSection[] {
  return layout.sections.flatMap((sectionTitle) => {
      const configuredFields = fields
        .filter((field) => {
          const config = layout.fields[field.id]
          return config.visible && config.section === sectionTitle
        })
        .sort((a, b) => {
          const left = layout.fields[a.id]
          const right = layout.fields[b.id]
          if (left.column !== right.column) return left.column - right.column
          return left.order - right.order
        })
        .map((field) => ({
          ...fieldDefinitions[field.id],
          column: layout.fields[field.id].column,
          order: layout.fields[field.id].order,
        }))

      if (configuredFields.length === 0) return []

      return [{
        title: sectionTitle,
        description: sectionDescriptions?.[sectionTitle],
        collapsible: true,
        defaultExpanded: true,
        fields: configuredFields,
      }]
    })
}

type CreateFieldMeta<TKey extends string> = FieldWithId<TKey> & {
  label: string
}

function inferCreateFieldType(fieldType: string): InlineRecordField['type'] | undefined {
  const normalized = fieldType.trim().toLowerCase()
  if (normalized === 'list') return 'select'
  if (normalized === 'boolean') return 'checkbox'
  if (normalized === 'address') return 'address'
  if (normalized === 'date') return 'date'
  if (normalized === 'number') return 'number'
  if (normalized === 'email') return 'email'
  return undefined
}

function stringifyCreateFieldValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? '').trim()).filter(Boolean).join(',')
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value ?? '')
}

export function buildCreateInlineFieldDefinitions<TKey extends string, TField extends CreateFieldMeta<TKey>>({
  fields,
  initialValues,
  fieldOptions = {},
  requirements = {},
  readOnlyFields = [],
  multipleFields = [],
  typeOverrides = {},
  blankSelectLabel = '-- Select --',
  generatedFieldLabels = [],
}: {
  fields: readonly TField[]
  initialValues?: Partial<Record<TKey, unknown>>
  fieldOptions?: Partial<Record<TKey, Array<{ value: string; label: string }>>>
  requirements?: Partial<Record<TKey, boolean>>
  readOnlyFields?: readonly TKey[]
  multipleFields?: readonly TKey[]
  typeOverrides?: Partial<Record<TKey, NonNullable<InlineRecordField['type']>>>
  blankSelectLabel?: string
  generatedFieldLabels?: readonly TKey[]
}): Record<TKey, InlineRecordField> {
  const readOnlyFieldSet = new Set<TKey>(readOnlyFields)
  const multipleFieldSet = new Set<TKey>(multipleFields)
  const generatedFieldSet = new Set<TKey>(generatedFieldLabels)

  return Object.fromEntries(
    fields.map((field) => {
      const type = typeOverrides[field.id] ?? inferCreateFieldType(field.fieldType)
      const multiple = multipleFieldSet.has(field.id)
      const rawOptions = fieldOptions[field.id] ?? []
      const options =
        type === 'select'
          ? (multiple
              ? rawOptions
              : [{ value: '', label: blankSelectLabel }, ...rawOptions])
          : undefined

      const inlineField: InlineRecordField = {
        name: field.id,
        label: field.label,
        value: stringifyCreateFieldValue(initialValues?.[field.id]),
        type,
        options,
        multiple: multiple || undefined,
        helpText: field.description,
        sourceText: field.source,
        required: Boolean(requirements[field.id]),
        readOnly: readOnlyFieldSet.has(field.id),
        placeholder: generatedFieldSet.has(field.id) ? 'Generated automatically' : undefined,
      }

      return [field.id, inlineField]
    })
  ) as Record<TKey, InlineRecordField>
}
