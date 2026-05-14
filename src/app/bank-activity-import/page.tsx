import { prisma } from '@/lib/prisma'
import BankActivityImportForm from './BankActivityImportForm'

export default async function BankActivityImportPage() {
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { active: true },
    include: { currency: true, glAccount: true, subsidiary: true },
    orderBy: [{ bankAccountId: 'asc' }],
  })

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section
          className="overflow-hidden rounded-3xl border"
          style={{
            borderColor: 'var(--border-muted)',
            background:
              'linear-gradient(135deg, rgba(20, 184, 166, 0.16), rgba(15, 23, 42, 0.92) 42%, rgba(37, 99, 235, 0.16))',
          }}
        >
          <div className="grid gap-6 p-7 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: 'var(--text-muted)' }}>
                Treasury
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-white">Bank Activity Import</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                Load bank statement or feed activity into the matching workbench. Validate first, then commit clean rows into unmatched bank feed transactions.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                ['1', 'Choose Account', 'Select the bank account whose activity you are loading.'],
                ['2', 'Validate', 'Check dates, amounts, currency, and duplicate references.'],
                ['3', 'Match', 'Committed rows appear in Bank Matching Workbench.'],
              ].map(([number, title, description]) => (
                <div key={number} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'rgba(15, 23, 42, 0.55)' }}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>
                      {number}
                    </span>
                    <span className="text-sm font-semibold text-white">{title}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <BankActivityImportForm
            bankAccounts={bankAccounts.map((account) => ({
              id: account.id,
              label: `${account.bankAccountId} - ${account.name}`,
              helper: `${account.subsidiary.subsidiaryId} • ${account.currency.code} • ${account.glAccount.accountNumber} ${account.glAccount.name}`,
              currencyCode: account.currency.code,
            }))}
          />
        </section>
      </div>
    </div>
  )
}
