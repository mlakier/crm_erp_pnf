import Link from 'next/link'
import { prisma } from '@/lib/prisma'

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString('en-US') : '-'
}

function money(value: unknown, code?: string | null) {
  return `${code ?? ''} ${Number(value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.trim()
}

export default async function PaymentRunsPage() {
  const runs = await prisma.paymentRun.findMany({
    include: {
      bankAccount: true,
      currency: true,
      subsidiary: true,
      lines: {
        include: {
          vendor: true,
          bill: true,
          billPayment: true,
        },
      },
    },
    orderBy: [{ paymentDate: 'desc' }, { paymentRunNumber: 'desc' }],
    take: 200,
  })

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>Procure to Pay</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Payment Runs</h1>
          <p className="mt-2 max-w-4xl text-sm" style={{ color: 'var(--text-secondary)' }}>
            Batch approved vendor bills into controlled payment proposals before checks, ACH, or wires hit the bank.
          </p>
        </div>
        <Link href="/payment-runs/new" className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}>
          New Payment Run
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <table className="min-w-full text-sm">
          <thead style={{ backgroundColor: 'rgba(15, 23, 42, 0.38)' }}>
            <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
              <th className="px-4 py-3">Run #</th>
              <th className="px-4 py-3">Payment Date</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Bank Account</th>
              <th className="px-4 py-3">Bills</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                  No payment runs yet.
                </td>
              </tr>
            ) : runs.map((run) => {
              const total = run.lines.reduce((sum, line) => sum + Number(line.amount), 0)
              return (
                <tr key={run.id} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                  <td className="px-4 py-3">
                    <Link href={`/payment-runs/${run.id}`} className="font-semibold hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                      {run.paymentRunNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{formatDate(run.paymentDate)}</td>
                  <td className="px-4 py-3 capitalize" style={{ color: 'var(--text-secondary)' }}>{run.paymentMethod}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{run.bankAccount?.name ?? '-'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{run.lines.length}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{money(total, run.currency?.code)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border px-2 py-1 text-xs font-semibold" style={{ borderColor: '#60a5fa', color: '#bfdbfe' }}>{run.status}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
