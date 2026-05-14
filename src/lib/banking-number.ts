import { prisma } from '@/lib/prisma'

function formatNext(prefix: string, current: string | null | undefined) {
  const match = String(current ?? '').match(/(\d+)$/)
  const next = match ? Number(match[1]) + 1 : 1
  return `${prefix}-${String(next).padStart(6, '0')}`
}

export async function generateNextBankAccountId() {
  const latest = await prisma.bankAccount.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { bankAccountId: true },
  })
  return formatNext('BANK', latest?.bankAccountId)
}

export async function generateNextBankConnectionId() {
  const latest = await prisma.bankConnection.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { connectionId: true },
  })
  return formatNext('BCON', latest?.connectionId)
}

export async function generateNextBankTransactionId() {
  const latest = await prisma.bankFeedTransaction.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { bankTransactionId: true },
  })
  return formatNext('BFT', latest?.bankTransactionId)
}

export async function generateNextBankReconciliationId() {
  const latest = await prisma.bankReconciliation.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { reconciliationId: true },
  })
  return formatNext('BREC', latest?.reconciliationId)
}

export async function generateNextBankDepositId() {
  const latest = await prisma.bankDeposit.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { depositNumber: true },
  })
  return formatNext('BDEP', latest?.depositNumber)
}

export async function generateNextBankTransferId() {
  const latest = await prisma.bankTransfer.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { transferNumber: true },
  })
  return formatNext('BTR', latest?.transferNumber)
}

export async function generateNextBankCheckId() {
  const latest = await prisma.bankCheck.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { checkTransactionNumber: true },
  })
  return formatNext('BCHK', latest?.checkTransactionNumber)
}

export async function generateNextPaymentRunId() {
  const latest = await prisma.paymentRun.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { paymentRunNumber: true },
  })
  return formatNext('PRUN', latest?.paymentRunNumber)
}
