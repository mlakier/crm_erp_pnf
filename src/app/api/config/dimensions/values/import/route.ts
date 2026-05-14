import { NextResponse } from 'next/server'

import { getDimensionConfigurationRows, getDimensionValueFieldEntityType } from '@/lib/dimension-control-plane'
import { getDimensionValueDeleteBlockers } from '@/lib/dimension-value-usage'
import { generateNextDepartmentId } from '@/lib/department-id'
import { generateNextLocationId } from '@/lib/location-number'
import { prisma } from '@/lib/prisma'
import {
  getImportText,
  parseDimensionImportRows,
  parseImportBoolean,
  type ParsedDimensionImportRow,
} from '@/lib/dimension-value-import-utils'

export const runtime = 'nodejs'

type ImportMode = 'add' | 'update' | 'addOrUpdate'
type ImportError = { row: number; message: string }

function normalizeValueKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function getCustomFieldImportValue(row: ParsedDimensionImportRow, field: { name: string; label: string }) {
  return getImportText(row, `custom_${field.name}`, field.name, field.label)
}

async function saveCustomFieldValues({
  row,
  recordId,
  dimensionKey,
  customFields,
}: {
  row: ParsedDimensionImportRow
  recordId: string
  dimensionKey: string
  customFields: Array<{ id: string; name: string; label: string; required: boolean; defaultValue: string }>
}) {
  const entityType = getDimensionValueFieldEntityType(dimensionKey)
  for (const field of customFields) {
    const value = getCustomFieldImportValue(row, field) || field.defaultValue || ''
    if (!value && !field.required) continue

    const existing = await prisma.customFieldValue.findFirst({
      where: { fieldId: field.id, recordId, entityType },
      select: { id: true },
    })

    if (existing) {
      await prisma.customFieldValue.update({ where: { id: existing.id }, data: { value } })
    } else {
      await prisma.customFieldValue.create({
        data: { fieldId: field.id, recordId, entityType, value },
      })
    }
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const dimensionId = String(formData.get('dimensionId') ?? '').trim()
    const mode = String(formData.get('mode') ?? 'update') as ImportMode
    const dryRun = String(formData.get('dryRun') ?? 'true') === 'true'
    const file = formData.get('file')

    if (!dimensionId) {
      return NextResponse.json({ error: 'Dimension id is required.' }, { status: 400 })
    }
    if (!['add', 'update', 'addOrUpdate'].includes(mode)) {
      return NextResponse.json({ error: 'Unsupported import mode.' }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Upload file is required.' }, { status: 400 })
    }

    const [dimensionDefinition, rowsSnapshot] = await Promise.all([
      prisma.dimensionDefinition.findUnique({
        where: { id: dimensionId },
        select: { id: true, dimensionKey: true, valueSourceType: true },
      }),
      getDimensionConfigurationRows(),
    ])
    const dimension = rowsSnapshot.find((row) => row.id === dimensionId)
    if (!dimensionDefinition || !dimension) {
      return NextResponse.json({ error: 'Dimension definition not found.' }, { status: 404 })
    }

    const rows = parseDimensionImportRows(file.name, await file.arrayBuffer())
    const errors: ImportError[] = []
    let succeeded = 0
    const customFields = dimension.valueFields
      .filter((field) => field.source === 'custom')
      .map((field) => ({
        id: field.id,
        name: field.name,
        label: field.label,
        required: field.required,
        defaultValue: field.defaultValue,
      }))

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const rowNumber = index + 2
      const dbId = getImportText(row, 'dbId', 'DB ID')
      const businessId = getImportText(row, 'businessId', 'Business ID')
      const code = getImportText(row, 'code', 'Code')
      const name = getImportText(row, 'name', 'Name')
      const description = getImportText(row, 'description', 'Description')
      const inactive = parseImportBoolean(getImportText(row, 'inactive', 'Inactive'), false)

      if (!code) {
        errors.push({ row: rowNumber, message: 'code is required.' })
        continue
      }
      if (!name) {
        errors.push({ row: rowNumber, message: 'name is required.' })
        continue
      }

      const missingCustom = customFields.find((field) => field.required && !getCustomFieldImportValue(row, field) && !field.defaultValue)
      if (missingCustom) {
        errors.push({ row: rowNumber, message: `${missingCustom.label} is required.` })
        continue
      }

      const result = await importOneValue({
        row,
        rowNumber,
        dimension,
        dimensionDefinition,
        mode,
        dryRun,
        dbId,
        businessId,
        code,
        name,
        description,
        inactive,
        customFields,
        errors,
      })
      if (result) succeeded += 1
    }

    const refreshedRows = await getDimensionConfigurationRows()
    const refreshed = refreshedRows.find((row) => row.id === dimensionId)

    return NextResponse.json({
      ok: errors.length === 0,
      dryRun,
      mode,
      rows: rows.length,
      succeeded: errors.length > 0 && dryRun ? 0 : succeeded,
      failed: errors.length,
      errors,
      row: refreshed,
    })
  } catch (error) {
    console.error('Failed to import dimension values', error)
    const message = error instanceof Error ? error.message : 'Failed to import dimension values.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function importOneValue({
  row,
  dimension,
  dimensionDefinition,
  mode,
  dryRun,
  dbId,
  businessId,
  code,
  name,
  description,
  inactive,
  customFields,
  errors,
  rowNumber,
}: {
  row: ParsedDimensionImportRow
  rowNumber: number
  dimension: Awaited<ReturnType<typeof getDimensionConfigurationRows>>[number]
  dimensionDefinition: { id: string; dimensionKey: string; valueSourceType: string }
  mode: ImportMode
  dryRun: boolean
  dbId: string
  businessId: string
  code: string
  name: string
  description: string
  inactive: boolean
  customFields: Array<{ id: string; name: string; label: string; required: boolean; defaultValue: string }>
  errors: ImportError[]
}) {
  if (dimensionDefinition.valueSourceType === 'department') {
    return importDepartmentValue({ row, rowNumber, mode, dryRun, dbId, businessId, code, name, description, inactive, customFields, dimensionKey: dimension.dimensionKey, errors })
  }
  if (dimensionDefinition.valueSourceType === 'location') {
    return importLocationValue({ row, rowNumber, mode, dryRun, dbId, businessId, code, name, description, inactive, customFields, dimensionKey: dimension.dimensionKey, errors })
  }
  if (dimensionDefinition.valueSourceType === 'class') {
    return importClassValue({ row, rowNumber, mode, dryRun, dbId, businessId, code, name, description, inactive, customFields, dimensionKey: dimension.dimensionKey, errors })
  }
  return importGenericValue({ row, rowNumber, dimensionId: dimension.id, dimensionKey: dimension.dimensionKey, mode, dryRun, dbId, businessId, code, name, description, inactive, customFields, errors })
}

