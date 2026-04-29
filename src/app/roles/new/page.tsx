import { prisma } from '@/lib/prisma'
import RecordCreateDetailPageClient from '@/components/RecordCreateDetailPageClient'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { loadRoleFormCustomization } from '@/lib/role-form-customization-store'
import { loadListOptionsForSource } from '@/lib/list-source'
import { ROLE_FORM_FIELDS, type RoleFormFieldKey } from '@/lib/role-form-customization'
import { buildConfiguredInlineSections } from '@/lib/detail-page-helpers'
import type { InlineRecordField } from '@/components/InlineRecordDetails'

const ROLE_SECTION_DESCRIPTIONS: Record<string, string> = {
  Core: 'Primary identity fields for the role record.',
  Status: 'Availability and active-state controls.',
}

export default async function NewRolePage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string }>
}) {
  const { duplicateFrom } = await searchParams
  const [inactiveOptions, formCustomization, formRequirements, duplicateRole] = await Promise.all([
    loadListOptionsForSource({ sourceType: 'system', sourceKey: 'activeInactive' }),
    loadRoleFormCustomization(),
    loadFormRequirements(),
    duplicateFrom ? prisma.role.findUnique({ where: { id: duplicateFrom }, select: { name: true, description: true } }) : Promise.resolve(null),
  ])

  const initialValues = duplicateRole
    ? {
        name: `Copy of ${duplicateRole.name}`,
        description: duplicateRole.description ?? '',
      }
    : { name: '', description: '' }

  const fieldDefinitions: Record<RoleFormFieldKey, InlineRecordField> = {
    roleId: {
      name: 'roleId',
      label: 'Role ID',
      value: '',
      placeholder: 'Generated automatically',
      helpText: 'System-generated role identifier.',
      readOnly: true,
    },
    name: {
      name: 'name',
      label: 'Name',
      value: initialValues.name,
      helpText: 'Role name shown to admins and users.',
      required: formRequirements.roleCreate.name,
    },
    description: {
      name: 'description',
      label: 'Description',
      value: initialValues.description,
      helpText: 'Short explanation of the role purpose.',
      required: formRequirements.roleCreate.description,
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: 'false',
      type: 'select',
      options: inactiveOptions,
      helpText: 'Marks the role unavailable for new assignments while preserving history.',
      sourceText: 'Active/Inactive',
      required: formRequirements.roleCreate.inactive,
    },
  }

  const sections = buildConfiguredInlineSections({
    fields: ROLE_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions: ROLE_SECTION_DESCRIPTIONS,
  })

  return (
    <RecordCreateDetailPageClient
      resource="roles"
      backHref="/roles"
      backLabel="<- Back to Roles"
      title="New Role"
      detailsTitle="Role details"
      formId="create-role-inline-form"
      sections={sections}
      formColumns={formCustomization.formColumns}
      createEndpoint="/api/roles"
      successRedirectBasePath="/roles"
    />
  )
}
