import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  CUSTOM_FIELD_TYPES,
  normalizeCustomFieldEntityType,
  normalizeCustomFieldName,
} from '@/lib/custom-fields'

// GET /api/custom-fields - Get all custom field definitions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = normalizeCustomFieldEntityType(searchParams.get('entityType') ?? '')

    const fields = await prisma.customFieldDefinition.findMany({
      where: entityType ? { entityType } : undefined,
      orderBy: [{ label: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json(fields)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch custom fields' }, { status: 500 })
  }
}

// POST /api/custom-fields - Create a new custom field definition
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawName = String(body?.name ?? '')
    const rawLabel = String(body?.label ?? '').trim()
    const rawType = String(body?.type ?? '').trim().toLowerCase()
    const rawEntityType = normalizeCustomFieldEntityType(String(body?.entityType ?? ''))
    const required = body?.required === true
    const defaultValue = body?.defaultValue != null ? String(body.defaultValue).trim() || null : null
    const optionValues = Array.isArray(body?.options)
      ? body.options.map((entry: unknown) => String(entry ?? '').trim()).filter(Boolean)
      : []

    const name = normalizeCustomFieldName(rawName)
    const label = rawLabel
    const type = rawType
    const entityType = rawEntityType

    if (!name || !label || !type || !entityType) {
      return NextResponse.json({ error: 'Name, label, type, and entityType are required' }, { status: 400 })
    }

    if (!CUSTOM_FIELD_TYPES.includes(type as (typeof CUSTOM_FIELD_TYPES)[number])) {
      return NextResponse.json({ error: 'Unsupported custom field type' }, { status: 400 })
    }

    if (type === 'select' && optionValues.length === 0) {
      return NextResponse.json({ error: 'Select fields require at least one option' }, { status: 400 })
    }

    const existing = await prisma.customFieldDefinition.findFirst({
      where: {
        entityType,
        OR: [{ name }, { label }],
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'A custom field with this name or label already exists for this record type' }, { status: 409 })
    }

    const field = await prisma.customFieldDefinition.create({
      data: {
        name,
        label,
        type,
        required,
        defaultValue,
        options: optionValues.length > 0 ? JSON.stringify(optionValues) : null,
        entityType,
      },
    })

    return NextResponse.json(field, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create custom field' }, { status: 500 })
  }
}

// PATCH /api/custom-fields - Update an existing custom field definition
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const id = String(body?.id ?? '').trim()
    const rawName = String(body?.name ?? '')
    const rawLabel = String(body?.label ?? '').trim()
    const rawType = String(body?.type ?? '').trim().toLowerCase()
    const rawEntityType = normalizeCustomFieldEntityType(String(body?.entityType ?? ''))
    const required = body?.required === true
    const defaultValue = body?.defaultValue != null ? String(body.defaultValue).trim() || null : null
    const optionValues = Array.isArray(body?.options)
      ? body.options.map((entry: unknown) => String(entry ?? '').trim()).filter(Boolean)
      : []

    const name = normalizeCustomFieldName(rawName)
    const label = rawLabel
    const type = rawType
    const entityType = rawEntityType

    if (!id || !name || !label || !type || !entityType) {
      return NextResponse.json({ error: 'Id, name, label, type, and entityType are required' }, { status: 400 })
    }

    if (!CUSTOM_FIELD_TYPES.includes(type as (typeof CUSTOM_FIELD_TYPES)[number])) {
      return NextResponse.json({ error: 'Unsupported custom field type' }, { status: 400 })
    }

    if (type === 'select' && optionValues.length === 0) {
      return NextResponse.json({ error: 'Select fields require at least one option' }, { status: 400 })
    }

    const existing = await prisma.customFieldDefinition.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 })
    }

    const conflict = await prisma.customFieldDefinition.findFirst({
      where: {
        entityType,
        id: { not: id },
        OR: [{ name }, { label }],
      },
    })

    if (conflict) {
      return NextResponse.json({ error: 'A custom field with this name or label already exists for this record type' }, { status: 409 })
    }

    const field = await prisma.customFieldDefinition.update({
      where: { id },
      data: {
        name,
        label,
        type,
        required,
        defaultValue,
        options: optionValues.length > 0 ? JSON.stringify(optionValues) : null,
        entityType,
      },
    })

    return NextResponse.json(field)
  } catch {
    return NextResponse.json({ error: 'Failed to update custom field' }, { status: 500 })
  }
}
