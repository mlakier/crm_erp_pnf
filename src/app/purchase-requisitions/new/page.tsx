import PurchaseRequisitionCreatePageClient from '@/components/PurchaseRequisitionCreatePageClient'
import { prisma } from '@/lib/prisma'
import { generateNextRequisitionNumber } from '@/lib/requisition-number'
import { loadPurchaseRequisitionDetailCustomization } from '@/lib/purchase-requisitions-detail-customization-store'
import { toNumericValue } from '@/lib/format'

export default async function NewPurchaseRequisitionPage({
  searchParams,
}: {
  searchParams?: Promise<{ duplicateFrom?: string }>
}) {
  const duplicateFrom = (await searchParams)?.duplicateFrom?.trim()

  const [vendors, departments, subsidiaries, currencies, items, adminUser, nextNumber, customization, duplicateSource] = await Promise.all([
    prisma.vendor.findMany({
      orderBy: { vendorNumber: 'asc' },
      where: { inactive: false },
      include: {
        subsidiary: { select: { id: true, subsidiaryId: true, name: true } },
        currency: { select: { id: true, currencyId: true, code: true, name: true } },
      },
    }),
    prisma.department.findMany({
      orderBy: { departmentId: 'asc' },
      where: { active: true },
      select: { id: true, departmentId: true, name: true },
    }),
    prisma.subsidiary.findMany({
      orderBy: { subsidiaryId: 'asc' },
      where: { active: true },
      select: { id: true, subsidiaryId: true, name: true },
    }),
    prisma.currency.findMany({
      orderBy: { code: 'asc' },
      where: { active: true },
      select: { id: true, currencyId: true, code: true, name: true },
    }),
    prisma.item.findMany({
      orderBy: [{ itemId: 'asc' }, { name: 'asc' }],
      select: { id: true, itemId: true, name: true, listPrice: true },
    }),
    prisma.user.findUnique({
      where: { email: 'admin@example.com' },
      select: { id: true, userId: true, name: true, email: true },
    }),
    generateNextRequisitionNumber(),
    loadPurchaseRequisitionDetailCustomization(),
    duplicateFrom
      ? prisma.requisition.findUnique({
          where: { id: duplicateFrom },
          include: {
            lineItems: {
              orderBy: [{ createdAt: 'asc' }],
            },
          },
        })
      : Promise.resolve(null),
  ])

  const userLabel =
    adminUser?.userId && adminUser.name
      ? `${adminUser.userId} - ${adminUser.name}`
      : adminUser?.userId ?? adminUser?.name ?? adminUser?.email ?? ''

  return (
    <PurchaseRequisitionCreatePageClient
      nextNumber={nextNumber}
      userId={adminUser?.id ?? ''}
      userLabel={userLabel}
      vendors={vendors}
      departments={departments}
      subsidiaries={subsidiaries}
      currencies={currencies}
      items={items.map((item) => ({ ...item, listPrice: toNumericValue(item.listPrice, 0) }))}
      customization={customization}
      initialHeaderValues={
        duplicateSource
          ? {
              number: nextNumber,
              status: duplicateSource.status,
              priority: duplicateSource.priority,
              title: duplicateSource.title ?? '',
              description: duplicateSource.description ?? '',
              neededByDate: duplicateSource.neededByDate
                ? duplicateSource.neededByDate.toISOString().slice(0, 10)
                : '',
              notes: duplicateSource.notes ?? '',
              vendorId: duplicateSource.vendorId ?? '',
              departmentId: duplicateSource.departmentId ?? '',
              subsidiaryId: duplicateSource.subsidiaryId ?? '',
              currencyId: duplicateSource.currencyId ?? '',
            }
          : undefined
      }
      initialDraftRows={
        duplicateSource
          ? duplicateSource.lineItems.map((line, index) => ({
              itemId: line.itemId,
              description: line.description,
              notes: line.notes ?? null,
              quantity: line.quantity,
              unitPrice: toNumericValue(line.unitPrice, 0),
              lineTotal: toNumericValue(line.lineTotal, 0),
              displayOrder: index,
            }))
          : undefined
      }
    />
  )
}
