import { Prisma, type PrismaClient } from '@prisma/client'

import { prisma } from '@/lib/prisma'

type SubsidiaryScopeClient = Prisma.TransactionClient | PrismaClient

export async function resolveSubsidiaryScope(
  subsidiaryId: string,
  includeChildren: boolean,
  tx: SubsidiaryScopeClient = prisma,
) {
  const root = await tx.subsidiary.findUnique({
    where: { id: subsidiaryId },
    select: { id: true, subsidiaryId: true, name: true },
  })

  if (!root) {
    throw new Error('Selected subsidiary scope was not found.')
  }

  if (!includeChildren) return [root]

  const allSubsidiaries = await tx.subsidiary.findMany({
    where: { active: true },
    select: { id: true, subsidiaryId: true, name: true, parentSubsidiaryId: true },
    orderBy: [{ subsidiaryId: 'asc' }],
  })

  const childrenByParent = new Map<string, typeof allSubsidiaries>()
  for (const subsidiary of allSubsidiaries) {
    if (!subsidiary.parentSubsidiaryId) continue
    const existing = childrenByParent.get(subsidiary.parentSubsidiaryId) ?? []
    existing.push(subsidiary)
    childrenByParent.set(subsidiary.parentSubsidiaryId, existing)
  }

  const scope = [root]
  const seen = new Set([root.id])
  const queue = [...(childrenByParent.get(root.id) ?? [])]

  while (queue.length > 0) {
    const next = queue.shift()
    if (!next || seen.has(next.id)) continue
    seen.add(next.id)
    scope.push({ id: next.id, subsidiaryId: next.subsidiaryId, name: next.name })
    queue.push(...(childrenByParent.get(next.id) ?? []))
  }

  return scope
}
