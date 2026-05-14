import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { toNumericValue } from '@/lib/format'
import { stripeRequest } from '@/lib/stripe-server'

type Params = { params: Promise<{ id: string }> }

type StripeCheckoutSessionResponse = {
  id?: string
  url?: string
  expires_at?: number
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
])

function getOrigin(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedProto && forwardedHost) return `${forwardedProto}://${forwardedHost}`
  return new URL(request.url).origin
}

function toMinorUnits(amount: number, currencyCode: string, configuredDecimals?: number | null) {
  const normalizedCurrency = currencyCode.trim().toLowerCase()
  const decimals = ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)
    ? 0
    : Number.isInteger(configuredDecimals)
      ? configuredDecimals ?? 2
      : 2
  return Math.round(amount * (10 ** decimals))
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, customerId: true, name: true, email: true } },
        currency: { select: { code: true, currencyId: true, decimals: true } },
        cashReceipts: { select: { amount: true, status: true } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const status = invoice.status?.toLowerCase() ?? ''
    if (status === 'paid' || status === 'void') {
      return NextResponse.json({ error: `Cannot create a payment link for a ${status} invoice.` }, { status: 409 })
    }

    const paidAmount = invoice.cashReceipts
      .filter((receipt) => receipt.status?.toLowerCase() !== 'void')
      .reduce((sum, receipt) => sum + toNumericValue(receipt.amount, 0), 0)
    const outstandingAmount = Math.max(0, toNumericValue(invoice.total, 0) - paidAmount)
    if (outstandingAmount <= 0) {
      return NextResponse.json({ error: 'Invoice has no outstanding amount to collect.' }, { status: 409 })
    }

    const currencyCode = (invoice.currency?.code ?? invoice.currency?.currencyId ?? '').trim().toLowerCase()
    if (!currencyCode) {
      return NextResponse.json({ error: 'Invoice is missing transaction currency.' }, { status: 400 })
    }

    const unitAmount = toMinorUnits(outstandingAmount, currencyCode, invoice.currency?.decimals)
    if (!Number.isInteger(unitAmount) || unitAmount <= 0) {
      return NextResponse.json({ error: 'Invoice amount is not valid for Stripe checkout.' }, { status: 400 })
    }

    const origin = getOrigin(request)
    const detailUrl = `${origin}/invoices/${invoice.id}`
    const body = new URLSearchParams()
    body.set('mode', 'payment')
    body.set('client_reference_id', invoice.id)
    body.set('success_url', `${detailUrl}?stripe_payment=success`)
    body.set('cancel_url', `${detailUrl}?stripe_payment=cancelled`)
    body.set('line_items[0][price_data][currency]', currencyCode)
    body.set('line_items[0][price_data][unit_amount]', String(unitAmount))
    body.set('line_items[0][price_data][product_data][name]', `Invoice ${invoice.number}`)
    body.set('line_items[0][price_data][product_data][description]', `Payment for ${invoice.customer.name}`)
    body.set('line_items[0][quantity]', '1')
    body.set('metadata[invoice_id]', invoice.id)
    body.set('metadata[invoice_number]', invoice.number)
    body.set('metadata[customer_id]', invoice.customer.id)
    body.set('invoice_creation[enabled]', 'false')
    if (invoice.customer.email?.trim()) {
      body.set('customer_email', invoice.customer.email.trim())
    }

    const session = await stripeRequest<StripeCheckoutSessionResponse>('/v1/checkout/sessions', {
      method: 'POST',
      body,
    })

    if (!session.url || !session.id) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 })
    }

    const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        stripeCheckoutSessionId: session.id,
        stripePaymentUrl: session.url,
        stripePaymentUrlExpiresAt: expiresAt,
        stripePaymentLinkCreatedAt: new Date(),
      },
      select: {
        id: true,
        number: true,
        stripeCheckoutSessionId: true,
        stripePaymentUrl: true,
        stripePaymentUrlExpiresAt: true,
        stripePaymentLinkCreatedAt: true,
      },
    })

    await logActivity({
      entityType: 'invoice',
      entityId: invoice.id,
      action: 'update',
      summary: `Created Stripe payment link for invoice ${invoice.number}`,
      userId: invoice.userId,
    })

    return NextResponse.json({
      invoiceId: updated.id,
      invoiceNumber: updated.number,
      stripeCheckoutSessionId: updated.stripeCheckoutSessionId,
      paymentUrl: updated.stripePaymentUrl,
      expiresAt: updated.stripePaymentUrlExpiresAt?.toISOString() ?? null,
      createdAt: updated.stripePaymentLinkCreatedAt?.toISOString() ?? null,
      amount: outstandingAmount,
      currency: currencyCode.toUpperCase(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create Stripe payment link.' },
      { status: 400 },
    )
  }
}
