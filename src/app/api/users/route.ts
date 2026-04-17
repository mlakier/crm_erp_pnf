import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    const { email, name, password, roleId, departmentId } = body
    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Email, name, and password are required' }, { status: 400 })
    }

    // Auto-generate userId
    const last = await prisma.user.findFirst({ orderBy: { userId: 'desc' }, where: { userId: { not: null } } })
    let nextNum = 1
    if (last?.userId) {
      const m = last.userId.match(/USER-(\d+)/)
      if (m) nextNum = parseInt(m[1], 10) + 1
    }
    const userId = 'USER-' + String(nextNum).padStart(4, '0')

    const user = await prisma.user.create({
      data: { userId, email, name, password, roleId: roleId || null, departmentId: departmentId || null },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
