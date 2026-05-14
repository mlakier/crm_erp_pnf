import { prisma } from '@/lib/prisma'

export type DimensionValueSourceModel = 'dimension_value' | 'department' | 'location' | 'class'

export function formatDimensionValueBlockers(counts: Record<string, number>) {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${count} ${label}`)
}

export async function getDimensionValueDeleteBlockers(sourceModel: DimensionValueSourceModel, valueId: string) {
  if (sourceModel === 'department') return getDepartmentDeleteBlockers(valueId)
  if (sourceModel === 'location') return getLocationDeleteBlockers(valueId)
  if (sourceModel === 'class') return getClassDeleteBlockers(valueId)
  return []
}

async function getDepartmentDeleteBlockers(valueId: string) {
  const [
    users,
    requisitions,
    employees,
    invoiceLines,
    billLines,
    journalLines,
    items,
    childDepartments,
  ] = await Promise.all([
    prisma.user.count({ where: { departmentId: valueId } }),
    prisma.requisition.count({ where: { departmentId: valueId } }),
    prisma.employee.count({ where: { departmentId: valueId } }),
    prisma.invoiceLineItem.count({ where: { departmentId: valueId } }),
    prisma.billLineItem.count({ where: { departmentId: valueId } }),
    prisma.journalEntryLineItem.count({ where: { departmentId: valueId } }),
    prisma.item.count({ where: { departmentId: valueId } }),
    prisma.department.count({ where: { parentDepartmentId: valueId } }),
  ])

  return formatDimensionValueBlockers({
    users,
    requisitions,
    employees,
    'invoice lines': invoiceLines,
    'bill lines': billLines,
    'journal lines': journalLines,
    items,
    'child departments': childDepartments,
  })
}

async function getLocationDeleteBlockers(valueId: string) {
  const [employees, invoiceLines, billLines, journalLines, items, childLocations] = await Promise.all([
    prisma.employee.count({ where: { locationId: valueId } }),
    prisma.invoiceLineItem.count({ where: { locationId: valueId } }),
    prisma.billLineItem.count({ where: { locationId: valueId } }),
    prisma.journalEntryLineItem.count({ where: { locationId: valueId } }),
    prisma.item.count({ where: { locationId: valueId } }),
    prisma.location.count({ where: { parentLocationId: valueId } }),
  ])

  return formatDimensionValueBlockers({
    employees,
    'invoice lines': invoiceLines,
    'bill lines': billLines,
    'journal lines': journalLines,
    items,
    'child locations': childLocations,
  })
}

async function getClassDeleteBlockers(valueId: string) {
  const [invoiceLines, billLines, journalLines] = await Promise.all([
    prisma.invoiceLineItem.count({ where: { classId: valueId } }),
    prisma.billLineItem.count({ where: { classId: valueId } }),
    prisma.journalEntryLineItem.count({ where: { classId: valueId } }),
  ])

  return formatDimensionValueBlockers({
    'invoice lines': invoiceLines,
    'bill lines': billLines,
    'journal lines': journalLines,
  })
}