async function importDepartmentValue(args: CommonImportArgs) {
  const { row, rowNumber, mode, dryRun, dbId, businessId, code, name, description, inactive, customFields, dimensionKey, errors } = args
  const existing = await prisma.department.findFirst({
    where: dbId ? { id: dbId } : businessId ? { departmentId: businessId } : { departmentNumber: code },
    select: { id: true },
  })
  if (!validateMode(mode, rowNumber, existing?.id, errors)) return false

  const duplicate = await prisma.department.findFirst({
    where: {
      OR: [{ departmentNumber: code }, ...(businessId ? [{ departmentId: businessId }] : [])],
      ...(existing ? { NOT: { id: existing.id } } : {}),
    },
    select: { departmentId: true, departmentNumber: true },
  })
  if (duplicate) {
    errors.push({ row: rowNumber, message: 'businessId or code already exists on another department.' })
    return false
  }

  const parentBusinessId = getImportText(row, 'parentBusinessId', 'Parent Business ID')
  const parent = parentBusinessId
    ? await prisma.department.findFirst({ where: { OR: [{ departmentId: parentBusinessId }, { departmentNumber: parentBusinessId }] }, select: { id: true } })
    : null
  if (parentBusinessId && !parent) {
    errors.push({ row: rowNumber, message: `parentBusinessId "${parentBusinessId}" was not found.` })
    return false
  }

  const subsidiaryCodes = splitCodes(getImportText(row, 'subsidiaryCodes', 'Subsidiary Codes'))
  const subsidiaries = subsidiaryCodes.length
    ? await prisma.subsidiary.findMany({ where: { subsidiaryId: { in: subsidiaryCodes } }, select: { id: true, subsidiaryId: true } })
    : []
  const missingSubsidiaries = subsidiaryCodes.filter((codeValue) => !subsidiaries.some((subsidiary) => subsidiary.subsidiaryId === codeValue))
  if (missingSubsidiaries.length > 0) {
    errors.push({ row: rowNumber, message: `subsidiaryCodes not found: ${missingSubsidiaries.join(', ')}.` })
    return false
  }

  const managerCode = getImportText(row, 'manager', 'Manager')
  const approverCode = getImportText(row, 'approver', 'Approver')
  const manager = managerCode
    ? await prisma.employee.findFirst({ where: { OR: [{ employeeId: managerCode }, { id: managerCode }] }, select: { id: true } })
    : null
  const approver = approverCode
    ? await prisma.employee.findFirst({ where: { OR: [{ employeeId: approverCode }, { id: approverCode }] }, select: { id: true } })
    : null
  if (managerCode && !manager) {
    errors.push({ row: rowNumber, message: `manager "${managerCode}" was not found.` })
    return false
  }
  if (approverCode && !approver) {
    errors.push({ row: rowNumber, message: `approver "${approverCode}" was not found.` })
    return false
  }

  if (dryRun) return true

  const record = existing
    ? await prisma.department.update({
        where: { id: existing.id },
        data: {
          ...(businessId ? { departmentId: businessId } : {}),
          departmentNumber: code,
          name,
          description,
          division: getImportText(row, 'division', 'Division') || null,
          planningCategory: getImportText(row, 'planning_category', 'planningCategory', 'Planning Category') || null,
          managerEmployeeId: manager?.id ?? null,
          approverEmployeeId: approver?.id ?? null,
          parentDepartmentId: parent?.id ?? null,
          includeChildren: parseImportBoolean(getImportText(row, 'includeChildren', 'Include Children'), false),
          active: !inactive,
        },
        select: { id: true },
      })
    : await prisma.department.create({
        data: {
          departmentId: businessId || await generateNextDepartmentId(),
          departmentNumber: code,
          name,
          description,
          division: getImportText(row, 'division', 'Division') || null,
          planningCategory: getImportText(row, 'planning_category', 'planningCategory', 'Planning Category') || null,
          managerEmployeeId: manager?.id ?? null,
          approverEmployeeId: approver?.id ?? null,
          parentDepartmentId: parent?.id ?? null,
          includeChildren: parseImportBoolean(getImportText(row, 'includeChildren', 'Include Children'), false),
          active: !inactive,
        },
        select: { id: true },
      })

  await prisma.departmentSubsidiary.deleteMany({ where: { departmentId: record.id } })
  if (subsidiaries.length > 0) {
    await prisma.departmentSubsidiary.createMany({
      data: subsidiaries.map((subsidiary) => ({ departmentId: record.id, subsidiaryId: subsidiary.id })),
      skipDuplicates: true,
    })
  }
  await saveCustomFieldValues({ row, recordId: record.id, dimensionKey, customFields })
  return true
}

