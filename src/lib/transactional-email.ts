import { loadIntegrationCredentials } from '@/lib/integration-settings-store'

export type TransactionalEmailPayload = {
  to: string
  subject: string
  text: string
  html?: string
  fromEmail?: string | null
  fromName?: string | null
}

export async function sendTransactionalEmail(payload: TransactionalEmailPayload) {
  const credentials = await loadIntegrationCredentials('sendgrid')
  const apiKey = credentials.apiKey?.trim()
  const configuredFromEmail = credentials.fromEmail?.trim()
  const configuredFromName = credentials.fromName?.trim()

  if (!apiKey || !configuredFromEmail) {
    throw new Error('SendGrid is not configured in Manage Integrations')
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: payload.to.trim() }],
          subject: payload.subject.trim(),
        },
      ],
      from: {
        email: payload.fromEmail?.trim() || configuredFromEmail,
        ...(payload.fromName?.trim() || configuredFromName
          ? { name: payload.fromName?.trim() || configuredFromName }
          : {}),
      },
      content: [
        { type: 'text/plain', value: payload.text },
        ...(payload.html ? [{ type: 'text/html', value: payload.html }] : []),
      ],
    }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || 'SendGrid email send failed')
  }
}
