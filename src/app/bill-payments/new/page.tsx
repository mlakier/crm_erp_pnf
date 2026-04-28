import { prisma } from '@/lib/prisma'
import { loadListValues } from '@/lib/load-list-values'
import BillPaymentCreatePageClient from '@/components/BillPaymentCreatePageClient'
import { loadBillPaymentDetailCustomization } from '@/lib/bill-payment-detail-customization-store'

export default async function NewBillPaymentPage({
  searchParams,
}: {
  searchParams?: Promise<{ duplicateFrom?: string }>
}) {
  const duplicateFrom = (await searchParams)?.duplicateFrom?.trim()

  const [bills, paymentMethodValues, statusValues, customization, duplicateSource] = await Promise.all([
    prisma.bill.findMany({
      include: { vendor: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    loadListValues('PAYMENT-METHOD'),
    loadListValues('BILL-PAYMENT-STATUS'),
    loadBillPaymentDetailCustomization(),
    duplicateFrom
      ? prisma.billPayment.findUnique({
          where: { id: duplicateFrom },
        })
      : Promise.resolve(null),
  ])

  return (
    <BillPaymentCreatePageClient
      bills={bills.map((bill) => ({
        id: bill.id,
        number: bill.number,
        vendorName: bill.vendor.name,
      }))}
      methodOptions={paymentMethodValues.map((value) => ({ value: value.toLowerCase(), label: value }))}
      statusOptions={statusValues.map((value) => ({ value: value.toLowerCase(), label: value }))}
      customization={customization}
      initialHeaderValues={
        duplicateSource
          ? {
              billId: duplicateSource.billId,
              amount: String(duplicateSource.amount),
              date: duplicateSource.date.toISOString().slice(0, 10),
              method: duplicateSource.method ?? '',
              status: duplicateSource.status,
              reference: duplicateSource.reference ?? '',
              notes: duplicateSource.notes ?? '',
            }
          : undefined
      }
    />
  )
}
