import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateInvoiceReceiptNumber } from '@/lib/invoice-receipt-number'
import { logActivity, logRecordSnapshotActivities } from '@/lib/activity'
import {
  loadStripeWebhookSecret,
  verifyStripeWebhookSignature,
} from '@/lib/stripe-server'

export const runtime = 'nodejs'

type StripeCheckoutSession = {
  id: string
  object: 'checkout.session'
  mode?: string | null
  payment_status?: string | null
  status?: string | null
  client_reference_id?: string | null
  currency?: string | null
  amount_total?: number | null
  created?: number | null
  metadata?: Record<string, string | undefined> | null
}

type StripeEvent = {
  id: string
  type: string
  data: {
    object: StripeCheckoutSession
  }
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
])

function minorToMajor(amount: number, currencyCode: string) {
  return ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase()) ? amount : amount / 100
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: NextRequest) {
  const payload = await req.text()

  try {
    const webhookSecret = await loadStripeWebhookSecret()
    verifyStripeWebhookSignature(payload, req.headers.get('stripe-signature'), webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Stripe webhook.'
    return jsonError(message, 400)
  }

  let event: StripeEvent
  try {
    event = JSON.parse(payload) as StripeEvent
  } catch {
    return jsonError('Invalid Stripe webhook payload.')
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true, ignored: true })
  }

  const session = event.data.object
  if (session.object !== 'checkout.session' || session.mode !== 'payment') {
    return NextResponse.json({ received: true, ignored: true })
  }
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true, ignored: true, reason: 'payment_not_paid' })
  }

  const invoiceId = session.client_reference_id ?? session.metadata?.invoiceId ?? null
  if (!invoiceId) return jsonError('Stripe Checkout Session is missing invoice reference.', 422)
  if (!session.id) return jsonError('Stripe Checkout Session is missing session id.', 422)

  const existingReceipt = await prisma.cashReceipt.findFirst({
    where: {
      reference: `stripe:${session.id}`,
      method: 'stripe',
    },
    select: { id: true, number: true },
  })
  if (existingReceipt) {
    return NextResponse.json({ received: true, idempotent: true, receiptId: existingReceipt.id })
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      currency: true,
      cashReceipts: {
        select: {
          id: true,
          amount: true,
          status: true,
          applications: { select: { id: true } },
        },
      },
      cashReceiptApplications: {
        select: {
          appliedAmount: true,
          cashReceipt: { select: { id: true, status: true } },
        },
      },
    },
  })
  if (!invoice) return jsonError('Invoice referenced by Stripe Checkout Session was not found.', 404)

  const currencyCode = (invoice.currency.code ?? invoice.currency.currencyId ?? '').toUpperCase()
  if (!currencyCode) return jsonError('Invoice currency is missing.', 422)
  if ((session.currency ?? '').toUpperCase() !== currencyCode) {
    return jsonError('Stripe Checkout Session currency does not match invoice currency.', 422)
  }
  if (!session.amount_total || session.amount_total <= 0) {
    return jsonError('Stripe Checkout Session amount is missing.', 422)
  }

  const appliedViaApplications = invoice.cashReceiptApplications.reduce((sum, application) => {
    if ((application.cashReceipt.status ?? '').toLowerCase() === 'void') return sum
    return sum + Number(application.appliedAmount)
  }, 0)
  const appliedViaLegacyReceipts = invoice.cashReceipts.reduce((sum, receipt) => {
    if ((receipt.status ?? '').toLowerCase() === 'void') return sum
    if (receipt.applications.length > 0) return sum
    return sum + Number(receipt.amount)
  }, 0)
  const openAmount = Math.max(0, Number(invoice.total) - appliedViaApplications - appliedViaLegacyReceipts)
  const receivedAmount = minorToMajor(session.amount_total, currencyCode)
  const appliedAmount = Math.min(openAmount, receivedAmount)
  if (appliedAmount <= 0) {
    return jsonError('Invoice has no open amount to apply this Stripe payment against.', 409)
  }

  const number = await generateInvoiceReceiptNumber()
  const receipt = await prisma.cashReceipt.create({
    data: {
      number,
      status: 'draft',
      invoiceId: invoice.id,
      subsidiaryId: invoice.subsidiaryId,
      currencyId: invoice.currencyId,
      amount: receivedAmount,
      date: session.created ? new Date(session.created * 1000) : new Date(),
      method: 'stripe',
      reference: `stripe:${session.id}`,
      applications: {
        create: {
          invoiceId: invoice.id,
          appliedAmount,
        },
      },
    },
  })

  await logActivity({
    entityType: 'invoice-receipt',
    entityId: receipt.id,
    action: 'create',
    summary: `Created draft invoice receipt ${receipt.number ?? receipt.id} from Stripe Checkout Session.`,
  })
  await logRecordSnapshotActivities({
    entityType: 'invoice-receipt',
    entityId: receipt.id,
    action: 'create',
    context: 'Stripe Webhook',
    fields: [
      { fieldName: 'Business Id', value: receipt.number },
      { fieldName: 'Invoice', value: receipt.invoiceId },
      { fieldName: 'Stripe Session', value: session.id },
      { fieldName: 'Amount', value: receipt.amount },
      { fieldName: 'Applied Amount', value: appliedAmount },
      { fieldName: 'Status', value: receipt.status },
    ],
  })

  return NextResponse.json({
    received: true,
    receiptId: receipt.id,
    receiptNumber: receipt.number,
    status: receipt.status,
  })
}
