import { prisma } from '@/lib/prisma'
import RecordCreateDetailPageClient from '@/components/RecordCreateDetailPageClient'
import { loadEmployeeFormCustomization } from '@/lib/employee-form-customization-store'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { EMPLOYEE_FORM_FIELDS, type EmployeeFormFieldKey } from '@/lib/employee-form-customization'
import { buildConfiguredInlineSections, buildCreateInlineFieldDefinitions } from '@/lib/detail-page-helpers'
import { buildFieldMetaById, loadFieldOptionsMap } from '@/lib/field-source-helpers'

const EMPLOYEE_SECTION_DESCRIPTIONS: Record<string, string> = {
  Core: 'Identity and primary contact details for the employee.',
  Organization: 'Reporting structure and organizational placement.',
  Access: 'User account linkage and access context.',
  Employment: 'Dates and employment lifecycle details.',
  Status: 'Availability and active-state controls.',
}

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string }>
}) {
  const { duplicateFrom } = await searchParams
  const fieldMetaById = buildFieldMetaById(EMPLOYEE_FORM_FIELDS)
  const [formCustomization, formRequirements, fieldOptions, duplicateEmployee] = await Promise.all([
    loadEmployeeFormCustomization(),
    loadFormRequirements(),
    loadFieldOptionsMap(fieldMetaById, ['laborType', 'departmentId', 'subsidiaryIds', 'managerId', 'userId', 'inactive']),
    duplicateFrom
      ? prisma.employee.findUnique({
          where: { id: duplicateFrom },
          select: {
            employeeId: true,
            eid: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            title: true,
            laborType: true,
            departmentId: true,
            subsidiaryId: true,
            includeChildren: true,
            managerId: true,
            hireDate: true,
            terminationDate: true,
            active: true,
            employeeSubsidiaries: { select: { subsidiaryId: true } },
          },
        })
      : Promise.resolve(null),
  ])

  const initialValues: Partial<Record<EmployeeFormFieldKey, unknown>> = duplicateEmployee
    ? {
        employeeId: '',
        eid: '',
        firstName: duplicateEmployee.firstName,
        lastName: duplicateEmployee.lastName,
        email: '',
        phone: duplicateEmployee.phone,
        title: duplicateEmployee.title,
        laborType: duplicateEmployee.laborType,
        departmentId: duplicateEmployee.departmentId,
        subsidiaryIds:
          duplicateEmployee.employeeSubsidiaries.length > 0
            ? duplicateEmployee.employeeSubsidiaries.map((assignment) => assignment.subsidiaryId)
            : duplicateEmployee.subsidiaryId
              ? [duplicateEmployee.subsidiaryId]
              : [],
        includeChildren: duplicateEmployee.includeChildren,
        managerId: duplicateEmployee.managerId,
        hireDate: duplicateEmployee.hireDate ? duplicateEmployee.hireDate.toISOString().split('T')[0] : '',
        terminationDate: duplicateEmployee.terminationDate ? duplicateEmployee.terminationDate.toISOString().split('T')[0] : '',
        inactive: !duplicateEmployee.active,
      }
    : {
        includeChildren: false,
        inactive: false,
      }

  const fieldDefinitions = buildCreateInlineFieldDefinitions<EmployeeFormFieldKey, (typeof EMPLOYEE_FORM_FIELDS)[number]>({
    fields: EMPLOYEE_FORM_FIELDS,
    initialValues,
    fieldOptions,
    requirements: formRequirements.employeeCreate,
    multipleFields: ['subsidiaryIds'],
    typeOverrides: {
      email: 'email',
    },
  })

  const sections = buildConfiguredInlineSections({
    fields: EMPLOYEE_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions: EMPLOYEE_SECTION_DESCRIPTIONS,
  })

  return (
    <RecordCreateDetailPageClient
      resource="employees"
      backHref="/employees"
      backLabel="<- Back to Employees"
      title="New Employee"
      detailsTitle="Employee details"
      formId="create-employee-inline-form"
      sections={sections}
      formColumns={formCustomization.formColumns}
      createEndpoint="/api/employees"
      successRedirectBasePath="/employees"
    />
  )
}
