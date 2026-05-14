export type PostingValidationLine = {
  accountId?: string | null
  debit?: number | { toString(): string } | null
  credit?: number | { toString(): string } | null
  localDebit?: number | { toString(): string } | null
  localCredit?: number | { toString(): string } | null
  functionalDebit?: number | { toString(): string } | null
  functionalCredit?: number | { toString(): string } | null
  groupDebit?: number | { toString(): string } | null
  groupCredit?: number | { toString(): string } | null
}

export type PostingValidationAccount = {
  id: string
  accountNumber: string
  name: string
  active: boolean
  isPosting: boolean
  summary: boolean
}

export type PostingValidationPeriod = {
  name: string
  startDate: Date
  endDate: Date
  subsidiaryId: string | null
  closed: boolean
  status: string
  arLocked: boolean
  apLocked: boolean
  inventoryLocked: boolean
}

export type PostingValidationModule = 'ar' | 'ap' | 'inventory' | 'gl'

export const CENT_TOLERANCE = 0.005

export function toPostingNumber(value: number | { toString(): string } | null | undefined) {
  if (value == null) return 0
  return Number(value)
}

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

export function assertBalancedPostingLines(lines: PostingValidationLine[]) {
  const totalDebit = roundCurrency(lines.reduce((sum, line) => sum + toPostingNumber(line.debit), 0))
  const totalCredit = roundCurrency(lines.reduce((sum, line) => sum + toPostingNumber(line.credit), 0))
  const difference = roundCurrency(totalDebit - totalCredit)

  if (Math.abs(difference) > CENT_TOLERANCE) {
    throw new Error(`Posting is out of balance: debits ${totalDebit.toFixed(2)} do not equal credits ${totalCredit.toFixed(2)}.`)
  }

  if (totalDebit <= 0) {
    throw new Error('Posting must include at least one debit and one credit amount.')
  }

  return totalDebit
}

export function assertValidPostingLines(lines: PostingValidationLine[]) {
  if (!lines.length) throw new Error('Posting must include at least two lines.')

  for (const [index, line] of lines.entries()) {
    const debit = toPostingNumber(line.debit)
    const credit = toPostingNumber(line.credit)
    const hasLayerAmount = [
      line.localDebit,
      line.localCredit,
      line.functionalDebit,
      line.functionalCredit,
      line.groupDebit,
      line.groupCredit,
    ].some((value) => Math.abs(toPostingNumber(value)) > CENT_TOLERANCE)

    if (!line.accountId) throw new Error(`Posting line ${index + 1} is missing a GL account.`)
    if (debit < 0 || credit < 0) throw new Error(`Posting line ${index + 1} cannot have negative debit or credit values.`)
    if (debit > 0 && credit > 0) throw new Error(`Posting line ${index + 1} cannot have both debit and credit values.`)
    if (debit === 0 && credit === 0 && !hasLayerAmount) {
      throw new Error(`Posting line ${index + 1} must have a debit, credit, or translated layer value.`)
    }
  }
}

export function assertPostingPeriodControls(args: {
  period: PostingValidationPeriod
  postingDate: Date
  subsidiaryId?: string | null
  module?: PostingValidationModule
}) {
  const { period, postingDate, subsidiaryId, module } = args

  if (subsidiaryId && period.subsidiaryId && period.subsidiaryId !== subsidiaryId) {
    throw new Error(`Accounting period ${period.name} belongs to a different subsidiary.`)
  }
  if (postingDate < period.startDate || postingDate > period.endDate) {
    throw new Error(`Posting date must fall inside accounting period ${period.name}.`)
  }
  if (period.closed || period.status.toLowerCase() === 'closed') {
    throw new Error(`Accounting period ${period.name} is closed.`)
  }
  if (module === 'ar' && period.arLocked) throw new Error(`AR is locked for accounting period ${period.name}.`)
  if (module === 'ap' && period.apLocked) throw new Error(`AP is locked for accounting period ${period.name}.`)
  if (module === 'inventory' && period.inventoryLocked) {
    throw new Error(`Inventory is locked for accounting period ${period.name}.`)
  }
}

export function assertPostingAccountControls(
  accountIds: string[],
  accounts: PostingValidationAccount[],
) {
  const accountById = new Map(accounts.map((account) => [account.id, account]))

  for (const accountId of Array.from(new Set(accountIds))) {
    const account = accountById.get(accountId)
    if (!account) throw new Error(`Posting account ${accountId} was not found.`)
    if (!account.active) throw new Error(`Posting account ${account.accountNumber} ${account.name} is inactive.`)
    if (!account.isPosting || account.summary) {
      throw new Error(`Posting account ${account.accountNumber} ${account.name} is not a posting account.`)
    }
  }
}
