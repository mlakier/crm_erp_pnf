import Link from 'next/link'
import { notFound } from 'next/navigation'
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

export default async function PaymentRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const run = await prisma.paymentRun.findUnique({
    where: { id },
    include: {
      bankAccount: { include: { glAccount: true } },
      currency: true,
      subsidiary: true,
      lines: {
        include: {
          bill: true,
          vendor: true,
          billPayment: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!run) notFound()

  const total = run.lines.reduce((sum, line) => sum + Number(line.amount), 0)

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/payment-runs" className="text-sm hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
            {'<- Back to Payment Runs'}
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>Payment Run</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{run.paymentRunNumber}</h1>
          <p className="mt-2 max-w-4xl text-sm" style={{ color: 'var(--text-secondary)' }}>
            Released payment runs create bill payments first; bank matching then clears the resulting payments/checks against bank activity.
          </p>
        </div>
        <Link href="/payment-runs/new" className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ backgroundColor: 'var(--accent-primary-strong)', color: '#ffffff' }}>
          New Payment Run
        </Link>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Status</p>
          <p className="mt-2 text-xl font-semibold capitalize text-white">{run.status}</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Payment Date</p>
          <p className="mt-2 text-xl font-semibold text-white">{formatDate(run.paymentDate)}</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Method</p>
          <p className="mt-2 text-xl font-semibold capitalize text-white">{run.paymentMethod}</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Total</p>
          <p className="mt-2 text-xl font-semibold text-white">{money(total, run.currency?.code)}</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border p-5" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <h2 className="text-lg font-semibold text-white">Bank and Posting Context</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Bank Account</p>
            <p className="mt-1 text-white">{run.bankAccount?.name ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Cash GL</p>
            <p className="mt-1 text-white">{run.bankAccount?.glAccount ? `${run.bankAccount.glAccount.accountNumber} - ${run.bankAccount.glAccount.name}` : '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Subsidiary / Currency</p>
            <p className="mt-1 text-white">{run.subsidiary?.name ?? '-'} / {run.currency?.code ?? '-'}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border-muted)' }}>
          <h2 className="text-lg font-semibold text-white">Payment Lines</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead style={{ backgroundColor: 'rgba(15, 23, 42, 0.38)' }}>
            <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
              <th className="px-4 py-3">Bill</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Bill Payment</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {run.lines.map((line) => (
              <tr key={line.id} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                <td className="px-4 py-3">
                  <Link href={`/bills/${line.billId}`} className="font-semibold hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>{line.bill.number}</Link>
                </td>
                <td className="px-4 py-3 text-white">{line.vendor.name}</td>
                <td className="px-4 py-3">
                  {line.billPayment ? (
                    <Link href={`/bill-payments/${line.billPayment.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>{line.billPayment.number}</Link>
                  ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-white">{money(line.amount, run.currency?.code)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full border px-2 py-1 text-xs font-semibold capitalize" style={{ borderColor: '#60a5fa', color: '#bfdbfe' }}>{line.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
