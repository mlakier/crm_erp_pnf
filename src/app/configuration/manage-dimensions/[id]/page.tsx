import { notFound } from 'next/navigation'

import DimensionDetailClient from '@/components/DimensionDetailClient'
import { getDimensionConfigurationRows } from '@/lib/dimension-control-plane'

export const dynamic = 'force-dynamic'

export default async function ManagedDimensionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rows = await getDimensionConfigurationRows()
  const row = rows.find((entry) => entry.id === id)

  if (!row) {
    notFound()
  }

  return (
    <div className="min-h-full px-8 py-8">
      <div className="w-full">
        <DimensionDetailClient mode="edit" initialRow={row} />
      </div>
    </div>
  )
}
