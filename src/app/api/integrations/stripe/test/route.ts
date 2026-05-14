import { NextResponse } from 'next/server'
import {
  getStripeKeyMode,
  loadStripeServerKey,
  STRIPE_API_VERSION,
  stripeRequest,
} from '@/lib/stripe-server'

type StripeAccountResponse = {
  id?: string
  country?: string
  default_currency?: string
  charges_enabled?: boolean
  payouts_enabled?: boolean
  details_submitted?: boolean
}

type StripeErrorResponse = {
  error?: {
    message?: string
    type?: string
  }
}

export async function POST() {
  try {
    const apiKey = await loadStripeServerKey()
    const body = await stripeRequest<StripeAccountResponse & StripeErrorResponse>('/v1/account')

    return NextResponse.json({
      connected: true,
      apiVersion: STRIPE_API_VERSION,
      mode: getStripeKeyMode(apiKey),
      account: {
        id: body?.id ?? '',
        country: body?.country ?? '',
        defaultCurrency: body?.default_currency ?? '',
        chargesEnabled: Boolean(body?.charges_enabled),
        payoutsEnabled: Boolean(body?.payouts_enabled),
        detailsSubmitted: Boolean(body?.details_submitted),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to reach Stripe from the server. Check network access and try again.' },
      { status: 400 },
    )
  }
}
