import { prisma } from '@/lib/prisma'
import type { SeededDimensionDisplayLabels } from '@/lib/transaction-gl-impact'

export async function loadSeededDimensionDisplayLabels(): Promise<SeededDimensionDisplayLabels> {
  const dimensions = await prisma.dimensionDefinition.findMany({
    where: { dimensionKey: { in: ['department', 'location', 'class'] } },
    select: { dimensionKey: true, label: true },
  })

  return Object.fromEntries(
    dimensions.map((dimension) => [dimension.dimensionKey, dimension.label]),
  ) as SeededDimensionDisplayLabels
}
