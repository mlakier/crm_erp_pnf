import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getDimensionConfigurationRows } from '@/lib/dimension-control-plane'

const ALLOWED_TARGET_TYPES = new Set(['customer', 'vendor'])
const SEEDED_SOURCE_MODELS = new Set(['department', 'location', 'class'])

function toOptionalString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function getRequestUrl(request: Request) {
  return new URL(request.url)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = getRequestUrl(request)
    const targetType = toOptionalString(searchParams.get('targetType'))
    const targetId = toOptionalString(searchParams.get('targetId'))

    if (!targetType || !ALLOWED_TARGET_TYPES.has(targetType) || !targetId) {
      return NextResponse.json({ error: 'Valid targetType and targetId are required.' }, { status: 400 })
    }

    const assignments = await prisma.dimensionAssignment.findMany({
      where: { targetType, targetId, scopeLevel: 'default' },
      include: {
        dimensionDefinition: { select: { id: true, dimensionKey: true, label: true, valueSourceType: true } },
        dimensionValue: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      assignments: assignments.map((assignment) => ({
        id: assignment.id,
        dimensionDefinitionId: assignment.dimensionDefinitionId,
        dimensionKey: assignment.dimensionDefinition.dimensionKey,
        label: assignment.dimensionDefinition.label,
        valueId: assignment.dimensionValueId ?? assignment.sourceRecordId,
        sourceModel: assignment.dimensionValueId ? 'dimension_value' : assignment.sourceRecordType,
        sourceRecordId: assignment.sourceRecordId,
        sourceRecordType: assignment.sourceRecordType,
        valueLabel: assignment.dimensionValue
          ? `${assignment.dimensionValue.code} - ${assignment.dimensionValue.name}`
          : null,
      })),
    })
  } catch (error) {
    console.error('Failed to load dimension assignments', error)
    return NextResponse.json({ error: 'Failed to load dimension assignments.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const targetType = toOptionalString(body?.targetType)
    const targetId = toOptionalString(body?.targetId)
    const assignments = Array.isArray(body?.assignments) ? body.assignments : []

    if (!targetType || !ALLOWED_TARGET_TYPES.has(targetType) || !targetId) {
      return NextResponse.json({ error: 'Valid targetType and targetId are required.' }, { status: 400 })
    }

    const rows = await getDimensionConfigurationRows()
    const dimensionIds = new Set(rows.map((row) => row.id))

    await prisma.$transaction(async (tx) => {
      for (const entry of assignments) {
        const dimensionDefinitionId = toOptionalString(entry?.dimensionDefinitionId)
        const rawValueId = toOptionalString(entry?.valueId)
        const sourceModel = toOptionalString(entry?.sourceModel)

        if (!dimensionDefinitionId || !dimensionIds.has(dimensionDefinitionId)) continue

        const existing = await tx.dimensionAssignment.findFirst({
          where: {
            targetType,
            targetId,
            scopeLevel: 'default',
            dimensionDefinitionId,
          },
          select: { id: true },
        })

        if (!rawValueId) {
          if (existing) await tx.dimensionAssignment.delete({ where: { id: existing.id } })
          continue
        }

        const isSeededSource = Boolean(sourceModel && SEEDED_SOURCE_MODELS.has(sourceModel))
        const data = {
          targetType,
          targetId,
          scopeLevel: 'default',
          dimensionDefinitionId,
          dimensionValueId: isSeededSource ? null : rawValueId,
          sourceType: 'manual_default',
          sourceRecordType: isSeededSource ? sourceModel : 'dimension_value',
          sourceRecordId: rawValueId,
          isOverridden: false,
        }

        if (existing) {
          await tx.dimensionAssignment.update({
            where: { id: existing.id },
            data,
          })
        } else {
          await tx.dimensionAssignment.create({ data })
        }
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to save dimension assignments', error)
    return NextResponse.json({ error: 'Failed to save dimension assignments.' }, { status: 500 })
  }
}