async function importLocationValue(args: CommonImportArgs) {
  const { row, rowNumber, mode, dryRun, dbId, businessId, code, name, description, inactive, customFields, dimensionKey, errors } = args
  const existing = await prisma.location.findFirst({
    where: dbId ? { id: dbId } : businessId ? { locationId: businessId } : { code },
    select: { id: true },
  })
  if (!validateMode(mode, rowNumber, existing?.id, errors)) return false

  const duplicate = await prisma.location.findFirst({
    where: {
      OR: [{ code }, ...(businessId ? [{ locationId: businessId }] : [])],
      ...(existing ? { NOT: { id: existing.id } } : {}),
    },
    select: { locationId: true, code: true },
  })
  if (duplicate) {
    errors.push({ row: rowNumber, message: 'businessId or code already exists on another location.' })
    return false
  }

  const parentBusinessId = getImportText(row, 'parentBusinessId', 'Parent Business ID')
  const parent = parentBusinessId
    ? await prisma.location.findFirst({ where: { OR: [{ locationId: parentBusinessId }, { code: parentBusinessId }] }, select: { id: true } })
    : null
  if (parentBusinessId && !parent) {
    errors.push({ row: rowNumber, message: `parentBusinessId "${parentBusinessId}" was not found.` })
    return false
  }

  const subsidiaryCode = splitCodes(getImportText(row, 'subsidiaryCodes', 'Subsidiary Codes'))[0] ?? ''
  const subsidiary = subsidiaryCode
    ? await prisma.subsidiary.findUnique({ where: { subsidiaryId: subsidiaryCode }, select: { id: true } })
    : null
  if (subsidiaryCode && !subsidiary) {
    errors.push({ row: rowNumber, message: `subsidiaryCode "${subsidiaryCode}" was not found.` })
    return false
  }

  if (dryRun) return true

  const record = existing
    ? await prisma.location.update({
        where: { id: existing.id },
        data: {
          ...(businessId ? { locationId: businessId } : {}),
          code,
          name,
          address: getImportText(row, 'address', 'Address') || description,
          locationType: getImportText(row, 'location_type', 'locationType', 'Location Type') || null,
          makeInventoryAvailable: parseImportBoolean(getImportText(row, 'make_inventory_available', 'makeInventoryAvailable', 'Make Inventory Available'), true),
          parentLocationId: parent?.id ?? null,
          subsidiaryId: subsidiary?.id ?? null,
          inactive,
        },
        select: { id: true },
      })
    : await prisma.location.create({
        data: {
          locationId: businessId || await generateNextLocationId(),
          code,
          name,
          address: getImportText(row, 'address', 'Address') || description,
          locationType: getImportText(row, 'location_type', 'locationType', 'Location Type') || null,
          makeInventoryAvailable: parseImportBoolean(getImportText(row, 'make_inventory_available', 'makeInventoryAvailable', 'Make Inventory Available'), true),
          parentLocationId: parent?.id ?? null,
          subsidiaryId: subsidiary?.id ?? null,
          inactive,
        },
        select: { id: true },
      })
  await saveCustomFieldValues({ row, recordId: record.id, dimensionKey, customFields })
  return true
}

