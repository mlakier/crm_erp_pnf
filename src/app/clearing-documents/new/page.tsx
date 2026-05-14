import { connection } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadListValues } from '@/lib/load-list-values'
import ClearingDocumentPageClient from '@/components/ClearingDocumentPageClient'

export const runtime = 'nodejs'

export default async function NewClearingDocumentPage({
  searchParams,
}: {
  searchParams?: Promise<{
    fromOpenItemId?: string
    toOpenItemId?: string
    amount?: string
    lines?: string
    postingDate?: string
    accountingPeriodId?: string
    sourceTransactionType?: string
    sourceTransactionId?: string
  }>
}) {
  await connection()
  const params = searchParams ? await searchParams : {}
  const fromOpenItemId = String(params.fromOpenItemId ?? '').trim()
  const toOpenItemId = String(params.toOpenItemId ?? '').trim()
  const requestedAmount = String(params.amount ?? '').trim()
  const requestedPostingDate = String(params.postingDate ?? '').trim()
  const requestedAccountingPeriodId = String(params.accountingPeriodId ?? '').trim()
  const requestedSourceTransactionType = String(params.sourceTransactionType ?? '').trim()
  const requestedSourceTransactionId = String(params.sourceTransactionId ?? '').trim()
  const requestedLines = (() => {
    const rawLines = String(params.lines ?? '').trim()
    if (!rawLines) return []
    try {
      const parsed = JSON.parse(rawLines) as Array<{
        fromOpenItemId?: string
        toOpenItemId?: string
        amount?: string
      }>
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })()
  const [accountingPeriods, openItems, statusValues, subsidiaries, currencies] = await Promise.all([
    prisma.accountingPeriod.findMany({
      orderBy: [{ startDate: 'desc' }],
      select: { id: true, name: true },
    }),
    prisma.openItem.findMany({
      where: { isOpen: true },
      orderBy: [{ postingDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
      select: {
        id: true,
        openItemNumber: true,
        sourceNumber: true,
        openItemType: true,
        originalTransactionAmount: true,
        postingDate: true,
        dueDate: true,
        subsidiaryId: true,
        transactionCurrencyId: true,
        localCurrencyId: true,
        functionalCurrencyId: true,
        groupCurrencyId: true,
        counterpartyType: true,
        counterpartyId: true,
        account: {
          select: {
            accountId: true,
            accountNumber: true,
            name: true,
          },
        },
        entries: {
          select: {
            transactionAmount: true,
            localAmount: true,
            functionalAmount: true,
            groupAmount: true,
          },
        },
      },
    }),
    loadListValues('CLEARING-DOCUMENT-STATUS'),
    prisma.subsidiary.findMany({
      where: { active: true },
      orderBy: [{ subsidiaryId: 'asc' }],
      select: { id: true, subsidiaryId: true, name: true },
    }),
    prisma.currency.findMany({
      where: { active: true },
      orderBy: [{ code: 'asc' }, { currencyId: 'asc' }],
      select: { id: true, code: true, currencyId: true, name: true },
    }),
  ])
  const editableStatusValues = statusValues.filter((value) =>
    ['draft', 'pending approval', 'approved'].includes(value.toLowerCase()),
  )
  const openItemOptionRows = openItems.map((item) => {
    const remainingTransactionAmount = item.entries.reduce(
      (sum, entry) => sum + Number(entry.transactionAmount),
      0,
    )
    const remainingLocalAmount = item.entries.reduce(
      (sum, entry) => sum + Number(entry.localAmount ?? 0),
      0,
    )
    const remainingFunctionalAmount = item.entries.reduce(
      (sum, entry) => sum + Number(entry.functionalAmount ?? 0),
      0,
    )
    const remainingGroupAmount = item.entries.reduce(
      (sum, entry) => sum + Number(entry.groupAmount ?? 0),
      0,
    )
    return {
      value: item.id,
      label: `${item.openItemNumber} - ${item.sourceNumber ?? item.openItemType} - remaining ${remainingTransactionAmount.toFixed(2)}`,
      openItemNumber: item.openItemNumber,
      sourceNumber: item.sourceNumber,
      openItemType: item.openItemType,
      accountLabel: item.account
        ? `${item.account.accountNumber ?? item.account.accountId} - ${item.account.name}`
        : null,
      subsidiaryId: item.subsidiaryId,
      transactionCurrencyId: item.transactionCurrencyId,
      localCurrencyId: item.localCurrencyId,
      functionalCurrencyId: item.functionalCurrencyId,
      groupCurrencyId: item.groupCurrencyId,
      counterpartyType: item.counterpartyType,
      counterpartyId: item.counterpartyId,
      postingDate: item.postingDate ? item.postingDate.toISOString().slice(0, 10) : null,
      dueDate: item.dueDate ? item.dueDate.toISOString().slice(0, 10) : null,
      remainingTransactionAmount,
      remainingLocalAmount,
      remainingFunctionalAmount,
      remainingGroupAmount,
    }
  })
  const fromItem = openItemOptionRows.find((item) => item.value === fromOpenItemId) ?? null
  const toItem = openItemOptionRows.find((item) => item.value === toOpenItemId) ?? null
  const prefillLines = requestedLines
    .map((line, index) => {
      const fromLineItem = openItemOptionRows.find((item) => item.value === String(line.fromOpenItemId ?? '').trim())
      const toLineItem = openItemOptionRows.find((item) => item.value === String(line.toOpenItemId ?? '').trim())
      if (!fromLineItem && !toLineItem) return null
      return {
        key: `line-${index + 1}`,
        lineRole: 'manual-settlement',
        fromOpenItemId: fromLineItem?.value ?? '',
        toOpenItemId: toLineItem?.value ?? '',
        transactionAmount: String(line.amount ?? '').trim(),
        memo: '',
      }
    })
    .filter((line): line is {
      key: string
      lineRole: string
      fromOpenItemId: string
      toOpenItemId: string
      transactionAmount: string
      memo: string
    } => Boolean(line))
  const firstPrefillFromItem = prefillLines[0]?.fromOpenItemId
    ? openItemOptionRows.find((item) => item.value === prefillLines[0]?.fromOpenItemId) ?? null
    : null
  const firstPrefillToItem = prefillLines[0]?.toOpenItemId
    ? openItemOptionRows.find((item) => item.value === prefillLines[0]?.toOpenItemId) ?? null
    : null
  const defaultAmount =
    requestedAmount
    || (prefillLines.length > 0
      ? prefillLines.reduce((sum, line) => sum + Number(line.transactionAmount || 0), 0).toFixed(2)
      : '')
    || (fromItem && toItem ? Math.min(fromItem.remainingTransactionAmount, toItem.remainingTransactionAmount).toFixed(2) : '0.00')

  return (
    <ClearingDocumentPageClient
      mode="create"
      subsidiaryOptions={subsidiaries.map((subsidiary) => ({
        value: subsidiary.id,
        label: `${subsidiary.subsidiaryId} - ${subsidiary.name}`,
      }))}
      currencyOptions={currencies.map((currency) => ({
        value: currency.id,
        label: `${currency.code ?? currency.currencyId} - ${currency.name}`,
      }))}
      accountingPeriodOptions={accountingPeriods.map((period) => ({
        value: period.id,
        label: period.name,
      }))}
      openItemOptions={openItemOptionRows}
      statusOptions={editableStatusValues.map((value) => ({
        value: value.toLowerCase(),
        label: value,
      }))}
      initialHeaderValues={{
        status: 'draft',
        clearingType: 'manual-clearing',
        subsidiaryId: firstPrefillFromItem?.subsidiaryId ?? fromItem?.subsidiaryId ?? '',
        transactionCurrencyId: firstPrefillFromItem?.transactionCurrencyId ?? fromItem?.transactionCurrencyId ?? '',
        counterpartyType: firstPrefillFromItem?.counterpartyType ?? fromItem?.counterpartyType ?? firstPrefillToItem?.counterpartyType ?? '',
        counterpartyId: firstPrefillFromItem?.counterpartyId ?? fromItem?.counterpartyId ?? firstPrefillToItem?.counterpartyId ?? '',
        transactionAmount: defaultAmount,
        localAmount: '0.00',
        functionalAmount: '0.00',
        groupAmount: '0.00',
        postingDate: requestedPostingDate,
        clearingDate: requestedPostingDate,
        accountingPeriodId: requestedAccountingPeriodId,
        sourceTransactionType: requestedSourceTransactionType,
        sourceTransactionId: requestedSourceTransactionId,
      }}
      initialLines={
        prefillLines.length > 0
          ? prefillLines
          : fromItem || toItem
          ? [
              {
                key: 'line-1',
                lineRole: 'manual-settlement',
                fromOpenItemId: fromItem?.value ?? '',
                toOpenItemId: toItem?.value ?? '',
                transactionAmount: defaultAmount === '0.00' ? '' : defaultAmount,
                memo: '',
              },
            ]
          : undefined
      }
    />
  )
}
