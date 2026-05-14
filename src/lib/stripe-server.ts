import { loadIntegrationCredentials } from '@/lib/integration-settings-store'
import crypto from 'crypto'

export const STRIPE_API_VERSION = '2026-04-22.dahlia'

type StripeRequestOptions = {
  method?: 'GET' | 'POST'
  body?: URLSearchParams
}

export function getStripeKeyMode(apiKey: string) {
  if (apiKey.startsWith('sk_live_') || apiKey.startsWith('rk_live_')) return 'live'
  if (apiKey.startsWith('sk_test_') || apiKey.startsWith('rk_test_')) return 'test'
  return 'unknown'
}

export function isSupportedStripeServerKey(apiKey: string) {
  return /^(sk|rk)_(test|live)_/.test(apiKey)
}

export async function loadStripeServerKey() {
  const credentials = await loadIntegrationCredentials('stripe')
  const apiKey = credentials.secretKey?.trim() ?? ''

  if (!apiKey) {
    throw new Error('Add a Stripe secret or restricted API key before using Stripe.')
  }

  if (!isSupportedStripeServerKey(apiKey)) {
    throw new Error('Stripe server key must start with sk_test_, sk_live_, rk_test_, or rk_live_.')
  }

  return apiKey
}

export async function loadStripeWebhookSecret() {
  const credentials = await loadIntegrationCredentials('stripe')
  const webhookSecret = credentials.webhookSecret?.trim() ?? ''
  if (!webhookSecret) {
    throw new Error('Add the Stripe webhook signing secret before processing Stripe webhooks.')
  }
  if (!webhookSecret.startsWith('whsec_')) {
    throw new Error('Stripe webhook signing secret must start with whsec_.')
  }
  return webhookSecret
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) throw new Error('Missing Stripe-Signature header.')

  const parts = new Map(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.split('=')
      return [key, value]
    }),
  )
  const timestamp = parts.get('t')
  const signature = parts.get('v1')
  if (!timestamp || !signature) throw new Error('Invalid Stripe-Signature header.')

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex')

  const expectedBuffer = Buffer.from(expected, 'hex')
  const receivedBuffer = Buffer.from(signature, 'hex')
  if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error('Invalid Stripe webhook signature.')
  }

  return true
}

export async function stripeRequest<T>(
  path: string,
  { method = 'GET', body }: StripeRequestOptions = {},
) {
  const apiKey = await loadStripeServerKey()
  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Stripe-Version': STRIPE_API_VERSION,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null) as T & { error?: { message?: string } } | null

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? 'Stripe request failed.')
  }

  return payload as T
}
