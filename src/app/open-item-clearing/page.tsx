import { connection } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenItemClearingWorkbenchClient, {
  type ClearingWorkbenchOpenItem,
} from '@/components/OpenItemClearingWorkbenchClient'

export const runtime = 'nodejs'

function formatDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null
}

export default async function OpenItemClearingPage() {
  await connection()
  const [openItems, subsidiaries, currencies, accounts, customers, vendors, employees, accountingPeriods] = await Promise.all([
    prisma.openItem.findMany({
      where: { isOpen: true },
      orderBy: [{ postingDate: 'desc' }, { createdAt: 'desc' }],
      take: 1000,
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
        sourceNumber: true,
        counterpartyType: true,
        counterpartyId: true,
        postingDate: true,
        dueDate: true,
        originalTransactionAmount: true,
        originalLocalAmount: true,
        originalFunctionalAmount: true,
        originalGroupAmount: true,
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
    prisma.subsidiary.findMany({
      select: { id: true, subsidiaryId: true, name: true },
      orderBy: [{ subsidiaryId: 'asc' }],
    }),
    prisma.currency.findMany({
      select: { id: true, code: true, currencyId: true, name: true },
      orderBy: [{ code: 'asc' }, { currencyId: 'asc' }],
    }),
    prisma.chartOfAccounts.findMany({
      select: { id: true, accountNumber: true, name: true },
      orderBy: [{ accountNumber: 'asc' }],
    }),
    prisma.customer.findMany({
      select: { id: true, customerId: true, name: true },
      orderBy: [{ customerId: 'asc' }],
    }),
    prisma.vendor.findMany({
      select: { id: true, vendorNumber: true, name: true },
      orderBy: [{ vendorNumber: 'asc' }],
    }),
    prisma.employee.findMany({
      select: { id: true, employeeId: true, displayName: true, firstName: true, lastName: true },
      orderBy: [{ employeeId: 'asc' }],
    }),
    prisma.accountingPeriod.findMany({
      where: { closed: false },
      select: { id: true, name: true, startDate: true, endDate: true },
      orderBy: [{ startDate: 'desc' }],
    }),
  ])

  const subsidiaryById = new Map(
    subsidiaries.map((subsidiary) => [subsidiary.id, `${subsidiary.subsidiaryId} - ${subsidiary.name}`]),
  )
  const currencyById = new Map(
    currencies.map((currency) => [currency.id, `${currency.code ?? currency.currencyId} - ${currency.name}`]),
  )
  const accountById = new Map(
    accounts.map((account) => [account.id, `${account.accountNumber} - ${account.name}`]),
  )
  const customerById = new Map(
    customers.map((customer) => [customer.id, `${customer.customerId} - ${customer.name}`]),
  )
  const vendorById = new Map(
    vendors.map((vendor) => [vendor.id, `${vendor.vendorNumber} - ${vendor.name}`]),
  )
  const employeeById = new Map(
    employees.map((employee) => [
      employee.id,
      `${employee.employeeId} - ${employee.displayName ?? [employee.firstName, employee.lastName].filter(Boolean).join(' ')}`,
    ]),
  )

  function counterpartyLabel(type: string | null, id: string | null) {
    if (!type || !id) return '-'
    if (type === 'customer') return customerById.get(id) ?? id
    if (type === 'vendor') return vendorById.get(id) ?? id
    if (type === 'employee') return employeeById.get(id) ?? id
    return id
  }

  const rows: ClearingWorkbenchOpenItem[] = openItems
    .map((item) => ({
      id: item.id,
      openItemNumber: item.openItemNumber,
      openItemType: item.openItemType,
      accountType: item.accountType,
      accountId: item.accountId,
      sourceNumber: item.sourceNumber,
      subsidiaryId: item.subsidiaryId,
      subsidiaryLabel: subsidiaryById.get(item.subsidiaryId) ?? item.subsidiaryId,
      transactionCurrencyId: item.transactionCurrencyId,
      transactionCurrencyLabel: currencyById.get(item.transactionCurrencyId) ?? item.transactionCurrencyId,
      localCurrencyLabel: item.localCurrencyId ? currencyById.get(item.localCurrencyId) ?? item.localCurrencyId : currencyById.get(item.transactionCurrencyId) ?? item.transactionCurrencyId,
      functionalCurrencyLabel: item.functionalCurrencyId ? currencyById.get(item.functionalCurrencyId) ?? item.functionalCurrencyId : currencyById.get(item.transactionCurrencyId) ?? item.transactionCurrencyId,
      groupCurrencyLabel: item.groupCurrencyId ? currencyById.get(item.groupCurrencyId) ?? item.groupCurrencyId : currencyById.get(item.transactionCurrencyId) ?? item.transactionCurrencyId,
      counterpartyType: item.counterpartyType,
      counterpartyId: item.counterpartyId,
      counterpartyLabel: counterpartyLabel(item.counterpartyType, item.counterpartyId),
      accountLabel: item.accountId ? accountById.get(item.accountId) ?? item.accountId : item.accountType,
      postingDate: formatDate(item.postingDate),
      dueDate: formatDate(item.dueDate),
      originalTransactionAmount: Number(item.originalTransactionAmount),
      originalLocalAmount: item.originalLocalAmount == null ? null : Number(item.originalLocalAmount),
      originalFunctionalAmount: item.originalFunctionalAmount == null ? null : Number(item.originalFunctionalAmount),
      originalGroupAmount: item.originalGroupAmount == null ? null : Number(item.originalGroupAmount),
      remainingTransactionAmount: item.entries.reduce((sum, entry) => sum + Number(entry.transactionAmount), 0),
      remainingLocalAmount: item.entries.some((entry) => entry.localAmount != null)
        ? item.entries.reduce((sum, entry) => sum + Number(entry.localAmount ?? 0), 0)
        : null,
      remainingFunctionalAmount: item.entries.some((entry) => entry.functionalAmount != null)
        ? item.entries.reduce((sum, entry) => sum + Number(entry.functionalAmount ?? 0), 0)
        : null,
      remainingGroupAmount: item.entries.some((entry) => entry.groupAmount != null)
        ? item.entries.reduce((sum, entry) => sum + Number(entry.groupAmount ?? 0), 0)
        : null,
    }))
    .filter((item) => item.remainingTransactionAmount > 0)

  const accountTypes = Array.from(new Set(rows.map((item) => item.accountType))).sort()

  return (
    <OpenItemClearingWorkbenchClient
      openItems={rows}
      subsidiaryOptions={subsidiaries.map((subsidiary) => ({
        value: subsidiary.id,
        label: `${subsidiary.subsidiaryId} - ${subsidiary.name}`,
        searchText: `${subsidiary.subsidiaryId} ${subsidiary.name}`,
      }))}
      currencyOptions={currencies.map((currency) => ({
        value: currency.id,
        label: `${currency.code ?? currency.currencyId} - ${currency.name}`,
        searchText: `${currency.code ?? currency.currencyId} ${currency.name}`,
      }))}
      accountTypeOptions={accountTypes.map((type) => ({
        value: type,
        label: type,
        searchText: type,
      }))}
      accountOptions={accounts.map((account) => ({
        value: account.id,
        label: `${account.accountNumber} - ${account.name}`,
        searchText: `${account.accountNumber} ${account.name}`,
      }))}
      customerOptions={customers.map((customer) => ({
        value: customer.id,
        label: `${customer.customerId} - ${customer.name}`,
        searchText: `${customer.customerId} ${customer.name}`,
      }))}
      vendorOptions={vendors.map((vendor) => ({
        value: vendor.id,
        label: `${vendor.vendorNumber} - ${vendor.name}`,
        searchText: `${vendor.vendorNumber} ${vendor.name}`,
      }))}
      accountingPeriodOptions={accountingPeriods.map((period) => ({
        value: period.id,
        label: period.name,
        searchText: `${period.name} ${formatDate(period.startDate)} ${formatDate(period.endDate)}`,
        startDate: formatDate(period.startDate) ?? '',
        endDate: formatDate(period.endDate) ?? '',
      }))}
    />
  )
}
