import type { FinancialStatementAmountLayer } from '@/lib/financial-statement-report'
import { prisma } from '@/lib/prisma'
import { resolveSubsidiaryScope } from '@/lib/subsidiary-scope'

type CurrencyLayer = Exclude<FinancialStatementAmountLayer, 'transaction'>

function currencyRelationForLayer(layer: CurrencyLayer) {
  if (layer === 'local') return 'localCurrency'
  if (layer === 'functional') return 'functionalCurrency'
  return 'groupCurrency'
}

export async function resolveFinancialStatementCurrencyLabel({
  amountLayer,
  subsidiaryId,
  includeChildren,
}: {
  amountLayer: FinancialStatementAmountLayer
  subsidiaryId: string | null
  includeChildren: boolean
}) {
  if (amountLayer === 'transaction') return 'TXN / Mixed'

  const relation = currencyRelationForLayer(amountLayer)
  const scopedSubsidiaryIds = subsidiaryId
    ? (await resolveSubsidiaryScope(subsidiaryId, includeChildren)).map((subsidiary) => subsidiary.id)
    : []
  const subsidiaries = await prisma.subsidiary.findMany({
    where: scopedSubsidiaryIds.length > 0 ? { id: { in: scopedSubsidiaryIds } } : { active: true },
    include: {
      localCurrency: true,
      functionalCurrency: true,
      groupCurrency: true,
    },
    orderBy: [{ subsidiaryId: 'asc' }],
  })

  const codes = new Set(
    subsidiaries
      .map((subsidiary) => subsidiary[relation]?.code ?? null)
      .filter((code): code is string => Boolean(code)),
  )

  if (codes.size === 1) return Array.from(codes)[0]
  if (codes.size > 1) return 'Mixed'

  const baseCurrency = await prisma.currency.findFirst({
    where: { isBase: true, active: true },
    select: { code: true },
  })
  return baseCurrency?.code ?? 'Currency'
}
