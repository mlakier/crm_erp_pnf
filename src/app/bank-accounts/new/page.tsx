import { prisma } from '@/lib/prisma'
import NewBankAccountForm from './NewBankAccountForm'

export default async function NewBankAccountPage() {
  const [subsidiaries, currencies, glAccounts, connections] = await Promise.all([
    prisma.subsidiary.findMany({ where: { active: true }, orderBy: { subsidiaryId: 'asc' } }),
    prisma.currency.findMany({ where: { active: true }, orderBy: { code: 'asc' } }),
    prisma.chartOfAccounts.findMany({
      where: { active: true, bankAccountRequired: true, linkedBankAccount: null },
      orderBy: [{ accountNumber: 'asc' }],
    }),
    prisma.bankConnection.findMany({ where: { active: true }, orderBy: { institutionName: 'asc' } }),
  ])

  return (
    <div className="min-h-full px-8 py-8">
      <NewBankAccountForm
        subsidiaries={subsidiaries.map((subsidiary) => ({ id: subsidiary.id, label: `${subsidiary.subsidiaryId} - ${subsidiary.name}` }))}
        currencies={currencies.map((currency) => ({ id: currency.id, label: `${currency.code} - ${currency.name}` }))}
        glAccounts={glAccounts.map((account) => ({ id: account.id, label: `${account.accountNumber} - ${account.name}` }))}
        connections={connections.map((connection) => ({ id: connection.id, label: `${connection.institutionName} (${connection.provider})` }))}
      />
    </div>
  )
}
