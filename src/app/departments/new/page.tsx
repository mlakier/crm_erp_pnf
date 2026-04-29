import { prisma } from '@/lib/prisma'
import RecordCreateDetailPageClient from '@/components/RecordCreateDetailPageClient'
import { generateNextDepartmentId } from '@/lib/department-id'
import { loadDepartmentFormCustomization } from '@/lib/department-form-customization-store'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { DEPARTMENT_FORM_FIELDS, type DepartmentFormFieldKey } from '@/lib/department-form-customization'
import { buildConfiguredInlineSections, buildCreateInlineFieldDefinitions } from '@/lib/detail-page-helpers'
import { buildFieldMetaById, loadFieldOptionsMap } from '@/lib/field-source-helpers'

const DEPARTMENT_SECTION_DESCRIPTIONS: Record<string, string> = {
  Core: 'Primary identity and descriptive fields for the department.',
  Organization: 'Subsidiary scope, planning, and approval ownership.',
  Status: 'Availability and active-state controls.',
}

export default async function NewDepartmentPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string }>
}) {
  const { duplicateFrom } = await searchParams
  const fieldMetaById = buildFieldMetaById(DEPARTMENT_FORM_FIELDS)
  const [formCustomization, formRequirements, fieldOptions, nextDepartmentId, duplicateDepartment] = await Promise.all([
    loadDepartmentFormCustomization(),
    loadFormRequirements(),
    loadFieldOptionsMap(fieldMetaById, [
      'division',
      'subsidiaryIds',
      'planningCategory',
      'managerEmployeeId',
      'approverEmployeeId',
      'inactive',
    ]),
    generateNextDepartmentId(),
    duplicateFrom
      ? prisma.department.findUnique({
          where: { id: duplicateFrom },
          include: { departmentSubsidiaries: { select: { subsidiaryId: true } } },
        })
      : Promise.resolve(null),
  ])

  const initialValues: Partial<Record<DepartmentFormFieldKey, unknown>> = duplicateDepartment
    ? {
        departmentId: nextDepartmentId,
        departmentNumber: duplicateDepartment.departmentNumber,
        name: `Copy of ${duplicateDepartment.name}`,
        description: duplicateDepartment.description,
        division: duplicateDepartment.division,
        subsidiaryIds: duplicateDepartment.departmentSubsidiaries.map((assignment) => assignment.subsidiaryId),
        includeChildren: duplicateDepartment.includeChildren,
        planningCategory: duplicateDepartment.planningCategory,
        managerEmployeeId: duplicateDepartment.managerEmployeeId,
        approverEmployeeId: duplicateDepartment.approverEmployeeId,
        inactive: !duplicateDepartment.active,
      }
    : {
        departmentId: nextDepartmentId,
        includeChildren: false,
        inactive: false,
      }

  const fieldDefinitions = buildCreateInlineFieldDefinitions<DepartmentFormFieldKey, (typeof DEPARTMENT_FORM_FIELDS)[number]>({
    fields: DEPARTMENT_FORM_FIELDS,
    initialValues,
    fieldOptions,
    requirements: formRequirements.departmentCreate,
    readOnlyFields: ['departmentId'],
    generatedFieldLabels: ['departmentId'],
    multipleFields: ['subsidiaryIds'],
  })

  const sections = buildConfiguredInlineSections({
    fields: DEPARTMENT_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions: DEPARTMENT_SECTION_DESCRIPTIONS,
  })

  return (
    <RecordCreateDetailPageClient
      resource="departments"
      backHref="/departments"
      backLabel="<- Back to Departments"
      title="New Department"
      detailsTitle="Department details"
      formId="create-department-inline-form"
      sections={sections}
      formColumns={formCustomization.formColumns}
      createEndpoint="/api/departments"
      successRedirectBasePath="/departments"
    />
  )
}
