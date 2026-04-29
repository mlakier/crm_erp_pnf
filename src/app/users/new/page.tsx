import { prisma } from '@/lib/prisma'
import RecordCreateDetailPageClient from '@/components/RecordCreateDetailPageClient'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { loadUserFormCustomization } from '@/lib/user-form-customization-store'
import {
  USER_FORM_FIELDS,
  type UserFormFieldKey,
} from '@/lib/user-form-customization'
import { buildConfiguredInlineSections } from '@/lib/detail-page-helpers'
import { buildFieldMetaById, getFieldSourceText, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import type { InlineRecordField, InlineRecordSection } from '@/components/InlineRecordDetails'
import { toNumericValue } from '@/lib/format'

const USER_FIELD_META_BY_ID = buildFieldMetaById(USER_FORM_FIELDS)

const USER_SECTION_DESCRIPTIONS: Record<string, string> = {
  Core: 'Primary identity fields for the user account.',
  Access: 'Role and organizational access context.',
  'Subsidiary Access': 'Default subsidiary and multi-subsidiary access scope.',
  Approval: 'Approval limit and temporary approver delegation.',
  Linkage: 'Link between this user account and an employee record.',
  Security: 'Account lockout and credential state.',
  Status: 'Availability and account-state controls.',
}

type UserCreateInitialValues = Partial<Record<UserFormFieldKey | 'password', string>>

function buildUserCreateFieldDefinitions({
  values,
  fieldOptions,
  requirements,
}: {
  values: UserCreateInitialValues
  fieldOptions: Record<string, Array<{ value: string; label: string }>>
  requirements: Record<string, boolean>
}): Record<UserFormFieldKey, InlineRecordField> {
  return {
    userId: {
      name: 'userId',
      label: 'User ID',
      value: values.userId ?? '',
      placeholder: 'Generated automatically',
      helpText: 'System-generated user identifier.',
      readOnly: true,
    },
    name: {
      name: 'name',
      label: 'Name',
      value: values.name ?? '',
      helpText: 'Display name for the user account.',
      required: requirements.name,
    },
    email: {
      name: 'email',
      label: 'Email',
      value: values.email ?? '',
      type: 'email',
      helpText: 'Login email address for the user.',
      required: requirements.email,
    },
    roleId: {
      name: 'roleId',
      label: 'Role',
      value: values.roleId ?? '',
      type: 'select',
      options: fieldOptions.roleId ?? [],
      helpText: 'Primary system role assigned to the user.',
      sourceText: getFieldSourceText(USER_FIELD_META_BY_ID as never, 'roleId'),
      required: requirements.roleId,
    },
    departmentId: {
      name: 'departmentId',
      label: 'Department',
      value: values.departmentId ?? '',
      type: 'select',
      options: fieldOptions.departmentId ?? [],
      helpText: 'Department context used for workflow and reporting.',
      sourceText: getFieldSourceText(USER_FIELD_META_BY_ID as never, 'departmentId'),
      required: requirements.departmentId,
    },
    defaultSubsidiaryId: {
      name: 'defaultSubsidiaryId',
      label: 'Default Subsidiary',
      value: values.defaultSubsidiaryId ?? '',
      type: 'select',
      options: fieldOptions.defaultSubsidiaryId ?? [],
      helpText: 'Default subsidiary context for new user activity.',
      sourceText: getFieldSourceText(USER_FIELD_META_BY_ID as never, 'defaultSubsidiaryId'),
      required: requirements.defaultSubsidiaryId,
    },
    subsidiaryIds: {
      name: 'subsidiaryIds',
      label: 'Subsidiaries',
      value: values.subsidiaryIds ?? '',
      type: 'select',
      multiple: true,
      options: fieldOptions.subsidiaryIds ?? [],
      placeholder: 'Select subsidiaries',
      helpText: 'Subsidiaries this user can access.',
      sourceText: getFieldSourceText(USER_FIELD_META_BY_ID as never, 'subsidiaryIds'),
      required: requirements.subsidiaryIds,
    },
    includeChildren: {
      name: 'includeChildren',
      label: 'Include Children',
      value: values.includeChildren ?? 'false',
      type: 'checkbox',
      placeholder: 'Include Children',
      helpText: 'If enabled, child subsidiaries under selected subsidiaries are included in access scope.',
    },
    approvalLimit: {
      name: 'approvalLimit',
      label: 'Approval Limit',
      value: values.approvalLimit ?? '',
      type: 'number',
      helpText: 'Maximum approval amount for routed workflows.',
      required: requirements.approvalLimit,
    },
    approvalCurrencyId: {
      name: 'approvalCurrencyId',
      label: 'Approval Currency',
      value: values.approvalCurrencyId ?? '',
      type: 'select',
      options: fieldOptions.approvalCurrencyId ?? [],
      helpText: 'Currency used for the approval limit.',
      sourceText: getFieldSourceText(USER_FIELD_META_BY_ID as never, 'approvalCurrencyId'),
      required: requirements.approvalCurrencyId,
    },
    delegatedApproverUserId: {
      name: 'delegatedApproverUserId',
      label: 'Delegated Approver',
      value: values.delegatedApproverUserId ?? '',
      type: 'select',
      options: fieldOptions.delegatedApproverUserId ?? [],
      helpText: 'User who can approve on this user\'s behalf during delegation.',
      sourceText: getFieldSourceText(USER_FIELD_META_BY_ID as never, 'delegatedApproverUserId'),
      required: requirements.delegatedApproverUserId,
    },
    delegationStartDate: {
      name: 'delegationStartDate',
      label: 'Delegation Start Date',
      value: values.delegationStartDate ?? '',
      type: 'date',
      helpText: 'Date delegation starts.',
      required: requirements.delegationStartDate,
    },
    delegationEndDate: {
      name: 'delegationEndDate',
      label: 'Delegation End Date',
      value: values.delegationEndDate ?? '',
      type: 'date',
      helpText: 'Date delegation ends.',
      required: requirements.delegationEndDate,
    },
    employeeId: {
      name: 'employeeId',
      label: 'Linked Employee',
      value: values.employeeId ?? '',
      type: 'select',
      options: fieldOptions.employeeId ?? [],
      helpText: 'Employee record linked to this user account.',
      sourceText: getFieldSourceText(USER_FIELD_META_BY_ID as never, 'employeeId'),
      required: requirements.employeeId,
    },
    locked: {
      name: 'locked',
      label: 'Locked',
      value: values.locked ?? 'false',
      type: 'checkbox',
      placeholder: 'Locked',
      helpText: 'Prevents account access until unlocked.',
    },
    mustChangePassword: {
      name: 'mustChangePassword',
      label: 'Must Change Password',
      value: values.mustChangePassword ?? 'false',
      type: 'checkbox',
      placeholder: 'Must Change Password',
      helpText: 'Requires password change at next login.',
    },
    failedLoginAttempts: {
      name: 'failedLoginAttempts',
      label: 'Failed Login Attempts',
      value: values.failedLoginAttempts ?? '0',
      type: 'number',
      helpText: 'Count of failed login attempts.',
      required: requirements.failedLoginAttempts,
    },
    lastLoginAt: {
      name: 'lastLoginAt',
      label: 'Last Login',
      value: values.lastLoginAt ?? '',
      type: 'date',
      helpText: 'Most recent successful login date.',
      required: requirements.lastLoginAt,
    },
    passwordChangedAt: {
      name: 'passwordChangedAt',
      label: 'Password Changed',
      value: values.passwordChangedAt ?? '',
      type: 'date',
      helpText: 'Most recent password change date.',
      required: requirements.passwordChangedAt,
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: values.inactive ?? 'false',
      type: 'select',
      options: fieldOptions.inactive ?? [],
      helpText: 'Disables the user account while preserving history.',
      sourceText: getFieldSourceText(USER_FIELD_META_BY_ID as never, 'inactive'),
      required: requirements.inactive,
    },
  }
}

function appendPasswordSection(
  sections: InlineRecordSection[],
  requirements: Record<string, boolean>,
  initialPassword = ''
): InlineRecordSection[] {
  const passwordField: InlineRecordField = {
    name: 'password',
    label: 'Password',
    value: initialPassword,
    type: 'password',
    helpText: 'Initial password for this user account.',
    required: requirements.password,
    column: 1,
    order: 0,
  }

  const securityIndex = sections.findIndex((section) => section.title === 'Security')
  if (securityIndex === -1) {
    return [
      ...sections,
      {
        title: 'Security',
        description: 'Credentials required to create the user account.',
        collapsible: true,
        defaultExpanded: true,
        fields: [passwordField],
      },
    ]
  }

  const securitySection = sections[securityIndex]
  const nextOrder =
    securitySection.fields.reduce((maxOrder, field) => Math.max(maxOrder, field.order ?? 0), -1) + 1

  const nextSections = [...sections]
  nextSections[securityIndex] = {
    ...securitySection,
    fields: [
      ...securitySection.fields,
      {
        ...passwordField,
        order: nextOrder,
      },
    ],
  }
  return nextSections
}

export default async function NewUserPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string; employeeId?: string }>
}) {
  const { duplicateFrom, employeeId } = await searchParams
  const [formCustomization, formRequirements, fieldOptions, duplicateUser, sourceEmployee] = await Promise.all([
    loadUserFormCustomization(),
    loadFormRequirements(),
    loadFieldOptionsMap(USER_FIELD_META_BY_ID as never, [
      'roleId',
      'departmentId',
      'defaultSubsidiaryId',
      'subsidiaryIds',
      'approvalCurrencyId',
      'delegatedApproverUserId',
      'employeeId',
      'inactive',
    ]),
    duplicateFrom
      ? prisma.user.findUnique({
          where: { id: duplicateFrom },
          include: { subsidiaryAssignments: { select: { subsidiaryId: true } } },
        })
      : Promise.resolve(null),
    employeeId
      ? prisma.employee.findUnique({
          where: { id: employeeId },
          select: { id: true, firstName: true, lastName: true, email: true, departmentId: true, userId: true },
        })
      : Promise.resolve(null),
  ])

  const employeePrefill =
    sourceEmployee && !sourceEmployee.userId
      ? {
          name: `${sourceEmployee.firstName} ${sourceEmployee.lastName}`,
          email: sourceEmployee.email ?? '',
          departmentId: sourceEmployee.departmentId ?? '',
          employeeId: sourceEmployee.id,
        }
      : undefined

  const initialValues: UserCreateInitialValues = duplicateUser
    ? {
        name: duplicateUser.name ? `Copy of ${duplicateUser.name}` : '',
        roleId: duplicateUser.roleId ?? '',
        departmentId: duplicateUser.departmentId ?? '',
        defaultSubsidiaryId: duplicateUser.defaultSubsidiaryId ?? '',
        subsidiaryIds: duplicateUser.subsidiaryAssignments.map((assignment) => assignment.subsidiaryId).join(','),
        includeChildren: duplicateUser.includeChildren ? 'true' : 'false',
        approvalLimit:
          duplicateUser.approvalLimit == null ? '' : String(toNumericValue(duplicateUser.approvalLimit)),
        approvalCurrencyId: duplicateUser.approvalCurrencyId ?? '',
        delegatedApproverUserId: duplicateUser.delegatedApproverUserId ?? '',
        delegationStartDate: duplicateUser.delegationStartDate?.toISOString().slice(0, 10) ?? '',
        delegationEndDate: duplicateUser.delegationEndDate?.toISOString().slice(0, 10) ?? '',
        locked: duplicateUser.locked ? 'true' : 'false',
        mustChangePassword: duplicateUser.mustChangePassword ? 'true' : 'false',
        failedLoginAttempts: String(duplicateUser.failedLoginAttempts ?? 0),
        inactive: duplicateUser.inactive ? 'true' : 'false',
      }
    : {
        name: employeePrefill?.name ?? '',
        email: employeePrefill?.email ?? '',
        departmentId: employeePrefill?.departmentId ?? '',
        employeeId: employeePrefill?.employeeId ?? '',
        includeChildren: 'false',
        locked: 'false',
        mustChangePassword: 'false',
        failedLoginAttempts: '0',
        inactive: 'false',
      }

  const fieldDefinitions = buildUserCreateFieldDefinitions({
    values: initialValues,
    fieldOptions,
    requirements: formRequirements.userCreate,
  })

  const sections = appendPasswordSection(
    buildConfiguredInlineSections({
      fields: USER_FORM_FIELDS,
      layout: formCustomization,
      fieldDefinitions,
      sectionDescriptions: USER_SECTION_DESCRIPTIONS,
    }),
    formRequirements.userCreate,
    initialValues.password ?? ''
  )

  return (
    <RecordCreateDetailPageClient
      resource="users"
      backHref="/users"
      backLabel="<- Back to Users"
      title="New User"
      detailsTitle="User details"
      formId="create-user-inline-form"
      sections={sections}
      formColumns={formCustomization.formColumns}
      createEndpoint="/api/users"
      successRedirectBasePath="/users"
    />
  )
}
