import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { deriveOpenItemCurrencyContext, type TranslationAuditSourceSummary } from '@/lib/open-item-currency-context'
import { getOpenItemRemainingAmount } from '@/lib/open-item-service'
import { generateNextSystemJournalNumber } from '@/lib/journal-number'
import { loadConfiguredUnrealizedFxPostingAccounts } from '@/lib/company-setup-account-resolver'
import { getRequiredStandardTransactionPostingContext } from '@/lib/transaction-posting-context'

const MONEY_TOLERANCE = 0.005

type RunFxRevaluationInput = {
  accountingPeriodId: string
  asOfDate: Date | string
  subsidiaryId?: string | null
  requestedById?: string | null
  triggerType?: string | null
}

type LayerKey = 'local' | 'functional' | 'group'

type LayerDelta = {
  layer: LayerKey
  currencyId: string
  carryingAmount: number
  revaluedAmount: number
  delta: number
}

type AggregatedJournalLine = {
  accountId: string
  subsidiaryId: string | null
  description: string
  memo: string | null
  localDebit: number
  localCredit: number
  functionalDebit: number
  functionalCredit: number
  groupDebit: number
  groupCredit: number
}

type GlBalanceCandidateLine = {
  id: string
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  localDebit: Prisma.Decimal | null
  localCredit: Prisma.Decimal | null
  functionalDebit: Prisma.Decimal | null
  functionalCredit: Prisma.Decimal | null
  groupDebit: Prisma.Decimal | null
  groupCredit: Prisma.Decimal | null
  accountId: string
  subsidiaryId: string | null
  account: {
    id: string
    accountNumber: string
    name: string
    accountType: string
    accountRole: string | null
    category: string | null
    requiresSubledgerType: string | null
    isControlAccount: boolean
  }
  journalEntry: {
    id: string
    number: string
    date: Date
    currencyId: string
    currency: {
      code: string
    }
    subsidiaryId: string
    sourceType: string | null
    journalType: string
  }
}

type GlBalanceGroup = {
  account: GlBalanceCandidateLine['account']
  subsidiaryId: string
  transactionCurrencyId: string
  transactionCurrencyCode: string
  transactionAmount: number
  carryingLocalAmount: number
  carryingFunctionalAmount: number
  carryingGroupAmount: number
  revaluedLocalAmount: number
  revaluedFunctionalAmount: number
  revaluedGroupAmount: number
  sourceLineIds: string[]
  sourceJournalNumbers: string[]
  firstPostingDate: Date | null
  lastPostingDate: Date | null
  translationSources: Set<string>
}

function roundMoney(value: Prisma.Decimal.Value | number | null | undefined) {
  return Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100
}

function generateFxRevaluationRunNumber() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `FXRV-${stamp}-${suffix}`
}

