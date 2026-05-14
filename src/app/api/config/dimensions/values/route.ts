import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getDimensionConfigurationRows } from '@/lib/dimension-control-plane'
import { generateNextDepartmentId } from '@/lib/department-id'
import { getDimensionValueDeleteBlockers } from '@/lib/dimension-value-usage'
import { generateNextLocationId } from '@/lib/location-number'

function toOptionalString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function toBoolean(value: unknown) {
  return value === true
}

function normalizeValueKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

async function ensureUniqueDepartmentValue({
  valueId,
  businessId,
  code,
}: {
  valueId: string | null
  businessId: string | null
  code: string
}) {
  if (businessId) {
    const existingBusinessId = await prisma.department.findUnique({ where: { departmentId: businessId }, select: { id: true } })
    if (existingBusinessId && existingBusinessId.id !== valueId) {
      return `Business ID ${businessId} is already used by another department.`
    }
  }

  const existingCode = await prisma.department.findUnique({ where: { departmentNumber: code }, select: { id: true } })
  if (existingCode && existingCode.id !== valueId) {
    return `Code ${code} is already used by another department.`
  }

  return null
}

async function ensureUniqueLocationValue({
  valueId,
  businessId,
  code,
}: {
  valueId: string | null
  businessId: string | null
  code: string
}) {
  if (businessId) {
    const existingBusinessId = await prisma.location.findUnique({ where: { locationId: businessId }, select: { id: true } })
    if (existingBusinessId && existingBusinessId.id !== valueId) {
      return `Business ID ${businessId} is already used by another location.`
    }
  }

  const existingCode = await prisma.location.findUnique({ where: { code }, select: { id: true } })
  if (existingCode && existingCode.id !== valueId) {
    return `Code ${code} is already used by another location.`
  }

  return null
}

async function ensureUniqueClassValue({
  valueId,
  businessId,
}: {
  valueId: string | null
  businessId: string
}) {
  const existingBusinessId = await prisma.classDimension.findUnique({ where: { classId: businessId }, select: { id: true } })
  if (existingBusinessId && existingBusinessId.id !== valueId) {
    return `Business ID ${businessId} is already used by another class.`
  }
  return null
}

async function ensureUniqueGenericValue({
  dimensionId,
  valueId,
  valueKey,
  code,
}: {
  dimensionId: string
  valueId: string | null
  valueKey: string
  code: string
}) {
  const [existingBusinessId, existingCode] = await Promise.all([
    prisma.dimensionValue.findFirst({
      where: { dimensionDefinitionId: dimensionId, valueKey },
      select: { id: true },
    }),
    prisma.dimensionValue.findFirst({
      where: { dimensionDefinitionId: dimensionId, code },
      select: { id: true },
    }),
  ])

  if (existingBusinessId && existingBusinessId.id !== valueId) {
    return `Business ID ${valueKey} is already used by another value.`
  }
  if (existingCode && existingCode.id !== valueId) {
    return `Code ${code} is already used by another value.`
  }
  return null
}

