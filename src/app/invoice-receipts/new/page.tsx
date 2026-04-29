import { prisma } from '@/lib/prisma'
import { loadListValues } from '@/lib/load-list-values'
import InvoiceReceiptCreatePageClient from '@/components/InvoiceReceiptCreatePageClient'
import { loadInvoiceReceiptDetailCustomization } from '@/lib/invoice-receipt-detail-customization-store'

export const runtime = 'nodejs'

export default async function NewInvoiceReceiptPage({
  searchParams,
}: {
  searchParams?: Promise<{ duplicateFrom?: string }>
}) {
  const duplicateFrom = (await searchParams)?.duplicateFrom?.trim()

  const [invoices, paymentMethodValues, customization, cashAccounts, duplicateSource] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        customer: {
          select: { id: true, customerId: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    loadListValues('PAYMENT-METHOD'),
    loadInvoiceReceiptDetailCustomization(),
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
      ? prisma.cashReceipt.findUnique({
          where: { id: duplicateFrom },
        })
      : Promise.resolve(null),
  ])

  return (
    <InvoiceReceiptCreatePageClient
      invoices={invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        customer: {
          id: invoice.customer.id,
          customerId: invoice.customer.customerId,
          name: invoice.customer.name,
        },
      }))}
      methodOptions={paymentMethodValues.map((value) => ({
        value: value.toLowerCase(),
        label: value,
      }))}
      bankAccountOptions={cashAccounts.map((account) => ({
        value: account.id,
        label: `${account.accountId} - ${account.name}`,
      }))}
      customization={customization}
      initialHeaderValues={
        duplicateSource
          ? {
              invoiceId: duplicateSource.invoiceId,
              bankAccountId: duplicateSource.bankAccountId ?? '',
              amount: String(duplicateSource.amount),
              date: duplicateSource.date.toISOString().slice(0, 10),
              method: duplicateSource.method,
              reference: duplicateSource.reference ?? '',
            }
          : undefined
      }
    />
  )
}
