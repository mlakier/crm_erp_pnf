import { prisma } from '@/lib/prisma'
import LeadCreatePageClient from '@/components/LeadCreatePageClient'
import { loadListOptionsForSource } from '@/lib/list-source'
import { loadLeadDetailCustomization } from '@/lib/lead-detail-customization-store'

export default async function NewLeadPage({
  searchParams,
}: {
  searchParams?: Promise<{ duplicateFrom?: string }>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const duplicateFrom = resolvedSearchParams.duplicateFrom

  const [adminUser, entities, currencies, leadSourceOptions, leadRatingOptions, leadStatusOptions, duplicateSource, customization] =
    await Promise.all([
      prisma.user.findUnique({ where: { email: 'admin@example.com' } }),
      prisma.subsidiary.findMany({ orderBy: { subsidiaryId: 'asc' }, select: { id: true, subsidiaryId: true, name: true } }),
      prisma.currency.findMany({ orderBy: { code: 'asc' }, select: { id: true, currencyId: true, code: true, name: true } }),
      loadListOptionsForSource({ sourceType: 'managed-list', sourceKey: 'LIST-LEAD-SRC' }),
      loadListOptionsForSource({ sourceType: 'managed-list', sourceKey: 'LIST-LEAD-RAT' }),
      loadListOptionsForSource({ sourceType: 'managed-list', sourceKey: 'LIST-LEAD-STATUS' }),
      duplicateFrom ? prisma.lead.findUnique({ where: { id: duplicateFrom } }) : Promise.resolve(null),
      loadLeadDetailCustomization(),
    ])

  if (!adminUser) {
    return <p className="p-8 text-white">No admin user found.</p>
  }

  return (
    <LeadCreatePageClient
      userId={adminUser.id}
      createdByLabel={adminUser.userId && adminUser.name ? `${adminUser.userId} - ${adminUser.name}` : adminUser.userId ?? adminUser.name ?? adminUser.email}
      entities={entities}
      currencies={currencies}
      leadSourceOptions={leadSourceOptions}
      leadRatingOptions={leadRatingOptions}
      leadStatusOptions={leadStatusOptions}
      customization={customization}
      initialValues={
        duplicateSource
          ? {
              firstName: duplicateSource.firstName ?? '',
              lastName: duplicateSource.lastName ?? '',
              company: duplicateSource.company ?? '',
              email: duplicateSource.email ?? '',
              phone: duplicateSource.phone ?? '',
              title: duplicateSource.title ?? '',
              website: duplicateSource.website ?? '',
              industry: duplicateSource.industry ?? '',
              status: duplicateSource.status ?? 'new',
              source: duplicateSource.source ?? '',
              rating: duplicateSource.rating ?? '',
              expectedValue: duplicateSource.expectedValue?.toString() ?? '',
              entityId: duplicateSource.subsidiaryId ?? '',
              currencyId: duplicateSource.currencyId ?? '',
              notes: duplicateSource.notes ?? '',
              address: duplicateSource.address ?? '',
            }
          : undefined
      }
    />
  )
}
