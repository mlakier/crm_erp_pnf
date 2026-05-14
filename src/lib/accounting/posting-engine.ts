import type { Prisma, PrismaClient } from '@prisma/client'
import { generateNextSystemJournalNumber } from '@/lib/journal-number'
import { prisma } from '@/lib/prisma'
import {
  assertBalancedPostingLines,
  assertPostingAccountControls,
  assertPostingPeriodControls,
  assertValidPostingLines,
} from '@/lib/accounting/posting-validation'

type PostingModule = 'ar' | 'ap' | 'inventory' | 'gl'

type PostingLineInput = {
  displayOrder?: number
  description?: string | null
  memo?: string | null
  activityTypeCode?: string | null
  debit?: number | Prisma.Decimal | null
  credit?: number | Prisma.Decimal | null
  localDebit?: number | Prisma.Decimal | null
  localCredit?: number | Prisma.Decimal | null
  functionalDebit?: number | Prisma.Decimal | null
  functionalCredit?: number | Prisma.Decimal | null
  groupDebit?: number | Prisma.Decimal | null
  groupCredit?: number | Prisma.Decimal | null
  accountId: string
  subsidiaryId?: string | null
  departmentId?: string | null
  locationId?: string | null
  classId?: string | null
  projectId?: string | null
  customerId?: string | null
  vendorId?: string | null
  itemId?: string | null
  employeeId?: string | null
  settlesOpenItemId?: string | null
  reconciliationGroupKey?: string | null
  reconciliationInstanceId?: string | null
}

type PostingRequest = {
  sourceType: string
  sourceId: string
  description?: string | null
  postingDate: Date
  accountingPeriodId?: string | null
  journalType?: string
  status?: string
  subsidiaryId: string
  currencyId: string
  userId?: string | null
  module?: PostingModule
  isOpenItemRelevant?: boolean
  lines: PostingLineInput[]
}

type PostingResult = {
  journalEntryId: string
  journalNumber: string
  created: boolean
}

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

type PostingControlsInput = {
  postingDate: Date
  accountingPeriodId?: string | null
  subsidiaryId: string | null
  module?: PostingModule
  lines: PostingLineInput[]
}

type PostingPeriodInput = Omit<PostingControlsInput, 'lines'>

async function findAccountingPeriod(tx: TransactionClient, input: PostingPeriodInput) {
  if (input.accountingPeriodId) {
    const period = await tx.accountingPeriod.findUnique({
      where: { id: input.accountingPeriodId },
    })
    if (!period) throw new Error('Selected accounting period was not found.')
    assertPostingPeriodControls({
      period,
      postingDate: input.postingDate,
      subsidiaryId: input.subsidiaryId,
      module: input.module,
    })
    return period
  }

  const periodFilter = {
    startDate: { lte: input.postingDate },
    endDate: { gte: input.postingDate },
    OR: [{ subsidiaryId: input.subsidiaryId }, { subsidiaryId: null }],
  } satisfies Prisma.AccountingPeriodWhereInput

  const periods = await tx.accountingPeriod.findMany({
    where: periodFilter,
    orderBy: [{ subsidiaryId: 'desc' }, { startDate: 'desc' }],
    take: 2,
  })

  const period = periods.find((candidate) => candidate.subsidiaryId === input.subsidiaryId) ?? periods[0] ?? null
  if (!period) {
    throw new Error(`No accounting period is configured for posting date ${input.postingDate.toISOString().slice(0, 10)}.`)
  }

  assertPostingPeriodControls({
    period,
    postingDate: input.postingDate,
    subsidiaryId: input.subsidiaryId,
    module: input.module,
  })

  return period
}

async function assertPostingAccounts(tx: TransactionClient, lines: PostingLineInput[]) {
  const accountIds = Array.from(new Set(lines.map((line) => line.accountId)))
  const accounts = await tx.chartOfAccounts.findMany({
    where: { id: { in: accountIds } },
    select: {
      id: true,
      accountNumber: true,
      name: true,
      active: true,
      isPosting: true,
      summary: true,
    },
  })
  assertPostingAccountControls(accountIds, accounts)
}

