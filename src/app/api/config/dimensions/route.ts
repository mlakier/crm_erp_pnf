import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  DIMENSION_TRANSACTION_FAMILIES,
  DIMENSION_SOURCING_TARGETS,
  DIMENSION_TARGETS,
  ensureDimensionControlPlaneSeeded,
  getDimensionConfigurationRows,
  type DimensionTransactionFamilyKey,
  type DimensionSourcingTargetKey,
  type DimensionTargetKey,
} from '@/lib/dimension-control-plane'

function toOptionalString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function toBoolean(value: unknown) {
  return value === true
}

function normalizeSourcePriority(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
  return []
}

function normalizeDimensionKey(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized.length ? normalized : null
}

function isDimensionTargetKey(value: string): value is DimensionTargetKey {
  return (DIMENSION_TARGETS as readonly string[]).includes(value)
}

function isDimensionSourcingTargetKey(value: string): value is DimensionSourcingTargetKey {
  return (DIMENSION_SOURCING_TARGETS as readonly string[]).includes(value)
}

function isDimensionTransactionFamilyKey(value: string): value is DimensionTransactionFamilyKey {
  return (DIMENSION_TRANSACTION_FAMILIES as readonly string[]).includes(value)
}

export async function GET() {
  const rows = await getDimensionConfigurationRows()
  return NextResponse.json({ rows })
}

