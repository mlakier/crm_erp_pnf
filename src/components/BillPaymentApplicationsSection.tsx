'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { fmtCurrency, fmtDocumentDate } from '@/lib/format'
import {
  roundMoney,
  type BillApplicationCandidate,
  type BillPaymentApplicationInput,
} from '@/lib/bill-payment-applications'

export default function BillPaymentApplicationsSection({
  bills,
  selectedVendorId,
  applications,
  onChange,
  editing = false,
  moneySettings,
  title = 'Bill Applications',
}: {
  bills: BillApplicationCandidate[]
  selectedVendorId: string
  applications: BillPaymentApplicationInput[]
  onChange?: (applications: BillPaymentApplicationInput[]) => void
  editing?: boolean
  moneySettings?: Parameters<typeof fmtCurrency>[2]
  title?: string
}) {
  const [draftAmounts, setDraftAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      applications.map((application) => [
        application.billId,
        application.appliedAmount > 0 ? String(application.appliedAmount) : '',
      ]),
    ),
  )

  const filteredBills = useMemo(() => {
    if (!selectedVendorId) return []
    return bills.filter((bill) => bill.vendorId === selectedVendorId && (bill.openAmount > 0 || applications.some((application) => application.billId === bill.id)))
  }, [applications, bills, selectedVendorId])

  const appliedRows = useMemo(() => {
    if (editing) return filteredBills
    return filteredBills.filter((bill) => {
      const amount = applications.find((application) => application.billId === bill.id)?.appliedAmount ?? 0
      return amount > 0
    })
  }, [applications, editing, filteredBills])

  function updateDraft(billId: string, nextRaw: string) {
    const nextDraft = {
      ...draftAmounts,
      [billId]: nextRaw,
    }
    setDraftAmounts(nextDraft)
    if (!onChange) return

    const nextApplications = filteredBills
      .map((bill) => ({
        billId: bill.id,
        appliedAmount: roundMoney(Number(nextDraft[bill.id] ?? 0)),
      }))
      .filter((application) => Number.isFinite(application.appliedAmount) && application.appliedAmount > 0)

    onChange(nextApplications)
  }

  const totalApplied = roundMoney(
    applications.reduce((sum, application) => sum + application.appliedAmount, 0),
  )

  return (
    <section
      className="rounded-2xl border"
      style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--panel)' }}
    >
      <div className="flex items-center justify-between gap-3 border-b px-6 py-4" style={{ borderColor: 'var(--border-muted)' }}>
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Apply this payment to one or more open vendor bills.
          </p>
        </div>
        <div className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--badge-background)', color: 'var(--accent-primary-strong)' }}>
          {fmtCurrency(totalApplied, undefined, moneySettings)}
        </div>
      </div>

      {!selectedVendorId ? (
        <div className="px-6 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          Select a vendor above to load open bills for application.
        </div>
      ) : appliedRows.length === 0 ? (
        <div className="px-6 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          {editing ? 'No open bills are available for this vendor.' : 'No bill applications are recorded for this payment.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                <th className="px-6 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Bill</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Bill Date</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>Bill Total</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>Open Amount</th>
                <th className="px-6 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>Applied Amount</th>
              </tr>
            </thead>
            <tbody>
              {appliedRows.map((bill) => {
                const appliedAmount = applications.find((application) => application.billId === bill.id)?.appliedAmount ?? 0
                return (
                  <tr key={bill.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <td className="px-6 py-3">
                      <Link href={`/bills/${bill.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {bill.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {bill.status}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {fmtDocumentDate(bill.date, moneySettings)}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>
                      {fmtCurrency(bill.total, undefined, moneySettings)}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>
                      {fmtCurrency(bill.openAmount, undefined, moneySettings)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {editing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draftAmounts[bill.id] ?? ''}
                          onChange={(event) => updateDraft(bill.id, event.target.value)}
                          className="w-28 rounded-md border bg-transparent px-3 py-2 text-right text-sm text-white"
                          style={{ borderColor: 'var(--border-muted)' }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-primary)' }}>
                          {fmtCurrency(appliedAmount, undefined, moneySettings)}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