function normalizeLine(line: PostingLineInput, index: number) {
  return {
    displayOrder: line.displayOrder ?? index,
    description: line.description ?? undefined,
    memo: line.memo ?? undefined,
    activityTypeCode: line.activityTypeCode ?? undefined,
    debit: line.debit ?? 0,
    credit: line.credit ?? 0,
    localDebit: line.localDebit ?? undefined,
    localCredit: line.localCredit ?? undefined,
    functionalDebit: line.functionalDebit ?? undefined,
    functionalCredit: line.functionalCredit ?? undefined,
    groupDebit: line.groupDebit ?? undefined,
    groupCredit: line.groupCredit ?? undefined,
    accountId: line.accountId,
    subsidiaryId: line.subsidiaryId ?? undefined,
    departmentId: line.departmentId ?? undefined,
    locationId: line.locationId ?? undefined,
    classId: line.classId ?? undefined,
    projectId: line.projectId ?? undefined,
    customerId: line.customerId ?? undefined,
    vendorId: line.vendorId ?? undefined,
    itemId: line.itemId ?? undefined,
    employeeId: line.employeeId ?? undefined,
    settlesOpenItemId: line.settlesOpenItemId ?? undefined,
    reconciliationGroupKey: line.reconciliationGroupKey ?? undefined,
    reconciliationInstanceId: line.reconciliationInstanceId ?? undefined,
  }
}

export async function postJournalFromSourceInTransaction(
  tx: TransactionClient,
  input: PostingRequest,
): Promise<PostingResult> {
  const existing = await tx.journalEntry.findFirst({
    where: { sourceType: input.sourceType, sourceId: input.sourceId },
    select: { id: true, number: true },
  })
  if (existing) {
    return { journalEntryId: existing.id, journalNumber: existing.number, created: false }
  }

  const { period, total } = await validateJournalPostingControls({
    tx,
    postingDate: input.postingDate,
    accountingPeriodId: input.accountingPeriodId,
    subsidiaryId: input.subsidiaryId,
    module: input.module,
    lines: input.lines,
  })

  const journalNumber = await generateNextSystemJournalNumber(tx)
  const journal = await tx.journalEntry.create({
    data: {
      number: journalNumber,
      date: input.postingDate,
      description: input.description ?? null,
      journalType: input.journalType ?? 'standard',
      status: input.status ?? 'approved',
      total,
      accountingPeriodId: period.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      subsidiaryId: input.subsidiaryId,
      currencyId: input.currencyId,
      userId: input.userId ?? null,
      isOpenItemRelevant: input.isOpenItemRelevant ?? false,
      lineItems: {
        create: input.lines.map(normalizeLine),
      },
    },
    select: { id: true, number: true },
  })

  return { journalEntryId: journal.id, journalNumber: journal.number, created: true }
}

export async function postJournalFromSource(input: PostingRequest): Promise<PostingResult> {
  return prisma.$transaction(async (tx) => {
    return postJournalFromSourceInTransaction(tx, input)
  })
}

export async function validateJournalPostingControls(input: PostingControlsInput & { tx?: TransactionClient }) {
  assertValidPostingLines(input.lines)
  const total = assertBalancedPostingLines(input.lines)
  const tx = input.tx ?? prisma
  const period = await findAccountingPeriod(tx, input)
  await assertPostingAccounts(tx, input.lines)

  return {
    accountingPeriodId: period.id,
    period,
    total,
  }
}

export async function validatePostingAccountsAndPeriodControls(
  input: Omit<PostingControlsInput, 'lines'> & {
    tx?: TransactionClient
    accountIds: string[]
  },
) {
  const tx = input.tx ?? prisma
  const period = await findAccountingPeriod(tx, input)
  await assertPostingAccounts(
    tx,
    Array.from(new Set(input.accountIds)).map((accountId) => ({ accountId })),
  )

  return {
    accountingPeriodId: period.id,
    period,
  }
}
