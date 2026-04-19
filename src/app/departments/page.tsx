import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import CreateModalButton from '@/components/CreateModalButton'
import DepartmentCreateForm from '@/components/DepartmentCreateForm'
import MasterDataPageHeader from '@/components/MasterDataPageHeader'
import MasterDataListSection from '@/components/MasterDataListSection'
import { MasterDataBodyCell, MasterDataEmptyStateRow, MasterDataHeaderCell, MasterDataMutedCell } from '@/components/MasterDataTableCells'
import EditButton from '@/components/EditButton'
import DeleteButton from '@/components/DeleteButton'
import PaginationFooter from '@/components/PaginationFooter'
import { getPagination } from '@/lib/pagination'
import { MASTER_DATA_TABLE_DIVIDER_STYLE, getMasterDataRowStyle } from '@/lib/master-data-table'
import { displayMasterDataValue, formatMasterDataDate } from '@/lib/master-data-display'
import { loadCompanyPageLogo } from '@/lib/company-page-logo'
import { loadDepartmentCustomization } from '@/lib/department-customization-store'
import { loadDepartmentFormCustomization } from '@/lib/department-form-customization-store'
import { loadCustomListState } from '@/lib/custom-list-store'
import { loadListValues } from '@/lib/load-list-values'
import {
  departmentColumnLabels,
  departmentListDefinition,
} from '@/lib/master-data-list-definitions'
import {
  CUSTOM_FIELD_TYPES,
  CustomFieldDefinitionSummary,
} from '@/lib/custom-fields'

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>
}) {
  const params = await searchParams
  const query = (params.q ?? '').trim()
  const sort = params.sort ?? 'newest'

  const where = query
    ? { OR: [{ departmentId: { contains: query } }, { name: { contains: query } }, { description: { contains: query } }, { division: { contains: query } }] }
    : {}

  const total = await prisma.department.count({ where })
  const pagination = getPagination(total, params.page)
  const orderBy =
    sort === 'oldest'
      ? [{ createdAt: 'asc' as const }]
      : sort === 'name'
        ? [{ name: 'asc' as const }, { departmentId: 'asc' as const }]
        : [{ createdAt: 'desc' as const }]

  const [departments, managers, subsidiaries, companyLogoPages, customization, formCustomization, customListState, customFields, divisionValues] = await Promise.all([
    prisma.department.findMany({ where, include: { entity: true }, orderBy, skip: pagination.skip, take: pagination.pageSize }),
    prisma.employee.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, employeeId: true },
    }),
    prisma.entity.findMany({ orderBy: { subsidiaryId: 'asc' }, select: { id: true, subsidiaryId: true, name: true } }),
    loadCompanyPageLogo(),
    loadDepartmentCustomization(),
    loadDepartmentFormCustomization(),
    loadCustomListState(),
    prisma.customFieldDefinition.findMany({
      where: { entityType: 'department', active: true },
      orderBy: [{ label: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, name: true, label: true, type: true, required: true, defaultValue: true, options: true, entityType: true },
    }),
    loadListValues('DIVISION'),
  ])

  const configuredColumnOrder = Array.isArray(customization.columnOrder) ? customization.columnOrder : []
  const fixedFirst = ['department-id', 'name']
  const defaultOrder = ['description', 'division', 'subsidiary', 'manager', 'status', 'created', 'last-modified']
  const orderedMiddle = [
    ...configuredColumnOrder.filter((id) => !fixedFirst.includes(id) && id !== 'actions' && defaultOrder.includes(id)),
    ...defaultOrder.filter((id) => !configuredColumnOrder.includes(id)),
  ]

  const orderedColumns = [
    'department-id',
    'name',
    ...orderedMiddle.filter((id) => {
      if (id === 'description') return customization.tableVisibility.description
      if (id === 'division') return customization.tableVisibility.division
      if (id === 'subsidiary') return customization.tableVisibility.subsidiary
      if (id === 'manager') return customization.tableVisibility.manager
      if (id === 'status') return customization.tableVisibility.status
      return true
    }),
    'actions',
  ]

  const divisionOptions = divisionValues.length > 0 ? divisionValues : (() => {
    const divisionCustomListId = customization.listBindings.divisionCustomListId
    const divisionRows = divisionCustomListId ? customListState.customRows[divisionCustomListId] ?? [] : []
    return divisionRows.map((row) => row.value)
  })()
  const normalizedCustomFields: CustomFieldDefinitionSummary[] = customFields.flatMap((field) => (
    CUSTOM_FIELD_TYPES.includes(field.type as (typeof CUSTOM_FIELD_TYPES)[number])
      ? [{
          ...field,
          type: field.type as CustomFieldDefinitionSummary['type'],
        }]
      : []
  ))

  const managerById = new Map(
    managers.map((manager) => [manager.id, `${manager.firstName} ${manager.lastName}${manager.employeeId ? ` (${manager.employeeId})` : ''}`])
  )

  const buildPageHref = (p: number) => {
    const s = new URLSearchParams()
    if (params.q) s.set('q', params.q)
    if (sort) s.set('sort', sort)
    s.set('page', String(p))
    return `/departments?${s.toString()}`
  }

  return (
    <div className="min-h-full px-8 py-8">
      <MasterDataPageHeader
        title="Departments"
        total={total}
        logoUrl={companyLogoPages?.url}
        actions={
          <CreateModalButton buttonLabel="New Department" title="New Department">
            <DepartmentCreateForm managers={managers} subsidiaries={subsidiaries} customization={customization} divisionOptions={divisionOptions} customFields={normalizedCustomFields} />
          </CreateModalButton>
        }
      />

      <MasterDataListSection
        query={params.q}
        searchPlaceholder={departmentListDefinition.searchPlaceholder}
        tableId={departmentListDefinition.tableId}
        exportFileName={departmentListDefinition.exportFileName}
        columns={departmentListDefinition.columns}
        sort={sort}
        sortOptions={departmentListDefinition.sortOptions}
      >
        <table className="min-w-full" id={departmentListDefinition.tableId}>
          <thead>
            <tr style={MASTER_DATA_TABLE_DIVIDER_STYLE}>
              {orderedColumns.map((columnId) => (
                <MasterDataHeaderCell key={columnId} columnId={columnId}>
                  {departmentColumnLabels[columnId] ?? columnId}
                </MasterDataHeaderCell>
              ))}
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 ? (
              <MasterDataEmptyStateRow colSpan={orderedColumns.length}>No departments found</MasterDataEmptyStateRow>
            ) : (
              departments.map((department, index) => (
                <tr key={department.id} style={getMasterDataRowStyle(index, departments.length)}>
                  {orderedColumns.map((columnId) => {
                    if (columnId === 'department-id') {
                      return (
                        <MasterDataBodyCell key={`${department.id}-${columnId}`} columnId="department-id" className="px-4 py-2 text-sm font-medium text-white">
                          <Link href={`/departments/${department.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                            {department.departmentId}
                          </Link>
                        </MasterDataBodyCell>
                      )
                    }

                    if (columnId === 'name') {
                      return <MasterDataMutedCell key={`${department.id}-${columnId}`} columnId="name">{department.name}</MasterDataMutedCell>
                    }

                    if (columnId === 'description') {
                      return <MasterDataMutedCell key={`${department.id}-${columnId}`} columnId="description">{displayMasterDataValue(department.description)}</MasterDataMutedCell>
                    }

                    if (columnId === 'division') {
                      return <MasterDataMutedCell key={`${department.id}-${columnId}`} columnId="division">{displayMasterDataValue(department.division)}</MasterDataMutedCell>
                    }

                    if (columnId === 'subsidiary') {
                      return <MasterDataMutedCell key={`${department.id}-${columnId}`} columnId="subsidiary">{department.entity ? `${department.entity.subsidiaryId} - ${department.entity.name}` : '-'}</MasterDataMutedCell>
                    }

                    if (columnId === 'manager') {
                      return <MasterDataMutedCell key={`${department.id}-${columnId}`} columnId="manager">{displayMasterDataValue(managerById.get(department.managerId ?? ''))}</MasterDataMutedCell>
                    }

                    if (columnId === 'status') {
                      return <MasterDataMutedCell key={`${department.id}-${columnId}`} columnId="status">{department.active ? 'No' : 'Yes'}</MasterDataMutedCell>
                    }

                    if (columnId === 'created') {
                      return <MasterDataMutedCell key={`${department.id}-${columnId}`} columnId="created">{formatMasterDataDate(department.createdAt)}</MasterDataMutedCell>
                    }

                    if (columnId === 'last-modified') {
                      return <MasterDataMutedCell key={`${department.id}-${columnId}`} columnId="last-modified">{formatMasterDataDate(department.updatedAt)}</MasterDataMutedCell>
                    }

                    const editFields = [
                      { name: 'departmentId', label: 'Department Id', value: department.departmentId },
                      { name: 'name', label: 'Name', value: department.name },
                      ...(formCustomization.fields.description.visible ? [{ name: 'description', label: 'Description', value: department.description ?? '' }] : []),
                      ...(formCustomization.fields.division.visible ? [{ name: 'division', label: 'Division', value: department.division ?? '' }] : []),
                      ...(formCustomization.fields.entityId.visible
                        ? [{
                            name: 'entityId',
                            label: 'Subsidiary',
                            value: department.entityId ?? '',
                            type: 'select' as const,
                            placeholder: 'Select subsidiary',
                            options: subsidiaries.map((subsidiary) => ({
                              value: subsidiary.id,
                              label: `${subsidiary.subsidiaryId} - ${subsidiary.name}`,
                            })),
                          }]
                        : []),
                      ...(formCustomization.fields.managerId.visible
                        ? [{
                            name: 'managerId',
                            label: 'Manager',
                            value: department.managerId ?? '',
                            type: 'select' as const,
                            placeholder: 'Select manager',
                            options: managers.map((manager) => ({
                              value: manager.id,
                              label: `${manager.firstName} ${manager.lastName}${manager.employeeId ? ` (${manager.employeeId})` : ''}`,
                            })),
                          }]
                        : []),
                      {
                        name: 'inactive',
                        label: 'Inactive',
                        value: String(!department.active),
                        type: 'select' as const,
                        options: [
                          { value: 'false', label: 'No' },
                          { value: 'true', label: 'Yes' },
                        ],
                      },
                    ]

                    return (
                      <MasterDataBodyCell key={`${department.id}-${columnId}`} columnId="actions">
                        <div className="flex items-center gap-2">
                          <EditButton resource="departments" id={department.id} fields={editFields} />
                          <DeleteButton resource="departments" id={department.id} />
                        </div>
                      </MasterDataBodyCell>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
        <PaginationFooter
          startRow={pagination.startRow}
          endRow={pagination.endRow}
          total={total}
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          hasPrevPage={pagination.hasPrevPage}
          hasNextPage={pagination.hasNextPage}
          prevHref={buildPageHref(pagination.currentPage - 1)}
          nextHref={buildPageHref(pagination.currentPage + 1)}
        />
      </MasterDataListSection>
    </div>
  )
}
