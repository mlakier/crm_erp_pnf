import type { FinancialStatementAmountLayer } from '@/lib/financial-statement-report'
import { loadCompanySetupSettings, type ConsolidationPolicy } from '@/lib/company-setup-settings-store'
import { prisma } from '@/lib/prisma'

export type ResolvedConsolidationPolicy = ConsolidationPolicy & {
  parentSubsidiaryId: string
}

export async function resolveConsolidationPolicyForSubsidiaryId(
  subsidiaryId: string | null,
): Promise<ResolvedConsolidationPolicy | null> {
  if (!subsidiaryId) return null

  const subsidiary = await prisma.subsidiary.findUnique({
    where: { id: subsidiaryId },
    select: { id: true, subsidiaryId: true },
  })
  if (!subsidiary) return null

  const settings = await loadCompanySetupSettings()
  const policy = settings.consolidationPolicies.find(
    (entry) => entry.parentSubsidiaryCode === subsidiary.subsidiaryId,
  )
  if (!policy) return null

  return {
    ...policy,
    parentSubsidiaryId: subsidiary.id,
  }
}

export async function resolveFinancialStatementConsolidationContext({
  subsidiaryId,
  includeChildren,
  amountLayer,
}: {
  subsidiaryId: string | null
  includeChildren: boolean
  amountLayer: FinancialStatementAmountLayer
}) {
  const policy = includeChildren
    ? await resolveConsolidationPolicyForSubsidiaryId(subsidiaryId)
    : null

  if (!policy) {
    return {
      policy: null,
      effectiveAmountLayer: amountLayer,
      currencyLabelOverride: null,
    }
  }

  const effectiveAmountLayer =
    amountLayer === 'local' || amountLayer === 'transaction'
      ? policy.defaultAmountLayer
      : amountLayer

  return {
    policy,
    effectiveAmountLayer,
    currencyLabelOverride: `${policy.reportingCurrencyCode} consolidated`,
  }
}
