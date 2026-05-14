import { redirect } from 'next/navigation'

import { getDimensionConfigurationRows } from '@/lib/dimension-control-plane'

export const dynamic = 'force-dynamic'

export default async function DepartmentsPage() {
  const rows = await getDimensionConfigurationRows()
  const departmentDimension = rows.find((row) => row.dimensionKey === 'department')
  redirect(departmentDimension ? `/configuration/manage-dimensions/${departmentDimension.id}` : '/configuration/manage-dimensions')
}
