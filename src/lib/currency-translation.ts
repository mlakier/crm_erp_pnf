import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { generateNextSystemJournalNumber } from '@/lib/journal-number'
import { getRequiredStandardTransactionPostingContext } from '@/lib/transaction-posting-context'
import { loadConfiguredCtaPostingAccount } from '@/lib/company-setup-account-resolver'
import { validatePostingAccountsAndPeriodControls } from '@/lib/accounting/posting-engine'

const MONEY_TOLERANCE = 0.005

type RunCurrencyTranslationInput = {
  accountingPeriodId: string
  asOfDate: Date | string
  subsidiaryId?: string | null
  requestedById?: string | null
  triggerType?: string | null
}

type TranslationLine = {
  accountId: string
  accountNumber: string
  accountName: string
  functionalNet: number
  existingGroupNet: number
  translatedGroupNet: number
  groupDelta: number
}

function roundMoney(value: Prisma.Decimal.Value | number | null | undefined) {
  return Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100
}

function normalizeDateOnly(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error('A valid as-of date is required for currency translation.')
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function generateTranslationRunNumber() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `TRN-${stamp}-${suffix}`
}

async function loadClosingRate(args: {
  tx: Prisma.TransactionClient
  fromCurrencyId: string
  toCurrencyId: string
  asOfDate: Date
}) {
  if (args.fromCurrencyId === args.toCurrencyId) return 1

  const rateTypeCandidates = ['closing', 'Closing', 'closing_rate', 'Closing Rate']
  const rows = await args.tx.exchangeRate.findMany({
    where: {
      active: true,
      effectiveDate: { lte: args.asOfDate },
      rateType: { in: rateTypeCandidates },
      OR: [
        { baseCurrencyId: args.fromCurrencyId, quoteCurrencyId: args.toCurrencyId },
        { baseCurrencyId: args.toCurrencyId, quoteCurrencyId: args.fromCurrencyId },
      ],
    },
    orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    select: {
      baseCurrencyId: true,
      quoteCurrencyId: true,
      rate: true,
      source: true,
      effectiveDate: true,
    },
    take: 1,
  })

  const row = rows[0]
  if (!row) {
    throw new Error('Missing closing exchange rate for subsidiary functional currency to group currency.')
  }

  const rate = Number(row.rate)
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('Configured closing exchange rate must be greater than zero.')
  }

  return row.baseCurrencyId === args.fromCurrencyId ? rate : 1 / rate
}

