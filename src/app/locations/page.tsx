import { redirect } from 'next/navigation'

import { getDimensionConfigurationRows } from '@/lib/dimension-control-plane'

export const dynamic = 'force-dynamic'

export default async function LocationsPage() {
  const rows = await getDimensionConfigurationRows()
  const locationDimension = rows.find((row) => row.dimensionKey === 'location')
  redirect(locationDimension ? `/configuration/manage-dimensions/${locationDimension.id}` : '/configuration/manage-dimensions')
}
