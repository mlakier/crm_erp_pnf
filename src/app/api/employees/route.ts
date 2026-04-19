import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function normalizeString(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function normalizeDate(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseInactive(value: unknown): boolean | undefined {
  if (value === undefined) return undefined
  return String(value).trim().toLowerCase() === 'true'
}

export async function GET() {
  const employees = await prisma.employee.findMany({
    select: { id: true, firstName: true, lastName: true, employeeId: true, userId: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })
  return NextResponse.json(employees)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const employeeId = normalizeString(body?.employeeId)
    const firstName = String(body?.firstName ?? '').trim()
    const lastName = String(body?.lastName ?? '').trim()
    const email = normalizeString(body?.email)
    const phone = normalizeString(body?.phone)
    const title = normalizeString(body?.title)
    const departmentId = normalizeString(body?.departmentId)
    const entityId = normalizeString(body?.entityId)
    const managerId = normalizeString(body?.managerId)
    const userId = normalizeString(body?.userId)
    const hireDate = normalizeDate(body?.hireDate)
    const terminationDate = normalizeDate(body?.terminationDate)
    const inactive = parseInactive(body?.inactive) ?? false

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required.' }, { status: 400 })
    }

    if (userId) {
      const linkedEmployee = await prisma.employee.findFirst({
        where: { userId },
        select: { id: true },
      })
      if (linkedEmployee) {
        return NextResponse.json({ error: 'Selected user is already linked to another employee.' }, { status: 400 })
      }
    }

    const created = await prisma.employee.create({
      data: {
        employeeId,
        firstName,
        lastName,
        email,
        phone,
        title,
        departmentId,
        entityId,
        managerId,
        userId,
        hireDate,
        terminationDate,
        active: !inactive,
        status: inactive ? 'inactive' : 'active',
      },
      include: { entity: true, departmentRef: true },
    })

    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unable to create employee.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const body = await request.json()

    const employeeId = body?.employeeId !== undefined ? normalizeString(body.employeeId) : undefined
    const firstName = body?.firstName !== undefined ? String(body.firstName).trim() : undefined
    const lastName = body?.lastName !== undefined ? String(body.lastName).trim() : undefined
    const email = body?.email !== undefined ? normalizeString(body.email) : undefined
    const phone = body?.phone !== undefined ? normalizeString(body.phone) : undefined
    const title = body?.title !== undefined ? normalizeString(body.title) : undefined
    const departmentId = body?.departmentId !== undefined ? normalizeString(body.departmentId) : undefined
    const entityId = body?.entityId !== undefined ? normalizeString(body.entityId) : undefined
    const managerId = body?.managerId !== undefined ? normalizeString(body.managerId) : undefined
    const userId = body?.userId !== undefined ? normalizeString(body.userId) : undefined
    const hireDate = body?.hireDate !== undefined ? normalizeDate(body.hireDate) : undefined
    const terminationDate = body?.terminationDate !== undefined ? normalizeDate(body.terminationDate) : undefined
    const inactive = parseInactive(body?.inactive)
    const active = inactive !== undefined
      ? !inactive
      : body?.active !== undefined
        ? String(body.active).trim().toLowerCase() === 'true'
        : undefined

    if (firstName !== undefined && !firstName) {
      return NextResponse.json({ error: 'First name cannot be empty.' }, { status: 400 })
    }
    if (lastName !== undefined && !lastName) {
      return NextResponse.json({ error: 'Last name cannot be empty.' }, { status: 400 })
    }

    if (userId) {
      const linkedEmployee = await prisma.employee.findFirst({
        where: { userId, id: { not: id } },
        select: { id: true },
      })
      if (linkedEmployee) {
        return NextResponse.json({ error: 'Selected user is already linked to another employee.' }, { status: 400 })
      }
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: Object.fromEntries(
        Object.entries({
          employeeId,
          firstName,
          lastName,
          email,
          phone,
          title,
          departmentId,
          entityId,
          managerId,
          userId,
          hireDate,
          terminationDate,
          active,
          status: active !== undefined ? (active ? 'active' : 'inactive') : undefined,
        }).filter(([, value]) => value !== undefined)
      ),
      include: { entity: true, departmentRef: true },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unable to update employee.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await prisma.employee.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unable to delete employee.' }, { status: 500 })
  }
}
