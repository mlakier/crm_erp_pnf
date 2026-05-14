import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { roundMoney } from '@/lib/bill-payment-applications'
import PaymentRunCreateClient from '@/components/PaymentRunCreateClient'

export default async function NewPaymentRunPage({
  searchParams,
}: {
  searchParams?: Promise<{ billId?: string }>
}) {
  const billId = (await searchParams)?.billId?.trim()
  const bills = await prisma.bill.findMany({
    where: billId ? { id: billId } : { status: { notIn: ['paid', 'cancelled', 'void'] } },
    include: {
      vendor: true,
      currency: true,
      subsidiary: true,
      paymentApplications: {
        include: {
          billPayment: { select: { status: true } },
        },
      },
      billPayments: {
        select: {
          amount: true,
          status: true,
          applications: { select: { id: true } },
        },
      },
    },
    orderBy: [{ dueDate: 'asc' }, { date: 'asc' }],
    take: 100,
  })
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { active: true },
    include: {
      glAccount: true,
      currency: true,
      subsidiary: true,
    },
    orderBy: [{ bankAccountId: 'asc' }],
  })

  const proposals = bills.map((bill) => {
    const appliedViaApplications = bill.paymentApplications.reduce((sum, application) => {
      if ((application.billPayment.status ?? '').toLowerCase() === 'cancelled') return sum
      return sum + Number(application.appliedAmount)
    }, 0)
    const appliedViaLegacyPayments = bill.billPayments.reduce((sum, payment) => {
      if ((payment.status ?? '').toLowerCase() === 'cancelled') return sum
      if (payment.applications.length > 0) return sum
      return sum + Number(payment.amount)
    }, 0)
    return {
      id: bill.id,
      number: bill.number,
      vendor: bill.vendor.name,
      dueDate: bill.dueDate,
      currencyCode: bill.currency.code,
      currencyId: bill.currencyId,
      subsidiary: bill.subsidiary.name,
      subsidiaryId: bill.subsidiaryId,
      openAmount: roundMoney(Number(bill.total) - appliedViaApplications - appliedViaLegacyPayments),
    }
  }).filter((bill) => bill.openAmount > 0)

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/payment-runs" className="text-sm hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
            {'<- Back to Payment Runs'}
          </Link>
          <h1 className="mt-4 text-3xl font-semibold text-white">New Payment Run</h1>
          <p className="mt-2 max-w-4xl text-sm" style={{ color: 'var(--text-secondary)' }}>
            Review proposed bills before creating payments. This is the ERP-grade control point before checks, ACH, wires, or bank matching.
          </p>
        </div>
      </div>
      <PaymentRunCreateClient
        proposals={proposals.map((bill) => ({
          ...bill,
          dueDate: bill.dueDate ? bill.dueDate.toISOString().slice(0, 10) : null,
        }))}
        bankAccounts={bankAccounts.map((account) => ({
          id: account.id,
          label: `${account.bankAccountId} - ${account.name} (${account.currency.code}, GL ${account.glAccount.accountNumber})`,
          subsidiaryId: account.subsidiaryId,
          currencyId: account.currencyId,
        }))}
      />
    </div>
  )
}