async function importClassValue(args: CommonImportArgs) {
  const { row, rowNumber, mode, dryRun, dbId, businessId, code, name, description, inactive, customFields, dimensionKey, errors } = args
  const resolvedBusinessId = businessId || code
  const existing = await prisma.classDimension.findFirst({
    where: dbId ? { id: dbId } : { classId: resolvedBusinessId },
    select: { id: true },
  })
  if (!validateMode(mode, rowNumber, existing?.id, errors)) return false
  const duplicate = await prisma.classDimension.findFirst({
    where: { classId: resolvedBusinessId, ...(existing ? { NOT: { id: existing.id } } : {}) },
    select: { id: true },
  })
  if (duplicate) {
    errors.push({ row: rowNumber, message: 'businessId already exists on another class.' })
    return false
  }
  if (dryRun) return true
  const record = existing
    ? await prisma.classDimension.update({ where: { id: existing.id }, data: { classId: resolvedBusinessId, name, description, inactive }, select: { id: true } })
    : await prisma.classDimension.create({ data: { classId: resolvedBusinessId, name, description, inactive }, select: { id: true } })
  await saveCustomFieldValues({ row, recordId: record.id, dimensionKey, customFields })
  return true
}

async function importGenericValue(args: CommonImportArgs & { dimensionId: string }) {
  const { row, rowNumber, dimensionId, dimensionKey, mode, dryRun, dbId, businessId, code, name, description, inactive, customFields, errors } = args
  const valueKey = normalizeValueKey(businessId || code)
  if (!valueKey) {
    errors.push({ row: rowNumber, message: 'businessId or code must contain at least one letter or number.' })
    return false
  }
  const existing = await prisma.dimensionValue.findFirst({
    where: dbId ? { id: dbId, dimensionDefinitionId: dimensionId } : { dimensionDefinitionId: dimensionId, OR: [{ valueKey }, { code }] },
    select: { id: true },
  })
  if (!validateMode(mode, rowNumber, existing?.id, errors)) return false
  const duplicate = await prisma.dimensionValue.findFirst({
    where: {
      dimensionDefinitionId: dimensionId,
      OR: [{ valueKey }, { code }],
      ...(existing ? { NOT: { id: existing.id } } : {}),
    },
    select: { id: true },
  })
  if (duplicate) {
    errors.push({ row: rowNumber, message: 'businessId or code already exists on another value.' })
    return false
  }
  if (dryRun) return true
  const record = existing
    ? await prisma.dimensionValue.update({ where: { id: existing.id }, data: { valueKey, code, name, description, isActive: !inactive }, select: { id: true } })
    : await prisma.dimensionValue.create({ data: { dimensionDefinitionId: dimensionId, valueKey, code, name, description, isActive: !inactive }, select: { id: true } })
  await saveCustomFieldValues({ row, recordId: record.id, dimensionKey, customFields })
  return true
}

type CommonImportArgs = {
  row: ParsedDimensionImportRow
  rowNumber: number
  mode: ImportMode
  dryRun: boolean
  dbId: string
  businessId: string
  code: string
  name: string
  description: string
  inactive: boolean
  customFields: Array<{ id: string; name: string; label: string; required: boolean; defaultValue: string }>
  dimensionKey: string
  errors: ImportError[]
}

function validateMode(mode: ImportMode, rowNumber: number, existingId: string | undefined, errors: ImportError[]) {
  if (mode === 'add' && existingId) {
    errors.push({ row: rowNumber, message: 'record already exists; use Update Only or Add Or Update.' })
    return false
  }
  if (mode === 'update' && !existingId) {
    errors.push({ row: rowNumber, message: 'record was not found for update.' })
    return false
  }
  return true
}

function splitCodes(value: string) {
  return value
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}
