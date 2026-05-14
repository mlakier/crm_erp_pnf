import ManageDimensionsClient from '@/components/ManageDimensionsClient'
import { getDimensionConfigurationRows } from '@/lib/dimension-control-plane'

export const dynamic = 'force-dynamic'

export default async function ManageDimensionsPage() {
  const rows = await getDimensionConfigurationRows()

  return (
    <div className="min-h-full px-8 py-8">
      <div className="max-w-7xl">
        <ManageDimensionsClient initialRows={rows} />
      </div>
    </div>
  )
}
