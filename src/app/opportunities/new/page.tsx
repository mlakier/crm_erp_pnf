import { prisma } from '@/lib/prisma'
import OpportunityCreatePageClient from '@/components/OpportunityCreatePageClient'
import { loadListOptionsForSource } from '@/lib/list-source'
import { toNumericValue } from '@/lib/format'
import { loadOpportunityDetailCustomization } from '@/lib/opportunity-detail-customization-store'

export default async function NewOpportunityPage({
  searchParams,
}: {
  searchParams?: Promise<{ duplicateFrom?: string }>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const duplicateFrom = resolvedSearchParams.duplicateFrom

  const [adminUser, customers, items, stageOptions, subsidiaries, currencies, customization, duplicateSource] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'admin@example.com' }, select: { id: true, userId: true, name: true, email: true } }),
    prisma.customer.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        customerId: true,
        name: true,
        email: true,
        phone: true,
        subsidiary: { select: { id: true, subsidiaryId: true, name: true } },
        currency: { select: { id: true, currencyId: true, code: true, name: true } },
      },
    }),
    prisma.item.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, listPrice: true, itemId: true },
    }),
    loadListOptionsForSource({ sourceType: 'managed-list', sourceKey: 'LIST-OPP-STAGE' }),
    prisma.subsidiary.findMany({ orderBy: { subsidiaryId: 'asc' }, select: { id: true, subsidiaryId: true, name: true } }),
    prisma.currency.findMany({ orderBy: { code: 'asc' }, select: { id: true, currencyId: true, code: true, name: true } }),
    loadOpportunityDetailCustomization(),
    duplicateFrom
      ? prisma.opportunity.findUnique({
          where: { id: duplicateFrom },
          include: { lineItems: true },
        })
      : Promise.resolve(null),
  ])

  if (!adminUser) {
    return <p className="p-8 text-white">No admin user found.</p>
  }

  return (
    <OpportunityCreatePageClient
      users={[adminUser]}
      customers={customers}
      items={items.map((item) => ({ ...item, listPrice: toNumericValue(item.listPrice, 0) }))}
      stageOptions={stageOptions}
      subsidiaries={subsidiaries}
      currencies={currencies}
      customization={customization}
      initialValues={
        duplicateSource
          ? {
              name: `${duplicateSource.name} Copy`,
              amount: toNumericValue(duplicateSource.amount, 0).toFixed(2),
              stage: duplicateSource.stage ?? 'prospecting',
              closeDate: duplicateSource.closeDate ? duplicateSource.closeDate.toISOString().slice(0, 10) : '',
              customerId: duplicateSource.customerId,
              probability: duplicateSource.probability != null ? String(duplicateSource.probability) : '',
              subsidiaryId: duplicateSource.subsidiaryId ?? '',
              currencyId: duplicateSource.currencyId ?? '',
              lineItems: duplicateSource.lineItems.map((line) => ({
                itemId: line.itemId,
                description: line.description,
                quantity: line.quantity,
                unitPrice: toNumericValue(line.unitPrice, 0),
                notes: line.notes ?? null,
              })),
            }
          : undefined
      }
    />
  )
}