export async function runCurrencyTranslation(input: RunCurrencyTranslationInput) {
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

    if (!period) throw new Error('Accounting period not found for currency translation.')
    if (period.closed) throw new Error('The selected accounting period is closed and cannot accept translation postings.')
    if (asOfDate < period.startDate || asOfDate > period.endDate) {
      throw new Error('The currency translation as-of date must fall inside the selected accounting period.')
    }

    const effectiveSubsidiaryId = input.subsidiaryId ?? period.subsidiaryId ?? null
    if (!effectiveSubsidiaryId) {
      throw new Error('Currency translation requires a subsidiary-scoped run.')
    }
    if (input.subsidiaryId && period.subsidiaryId && input.subsidiaryId !== period.subsidiaryId) {
      throw new Error('The selected accounting period belongs to a different subsidiary than the chosen translation scope.')
    }

    const subsidiary = await tx.subsidiary.findUnique({
      where: { id: effectiveSubsidiaryId },
      select: {
        id: true,
        subsidiaryId: true,
        name: true,
        localCurrencyId: true,
        functionalCurrencyId: true,
        groupCurrencyId: true,
      },
    })

    if (!subsidiary) throw new Error('Subsidiary not found for currency translation.')
    if (!subsidiary.functionalCurrencyId || !subsidiary.groupCurrencyId) {
      throw new Error('Subsidiary needs both functional currency and group currency before translation can run.')
    }
    if (subsidiary.functionalCurrencyId === subsidiary.groupCurrencyId) {
      throw new Error('Subsidiary functional currency already equals group currency; no translation run is needed.')
    }

    const { ctaAccountId } = await loadConfiguredCtaPostingAccount(tx)
    if (!ctaAccountId) {
      throw new Error('Configure the CTA account in Company Setup before running currency translation.')
    }

    const journalPostingContext = getRequiredStandardTransactionPostingContext('journal', {
      subsidiaryId: subsidiary.id,
      currencyId: subsidiary.functionalCurrencyId,
    })
    if ('error' in journalPostingContext) throw new Error(journalPostingContext.error)

    const existingRun = await tx.runHeader.findFirst({
      where: {
        runType: 'translation',
        accountingPeriodId: period.id,
        subsidiaryScope: effectiveSubsidiaryId,
        asOfDate,
        status: { in: ['queued', 'running', 'completed', 'completed_with_exceptions'] },
      },
      orderBy: { requestedAt: 'desc' },
      select: { id: true, runNumber: true, status: true, message: true, summaryJson: true },
    })

    if (existingRun) {
      let existingJournalId: string | null = null
      if (existingRun.summaryJson) {
        try {
          existingJournalId = (JSON.parse(existingRun.summaryJson) as { journalEntryId?: string | null }).journalEntryId ?? null
        } catch {
          existingJournalId = null
        }
      }
      return {
        runId: existingRun.id,
        runNumber: existingRun.runNumber,
        status: existingRun.status,
        message: existingRun.message ?? `Translation ${existingRun.runNumber} already exists for this subsidiary, period, and as-of date.`,
        summary: {
          asOfDate: asOfDate.toISOString(),
          accountingPeriodId: period.id,
          subsidiaryId: effectiveSubsidiaryId,
          translatedAccounts: 0,
          skippedAccounts: 0,
          failedItems: 0,
          journalEntryId: existingJournalId,
          duplicateOfRunId: existingRun.id,
          duplicateOfRunNumber: existingRun.runNumber,
          groupDeltaTotal: 0,
        },
      }
    }

    const runHeader = await tx.runHeader.create({
      data: {
        runNumber: generateTranslationRunNumber(),
        runType: 'translation',
        triggerType,
        scopeType: 'subsidiary_period',
        scopeJson: JSON.stringify({
          accountingPeriodId: period.id,
          accountingPeriodName: period.name,
          subsidiaryId: effectiveSubsidiaryId,
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
        message: 'Currency translation run started.',
      },
    })

    const closingRate = await loadClosingRate({
      tx,
      fromCurrencyId: subsidiary.functionalCurrencyId,
      toCurrencyId: subsidiary.groupCurrencyId,
      asOfDate,
    })

    const accounts = await tx.chartOfAccounts.findMany({
      where: {
        active: true,
        isPosting: true,
        translationTreatment: 'closing_rate',
        financialStatementSection: 'Balance Sheet',
        id: { not: ctaAccountId },
      },
      select: { id: true, accountNumber: true, name: true },
      orderBy: [{ accountNumber: 'asc' }, { name: 'asc' }],
    })

    const translationLines: TranslationLine[] = []
    let skippedAccounts = 0
    let failedItems = 0

    for (const [index, account] of accounts.entries()) {
      const runItem = await tx.runItem.create({
        data: {
          runHeaderId: runHeader.id,
          itemNumber: index + 1,
          itemType: 'account_translation',
          status: 'running',
          sourceRecordType: 'chart_of_accounts',
          sourceRecordId: account.id,
          startedAt: new Date(),
        },
      })

      try {
        const lines = await tx.journalEntryLineItem.findMany({
          where: {
            accountId: account.id,
            subsidiaryId: effectiveSubsidiaryId,
            journalEntry: {
              date: { lte: asOfDate },
              status: { in: ['approved', 'posted'] },
            },
          },
          select: {
            functionalDebit: true,
            functionalCredit: true,
            groupDebit: true,
            groupCredit: true,
          },
        })

        const functionalNet = roundMoney(lines.reduce((sum, line) => {
          return sum + Number(line.functionalDebit ?? 0) - Number(line.functionalCredit ?? 0)
        }, 0))
        const existingGroupNet = roundMoney(lines.reduce((sum, line) => {
          return sum + Number(line.groupDebit ?? 0) - Number(line.groupCredit ?? 0)
        }, 0))
        const translatedGroupNet = roundMoney(functionalNet * closingRate)
        const groupDelta = roundMoney(translatedGroupNet - existingGroupNet)

        if (Math.abs(groupDelta) <= MONEY_TOLERANCE) {
          skippedAccounts += 1
          await tx.runItem.update({
            where: { id: runItem.id },
            data: {
              status: 'completed',
              completedAt: new Date(),
              message: 'No group translation true-up needed.',
              resultPayloadJson: JSON.stringify({ functionalNet, existingGroupNet, translatedGroupNet, groupDelta }),
            },
          })
          continue
        }

        translationLines.push({
          accountId: account.id,
          accountNumber: account.accountNumber,
          accountName: account.name,
          functionalNet,
          existingGroupNet,
          translatedGroupNet,
          groupDelta,
        })

        await tx.runItem.update({
          where: { id: runItem.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            message: 'Calculated group translation true-up.',
            resultPayloadJson: JSON.stringify({ functionalNet, existingGroupNet, translatedGroupNet, groupDelta }),
          },
        })
      } catch (error) {
        failedItems += 1
        const message = error instanceof Error ? error.message : 'Currency translation failed for this account.'
        await tx.runItem.update({
          where: { id: runItem.id },
          data: { status: 'failed', completedAt: new Date(), message },
        })
        await tx.runException.create({
          data: {
            runHeaderId: runHeader.id,
            runItemId: runItem.id,
            severity: 'error',
            exceptionType: 'currency_translation_account_error',
            status: 'open',
            sourceRecordType: 'chart_of_accounts',
            sourceRecordId: account.id,
            message,
          },
        })
      }
    }

    let journalEntryId: string | null = null
    const groupDeltaTotal = roundMoney(translationLines.reduce((sum, line) => sum + line.groupDelta, 0))

    if (translationLines.length > 0) {
      await validatePostingAccountsAndPeriodControls({
        tx,
        postingDate: asOfDate,
        accountingPeriodId: period.id,
        subsidiaryId: journalPostingContext.subsidiaryId,
        module: 'gl',
        accountIds: [...translationLines.map((line) => line.accountId), ctaAccountId],
      })

      const journalNumber = await generateNextSystemJournalNumber(tx)
      const journalEntry = await tx.journalEntry.create({
        data: {
          number: journalNumber,
          date: asOfDate,
          description: `Currency translation / CTA as of ${asOfDate.toISOString().slice(0, 10)}`,
          journalType: 'translation',
          status: 'approved',
          total: 0,
          accountingPeriodId: period.id,
          sourceType: 'currency-translation',
          sourceId: runHeader.id,
          subsidiaryId: journalPostingContext.subsidiaryId,
          currencyId: journalPostingContext.currencyId,
          userId: input.requestedById ?? null,
          lineItems: {
            create: [
              ...translationLines.map((line, index) => ({
                displayOrder: index,
                description: `${line.accountNumber} ${line.accountName} group translation true-up`,
                memo: `Closing-rate translation at ${closingRate.toFixed(8)}`,
                activityTypeCode: 'translation',
                debit: 0,
                credit: 0,
                groupDebit: line.groupDelta > MONEY_TOLERANCE ? line.groupDelta : null,
                groupCredit: line.groupDelta < -MONEY_TOLERANCE ? Math.abs(line.groupDelta) : null,
                accountId: line.accountId,
                subsidiaryId: effectiveSubsidiaryId,
              })),
              {
                displayOrder: translationLines.length,
                description: 'Cumulative translation adjustment',
                memo: `Offset for ${translationLines.length} translated account${translationLines.length === 1 ? '' : 's'}`,
                activityTypeCode: 'cta',
                debit: 0,
                credit: 0,
                groupDebit: groupDeltaTotal < -MONEY_TOLERANCE ? Math.abs(groupDeltaTotal) : null,
                groupCredit: groupDeltaTotal > MONEY_TOLERANCE ? groupDeltaTotal : null,
                accountId: ctaAccountId,
                subsidiaryId: effectiveSubsidiaryId,
              },
            ],
          },
        },
        select: { id: true },
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

    const status = failedItems === 0 ? 'completed' : translationLines.length > 0 || skippedAccounts > 0 ? 'completed_with_exceptions' : 'failed'
    const summary = {
      asOfDate: asOfDate.toISOString(),
      accountingPeriodId: period.id,
      subsidiaryId: effectiveSubsidiaryId,
      translatedAccounts: translationLines.length,
      skippedAccounts,
      failedItems,
      journalEntryId,
      groupDeltaTotal,
      closingRate,
      rateBasis: 'closing_rate',
    }

    const completedRun = await tx.runHeader.update({
      where: { id: runHeader.id },
      data: {
        status,
        completedAt: new Date(),
        completedById: input.requestedById ?? null,
        message: journalEntryId
          ? `Currency translation completed. Journal ${journalEntryId} created for ${translationLines.length} account${translationLines.length === 1 ? '' : 's'}.`
          : 'Currency translation completed with no CTA posting deltas for the selected scope.',
        summaryJson: JSON.stringify(summary),
      },
      select: { id: true, runNumber: true, status: true, message: true },
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