export async function POST(request: Request) {
  try {
    await ensureDimensionControlPlaneSeeded()

    const body = await request.json()
    const dimensionId = toOptionalString(body?.dimensionId)

    const label = toOptionalString(body?.label)
    const dimensionKey = normalizeDimensionKey(body?.dimensionKey)
    const description = toOptionalString(body?.description)
    const dimensionType = toOptionalString(body?.dimensionType)
    const valueSourceType = toOptionalString(body?.valueSourceType)
    const valueModel = toOptionalString(body?.valueModel)
    const selectionType = toOptionalString(body?.selectionType)
    const inheritanceMode = toOptionalString(body?.inheritanceMode)
    const overrideMode = toOptionalString(body?.overrideMode)
    const validationMode = toOptionalString(body?.validationMode)

    if (!label) {
      return NextResponse.json({ error: 'Label is required.' }, { status: 400 })
    }
    if (!dimensionId && !dimensionKey) {
      return NextResponse.json({ error: 'Dimension key is required.' }, { status: 400 })
    }
    if (!dimensionType) {
      return NextResponse.json({ error: 'Dimension type is required.' }, { status: 400 })
    }
    if (!valueSourceType) {
      return NextResponse.json({ error: 'Value source type is required.' }, { status: 400 })
    }
    if (!valueModel) {
      return NextResponse.json({ error: 'Value model is required.' }, { status: 400 })
    }
    if (!selectionType) {
      return NextResponse.json({ error: 'Selection type is required.' }, { status: 400 })
    }
    if (!inheritanceMode) {
      return NextResponse.json({ error: 'Inheritance mode is required.' }, { status: 400 })
    }
    if (!overrideMode) {
      return NextResponse.json({ error: 'Override mode is required.' }, { status: 400 })
    }
    if (!validationMode) {
      return NextResponse.json({ error: 'Validation mode is required.' }, { status: 400 })
    }

    const applicabilities: Array<Record<string, unknown>> = Array.isArray(body?.applicabilities) ? body.applicabilities : []
    const sourcingPolicies: Array<Record<string, unknown>> = Array.isArray(body?.sourcingPolicies) ? body.sourcingPolicies : []
    const transactionFamilyAssignments: Array<Record<string, unknown>> = Array.isArray(body?.transactionFamilyAssignments)
      ? body.transactionFamilyAssignments
      : []
    const transactionFamilySourcingPolicies: Array<Record<string, unknown>> = Array.isArray(body?.transactionFamilySourcingPolicies)
      ? body.transactionFamilySourcingPolicies
      : []

    if (!dimensionId) {
      const key = dimensionKey as string
      const existingKey = await prisma.dimensionDefinition.findUnique({
        where: { dimensionKey: key },
        select: { id: true },
      })

      if (existingKey) {
        return NextResponse.json({ error: 'Dimension key already exists.' }, { status: 409 })
      }

      const created = await prisma.$transaction(async (tx) => {
        const definition = await tx.dimensionDefinition.create({
          data: {
            dimensionKey: key,
            label,
            description,
            dimensionType,
            valueSourceType,
            valueModel,
            selectionType,
            isSeeded: false,
            isCustom: true,
            isActive: toBoolean(body?.isActive),
            allowsHeaderAssignment: toBoolean(body?.allowsHeaderAssignment),
            allowsLineAssignment: toBoolean(body?.allowsLineAssignment),
            allowsGlAssignment: toBoolean(body?.allowsGlAssignment),
            allowsProjectAssignment: toBoolean(body?.allowsProjectAssignment),
            allowsSubscriptionAssignment: toBoolean(body?.allowsSubscriptionAssignment),
            inheritanceMode,
            overrideMode,
            validationMode,
            postToGl: toBoolean(body?.postToGl),
            requiresGlSplit: toBoolean(body?.requiresGlSplit),
          },
          select: { id: true },
        })

        for (const targetKey of DIMENSION_TARGETS) {
          const applicability = applicabilities.find((entry) => entry?.targetKey === targetKey)
          await tx.dimensionApplicability.create({
            data: {
              dimensionDefinitionId: definition.id,
              targetKey,
              isVisible: toBoolean(applicability?.isVisible),
              isRequired: toBoolean(applicability?.isRequired),
              isLockedInCustomize: toBoolean(applicability?.isLockedInCustomize),
            },
          })

        }

        for (const targetKey of DIMENSION_SOURCING_TARGETS) {
          const sourcingPolicy = sourcingPolicies.find((entry) => entry?.targetKey === targetKey)
          await tx.dimensionSourcingPolicy.create({
            data: {
              dimensionDefinitionId: definition.id,
              targetKey,
              sourcePriorityJson: JSON.stringify(normalizeSourcePriority(sourcingPolicy?.sourcePriority)),
              allowHeaderInheritance: toBoolean(sourcingPolicy?.allowHeaderInheritance),
              allowSourceLineInheritance: toBoolean(sourcingPolicy?.allowSourceLineInheritance),
              allowProjectInheritance: toBoolean(sourcingPolicy?.allowProjectInheritance),
              allowSubscriptionInheritance: toBoolean(sourcingPolicy?.allowSubscriptionInheritance),
              allowManualOverride: toBoolean(sourcingPolicy?.allowManualOverride),
              failIfUnresolved: toBoolean(sourcingPolicy?.failIfUnresolved),
            },
          })
        }

        for (const familyKey of DIMENSION_TRANSACTION_FAMILIES) {
          const assignment = transactionFamilyAssignments.find((entry) => entry?.familyKey === familyKey)
          await tx.dimensionTransactionFamilyAssignment.create({
            data: {
              dimensionDefinitionId: definition.id,
              familyKey,
              allowsHeader: toBoolean(assignment?.allowsHeader),
              allowsLine: toBoolean(assignment?.allowsLine),
            },
          })

          const sourcingPolicy = transactionFamilySourcingPolicies.find((entry) => entry?.familyKey === familyKey)
          await tx.dimensionTransactionFamilySourcingPolicy.create({
            data: {
              dimensionDefinitionId: definition.id,
              familyKey,
              headerSourcePriorityJson: JSON.stringify(normalizeSourcePriority(sourcingPolicy?.headerSourcePriority)),
              lineSourcePriorityJson: JSON.stringify(normalizeSourcePriority(sourcingPolicy?.lineSourcePriority)),
              allowProjectInheritance: toBoolean(sourcingPolicy?.allowProjectInheritance),
              allowSubscriptionInheritance: toBoolean(sourcingPolicy?.allowSubscriptionInheritance),
              allowManualOverride: toBoolean(sourcingPolicy?.allowManualOverride),
              failIfUnresolved: toBoolean(sourcingPolicy?.failIfUnresolved),
            },
          })
        }

        return definition
      })

      const rows = await getDimensionConfigurationRows()
      return NextResponse.json({ ok: true, createdId: created.id, rows })
    }

    const existing = await prisma.dimensionDefinition.findUnique({
      where: { id: dimensionId },
      select: { id: true, isSeeded: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Dimension definition not found.' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.dimensionDefinition.update({
        where: { id: dimensionId },
        data: {
          ...(existing.isSeeded ? {} : dimensionKey ? { dimensionKey } : {}),
          label,
          description,
          ...(existing.isSeeded ? {} : { dimensionType }),
          valueSourceType,
          ...(existing.isSeeded ? {} : { valueModel, selectionType }),
          isActive: toBoolean(body?.isActive),
          allowsHeaderAssignment: toBoolean(body?.allowsHeaderAssignment),
          allowsLineAssignment: toBoolean(body?.allowsLineAssignment),
          allowsGlAssignment: toBoolean(body?.allowsGlAssignment),
          allowsProjectAssignment: toBoolean(body?.allowsProjectAssignment),
          allowsSubscriptionAssignment: toBoolean(body?.allowsSubscriptionAssignment),
          inheritanceMode,
          overrideMode,
          validationMode,
          postToGl: toBoolean(body?.postToGl),
          requiresGlSplit: toBoolean(body?.requiresGlSplit),
        },
      })

      for (const entry of applicabilities) {
        const targetKey = toOptionalString(entry?.targetKey)
        if (!targetKey || !isDimensionTargetKey(targetKey)) continue
        await tx.dimensionApplicability.upsert({
          where: {
            dimensionDefinitionId_targetKey: {
              dimensionDefinitionId: dimensionId,
              targetKey,
            },
          },
          update: {
            isVisible: toBoolean(entry?.isVisible),
            isRequired: toBoolean(entry?.isRequired),
            isLockedInCustomize: toBoolean(entry?.isLockedInCustomize),
          },
          create: {
            dimensionDefinitionId: dimensionId,
            targetKey,
            isVisible: toBoolean(entry?.isVisible),
            isRequired: toBoolean(entry?.isRequired),
            isLockedInCustomize: toBoolean(entry?.isLockedInCustomize),
          },
        })
      }

      for (const entry of sourcingPolicies) {
        const targetKey = toOptionalString(entry?.targetKey)
        if (!targetKey || !isDimensionSourcingTargetKey(targetKey)) continue
        await tx.dimensionSourcingPolicy.upsert({
          where: {
            dimensionDefinitionId_targetKey: {
              dimensionDefinitionId: dimensionId,
              targetKey,
            },
          },
          update: {
            sourcePriorityJson: JSON.stringify(normalizeSourcePriority(entry?.sourcePriority)),
            allowHeaderInheritance: toBoolean(entry?.allowHeaderInheritance),
            allowSourceLineInheritance: toBoolean(entry?.allowSourceLineInheritance),
            allowProjectInheritance: toBoolean(entry?.allowProjectInheritance),
            allowSubscriptionInheritance: toBoolean(entry?.allowSubscriptionInheritance),
            allowManualOverride: toBoolean(entry?.allowManualOverride),
            failIfUnresolved: toBoolean(entry?.failIfUnresolved),
          },
          create: {
            dimensionDefinitionId: dimensionId,
            targetKey,
            sourcePriorityJson: JSON.stringify(normalizeSourcePriority(entry?.sourcePriority)),
            allowHeaderInheritance: toBoolean(entry?.allowHeaderInheritance),
            allowSourceLineInheritance: toBoolean(entry?.allowSourceLineInheritance),
            allowProjectInheritance: toBoolean(entry?.allowProjectInheritance),
            allowSubscriptionInheritance: toBoolean(entry?.allowSubscriptionInheritance),
            allowManualOverride: toBoolean(entry?.allowManualOverride),
            failIfUnresolved: toBoolean(entry?.failIfUnresolved),
          },
        })
      }

      for (const entry of transactionFamilyAssignments) {
        const familyKey = toOptionalString(entry?.familyKey)
        if (!familyKey || !isDimensionTransactionFamilyKey(familyKey)) continue
        await tx.dimensionTransactionFamilyAssignment.upsert({
          where: {
            dimensionDefinitionId_familyKey: {
              dimensionDefinitionId: dimensionId,
              familyKey,
            },
          },
          update: {
            allowsHeader: toBoolean(entry?.allowsHeader),
            allowsLine: toBoolean(entry?.allowsLine),
          },
          create: {
            dimensionDefinitionId: dimensionId,
            familyKey,
            allowsHeader: toBoolean(entry?.allowsHeader),
            allowsLine: toBoolean(entry?.allowsLine),
          },
        })
      }

      for (const entry of transactionFamilySourcingPolicies) {
        const familyKey = toOptionalString(entry?.familyKey)
        if (!familyKey || !isDimensionTransactionFamilyKey(familyKey)) continue
        await tx.dimensionTransactionFamilySourcingPolicy.upsert({
          where: {
            dimensionDefinitionId_familyKey: {
              dimensionDefinitionId: dimensionId,
              familyKey,
            },
          },
          update: {
            headerSourcePriorityJson: JSON.stringify(normalizeSourcePriority(entry?.headerSourcePriority)),
            lineSourcePriorityJson: JSON.stringify(normalizeSourcePriority(entry?.lineSourcePriority)),
            allowProjectInheritance: toBoolean(entry?.allowProjectInheritance),
            allowSubscriptionInheritance: toBoolean(entry?.allowSubscriptionInheritance),
            allowManualOverride: toBoolean(entry?.allowManualOverride),
            failIfUnresolved: toBoolean(entry?.failIfUnresolved),
          },
          create: {
            dimensionDefinitionId: dimensionId,
            familyKey,
            headerSourcePriorityJson: JSON.stringify(normalizeSourcePriority(entry?.headerSourcePriority)),
            lineSourcePriorityJson: JSON.stringify(normalizeSourcePriority(entry?.lineSourcePriority)),
            allowProjectInheritance: toBoolean(entry?.allowProjectInheritance),
            allowSubscriptionInheritance: toBoolean(entry?.allowSubscriptionInheritance),
            allowManualOverride: toBoolean(entry?.allowManualOverride),
            failIfUnresolved: toBoolean(entry?.failIfUnresolved),
          },
        })
      }
    })

    const rows = await getDimensionConfigurationRows()
    return NextResponse.json({ ok: true, rows })
  } catch (error) {
    console.error('Failed to save dimension configuration', error)
    return NextResponse.json({ error: 'Failed to save dimension configuration.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const dimensionId = toOptionalString(body?.dimensionId)

    if (!dimensionId) {
      return NextResponse.json({ error: 'Dimension id is required.' }, { status: 400 })
    }

    const dimension = await prisma.dimensionDefinition.findUnique({
      where: { id: dimensionId },
      select: {
        id: true,
        dimensionKey: true,
        label: true,
        isSeeded: true,
        _count: {
          select: {
            assignments: true,
            values: true,
          },
        },
      },
    })

    if (!dimension) {
      return NextResponse.json({ error: 'Dimension definition not found.' }, { status: 404 })
    }

    if (dimension.isSeeded) {
      return NextResponse.json({ error: 'Seeded dimensions cannot be deleted.' }, { status: 409 })
    }

    if (dimension._count.assignments > 0) {
      return NextResponse.json(
        { error: `Cannot delete ${dimension.label} because it is used by ${dimension._count.assignments} dimension assignment${dimension._count.assignments === 1 ? '' : 's'}.` },
        { status: 409 },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.customFieldValue.deleteMany({
        where: { entityType: `dimension_value:${dimension.dimensionKey}` },
      })
      await tx.customFieldDefinition.deleteMany({
        where: { entityType: `dimension_value:${dimension.dimensionKey}` },
      })
      await tx.dimensionDefinition.delete({ where: { id: dimension.id } })
    })

    const rows = await getDimensionConfigurationRows()
    return NextResponse.json({ ok: true, rows })
  } catch (error) {
    console.error('Failed to delete dimension configuration', error)
    return NextResponse.json({ error: 'Failed to delete dimension configuration.' }, { status: 500 })
  }
}