async function deleteDimensionValueCustomFields(dimensionKey: string, valueId: string) {
  await prisma.customFieldValue.deleteMany({
    where: {
      entityType: `dimension_value:${dimensionKey}`,
      recordId: valueId,
    },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const dimensionId = toOptionalString(body?.dimensionId)
    const valueId = toOptionalString(body?.valueId)
    const businessId = toOptionalString(body?.businessId)
    const code = toOptionalString(body?.code)
    const name = toOptionalString(body?.name)
    const description = toOptionalString(body?.description)
    const isActive = toBoolean(body?.isActive)

    if (!dimensionId) {
      return NextResponse.json({ error: 'Dimension id is required.' }, { status: 400 })
    }
    if (!code) {
      return NextResponse.json({ error: 'Code is required.' }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }

    const dimension = await prisma.dimensionDefinition.findUnique({
      where: { id: dimensionId },
      select: { id: true, valueSourceType: true, isSeeded: true },
    })

    if (!dimension) {
      return NextResponse.json({ error: 'Dimension definition not found.' }, { status: 404 })
    }

    if (dimension.valueSourceType === 'department') {
      const duplicateError = await ensureUniqueDepartmentValue({ valueId, businessId, code })
      if (duplicateError) {
        return NextResponse.json({ error: duplicateError }, { status: 409 })
      }

      if (valueId) {
        await prisma.department.update({
          where: { id: valueId },
          data: {
            ...(businessId ? { departmentId: businessId } : {}),
            departmentNumber: code,
            name,
            description,
            active: isActive,
          },
        })
      } else {
        await prisma.department.create({
          data: {
            departmentId: businessId ?? await generateNextDepartmentId(),
            departmentNumber: code,
            name,
            description,
            active: isActive,
          },
        })
      }
    } else if (dimension.valueSourceType === 'location') {
      const duplicateError = await ensureUniqueLocationValue({ valueId, businessId, code })
      if (duplicateError) {
        return NextResponse.json({ error: duplicateError }, { status: 409 })
      }

      if (valueId) {
        await prisma.location.update({
          where: { id: valueId },
          data: {
            ...(businessId ? { locationId: businessId } : {}),
            code,
            name,
            address: description,
            inactive: !isActive,
          },
        })
      } else {
        await prisma.location.create({
          data: {
            locationId: businessId ?? await generateNextLocationId(),
            code,
            name,
            address: description,
            inactive: !isActive,
          },
        })
      }
    } else if (dimension.valueSourceType === 'class') {
      const resolvedBusinessId = businessId ?? code
      const duplicateError = await ensureUniqueClassValue({ valueId, businessId: resolvedBusinessId })
      if (duplicateError) {
        return NextResponse.json({ error: duplicateError }, { status: 409 })
      }

      if (valueId) {
        await prisma.classDimension.update({
          where: { id: valueId },
          data: {
            classId: resolvedBusinessId,
            name,
            description,
            inactive: !isActive,
          },
        })
      } else {
        await prisma.classDimension.create({
          data: {
            classId: resolvedBusinessId,
            name,
            description,
            inactive: !isActive,
          },
        })
      }
    } else {
      const resolvedBusinessId = businessId ?? code
      const valueKey = normalizeValueKey(resolvedBusinessId)
      if (!valueKey) {
        return NextResponse.json({ error: 'Code must contain at least one letter or number.' }, { status: 400 })
      }
      const duplicateError = await ensureUniqueGenericValue({ dimensionId, valueId, valueKey, code })
      if (duplicateError) {
        return NextResponse.json({ error: duplicateError }, { status: 409 })
      }

      if (valueId) {
        await prisma.dimensionValue.update({
          where: { id: valueId },
          data: {
            valueKey,
            code,
            name,
            description,
            isActive,
          },
        })
      } else {
        await prisma.dimensionValue.create({
          data: {
            dimensionDefinitionId: dimensionId,
            valueKey,
            code,
            name,
            description,
            isActive,
          },
        })
      }
    }

    const rows = await getDimensionConfigurationRows()
    const refreshed = rows.find((entry) => entry.id === dimensionId)
    return NextResponse.json({ ok: true, row: refreshed })
  } catch (error) {
    console.error('Failed to save dimension value', error)
    return NextResponse.json({ error: 'Failed to save dimension value.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const dimensionId = toOptionalString(body?.dimensionId)
    const valueId = toOptionalString(body?.valueId)

    if (!dimensionId || !valueId) {
      return NextResponse.json({ error: 'Dimension id and value id are required.' }, { status: 400 })
    }

    const dimension = await prisma.dimensionDefinition.findUnique({
      where: { id: dimensionId },
      select: { id: true, dimensionKey: true, valueSourceType: true },
    })

    if (!dimension) {
      return NextResponse.json({ error: 'Dimension definition not found.' }, { status: 404 })
    }

    if (dimension.valueSourceType === 'department') {
      const blockers = await getDimensionValueDeleteBlockers('department', valueId)
      if (blockers.length > 0) {
        return NextResponse.json({ error: `This department is still used by ${blockers.join(', ')}.` }, { status: 409 })
      }
      await deleteDimensionValueCustomFields(dimension.dimensionKey, valueId)
      await prisma.department.delete({ where: { id: valueId } })
    } else if (dimension.valueSourceType === 'location') {
      const blockers = await getDimensionValueDeleteBlockers('location', valueId)
      if (blockers.length > 0) {
        return NextResponse.json({ error: `This location is still used by ${blockers.join(', ')}.` }, { status: 409 })
      }
      await deleteDimensionValueCustomFields(dimension.dimensionKey, valueId)
      await prisma.location.delete({ where: { id: valueId } })
    } else if (dimension.valueSourceType === 'class') {
      const blockers = await getDimensionValueDeleteBlockers('class', valueId)
      if (blockers.length > 0) {
        return NextResponse.json({ error: `This class is still used by ${blockers.join(', ')}.` }, { status: 409 })
      }
      await deleteDimensionValueCustomFields(dimension.dimensionKey, valueId)
      await prisma.classDimension.delete({ where: { id: valueId } })
    } else {
      await deleteDimensionValueCustomFields(dimension.dimensionKey, valueId)
      await prisma.dimensionValue.delete({ where: { id: valueId } })
    }

    const rows = await getDimensionConfigurationRows()
    const refreshed = rows.find((entry) => entry.id === dimensionId)
    return NextResponse.json({ ok: true, row: refreshed })
  } catch (error) {
    console.error('Failed to delete dimension value', error)
    return NextResponse.json({ error: 'Failed to delete dimension value.' }, { status: 500 })
  }
}
