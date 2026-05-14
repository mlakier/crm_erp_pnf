import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

import { getDimensionConfigurationRows } from '@/lib/dimension-control-plane'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const REQUIRED_HEADER_SUFFIX = ' (Required)'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dimensionId = searchParams.get('dimensionId')

    if (!dimensionId) {
      return NextResponse.json({ error: 'Dimension id is required.' }, { status: 400 })
    }

    const rows = await getDimensionConfigurationRows()
    const dimension = rows.find((row) => row.id === dimensionId)
    if (!dimension) {
      return NextResponse.json({ error: 'Dimension definition not found.' }, { status: 404 })
    }

    const importableSeededFields = dimension.valueFields.filter((field) => field.source === 'seeded' && field.status === 'live')
    const customFields = dimension.valueFields.filter((field) => field.source === 'custom')
    const includeParent = dimension.valueSourceType === 'department' || dimension.valueSourceType === 'location'
    const includeSubsidiaries = dimension.valueSourceType === 'department' || dimension.valueSourceType === 'location'
    const includeChildren = dimension.valueSourceType === 'department'

    const headers = [
      'dbId',
      'businessId',
      'code',
      'name',
      'description',
      ...(includeParent ? ['parentBusinessId'] : []),
      ...(includeSubsidiaries ? ['subsidiaryCodes'] : []),
      ...(includeChildren ? ['includeChildren'] : []),
      'inactive',
      ...importableSeededFields.map((field) => field.name),
      ...customFields.map((field) => `custom_${field.name}`),
    ]
    const requiredHeaders = new Set(['code', 'name'])
    const exportRows = await buildExportRows(dimension.id, dimension.valueSourceType)

    const data = [
      headers.map((header) => `${header}${requiredHeaders.has(header) ? REQUIRED_HEADER_SUFFIX : ''}`),
      ...dimension.values.map((value) => {
        const exportRow = exportRows.get(value.id)
        return [
        value.dbId,
        value.businessId,
        value.code,
        value.name,
        value.description,
        ...(includeParent ? [exportRow?.parentBusinessId ?? ''] : []),
        ...(includeSubsidiaries ? [exportRow?.subsidiaryCodes ?? ''] : []),
        ...(includeChildren ? [exportRow?.includeChildren ? 'TRUE' : 'FALSE'] : []),
        value.isActive ? 'FALSE' : 'TRUE',
        ...importableSeededFields.map((field) => exportRow?.seededValues[field.name] ?? ''),
        ...customFields.map((field) => value.customFieldValues[field.id] ?? ''),
      ]}),
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dimension Values')
    worksheet['!cols'] = headers.map(() => ({ wch: 22 }))
    worksheet['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: Math.max(data.length - 1, 0), c: Math.max(headers.length - 1, 0) },
      }),
    }

    headers.forEach((header, index) => {
      const address = XLSX.utils.encode_cell({ r: 0, c: index })
      const cell = worksheet[address]
      if (!cell) return
      cell.s = {
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: requiredHeaders.has(header) ? 'FFC00000' : 'FF1F4E79' }, patternType: 'solid' },
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
      }
    })

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
    const safeName = dimension.dimensionKey.replace(/[^a-z0-9_-]/gi, '_')

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${safeName}_dimension_values_${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate dimension value template.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function buildExportRows(dimensionId: string, valueSourceType: string) {
  const rows = new Map<string, {
    parentBusinessId: string
    subsidiaryCodes: string
    includeChildren: boolean
    seededValues: Record<string, string>
  }>()

  if (valueSourceType === 'department') {
    const departments = await prisma.department.findMany({
      include: {
        parentDepartment: { select: { departmentId: true, departmentNumber: true } },
        departmentSubsidiaries: { include: { subsidiary: { select: { subsidiaryId: true } } } },
        manager: { select: { employeeId: true } },
        approver: { select: { employeeId: true } },
      },
    })
    departments.forEach((department) => {
      rows.set(department.id, {
        parentBusinessId: department.parentDepartment?.departmentId ?? department.parentDepartment?.departmentNumber ?? '',
        subsidiaryCodes: department.departmentSubsidiaries.map((entry) => entry.subsidiary.subsidiaryId).join(';'),
        includeChildren: department.includeChildren,
        seededValues: {
          division: department.division ?? '',
          planning_category: department.planningCategory ?? '',
          manager: department.manager?.employeeId ?? '',
          approver: department.approver?.employeeId ?? '',
        },
      })
    })
  } else if (valueSourceType === 'location') {
    const locations = await prisma.location.findMany({
      include: {
        parentLocation: { select: { locationId: true, code: true } },
        subsidiary: { select: { subsidiaryId: true } },
      },
    })
    locations.forEach((location) => {
      rows.set(location.id, {
        parentBusinessId: location.parentLocation?.locationId ?? location.parentLocation?.code ?? '',
        subsidiaryCodes: location.subsidiary?.subsidiaryId ?? '',
        includeChildren: false,
        seededValues: {
          location_type: location.locationType ?? '',
          address: location.address ?? '',
          make_inventory_available: location.makeInventoryAvailable ? 'TRUE' : 'FALSE',
          approver: '',
        },
      })
    })
  } else if (valueSourceType === 'class') {
    const classes = await prisma.classDimension.findMany({ select: { id: true } })
    classes.forEach((classRow) => {
      rows.set(classRow.id, { parentBusinessId: '', subsidiaryCodes: '', includeChildren: false, seededValues: {} })
    })
  } else {
    const values = await prisma.dimensionValue.findMany({ where: { dimensionDefinitionId: dimensionId }, select: { id: true } })
    values.forEach((value) => {
      rows.set(value.id, { parentBusinessId: '', subsidiaryCodes: '', includeChildren: false, seededValues: {} })
    })
  }

  return rows
}