function normalizeDateOnly(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error('A valid as-of date is required for FX revaluation.')
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function isAssetAccountType(accountType: string) {
  return accountType.toLowerCase().includes('asset')
}

function isLiabilityAccountType(accountType: string) {
  return accountType.toLowerCase().includes('liability')
}

function isSubledgerControlledAccount(account: {
  accountRole: string | null
  requiresSubledgerType: string | null
  isControlAccount: boolean
}) {
  const subledgerType = String(account.requiresSubledgerType ?? '').toLowerCase()
  return (
    account.isControlAccount
    || subledgerType === 'customer'
    || subledgerType === 'vendor'
  )
}

function signedNet(debit: Prisma.Decimal.Value | number | null | undefined, credit: Prisma.Decimal.Value | number | null | undefined) {
  return roundMoney(Number(debit ?? 0) - Number(credit ?? 0))
}

function ensureJournalLine(
  lines: Map<string, AggregatedJournalLine>,
  accountId: string,
  subsidiaryId: string | null,
  description: string,
  memo: string | null,
) {
  const key = `${accountId}:${subsidiaryId ?? ''}`
  const existing = lines.get(key)
  if (existing) return existing

  const created: AggregatedJournalLine = {
    accountId,
    subsidiaryId,
    description,
    memo,
    localDebit: 0,
    localCredit: 0,
    functionalDebit: 0,
    functionalCredit: 0,
    groupDebit: 0,
    groupCredit: 0,
  }
  lines.set(key, created)
  return created
}

function addLayerAmount(
  line: AggregatedJournalLine,
  layer: LayerKey,
  side: 'debit' | 'credit',
  amount: number,
) {
  if (amount <= MONEY_TOLERANCE) return

  if (layer === 'local') {
    if (side === 'debit') line.localDebit = roundMoney(line.localDebit + amount)
    else line.localCredit = roundMoney(line.localCredit + amount)
    return
  }

  if (layer === 'functional') {
    if (side === 'debit') line.functionalDebit = roundMoney(line.functionalDebit + amount)
    else line.functionalCredit = roundMoney(line.functionalCredit + amount)
    return
  }

  if (side === 'debit') line.groupDebit = roundMoney(line.groupDebit + amount)
  else line.groupCredit = roundMoney(line.groupCredit + amount)
}

function addSignedGlRemeasurementDelta(
  sourceLine: AggregatedJournalLine,
  offsetLine: AggregatedJournalLine,
  layer: LayerKey,
  delta: number,
) {
  const absDelta = Math.abs(delta)
  if (delta > 0) {
    addLayerAmount(sourceLine, layer, 'debit', absDelta)
    addLayerAmount(offsetLine, layer, 'credit', absDelta)
  } else {
    addLayerAmount(sourceLine, layer, 'credit', absDelta)
    addLayerAmount(offsetLine, layer, 'debit', absDelta)
  }
}

function computeLayerDeltas(args: {
  transactionCurrencyId: string | null
  localCurrencyId: string | null
  functionalCurrencyId: string | null
  groupCurrencyId: string | null
  carryingLocalAmount: number | null
  carryingFunctionalAmount: number | null
  carryingGroupAmount: number | null
  revaluedLocalAmount: number | null
  revaluedFunctionalAmount: number | null
  revaluedGroupAmount: number | null
}) {
  const deltas: LayerDelta[] = []

  const candidates: Array<{
    layer: LayerKey
    currencyId: string | null
    carryingAmount: number | null
    revaluedAmount: number | null
  }> = [
    {
      layer: 'local',
      currencyId: args.localCurrencyId,
      carryingAmount: args.carryingLocalAmount,
      revaluedAmount: args.revaluedLocalAmount,
    },
    {
      layer: 'functional',
      currencyId: args.functionalCurrencyId,
      carryingAmount: args.carryingFunctionalAmount,
      revaluedAmount: args.revaluedFunctionalAmount,
    },
    {
      layer: 'group',
      currencyId: args.groupCurrencyId,
      carryingAmount: args.carryingGroupAmount,
      revaluedAmount: args.revaluedGroupAmount,
    },
  ]

  for (const candidate of candidates) {
    if (!candidate.currencyId) continue
    if (candidate.currencyId === args.transactionCurrencyId) continue
    if (candidate.carryingAmount == null || candidate.revaluedAmount == null) continue
    const delta = roundMoney(candidate.revaluedAmount - candidate.carryingAmount)
    if (Math.abs(delta) <= MONEY_TOLERANCE) continue
    deltas.push({
      layer: candidate.layer,
      currencyId: candidate.currencyId,
      carryingAmount: candidate.carryingAmount,
      revaluedAmount: candidate.revaluedAmount,
      delta,
    })
  }

  return deltas
}

function buildScopeSummary(period: {
  id: string
  name: string
  subsidiaryId: string | null
}) {
  return {
    accountingPeriodId: period.id,
    accountingPeriodName: period.name,
    subsidiaryId: period.subsidiaryId,
  }
}

function isRemeasurementLayer(layer: LayerKey) {
  // Group currency movement belongs to translation/CTA, not the unrealized FX remeasurement journal.
  return layer === 'local' || layer === 'functional'
}

export async function runFxRevaluation(input: RunFxRevaluationInput) {
  const asOfDate = normalizeDateOnly(input.asOfDate)
  const triggerType = input.triggerType?.trim() || 'manual'

  return prisma.$transaction(async (tx) => {
    const period = await tx.accountingPeriod.findUnique({
      where: { id: input.accountingPeriodId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        closed: true,
        subsidiaryId: true,
      },
    })

    if (!period) {
      throw new Error('Accounting period not found for FX revaluation.')
    }
    if (period.closed) {
      throw new Error('The selected accounting period is closed and cannot accept FX revaluation postings.')
    }
    if (asOfDate < period.startDate || asOfDate > period.endDate) {
      throw new Error('The FX revaluation as-of date must fall inside the selected accounting period.')
    }

    const effectiveSubsidiaryId = input.subsidiaryId ?? period.subsidiaryId ?? null
    if (input.subsidiaryId && period.subsidiaryId && input.subsidiaryId !== period.subsidiaryId) {
      throw new Error('The selected accounting period belongs to a different subsidiary than the chosen FX revaluation scope.')
    }
    if (!effectiveSubsidiaryId) {
      throw new Error('FX revaluation requires a subsidiary-scoped run so the posting journal has a real transaction subsidiary and currency.')
    }

    const postingSubsidiary = await tx.subsidiary.findUnique({
      where: { id: effectiveSubsidiaryId },
      select: {
        id: true,
        localCurrencyId: true,
        functionalCurrencyId: true,
        groupCurrencyId: true,
      },
    })

    if (!postingSubsidiary?.localCurrencyId) {
      throw new Error('The selected subsidiary is missing a local currency, so FX revaluation cannot create a posting journal.')
    }

    const journalPostingContext = getRequiredStandardTransactionPostingContext('journal', {
      subsidiaryId: postingSubsidiary.id,
      currencyId: postingSubsidiary.localCurrencyId,
    })
    if ('error' in journalPostingContext) {
      throw new Error(journalPostingContext.error)
    }

    const { unrealizedFxGainAccountId, unrealizedFxLossAccountId } =
      await loadConfiguredUnrealizedFxPostingAccounts(tx)

    if (!unrealizedFxGainAccountId || !unrealizedFxLossAccountId) {
      throw new Error('Configure Unrealized FX Gain and Unrealized FX Loss accounts in Company Setup before running FX revaluation.')
    }

    const existingRun = await tx.runHeader.findFirst({
      where: {
        runType: 'fx_revaluation',
        accountingPeriodId: period.id,
        subsidiaryScope: effectiveSubsidiaryId,
        asOfDate,
        status: { in: ['queued', 'running', 'completed', 'completed_with_exceptions'] },
      },
      orderBy: { requestedAt: 'desc' },
      select: {
        id: true,
        runNumber: true,
        status: true,
        message: true,
        summaryJson: true,
      },
    })
    if (existingRun) {
      let existingJournalId: string | null = null
      if (existingRun.summaryJson) {
        try {
          const summary = JSON.parse(existingRun.summaryJson) as { journalEntryId?: string | null }
          existingJournalId = summary.journalEntryId ?? null
        } catch {
          existingJournalId = null
        }
      }
      return {
        runId: existingRun.id,
        runNumber: existingRun.runNumber,
        status: existingRun.status,
        message:
          existingRun.message
          ?? `FX revaluation ${existingRun.runNumber} already exists for this subsidiary, period, and as-of date.`,
        summary: {
          asOfDate: asOfDate.toISOString(),
          accountingPeriodId: period.id,
          subsidiaryId: effectiveSubsidiaryId,
          eligibleOpenItems: 0,
          revaluedItems: 0,
          skippedItems: 0,
          failedItems: 0,
          eligibleGlBalances: 0,
          revaluedGlBalances: 0,
          skippedGlBalances: 0,
          failedGlBalances: 0,
          journalEntryId: existingJournalId,
          duplicateOfRunId: existingRun.id,
          duplicateOfRunNumber: existingRun.runNumber,
          localDeltaTotal: 0,
          functionalDeltaTotal: 0,
          groupTranslationDeltaTotal: 0,
          translationSourceSummary: null,
        },
      }
    }

    const runHeader = await tx.runHeader.create({
      data: {
        runNumber: generateFxRevaluationRunNumber(),
        runType: 'fx_revaluation',
        triggerType,
        scopeType: 'subsidiary_period',
        scopeJson: JSON.stringify({
          ...buildScopeSummary({
            id: period.id,
            name: period.name,
            subsidiaryId: effectiveSubsidiaryId,
          }),
          asOfDate: asOfDate.toISOString(),
        }),
        status: 'running',
        requestedAt: new Date(),
        startedAt: new Date(),
        asOfDate,
        accountingPeriodId: period.id,
        subsidiaryScope: effectiveSubsidiaryId,
        requestedById: input.requestedById ?? null,
        startedById: input.requestedById ?? null,
        message: 'FX revaluation run started.',
      },
    })

    const candidates = await tx.openItem.findMany({
      where: {
        isOpen: true,
        openItemEligible: true,
        accountId: { not: null },
        subsidiaryId: effectiveSubsidiaryId,
          account: {
            revalueOpenBalance: true,
            active: true,
            isPosting: true,
            monetaryClassification: 'monetary',
          },
      },
      select: {
        id: true,
        openItemNumber: true,
        openItemType: true,
        accountType: true,
        accountId: true,
        subsidiaryId: true,
        transactionCurrencyId: true,
        localCurrencyId: true,
        functionalCurrencyId: true,
        groupCurrencyId: true,
        sourceTransactionType: true,
        sourceTransactionId: true,
        sourceTransactionLineId: true,
        sourceNumber: true,
        memo: true,
        account: {
          select: {
            id: true,
            accountNumber: true,
            name: true,
            accountType: true,
          },
        },
      },
      orderBy: [{ subsidiaryId: 'asc' }, { accountId: 'asc' }, { openItemNumber: 'asc' }],
    })

    const journalLines = new Map<string, AggregatedJournalLine>()
    const translationSources = new Set<string>()
    let revaluedItemCount = 0
    let skippedItemCount = 0
    let failedItemCount = 0
    let eligibleGlBalanceCount = 0
    let revaluedGlBalanceCount = 0
    let skippedGlBalanceCount = 0
    let failedGlBalanceCount = 0
    let localDeltaTotal = 0
    let functionalDeltaTotal = 0
    let groupTranslationDeltaTotal = 0

    for (const [index, openItem] of candidates.entries()) {
      const runItem = await tx.runItem.create({
        data: {
          runHeaderId: runHeader.id,
          itemNumber: index + 1,
          itemType: 'open_item_revaluation',
          status: 'running',
          sourceRecordType: 'open_item',
          sourceRecordId: openItem.id,
          sourceLineId: openItem.sourceTransactionLineId ?? null,
          requestPayloadJson: JSON.stringify({
            openItemNumber: openItem.openItemNumber,
            sourceTransactionType: openItem.sourceTransactionType,
            sourceTransactionId: openItem.sourceTransactionId,
            accountId: openItem.accountId,
            asOfDate: asOfDate.toISOString(),
          }),
          startedAt: new Date(),
        },
      })

      try {
        if (!openItem.accountId || !openItem.account) {
          throw new Error('Open item is missing a linked GL account.')
        }

        const accountType = openItem.account.accountType || openItem.accountType
        const assetAccount = isAssetAccountType(accountType)
        const liabilityAccount = isLiabilityAccountType(accountType)
        if (!assetAccount && !liabilityAccount) {
          throw new Error('Only asset and liability open items are eligible for unrealized FX revaluation.')
        }

        const remaining = await getOpenItemRemainingAmount(openItem.id, tx)
        if (Math.abs(remaining.transactionAmount) <= MONEY_TOLERANCE) {
          skippedItemCount += 1
          await tx.runItem.update({
            where: { id: runItem.id },
            data: {
              status: 'completed',
              completedAt: new Date(),
              message: 'Skipped because the open item no longer has a remaining balance.',
              resultPayloadJson: JSON.stringify({ remaining }),
            },
          })
          continue
        }

        const revaluedContext = await deriveOpenItemCurrencyContext({
          tx,
          subsidiaryId: openItem.subsidiaryId ?? null,
          transactionCurrencyId: openItem.transactionCurrencyId ?? null,
          transactionAmount: remaining.transactionAmount,
          effectiveDate: asOfDate,
          rateType: 'spot',
        })

        const translationAudit = revaluedContext.translationAudit as TranslationAuditSourceSummary | null
        if (translationAudit?.sourceSummary) translationSources.add(translationAudit.sourceSummary)

        const deltas = computeLayerDeltas({
          transactionCurrencyId: openItem.transactionCurrencyId,
          localCurrencyId: openItem.localCurrencyId,
          functionalCurrencyId: openItem.functionalCurrencyId,
          groupCurrencyId: openItem.groupCurrencyId,
          carryingLocalAmount: remaining.localAmount,
          carryingFunctionalAmount: remaining.functionalAmount,
          carryingGroupAmount: remaining.groupAmount,
          revaluedLocalAmount: revaluedContext.originalLocalAmount,
          revaluedFunctionalAmount: revaluedContext.originalFunctionalAmount,
          revaluedGroupAmount: revaluedContext.originalGroupAmount,
        })

        const remeasurementDeltas = deltas.filter((delta) => isRemeasurementLayer(delta.layer))
        const translationDeltas = deltas.filter((delta) => delta.layer === 'group')
        for (const delta of translationDeltas) {
          groupTranslationDeltaTotal = roundMoney(groupTranslationDeltaTotal + delta.delta)
        }

        if (remeasurementDeltas.length === 0) {
          skippedItemCount += 1
          await tx.runItem.update({
            where: { id: runItem.id },
            data: {
              status: 'completed',
              completedAt: new Date(),
              message: translationDeltas.length > 0
                ? 'No local/functional remeasurement delta. Group translation is handled by the separate translation/CTA process.'
                : 'No unrealized FX delta for this open item on the selected as-of date.',
              resultPayloadJson: JSON.stringify({
                remaining,
                revaluedContext,
                translationDeltas,
              }),
            },
          })
          continue
        }

        const sourceLine = ensureJournalLine(
          journalLines,
          openItem.accountId,
          openItem.subsidiaryId ?? null,
          `${openItem.account.accountNumber} ${openItem.account.name} FX revaluation`,
          `Open item ${openItem.openItemNumber}`,
        )

        for (const delta of remeasurementDeltas) {
          const absDelta = Math.abs(delta.delta)
          const useGainOffset =
            (assetAccount && delta.delta > 0) || (liabilityAccount && delta.delta < 0)
          const offsetAccountId = useGainOffset ? unrealizedFxGainAccountId : unrealizedFxLossAccountId
          const offsetLine = ensureJournalLine(
            journalLines,
            offsetAccountId,
            openItem.subsidiaryId ?? null,
            useGainOffset ? 'Unrealized FX gain' : 'Unrealized FX loss',
            `FX revaluation ${delta.layer} layer`,
          )

          if (assetAccount) {
            if (delta.delta > 0) {
              addLayerAmount(sourceLine, delta.layer, 'debit', absDelta)
              addLayerAmount(offsetLine, delta.layer, 'credit', absDelta)
            } else {
              addLayerAmount(sourceLine, delta.layer, 'credit', absDelta)
              addLayerAmount(offsetLine, delta.layer, 'debit', absDelta)
            }
          } else {
            if (delta.delta > 0) {
              addLayerAmount(sourceLine, delta.layer, 'credit', absDelta)
              addLayerAmount(offsetLine, delta.layer, 'debit', absDelta)
            } else {
              addLayerAmount(sourceLine, delta.layer, 'debit', absDelta)
              addLayerAmount(offsetLine, delta.layer, 'credit', absDelta)
            }
          }

          if (delta.layer === 'local') localDeltaTotal = roundMoney(localDeltaTotal + delta.delta)
          if (delta.layer === 'functional') functionalDeltaTotal = roundMoney(functionalDeltaTotal + delta.delta)
        }

        revaluedItemCount += 1
        await tx.runItem.update({
          where: { id: runItem.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            message: `Calculated ${remeasurementDeltas.length} local/functional unrealized FX delta${remeasurementDeltas.length === 1 ? '' : 's'}.`,
            resultPayloadJson: JSON.stringify({
              remaining,
              revaluedContext,
              remeasurementDeltas,
              translationDeltas,
            }),
          },
        })
      } catch (error) {
        failedItemCount += 1
        const message = error instanceof Error ? error.message : 'FX revaluation failed for this open item.'

        await tx.runItem.update({
          where: { id: runItem.id },
          data: {
            status: 'failed',
            completedAt: new Date(),
            message,
          },
        })

        await tx.runException.create({
          data: {
            runHeaderId: runHeader.id,
            runItemId: runItem.id,
            severity: 'error',
            exceptionType: 'fx_revaluation_item_error',
            status: 'open',
            sourceRecordType: 'open_item',
            sourceRecordId: openItem.id,
            message,
            detailsJson: JSON.stringify({
              openItemNumber: openItem.openItemNumber,
              sourceTransactionType: openItem.sourceTransactionType,
              sourceTransactionId: openItem.sourceTransactionId,
              accountId: openItem.accountId,
            }),
          },
        })
      }
    }

    const openItemSourceLineIds = new Set(
      (
        await tx.openItemEntry.findMany({
          where: {
            sourceGlLineId: { not: null },
            openItem: { subsidiaryId: effectiveSubsidiaryId },
          },
          select: { sourceGlLineId: true },
        })
      )
        .map((entry) => entry.sourceGlLineId)
        .filter((value): value is string => Boolean(value)),
    )

    const glCandidateLines = await tx.journalEntryLineItem.findMany({
      where: {
        settlesOpenItemId: null,
        OR: [{ subsidiaryId: effectiveSubsidiaryId }, { subsidiaryId: null }],
        account: {
          revalueOpenBalance: true,
          active: true,
          isPosting: true,
          monetaryClassification: 'monetary',
        },
        journalEntry: {
          subsidiaryId: effectiveSubsidiaryId,
          date: { lte: asOfDate },
          status: { in: ['approved', 'posted'] },
          isOpenItemRelevant: false,
        },
      },
      select: {
        id: true,
        debit: true,
        credit: true,
        localDebit: true,
        localCredit: true,
        functionalDebit: true,
        functionalCredit: true,
        groupDebit: true,
        groupCredit: true,
        accountId: true,
        subsidiaryId: true,
        account: {
          select: {
            id: true,
            accountNumber: true,
            name: true,
            accountType: true,
            accountRole: true,
            category: true,
            requiresSubledgerType: true,
            isControlAccount: true,
          },
        },
        journalEntry: {
          select: {
            id: true,
            number: true,
            date: true,
            currencyId: true,
            subsidiaryId: true,
            sourceType: true,
            journalType: true,
            currency: { select: { code: true } },
          },
        },
      },
      orderBy: [{ journalEntry: { date: 'asc' } }, { displayOrder: 'asc' }],
    })

    const glBalanceGroups = new Map<string, GlBalanceGroup>()

    for (const line of glCandidateLines) {
      if (openItemSourceLineIds.has(line.id)) continue
      if (isSubledgerControlledAccount(line.account)) continue
      if (line.journalEntry.sourceType === 'fx-revaluation' || line.journalEntry.journalType === 'fx_revaluation') continue

      const transactionAmount = signedNet(line.debit, line.credit)
      if (Math.abs(transactionAmount) <= MONEY_TOLERANCE) continue

      const subsidiaryId = line.subsidiaryId ?? line.journalEntry.subsidiaryId
      const historicalContext = await deriveOpenItemCurrencyContext({
        tx,
        subsidiaryId,
        transactionCurrencyId: line.journalEntry.currencyId,
        transactionAmount,
        effectiveDate: line.journalEntry.date,
        rateType: 'spot',
      })
      const revaluedContext = await deriveOpenItemCurrencyContext({
        tx,
        subsidiaryId,
        transactionCurrencyId: line.journalEntry.currencyId,
        transactionAmount,
        effectiveDate: asOfDate,
        rateType: 'spot',
      })

      const hasLocalLayer = line.localDebit != null || line.localCredit != null
      const hasFunctionalLayer = line.functionalDebit != null || line.functionalCredit != null
      const hasGroupLayer = line.groupDebit != null || line.groupCredit != null
      const carryingLocalAmount = hasLocalLayer
        ? signedNet(line.localDebit, line.localCredit)
        : historicalContext.originalLocalAmount
      const carryingFunctionalAmount = hasFunctionalLayer
        ? signedNet(line.functionalDebit, line.functionalCredit)
        : historicalContext.originalFunctionalAmount
      const carryingGroupAmount = hasGroupLayer
        ? signedNet(line.groupDebit, line.groupCredit)
        : historicalContext.originalGroupAmount

      const groupKey = `${line.accountId}:${subsidiaryId}:${line.journalEntry.currencyId}`
      const existingGroup = glBalanceGroups.get(groupKey)
      const group = existingGroup ?? {
        account: line.account,
        subsidiaryId,
        transactionCurrencyId: line.journalEntry.currencyId,
        transactionCurrencyCode: line.journalEntry.currency.code,
        transactionAmount: 0,
        carryingLocalAmount: 0,
        carryingFunctionalAmount: 0,
        carryingGroupAmount: 0,
        revaluedLocalAmount: 0,
        revaluedFunctionalAmount: 0,
        revaluedGroupAmount: 0,
        sourceLineIds: [],
        sourceJournalNumbers: [],
        firstPostingDate: null,
        lastPostingDate: null,
        translationSources: new Set<string>(),
      }

      group.transactionAmount = roundMoney(group.transactionAmount + transactionAmount)
      group.carryingLocalAmount = roundMoney(group.carryingLocalAmount + Number(carryingLocalAmount ?? 0))
      group.carryingFunctionalAmount = roundMoney(group.carryingFunctionalAmount + Number(carryingFunctionalAmount ?? 0))
      group.carryingGroupAmount = roundMoney(group.carryingGroupAmount + Number(carryingGroupAmount ?? 0))
      group.revaluedLocalAmount = roundMoney(group.revaluedLocalAmount + Number(revaluedContext.originalLocalAmount ?? 0))
      group.revaluedFunctionalAmount = roundMoney(group.revaluedFunctionalAmount + Number(revaluedContext.originalFunctionalAmount ?? 0))
      group.revaluedGroupAmount = roundMoney(group.revaluedGroupAmount + Number(revaluedContext.originalGroupAmount ?? 0))
      group.sourceLineIds.push(line.id)
      group.sourceJournalNumbers.push(line.journalEntry.number)
      group.firstPostingDate =
        !group.firstPostingDate || line.journalEntry.date < group.firstPostingDate
          ? line.journalEntry.date
          : group.firstPostingDate
      group.lastPostingDate =
        !group.lastPostingDate || line.journalEntry.date > group.lastPostingDate
          ? line.journalEntry.date
          : group.lastPostingDate
      const revaluedAudit = revaluedContext.translationAudit as TranslationAuditSourceSummary | null
      if (revaluedAudit?.sourceSummary) group.translationSources.add(revaluedAudit.sourceSummary)

      glBalanceGroups.set(groupKey, group)
    }

    const glBalanceCandidates = Array.from(glBalanceGroups.values()).filter((group) => (
      Math.abs(group.transactionAmount) > MONEY_TOLERANCE
    ))
    eligibleGlBalanceCount = glBalanceCandidates.length

    for (const [index, group] of glBalanceCandidates.entries()) {
      const runItem = await tx.runItem.create({
        data: {
          runHeaderId: runHeader.id,
          itemNumber: candidates.length + index + 1,
          itemType: 'gl_balance_revaluation',
          status: 'running',
          sourceRecordType: 'chart_of_accounts',
          sourceRecordId: group.account.id,
          requestPayloadJson: JSON.stringify({
            accountId: group.account.id,
            accountNumber: group.account.accountNumber,
            transactionCurrencyId: group.transactionCurrencyId,
            transactionCurrencyCode: group.transactionCurrencyCode,
            subsidiaryId: group.subsidiaryId,
            sourceLineCount: group.sourceLineIds.length,
            asOfDate: asOfDate.toISOString(),
          }),
          startedAt: new Date(),
        },
      })

      try {
        const deltas = computeLayerDeltas({
          transactionCurrencyId: group.transactionCurrencyId,
          localCurrencyId: journalPostingContext.currencyId,
          functionalCurrencyId: postingSubsidiary.functionalCurrencyId,
          groupCurrencyId: postingSubsidiary.groupCurrencyId,
          carryingLocalAmount: group.carryingLocalAmount,
          carryingFunctionalAmount: group.carryingFunctionalAmount,
          carryingGroupAmount: group.carryingGroupAmount,
          revaluedLocalAmount: group.revaluedLocalAmount,
          revaluedFunctionalAmount: group.revaluedFunctionalAmount,
          revaluedGroupAmount: group.revaluedGroupAmount,
        })

        const remeasurementDeltas = deltas.filter((delta) => isRemeasurementLayer(delta.layer))
        const translationDeltas = deltas.filter((delta) => delta.layer === 'group')
        for (const delta of translationDeltas) {
          groupTranslationDeltaTotal = roundMoney(groupTranslationDeltaTotal + delta.delta)
        }

        if (remeasurementDeltas.length === 0) {
          skippedGlBalanceCount += 1
          await tx.runItem.update({
            where: { id: runItem.id },
            data: {
              status: 'completed',
              completedAt: new Date(),
              message: translationDeltas.length > 0
                ? 'No local/functional remeasurement delta. Group translation is handled by the separate translation/CTA process.'
                : 'No unrealized FX delta for this GL balance on the selected as-of date.',
              resultPayloadJson: JSON.stringify({
                accountNumber: group.account.accountNumber,
                accountName: group.account.name,
                transactionCurrencyId: group.transactionCurrencyId,
                transactionCurrencyCode: group.transactionCurrencyCode,
                transactionAmount: group.transactionAmount,
                carryingContext: {
                  originalLocalAmount: group.carryingLocalAmount,
                  originalFunctionalAmount: group.carryingFunctionalAmount,
                  originalGroupAmount: group.carryingGroupAmount,
                },
                revaluedContext: {
                  originalLocalAmount: group.revaluedLocalAmount,
                  originalFunctionalAmount: group.revaluedFunctionalAmount,
                  originalGroupAmount: group.revaluedGroupAmount,
                },
                remeasurementDeltas,
                translationDeltas,
                sourceLineCount: group.sourceLineIds.length,
                firstPostingDate: group.firstPostingDate?.toISOString() ?? null,
                lastPostingDate: group.lastPostingDate?.toISOString() ?? null,
              }),
            },
          })
          continue
        }

        const sourceLine = ensureJournalLine(
          journalLines,
          group.account.id,
          group.subsidiaryId,
          `${group.account.accountNumber} ${group.account.name} FX revaluation`,
          `GL balance ${group.transactionCurrencyCode} across ${group.sourceLineIds.length} posted line${group.sourceLineIds.length === 1 ? '' : 's'}`,
        )

        for (const delta of remeasurementDeltas) {
          const offsetAccountId = delta.delta > 0 ? unrealizedFxGainAccountId : unrealizedFxLossAccountId
          const offsetLine = ensureJournalLine(
            journalLines,
            offsetAccountId,
            group.subsidiaryId,
            delta.delta > 0 ? 'Unrealized FX gain' : 'Unrealized FX loss',
            `GL balance FX revaluation ${delta.layer} layer`,
          )

          addSignedGlRemeasurementDelta(sourceLine, offsetLine, delta.layer, delta.delta)
          if (delta.layer === 'local') localDeltaTotal = roundMoney(localDeltaTotal + delta.delta)
          if (delta.layer === 'functional') functionalDeltaTotal = roundMoney(functionalDeltaTotal + delta.delta)
        }

        for (const source of group.translationSources) translationSources.add(source)
        revaluedGlBalanceCount += 1
        await tx.runItem.update({
          where: { id: runItem.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            message: `Calculated ${remeasurementDeltas.length} local/functional unrealized FX delta${remeasurementDeltas.length === 1 ? '' : 's'} for non-open-item GL balance.`,
            resultPayloadJson: JSON.stringify({
              accountNumber: group.account.accountNumber,
              accountName: group.account.name,
              transactionCurrencyId: group.transactionCurrencyId,
              transactionCurrencyCode: group.transactionCurrencyCode,
              transactionAmount: group.transactionAmount,
              carryingContext: {
                originalLocalAmount: group.carryingLocalAmount,
                originalFunctionalAmount: group.carryingFunctionalAmount,
                originalGroupAmount: group.carryingGroupAmount,
              },
              revaluedContext: {
                originalLocalAmount: group.revaluedLocalAmount,
                originalFunctionalAmount: group.revaluedFunctionalAmount,
                originalGroupAmount: group.revaluedGroupAmount,
              },
              remeasurementDeltas,
              translationDeltas,
              sourceLineCount: group.sourceLineIds.length,
              sourceJournalNumbers: Array.from(new Set(group.sourceJournalNumbers)),
              firstPostingDate: group.firstPostingDate?.toISOString() ?? null,
              lastPostingDate: group.lastPostingDate?.toISOString() ?? null,
            }),
          },
        })
      } catch (error) {
        failedGlBalanceCount += 1
        const message = error instanceof Error ? error.message : 'FX revaluation failed for this GL balance.'

        await tx.runItem.update({
          where: { id: runItem.id },
          data: {
            status: 'failed',
            completedAt: new Date(),
            message,
          },
        })

        await tx.runException.create({
          data: {
            runHeaderId: runHeader.id,
            runItemId: runItem.id,
            severity: 'error',
            exceptionType: 'fx_revaluation_gl_balance_error',
            status: 'open',
            sourceRecordType: 'chart_of_accounts',
            sourceRecordId: group.account.id,
            message,
            detailsJson: JSON.stringify({
              accountNumber: group.account.accountNumber,
              accountName: group.account.name,
              transactionCurrencyId: group.transactionCurrencyId,
              transactionCurrencyCode: group.transactionCurrencyCode,
              sourceLineCount: group.sourceLineIds.length,
            }),
          },
        })
      }
    }

    let journalEntryId: string | null = null
    const journalLineCreates = Array.from(journalLines.values()).filter((line) => {
      return (
        Math.abs(line.localDebit - line.localCredit) > MONEY_TOLERANCE
        || Math.abs(line.functionalDebit - line.functionalCredit) > MONEY_TOLERANCE
        || Math.abs(line.groupDebit - line.groupCredit) > MONEY_TOLERANCE
      )
    })

    if (journalLineCreates.length > 0) {
      const journalNumber = await generateNextSystemJournalNumber()
      const journalEntry = await tx.journalEntry.create({
        data: {
          number: journalNumber,
          date: asOfDate,
          description: `FX revaluation as of ${asOfDate.toISOString().slice(0, 10)}`,
          journalType: 'fx_revaluation',
          status: 'approved',
          total: 0,
          accountingPeriodId: period.id,
          sourceType: 'fx-revaluation',
          sourceId: runHeader.id,
          subsidiaryId: journalPostingContext.subsidiaryId,
          currencyId: journalPostingContext.currencyId,
          userId: input.requestedById ?? null,
          lineItems: {
            create: journalLineCreates.map((line, index) => ({
              displayOrder: index,
              description: line.description,
              memo: line.memo,
              activityTypeCode: 'fx_unrealized_revaluation',
              debit: 0,
              credit: 0,
              localDebit: line.localDebit > MONEY_TOLERANCE ? line.localDebit : null,
              localCredit: line.localCredit > MONEY_TOLERANCE ? line.localCredit : null,
              functionalDebit: line.functionalDebit > MONEY_TOLERANCE ? line.functionalDebit : null,
              functionalCredit: line.functionalCredit > MONEY_TOLERANCE ? line.functionalCredit : null,
              groupDebit: line.groupDebit > MONEY_TOLERANCE ? line.groupDebit : null,
              groupCredit: line.groupCredit > MONEY_TOLERANCE ? line.groupCredit : null,
              accountId: line.accountId,
              subsidiaryId: line.subsidiaryId,
            })),
          },
        },
        select: { id: true, number: true },
      })

      journalEntryId = journalEntry.id

      await tx.runOutputLink.create({
        data: {
          runHeaderId: runHeader.id,
          outputType: 'journal_entry',
          outputRecordType: 'journal_entry',
          outputRecordId: journalEntry.id,
          glHeaderId: journalEntry.id,
        },
      })
    }

    const totalFailedItems = failedItemCount + failedGlBalanceCount
    const totalRevaluedItems = revaluedItemCount + revaluedGlBalanceCount
    const totalSkippedItems = skippedItemCount + skippedGlBalanceCount

    const status =
      totalFailedItems === 0
        ? 'completed'
        : totalRevaluedItems > 0 || totalSkippedItems > 0
          ? 'completed_with_exceptions'
          : 'failed'

    const summary = {
      asOfDate: asOfDate.toISOString(),
      accountingPeriodId: period.id,
      subsidiaryId: effectiveSubsidiaryId,
      eligibleOpenItems: candidates.length,
      revaluedOpenItems: revaluedItemCount,
      skippedOpenItems: skippedItemCount,
      failedOpenItems: failedItemCount,
      eligibleGlBalances: eligibleGlBalanceCount,
      revaluedGlBalances: revaluedGlBalanceCount,
      skippedGlBalances: skippedGlBalanceCount,
      failedGlBalances: failedGlBalanceCount,
      revaluedItems: totalRevaluedItems,
      skippedItems: totalSkippedItems,
      failedItems: totalFailedItems,
      journalEntryId,
      localDeltaTotal,
      functionalDeltaTotal,
      groupTranslationDeltaTotal,
      translationStatus: 'not_posted_by_remeasurement',
      translationSourceSummary:
        translationSources.size === 0
          ? null
          : translationSources.size === 1
            ? Array.from(translationSources)[0]
            : 'Mixed exchange-rate sources',
    }

    const completedRun = await tx.runHeader.update({
      where: { id: runHeader.id },
      data: {
        status,
        completedAt: new Date(),
        completedById: input.requestedById ?? null,
        message:
          journalEntryId
            ? `FX revaluation completed. Journal ${journalEntryId} created for ${totalRevaluedItems} remeasured balance${totalRevaluedItems === 1 ? '' : 's'}.`
            : `FX revaluation completed with no posting deltas for the selected scope.`,
        summaryJson: JSON.stringify(summary),
      },
      select: {
        id: true,
        runNumber: true,
        status: true,
        message: true,
      },
    })

    return {
      runId: completedRun.id,
      runNumber: completedRun.runNumber,
      status: completedRun.status,
      message: completedRun.message,
      summary,
    }
  })
}
