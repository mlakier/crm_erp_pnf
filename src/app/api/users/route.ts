import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateNextUserNumber } from '@/lib/user-number'
import { isFieldRequiredServer } from '@/lib/form-requirements-store'

function normalizeString(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function parseInactive(value: unknown): boolean | undefined {
  if (value === undefined) return undefined
  return String(value).trim().toLowerCase() === 'true'
}

async function validateEmployeeLink(employeeId: string | null, currentUserId?: string) {
  if (!employeeId) return null
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, userId: true, firstName: true, lastName: true, employeeId: true },
  })
  if (!employee) {
    throw new Error('Selected employee was not found.')
  }
  if (employee.userId && employee.userId !== currentUserId) {
    throw new Error('Selected employee is already linked to another user.')
  }
  return employee
}

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { role: true, department: true },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = normalizeString(body?.email)
    const name = normalizeString(body?.name)
    const password = normalizeString(body?.password)
    const roleId = normalizeString(body?.roleId)
    const departmentId = normalizeString(body?.departmentId)
    const employeeId = normalizeString(body?.employeeId)
    const inactive = parseInactive(body?.inactive) ?? false

    const missing: string[] = []
    if ((await isFieldRequiredServer('userCreate', 'name')) && !name) missing.push('name')
    if ((await isFieldRequiredServer('userCreate', 'email')) && !email) missing.push('email')
    if ((await isFieldRequiredServer('userCreate', 'password')) && !password) missing.push('password')

    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    }

    await validateEmployeeLink(employeeId)

    const userId = await generateNextUserNumber()

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          userId,
          email: email!,
          name,
          password: password!,
          roleId,
          departmentId,
          inactive,
        },
      })

      if (employeeId) {
        await tx.employee.update({
          where: { id: employeeId },
          data: { userId: user.id },
        })
      }

      return user
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create user' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await req.json()
    const name = body?.name !== undefined ? normalizeString(body.name) : undefined
    const email = body?.email !== undefined ? normalizeString(body.email) : undefined
    const roleId = body?.roleId !== undefined ? normalizeString(body.roleId) : undefined
    const departmentId = body?.departmentId !== undefined ? normalizeString(body.departmentId) : undefined
    const employeeId = body?.employeeId !== undefined ? normalizeString(body.employeeId) : undefined
    const inactive = parseInactive(body?.inactive)

    if (email === '') {
      return NextResponse.json({ error: 'Email cannot be empty' }, { status: 400 })
    }

    if (employeeId !== undefined) {
      await validateEmployeeLink(employeeId, id)
    }

    const updated = await prisma.$transaction(async (tx) => {
      const currentLinkedEmployee = await tx.employee.findFirst({
        where: { userId: id },
        select: { id: true },
      })

      const user = await tx.user.update({
        where: { id },
        data: Object.fromEntries(
          Object.entries({
            name,
            email,
            roleId,
            departmentId,
            inactive,
          }).filter(([, value]) => value !== undefined)
        ),
      })

      if (employeeId !== undefined) {
        if (currentLinkedEmployee && currentLinkedEmployee.id !== employeeId) {
          await tx.employee.update({
            where: { id: currentLinkedEmployee.id },
            data: { userId: null },
          })
        }
        if (employeeId) {
          await tx.employee.update({
            where: { id: employeeId },
            data: { userId: id },
          })
        }
      }

      return user
    })

    return NextResponse.json(updated)
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unable to update user.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await prisma.$transaction(async (tx) => {
      await tx.employee.updateMany({
        where: { userId: id },
        data: { userId: null },
      })
      await tx.user.delete({ where: { id } })
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unable to delete user.' }, { status: 500 })
  }
}
