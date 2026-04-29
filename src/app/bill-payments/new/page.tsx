import { prisma } from '@/lib/prisma'
import { loadListValues } from '@/lib/load-list-values'
import BillPaymentCreatePageClient from '@/components/BillPaymentCreatePageClient'
import { loadBillPaymentDetailCustomization } from '@/lib/bill-payment-detail-customization-store'
import {
  normalizeBillPaymentApplications,
  roundMoney,
} from '@/lib/bill-payment-applications'

export const runtime = 'nodejs'

export default async function NewBillPaymentPage({
  searchParams,
}: {
  searchParams?: Promise<{ duplicateFrom?: string }>
}) {
  const duplicateFrom = (await searchParams)?.duplicateFrom?.trim()

  const [vendors, bills, paymentMethodValues, statusValues, customization, cashAccounts, duplicateSource] = await Promise.all([
    prisma.vendor.findMany({
      where: { inactive: false },
      orderBy: [{ vendorNumber: 'asc' }, { name: 'asc' }],
    }),
    prisma.bill.findMany({
      include: {
        vendor: true,
        paymentApplications: {
          include: {
            billPayment: {
              select: { id: true, status: true },
            },
          },
        },
        billPayments: {
          select: {
            id: true,
            amount: true,
            status: true,
            applications: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    loadListValues('PAYMENT-METHOD'),
    loadListValues('BILL-PAYMENT-STATUS'),
    loadBillPaymentDetailCustomization(),
    prisma.chartOfAccounts.findMany({
      where: {
        active: true,
        isPosting: true,
        accountType: 'Asset',
        OR: [
          { name: { contains: 'Cash', mode: 'insensitive' } },
          { name: { contains: 'Bank', mode: 'insensitive' } },
          { accountId: { in: ['1000', '1010'] } },
        ],
      },
      orderBy: [{ accountId: 'asc' }],
    }),
    duplicateFrom
      ? prisma.billPayment.findUnique({
          where: { id: duplicateFrom },
          include: {
            applications: true,
          },
        })
      : Promise.resolve(null),
  ])

  const duplicateVendorId =
    duplicateSource?.vendorId
    ?? (duplicateSource?.billId ? bills.find((bill) => bill.id === duplicateSource.billId)?.vendorId ?? '' : '')

  return (
    <BillPaymentCreatePageClient
      vendors={vendors.map((vendor) => ({
        value: vendor.id,
        label: `${vendor.vendorNumber ?? 'VENDOR'} - ${vendor.name}`,
      }))}
      bills={bills.map((bill) => {
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
          vendorId: bill.vendorId,
          vendorName: bill.vendor.name,
          status: bill.status,
          total: Number(bill.total),
          date: bill.date,
          subsidiaryId: bill.subsidiaryId ?? null,
          currencyId: bill.currencyId ?? null,
          userId: bill.userId ?? null,
          openAmount: roundMoney(Number(bill.total) - appliedViaApplications - appliedViaLegacyPayments),
        }
      })}
      methodOptions={paymentMethodValues.map((value) => ({ value: value.toLowerCase(), label: value }))}
      statusOptions={statusValues.map((value) => ({ value: value.toLowerCase(), label: value }))}
      bankAccountOptions={cashAccounts.map((account) => ({
        value: account.id,
        label: `${account.accountId} - ${account.name}`,
      }))}
      customization={customization}
      initialHeaderValues={
        duplicateSource
          ? {
              vendorId: duplicateVendorId,
              bankAccountId: duplicateSource.bankAccountId ?? '',
              date: duplicateSource.date.toISOString().slice(0, 10),
              method: duplicateSource.method ?? '',
              status: duplicateSource.status,
              reference: duplicateSource.reference ?? '',
              notes: duplicateSource.notes ?? '',
            }
          : undefined
      }
      initialApplications={
        duplicateSource
          ? normalizeBillPaymentApplications(
              duplicateSource.applications.length > 0
                ? duplicateSource.applications.map((application) => ({
                    billId: application.billId,
                    appliedAmount: Number(application.appliedAmount),
                  }))
                : duplicateSource.billId
                  ? [{ billId: duplicateSource.billId, appliedAmount: Number(duplicateSource.amount) }]
                  : [],
            )
          : undefined
      }
    />
  )
}
