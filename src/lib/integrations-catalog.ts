export type IntegrationCategory = 'Address' | 'Finance' | 'Commerce' | 'Identity' | 'Messaging' | 'CRM' | 'ProjectManagement' | 'WorkManagement' | 'HR' | 'Other'

export type CredentialField = {
  key: string
  label: string
  type: 'text' | 'password' | 'email'
  required?: boolean
  placeholder?: string
  hint?: string
}

export type IntegrationDefinition = {
  key: string
  label: string
  provider: string
  href: string
  summary: string
  category: IntegrationCategory
  statusLabel: string
  setupFields: string[]
  /** Used by the generic setup page to render credential inputs */
  credentials?: CredentialField[]
}

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    key: 'google-address-validation',
    label: 'Address Validation',
    provider: 'Google',
    href: '/integrations/google-address-validation',
    summary: 'Validate structured addresses and normalize the result returned by Google geocoding.',
    category: 'Address',
    statusLabel: 'Configured via API key',
    setupFields: ['Google Maps API key'],
    // Handled by a dedicated component — no generic credentials field needed
  },
  {
    key: 'quickbooks',
    label: 'QuickBooks Online',
    provider: 'Intuit',
    href: '/integrations/quickbooks',
    summary: 'Sync invoices, bills, customers, and vendors with QuickBooks Online via OAuth.',
    category: 'Finance',
    statusLabel: 'OAuth client credentials required',
    setupFields: ['Client ID', 'Client Secret'],
    credentials: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'AB1234abcd...' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true, placeholder: '••••••••' },
      {
        key: 'redirectUri',
        label: 'Redirect URI',
        type: 'text',
        required: false,
        placeholder: 'https://your-domain.com/integrations/quickbooks/callback',
        hint: 'Must match the redirect URI registered in the Intuit developer portal.',
      },
    ],
  },
  {
    key: 'stripe',
    label: 'Payments',
    provider: 'Stripe',
    href: '/integrations/stripe',
    summary: 'Process customer payments, manage subscriptions, and receive payment event webhooks.',
    category: 'Commerce',
    statusLabel: 'Configured via API keys',
    setupFields: ['Secret Key', 'Publishable Key'],
    credentials: [
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, placeholder: 'sk_live_...' },
      { key: 'publishableKey', label: 'Publishable Key', type: 'text', required: true, placeholder: 'pk_live_...' },
      {
        key: 'webhookSecret',
        label: 'Webhook Signing Secret',
        type: 'password',
        required: false,
        placeholder: 'whsec_...',
        hint: 'Found in the Stripe Dashboard under Webhooks. Required to verify event signatures.',
      },
    ],
  },
  {
    key: 'sendgrid',
    label: 'Transactional Email',
    provider: 'SendGrid',
    href: '/integrations/sendgrid',
    summary: 'Send automated emails for invoices, quotes, order confirmations, and workflow notifications.',
    category: 'Messaging',
    statusLabel: 'Configured via API key',
    setupFields: ['API Key', 'From Email'],
    credentials: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'SG.••••••••' },
      { key: 'fromEmail', label: 'From Email Address', type: 'email', required: true, placeholder: 'noreply@yourcompany.com' },
      { key: 'fromName', label: 'From Name', type: 'text', required: false, placeholder: 'Tillster Group' },
    ],
  },
  {
    key: 'twilio',
    label: 'SMS & Voice',
    provider: 'Twilio',
    href: '/integrations/twilio',
    summary: 'Send SMS notifications for order updates, approvals, and alerts to customers and staff.',
    category: 'Messaging',
    statusLabel: 'Configured via Account SID and Auth Token',
    setupFields: ['Account SID', 'Auth Token', 'From Number'],
    credentials: [
      { key: 'accountSid', label: 'Account SID', type: 'text', required: true, placeholder: 'AC...' },
      { key: 'authToken', label: 'Auth Token', type: 'password', required: true, placeholder: '••••••••' },
      {
        key: 'fromNumber',
        label: 'From Phone Number',
        type: 'text',
        required: true,
        placeholder: '+15005550006',
        hint: 'Must be a verified Twilio number in E.164 format.',
      },
    ],
  },
  {
    key: 'slack',
    label: 'Notifications',
    provider: 'Slack',
    href: '/integrations/slack',
    summary: 'Post workflow alerts, approval requests, and activity digests to Slack channels.',
    category: 'Messaging',
    statusLabel: 'Configured via Bot Token',
    setupFields: ['Bot Token', 'Default Channel'],
    credentials: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true, placeholder: 'xoxb-...' },
      {
        key: 'signingSecret',
        label: 'Signing Secret',
        type: 'password',
        required: false,
        placeholder: '••••••••',
        hint: 'Required to verify incoming Slack event payloads.',
      },
      { key: 'defaultChannel', label: 'Default Channel', type: 'text', required: false, placeholder: '#notifications' },
    ],
  },
  {
    key: 'salesforce',
    label: 'CRM Sync',
    provider: 'Salesforce',
    href: '/integrations/salesforce',
    summary: 'Sync customers, contacts, opportunities, and leads with Salesforce CRM via Connected App credentials.',
    category: 'CRM',
    statusLabel: 'Connected App OAuth credentials required',
    setupFields: ['Consumer Key', 'Consumer Secret', 'Instance URL'],
    credentials: [
      {
        key: 'consumerKey',
        label: 'Consumer Key',
        type: 'text',
        required: true,
        placeholder: '3MVG9...',
        hint: 'Found in your Salesforce Connected App settings under API (Enable OAuth Settings).',
      },
      { key: 'consumerSecret', label: 'Consumer Secret', type: 'password', required: true, placeholder: '••••••••' },
      {
        key: 'instanceUrl',
        label: 'Instance URL',
        type: 'text',
        required: true,
        placeholder: 'https://your-org.salesforce.com',
        hint: 'Your Salesforce org URL, e.g. https://na1.salesforce.com or a custom domain.',
      },
      {
        key: 'apiVersion',
        label: 'API Version',
        type: 'text',
        required: false,
        placeholder: 'v59.0',
        hint: 'Leave blank to use the default. Example: v59.0',
      },
    ],
  },
  {
    key: 'jira',
    label: 'Project Tracking',
    provider: 'Jira',
    href: '/integrations/jira',
    summary: 'Create and update Jira issues from purchase orders, approvals, and workflow tasks automatically.',
    category: 'ProjectManagement',
    statusLabel: 'API token and project key required',
    setupFields: ['Email', 'API Token', 'Site URL'],
    credentials: [
      {
        key: 'email',
        label: 'Account Email',
        type: 'email',
        required: true,
        placeholder: 'admin@yourcompany.com',
        hint: 'The email address of the Atlassian account used to generate the API token.',
      },
      {
        key: 'apiToken',
        label: 'API Token',
        type: 'password',
        required: true,
        placeholder: '••••••••',
        hint: 'Generate at id.atlassian.com/manage-profile/security/api-tokens.',
      },
      {
        key: 'siteUrl',
        label: 'Site URL',
        type: 'text',
        required: true,
        placeholder: 'https://your-org.atlassian.net',
      },
      {
        key: 'defaultProjectKey',
        label: 'Default Project Key',
        type: 'text',
        required: false,
        placeholder: 'OPS',
        hint: 'The Jira project key where issues will be created by default.',
      },
    ],
  },
  {
    key: 'bamboohr',
    label: 'HR & People',
    provider: 'BambooHR',
    href: '/integrations/bamboohr',
    summary: 'Sync employee records, org structure, and onboarding data between BambooHR and the ERP.',
    category: 'HR',
    statusLabel: 'API key and subdomain required',
    setupFields: ['Subdomain', 'API Key'],
    credentials: [
      {
        key: 'subdomain',
        label: 'Company Subdomain',
        type: 'text',
        required: true,
        placeholder: 'yourcompany',
        hint: 'The subdomain of your BambooHR account, e.g. "yourcompany" from yourcompany.bamboohr.com.',
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: '••••••••',
        hint: 'Generate in BambooHR under your profile → API Keys.',
      },
    ],
  },
  {
    key: 'monday',
    label: 'Work Management',
    provider: 'Monday.com',
    href: '/integrations/monday',
    summary: 'Create and update boards, items, and subitems in Monday.com from purchase orders, tasks, and project workflows.',
    category: 'WorkManagement',
    statusLabel: 'API token required',
    setupFields: ['API Token', 'Board ID'],
    credentials: [
      {
        key: 'apiToken',
        label: 'API Token',
        type: 'password',
        required: true,
        placeholder: '••••••••',
        hint: 'Found in Monday.com under your profile → Developers → My Access Tokens.',
      },
      {
        key: 'defaultBoardId',
        label: 'Default Board ID',
        type: 'text',
        required: false,
        placeholder: '1234567890',
        hint: 'The numeric ID of the board where items will be created by default. Found in the board URL.',
      },
      {
        key: 'defaultGroupId',
        label: 'Default Group ID',
        type: 'text',
        required: false,
        placeholder: 'topics',
        hint: 'Optional. The group within the board where new items are placed.',
      },
    ],
  },
  {
    key: 'maestro',
    label: 'Workflow Automation',
    provider: 'Maestro',
    href: '/integrations/maestro',
    summary: 'Trigger and manage Maestro workflow automations from ERP events such as approvals, order status changes, and exceptions.',
    category: 'WorkManagement',
    statusLabel: 'API key and workspace ID required',
    setupFields: ['API Key', 'Workspace ID'],
    credentials: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: '••••••••',
        hint: 'Your Maestro API key. Found in Maestro under Settings → Integrations → API.',
      },
      {
        key: 'workspaceId',
        label: 'Workspace ID',
        type: 'text',
        required: true,
        placeholder: 'ws_abc123',
        hint: 'The ID of the Maestro workspace this integration should target.',
      },
      {
        key: 'webhookSecret',
        label: 'Webhook Secret',
        type: 'password',
        required: false,
        placeholder: '••••••••',
        hint: 'Optional. Used to verify the authenticity of inbound Maestro event payloads.',
      },
    ],
  },
]

export function getIntegrationByHref(href: string) {
  return INTEGRATIONS.find((integration) => integration.href === href)
}

export function getIntegrationByKey(key: string) {
  return INTEGRATIONS.find((integration) => integration.key === key)
}

/** Returns true if all required credential fields for an integration have values */
export function isIntegrationConfigured(
  integration: IntegrationDefinition,
  savedValues: Record<string, string> | undefined,
): boolean {
  if (!integration.credentials || !savedValues) return false
  return integration.credentials
    .filter((f) => f.required)
    .every((f) => typeof savedValues[f.key] === 'string' && savedValues[f.key].trim().length > 0)
}