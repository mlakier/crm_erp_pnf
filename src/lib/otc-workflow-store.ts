import { promises as fs } from 'fs'
import path from 'path'

export type OtcStep = {
  id: string
  label: string
  enabled: boolean
  order: number
  entity: string
  href: string
}

export type TriggerCondition = {
  field: string
  operator: string
  value: string
}

export type TransitionCondition = {
  field: string
  operator: 'not_empty' | 'equals'
  value: string
  joinOperator?: 'and' | 'or'
  openParen?: boolean
  closeParen?: boolean
}

export type OtcTransition = {
  id: string
  label: string
  step: string
  enabled: boolean
  systemProvided?: boolean
  fromStatus: string
  toStatus: string
  actionLabel: string
  triggerType: 'manual_action' | 'external_event' | 'auto_rule' | 'approval_workflow' | 'auto_create'
  actionType: 'status_change' | 'send_for_signature' | 'send_approval_email'
  conditions?: TransitionCondition[]
  integrationKey: string
  templateKey: string
  recipientSource: string
  recipientAddress: string
  externalEvent: string
  successStatus: string
  declineStatus: string
  voidStatus: string
  lockRecordWhilePending: boolean
  autoCreateNextRecord?: boolean
  autoCreateToStep?: string
  autoCreateResultStatus?: string
}

export type OtcTrigger = {
  id: string
  label: string
  fromStep: string
  toStep: string
  enabled: boolean
  systemProvided?: boolean
  condition: TriggerCondition
  action: string
  resultStatus: string
}

export type ApprovalTier = {
  level: number
  operator: string
  value: number
  approverType: 'role' | 'employee'
  approverValue: string
}

export type OtcApproval = {
  id: string
  label: string
  step: string
  enabled: boolean
  tiers: ApprovalTier[]
}

export type OtcWorkflowConfig = {
  steps: OtcStep[]
  transitions: OtcTransition[]
  triggers: OtcTrigger[]
  approvals: OtcApproval[]
}

const STORE_PATH = path.join(process.cwd(), 'config', 'otc-workflow.json')
const REMOVED_TRANSITION_IDS = new Set([
  'lead-qualify-new',
  'lead-disqualify-qualified',
  'lead-qualified-to-nurturing',
])

const DEFAULT_CONFIG: OtcWorkflowConfig = {
  steps: [
    { id: 'lead', label: 'Lead', enabled: true, order: 1, entity: 'lead', href: '/leads' },
    { id: 'opportunity', label: 'Opportunity', enabled: true, order: 2, entity: 'opportunity', href: '/opportunities' },
    { id: 'quote', label: 'Quote', enabled: true, order: 3, entity: 'quote', href: '/quotes' },
    { id: 'sales-order', label: 'Sales Order', enabled: true, order: 4, entity: 'salesOrder', href: '/sales-orders' },
    { id: 'invoice', label: 'Invoice', enabled: true, order: 5, entity: 'invoice', href: '/invoices' },
    { id: 'fulfillment', label: 'Fulfillment', enabled: true, order: 6, entity: 'fulfillment', href: '/fulfillments' },
    { id: 'invoice-receipt', label: 'Invoice Receipt', enabled: true, order: 7, entity: 'invoiceReceipt', href: '/invoice-receipts' },
  ],
  transitions: [
    { id: 'lead-start-working', label: 'Lead Start Working', step: 'lead', enabled: true, fromStatus: 'New', toStatus: 'Working', actionLabel: 'Start Working', triggerType: 'manual_action', actionType: 'status_change', conditions: [], integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false, autoCreateNextRecord: false, autoCreateToStep: '', autoCreateResultStatus: '' },
    { id: 'lead-start-nurturing', label: 'Lead Start Nurturing', step: 'lead', enabled: true, fromStatus: 'New', toStatus: 'Nurturing', actionLabel: 'Start Nurturing', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false, autoCreateNextRecord: false, autoCreateToStep: '', autoCreateResultStatus: '' },
    { id: 'lead-qualify-working', label: 'Lead Qualify from Working', step: 'lead', enabled: true, fromStatus: 'Working', toStatus: 'Qualified', actionLabel: 'Qualify', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false, autoCreateNextRecord: false, autoCreateToStep: '', autoCreateResultStatus: '' },
    { id: 'lead-working-to-nurturing', label: 'Lead Move to Nurturing', step: 'lead', enabled: true, fromStatus: 'Working', toStatus: 'Nurturing', actionLabel: 'Move to Nurturing', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false, autoCreateNextRecord: false, autoCreateToStep: '', autoCreateResultStatus: '' },
    { id: 'lead-nurturing-to-working', label: 'Lead Resume Working', step: 'lead', enabled: true, fromStatus: 'Nurturing', toStatus: 'Working', actionLabel: 'Resume Working', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false, autoCreateNextRecord: false, autoCreateToStep: '', autoCreateResultStatus: '' },
    { id: 'lead-qualify-nurturing', label: 'Lead Qualify from Nurturing', step: 'lead', enabled: true, fromStatus: 'Nurturing', toStatus: 'Qualified', actionLabel: 'Qualify', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false, autoCreateNextRecord: false, autoCreateToStep: '', autoCreateResultStatus: '' },
    { id: 'lead-disqualify', label: 'Lead Disqualify', step: 'lead', enabled: true, fromStatus: 'Working', toStatus: 'Unqualified', actionLabel: 'Disqualify', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'lead-disqualify-nurturing', label: 'Lead Disqualify from Nurturing', step: 'lead', enabled: true, fromStatus: 'Nurturing', toStatus: 'Unqualified', actionLabel: 'Disqualify', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'lead-reopen', label: 'Lead Reopen', step: 'lead', enabled: true, fromStatus: 'Unqualified', toStatus: 'Working', actionLabel: 'Reopen', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'lead-auto-working-contact', label: 'Lead Auto Start Working', step: 'lead', enabled: true, fromStatus: 'New', toStatus: 'Working', actionLabel: 'Auto Start Working', triggerType: 'auto_rule', actionType: 'status_change', conditions: [{ field: 'email', operator: 'not_empty', value: '', joinOperator: 'and', openParen: false, closeParen: false }, { field: 'phone', operator: 'not_empty', value: '', joinOperator: 'and', openParen: false, closeParen: false }], integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'lead-auto-qualify-complete', label: 'Lead Auto Qualify with Complete Contact', step: 'lead', enabled: true, fromStatus: 'Working', toStatus: 'Qualified', actionLabel: 'Auto Qualify', triggerType: 'auto_rule', actionType: 'status_change', conditions: [{ field: 'company', operator: 'not_empty', value: '', joinOperator: 'and', openParen: false, closeParen: false }, { field: 'email', operator: 'not_empty', value: '', joinOperator: 'and', openParen: false, closeParen: false }, { field: 'phone', operator: 'not_empty', value: '', joinOperator: 'and', openParen: false, closeParen: false }], integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'opportunity-qualify', label: 'Opportunity Qualify', step: 'opportunity', enabled: true, fromStatus: 'Prospecting', toStatus: 'Qualified', actionLabel: 'Qualify', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'opportunity-proposal', label: 'Opportunity Move to Proposal', step: 'opportunity', enabled: true, fromStatus: 'Qualified', toStatus: 'Proposal', actionLabel: 'Move to Proposal', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'opportunity-negotiation', label: 'Opportunity Move to Negotiation', step: 'opportunity', enabled: true, fromStatus: 'Proposal', toStatus: 'Negotiation', actionLabel: 'Move to Negotiation', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'opportunity-won', label: 'Opportunity Mark Won', step: 'opportunity', enabled: true, fromStatus: 'Negotiation', toStatus: 'Won', actionLabel: 'Mark Won', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'opportunity-lost-qualified', label: 'Opportunity Mark Lost from Qualified', step: 'opportunity', enabled: true, fromStatus: 'Qualified', toStatus: 'Lost', actionLabel: 'Mark Lost', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'opportunity-lost-proposal', label: 'Opportunity Mark Lost from Proposal', step: 'opportunity', enabled: true, fromStatus: 'Proposal', toStatus: 'Lost', actionLabel: 'Mark Lost', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'opportunity-lost-negotiation', label: 'Opportunity Mark Lost from Negotiation', step: 'opportunity', enabled: true, fromStatus: 'Negotiation', toStatus: 'Lost', actionLabel: 'Mark Lost', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'opportunity-reopen', label: 'Opportunity Reopen', step: 'opportunity', enabled: true, fromStatus: 'Lost', toStatus: 'Qualified', actionLabel: 'Reopen', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'quote-send', label: 'Quote Send', step: 'quote', enabled: true, fromStatus: 'Draft', toStatus: 'Sent', actionLabel: 'Send Quote', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'quote-accept', label: 'Quote Accept', step: 'quote', enabled: true, fromStatus: 'Sent', toStatus: 'Accepted', actionLabel: 'Accept Quote', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'quote-expire', label: 'Quote Expire', step: 'quote', enabled: true, fromStatus: 'Sent', toStatus: 'Expired', actionLabel: 'Expire', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'quote-redraft', label: 'Quote Reset Draft', step: 'quote', enabled: true, fromStatus: 'Expired', toStatus: 'Draft', actionLabel: 'Reset Draft', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'sales-order-approve', label: 'Sales Order Approve', step: 'sales-order', enabled: true, fromStatus: 'Draft', toStatus: 'Approved', actionLabel: 'Approve', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'sales-order-send-signature', label: 'Sales Order Send for Signature', step: 'sales-order', enabled: false, fromStatus: 'Draft', toStatus: 'Pending Signature', actionLabel: 'Send to DocuSign', triggerType: 'manual_action', actionType: 'send_for_signature', integrationKey: 'docusign', templateKey: 'sales-order-signature', recipientSource: 'customer_primary_contact', recipientAddress: '', externalEvent: '', successStatus: 'Approved', declineStatus: 'Cancelled', voidStatus: 'Draft', lockRecordWhilePending: true },
    { id: 'sales-order-signature-complete', label: 'Sales Order Signature Completed', step: 'sales-order', enabled: false, fromStatus: 'Pending Signature', toStatus: 'Approved', actionLabel: 'Signature Completed', triggerType: 'external_event', actionType: 'status_change', integrationKey: 'docusign', templateKey: 'sales-order-signature', recipientSource: 'customer_primary_contact', recipientAddress: '', externalEvent: 'envelope_completed', successStatus: 'Approved', declineStatus: 'Cancelled', voidStatus: 'Draft', lockRecordWhilePending: true },
    { id: 'sales-order-signature-declined', label: 'Sales Order Signature Declined', step: 'sales-order', enabled: false, fromStatus: 'Pending Signature', toStatus: 'Cancelled', actionLabel: 'Signature Declined', triggerType: 'external_event', actionType: 'status_change', integrationKey: 'docusign', templateKey: 'sales-order-signature', recipientSource: 'customer_primary_contact', recipientAddress: '', externalEvent: 'envelope_declined', successStatus: 'Approved', declineStatus: 'Cancelled', voidStatus: 'Draft', lockRecordWhilePending: true },
    { id: 'sales-order-book', label: 'Sales Order Book', step: 'sales-order', enabled: true, fromStatus: 'Approved', toStatus: 'Booked', actionLabel: 'Book Order', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'sales-order-cancel', label: 'Sales Order Cancel', step: 'sales-order', enabled: true, fromStatus: 'Approved', toStatus: 'Cancelled', actionLabel: 'Cancel', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'sales-order-fulfill', label: 'Sales Order Fulfill', step: 'sales-order', enabled: true, fromStatus: 'Booked', toStatus: 'Fulfilled', actionLabel: 'Mark Fulfilled', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'sales-order-cancel-booked', label: 'Sales Order Cancel from Booked', step: 'sales-order', enabled: true, fromStatus: 'Booked', toStatus: 'Cancelled', actionLabel: 'Cancel', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'sales-order-reset', label: 'Sales Order Reset Draft', step: 'sales-order', enabled: true, fromStatus: 'Cancelled', toStatus: 'Draft', actionLabel: 'Reset Draft', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'invoice-open', label: 'Invoice Open', step: 'invoice', enabled: true, fromStatus: 'Draft', toStatus: 'Open', actionLabel: 'Mark Open', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'invoice-paid', label: 'Invoice Paid', step: 'invoice', enabled: true, fromStatus: 'Open', toStatus: 'Paid', actionLabel: 'Mark Paid', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'invoice-void', label: 'Invoice Void', step: 'invoice', enabled: true, fromStatus: 'Open', toStatus: 'Void', actionLabel: 'Void', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'invoice-redraft', label: 'Invoice Reset Draft', step: 'invoice', enabled: true, fromStatus: 'Void', toStatus: 'Draft', actionLabel: 'Reset Draft', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'fulfillment-pack', label: 'Fulfillment Pack', step: 'fulfillment', enabled: true, fromStatus: 'Pending', toStatus: 'Packed', actionLabel: 'Mark Packed', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'fulfillment-ship', label: 'Fulfillment Ship', step: 'fulfillment', enabled: true, fromStatus: 'Packed', toStatus: 'Shipped', actionLabel: 'Mark Shipped', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'fulfillment-deliver', label: 'Fulfillment Deliver', step: 'fulfillment', enabled: true, fromStatus: 'Shipped', toStatus: 'Delivered', actionLabel: 'Mark Delivered', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'fulfillment-cancel-pending', label: 'Fulfillment Cancel from Pending', step: 'fulfillment', enabled: true, fromStatus: 'Pending', toStatus: 'Cancelled', actionLabel: 'Cancel', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'fulfillment-cancel-packed', label: 'Fulfillment Cancel from Packed', step: 'fulfillment', enabled: true, fromStatus: 'Packed', toStatus: 'Cancelled', actionLabel: 'Cancel', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'fulfillment-reset', label: 'Fulfillment Reset Pending', step: 'fulfillment', enabled: true, fromStatus: 'Cancelled', toStatus: 'Pending', actionLabel: 'Reset Pending', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'invoice-receipt-post', label: 'Invoice Receipt Post', step: 'invoice-receipt', enabled: true, fromStatus: 'Draft', toStatus: 'Posted', actionLabel: 'Post Receipt', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'invoice-receipt-void', label: 'Invoice Receipt Void', step: 'invoice-receipt', enabled: true, fromStatus: 'Posted', toStatus: 'Void', actionLabel: 'Void Receipt', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
    { id: 'invoice-receipt-redraft', label: 'Invoice Receipt Reset Draft', step: 'invoice-receipt', enabled: true, fromStatus: 'Void', toStatus: 'Draft', actionLabel: 'Reset Draft', triggerType: 'manual_action', actionType: 'status_change', integrationKey: '', templateKey: '', recipientSource: '', recipientAddress: '', externalEvent: '', successStatus: '', declineStatus: '', voidStatus: '', lockRecordWhilePending: false },
  ],
  triggers: [
    { id: 'opportunity-create-quote-proposal', label: 'Create Quote', fromStep: 'opportunity', toStep: 'quote', enabled: true, condition: { field: 'stage', operator: 'equals', value: 'Proposal' }, action: 'create_next', resultStatus: 'Draft' },
    { id: 'opportunity-create-quote-negotiation', label: 'Create Quote', fromStep: 'opportunity', toStep: 'quote', enabled: true, condition: { field: 'stage', operator: 'equals', value: 'Negotiation' }, action: 'create_next', resultStatus: 'Draft' },
    { id: 'opportunity-create-quote-won', label: 'Create Quote', fromStep: 'opportunity', toStep: 'quote', enabled: true, condition: { field: 'stage', operator: 'equals', value: 'Won' }, action: 'create_next', resultStatus: 'Draft' },
    { id: 'quote-create-sales-order', label: 'Create Sales Order', fromStep: 'quote', toStep: 'sales-order', enabled: true, condition: { field: 'status', operator: 'equals', value: 'Accepted' }, action: 'create_next', resultStatus: 'Draft' },
    { id: 'sales-order-create-fulfillment', label: 'Create Fulfillment', fromStep: 'sales-order', toStep: 'fulfillment', enabled: true, condition: { field: 'status', operator: 'equals', value: 'Booked' }, action: 'create_next', resultStatus: 'Pending' },
    { id: 'sales-order-create-invoice', label: 'Create Invoice', fromStep: 'sales-order', toStep: 'invoice', enabled: true, condition: { field: 'status', operator: 'equals', value: 'Fulfilled' }, action: 'create_next', resultStatus: 'Draft' },
    { id: 'invoice-create-receipt', label: 'Create Invoice Receipt', fromStep: 'invoice', toStep: 'invoice-receipt', enabled: true, condition: { field: 'status', operator: 'equals', value: 'Open' }, action: 'create_next', resultStatus: 'Draft' },
  ],
  approvals: [
    { id: 'quote-approval', label: 'Quote Approval', step: 'quote', enabled: false, tiers: [{ level: 1, operator: '>=', value: 10000, approverType: 'role', approverValue: 'sales_manager' }, { level: 2, operator: '>=', value: 50000, approverType: 'role', approverValue: 'director' }] },
    { id: 'sales-order-approval', label: 'Sales Order Approval', step: 'sales-order', enabled: false, tiers: [{ level: 1, operator: '>=', value: 25000, approverType: 'role', approverValue: 'sales_manager' }, { level: 2, operator: '>=', value: 100000, approverType: 'role', approverValue: 'vp' }] },
    { id: 'invoice-approval', label: 'Invoice Approval', step: 'invoice', enabled: false, tiers: [{ level: 1, operator: '>=', value: 50000, approverType: 'role', approverValue: 'finance_manager' }, { level: 2, operator: '>=', value: 100000, approverType: 'role', approverValue: 'cfo' }] },
    { id: 'fulfillment-approval', label: 'Fulfillment Approval', step: 'fulfillment', enabled: false, tiers: [{ level: 1, operator: '>=', value: 50000, approverType: 'role', approverValue: 'warehouse_manager' }] },
    { id: 'invoice-receipt-approval', label: 'Invoice Receipt Approval', step: 'invoice-receipt', enabled: false, tiers: [{ level: 1, operator: '>=', value: 100000, approverType: 'role', approverValue: 'finance_manager' }, { level: 2, operator: '>=', value: 250000, approverType: 'role', approverValue: 'cfo' }] },
  ],
}

function sanitizeTransition(input: Record<string, unknown>, fallback: OtcTransition): OtcTransition {
  const rawConditions = Array.isArray(input.conditions) ? input.conditions : Array.isArray(fallback.conditions) ? fallback.conditions : []
  return {
    ...fallback,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
    systemProvided: typeof input.systemProvided === 'boolean' ? input.systemProvided : (fallback.systemProvided ?? true),
    label: typeof input.label === 'string' ? input.label : fallback.label,
    fromStatus: typeof input.fromStatus === 'string' ? input.fromStatus : fallback.fromStatus,
    toStatus: typeof input.toStatus === 'string' ? input.toStatus : fallback.toStatus,
    actionLabel: typeof input.actionLabel === 'string' ? input.actionLabel : fallback.actionLabel,
    triggerType:
      input.triggerType === 'external_event'
        ? 'external_event'
        : input.triggerType === 'auto_rule'
          ? 'auto_rule'
          : input.triggerType === 'approval_workflow'
            ? 'approval_workflow'
            : input.triggerType === 'auto_create'
              ? 'auto_create'
          : 'manual_action',
    actionType:
      input.actionType === 'send_for_signature'
        ? 'send_for_signature'
        : input.actionType === 'send_approval_email'
          ? 'send_approval_email'
          : 'status_change',
    conditions: rawConditions
      .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
      .map((condition) => ({
        field: typeof condition.field === 'string' ? condition.field : '',
        operator: condition.operator === 'equals' ? 'equals' : 'not_empty',
        value: typeof condition.value === 'string' ? condition.value : '',
        joinOperator: condition.joinOperator === 'or' ? 'or' : 'and',
        openParen: Boolean(condition.openParen),
        closeParen: Boolean(condition.closeParen),
      }))
      .filter((condition) => condition.field),
    integrationKey: typeof input.integrationKey === 'string' ? input.integrationKey : fallback.integrationKey,
    templateKey: typeof input.templateKey === 'string' ? input.templateKey : fallback.templateKey,
    recipientSource: typeof input.recipientSource === 'string' ? input.recipientSource : fallback.recipientSource,
    recipientAddress: typeof input.recipientAddress === 'string' ? input.recipientAddress : fallback.recipientAddress,
    externalEvent: typeof input.externalEvent === 'string' ? input.externalEvent : fallback.externalEvent,
    successStatus: typeof input.successStatus === 'string' ? input.successStatus : fallback.successStatus,
    declineStatus: typeof input.declineStatus === 'string' ? input.declineStatus : fallback.declineStatus,
    voidStatus: typeof input.voidStatus === 'string' ? input.voidStatus : fallback.voidStatus,
    lockRecordWhilePending:
      typeof input.lockRecordWhilePending === 'boolean'
        ? input.lockRecordWhilePending
        : fallback.lockRecordWhilePending,
    autoCreateNextRecord:
      typeof input.autoCreateNextRecord === 'boolean'
        ? input.autoCreateNextRecord
        : (fallback.autoCreateNextRecord ?? false),
    autoCreateToStep:
      typeof input.autoCreateToStep === 'string'
        ? input.autoCreateToStep
        : (fallback.autoCreateToStep ?? ''),
    autoCreateResultStatus:
      typeof input.autoCreateResultStatus === 'string'
        ? input.autoCreateResultStatus
        : (fallback.autoCreateResultStatus ?? ''),
  }
}

function sanitizeTrigger(input: Record<string, unknown>, fallback: OtcTrigger): OtcTrigger {
  const condition = input.condition && typeof input.condition === 'object' ? input.condition as Record<string, unknown> : {}
  return {
    ...fallback,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
    systemProvided: typeof input.systemProvided === 'boolean' ? input.systemProvided : (fallback.systemProvided ?? true),
    label: typeof input.label === 'string' ? input.label : fallback.label,
    condition: {
      field: typeof condition.field === 'string' ? condition.field : fallback.condition.field,
      operator: typeof condition.operator === 'string' ? condition.operator : fallback.condition.operator,
      value: typeof condition.value === 'string' ? condition.value : fallback.condition.value,
    },
    action: typeof input.action === 'string' ? input.action : fallback.action,
    resultStatus: typeof input.resultStatus === 'string' ? input.resultStatus : fallback.resultStatus,
  }
}

function sanitizeApproval(input: Record<string, unknown>, fallback: OtcApproval): OtcApproval {
  const rawTiers = Array.isArray(input.tiers) ? input.tiers : Array.isArray(fallback.tiers) ? fallback.tiers : []
  const tiers: ApprovalTier[] = rawTiers.length > 0
    ? rawTiers
        .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
        .map((tier, index) => ({
          level: typeof tier.level === 'number' ? tier.level : index + 1,
          operator: typeof tier.operator === 'string' ? tier.operator : '>=',
          value: typeof tier.value === 'number' ? tier.value : 0,
          approverType: tier.approverType === 'role' || tier.approverType === 'employee' ? tier.approverType : 'role',
          approverValue:
            typeof tier.approverValue === 'string'
              ? tier.approverValue
              : (typeof tier.approverRole === 'string' ? tier.approverRole : 'manager'),
        }))
    : fallback.tiers

  return {
    ...fallback,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
    label: typeof input.label === 'string' ? input.label : fallback.label,
    tiers,
  }
}

function sanitize(input: unknown): OtcWorkflowConfig {
  if (!input || typeof input !== "object") return structuredClone(DEFAULT_CONFIG)
  const root = input as Record<string, unknown>

  const rawSteps = Array.isArray(root.steps) ? root.steps : []
  const steps: OtcStep[] = DEFAULT_CONFIG.steps.map((def) => {
    const match = rawSteps.find((step: Record<string, unknown>) => step && step.id === def.id) as Record<string, unknown> | undefined
    return {
      ...def,
      enabled: match && typeof match.enabled === 'boolean' ? match.enabled : def.enabled,
    }
  })

  const rawTransitions = Array.isArray(root.transitions) ? root.transitions : []
  const transitions: OtcTransition[] = DEFAULT_CONFIG.transitions.map((def) => {
    const match = rawTransitions.find((transition: Record<string, unknown>) => transition && transition.id === def.id) as Record<string, unknown> | undefined
    return sanitizeTransition(match ?? {}, def)
  })
  const defaultTransitionIds = new Set(DEFAULT_CONFIG.transitions.map((transition) => transition.id))
  const customTransitions: OtcTransition[] = rawTransitions
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
    .filter((transition) => !(typeof transition.id === 'string' && REMOVED_TRANSITION_IDS.has(transition.id)))
    .filter((transition) => typeof transition.id === 'string' && !defaultTransitionIds.has(transition.id))
    .filter((transition) => typeof transition.step === 'string' && steps.some((step) => step.id === transition.step))
    .map((transition) =>
      sanitizeTransition(transition, {
        id: transition.id as string,
        label: typeof transition.label === 'string' ? transition.label : 'Custom Transition',
        step: transition.step as string,
        enabled: typeof transition.enabled === 'boolean' ? transition.enabled : true,
        systemProvided: false,
        fromStatus: typeof transition.fromStatus === 'string' ? transition.fromStatus : '',
        toStatus: typeof transition.toStatus === 'string' ? transition.toStatus : '',
        actionLabel: typeof transition.actionLabel === 'string' ? transition.actionLabel : '',
        triggerType:
          transition.triggerType === 'external_event'
            ? 'external_event'
            : transition.triggerType === 'auto_rule'
              ? 'auto_rule'
              : transition.triggerType === 'approval_workflow'
                ? 'approval_workflow'
                : transition.triggerType === 'auto_create'
                  ? 'auto_create'
              : 'manual_action',
        actionType:
          transition.actionType === 'send_for_signature'
            ? 'send_for_signature'
            : transition.actionType === 'send_approval_email'
              ? 'send_approval_email'
              : 'status_change',
        conditions: [],
        integrationKey: typeof transition.integrationKey === 'string' ? transition.integrationKey : '',
        templateKey: typeof transition.templateKey === 'string' ? transition.templateKey : '',
        recipientSource: typeof transition.recipientSource === 'string' ? transition.recipientSource : '',
        recipientAddress: typeof transition.recipientAddress === 'string' ? transition.recipientAddress : '',
        externalEvent: typeof transition.externalEvent === 'string' ? transition.externalEvent : '',
        successStatus: typeof transition.successStatus === 'string' ? transition.successStatus : '',
        declineStatus: typeof transition.declineStatus === 'string' ? transition.declineStatus : '',
        voidStatus: typeof transition.voidStatus === 'string' ? transition.voidStatus : '',
        lockRecordWhilePending: typeof transition.lockRecordWhilePending === 'boolean' ? transition.lockRecordWhilePending : false,
        autoCreateNextRecord: typeof transition.autoCreateNextRecord === 'boolean' ? transition.autoCreateNextRecord : false,
        autoCreateToStep: typeof transition.autoCreateToStep === 'string' ? transition.autoCreateToStep : '',
        autoCreateResultStatus: typeof transition.autoCreateResultStatus === 'string' ? transition.autoCreateResultStatus : '',
      }),
    )

  const rawTriggers = Array.isArray(root.triggers) ? root.triggers : []
  const triggers: OtcTrigger[] = DEFAULT_CONFIG.triggers.map((def) => {
    const match = rawTriggers.find((trigger: Record<string, unknown>) => trigger && trigger.id === def.id) as Record<string, unknown> | undefined
    return sanitizeTrigger(match ?? {}, def)
  })
  const defaultTriggerIds = new Set(DEFAULT_CONFIG.triggers.map((trigger) => trigger.id))
  const customTriggers: OtcTrigger[] = rawTriggers
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
    .filter((trigger) => typeof trigger.id === 'string' && !defaultTriggerIds.has(trigger.id))
    .filter(
      (trigger) =>
        typeof trigger.fromStep === 'string' &&
        typeof trigger.toStep === 'string' &&
        steps.some((step) => step.id === trigger.fromStep) &&
        steps.some((step) => step.id === trigger.toStep),
    )
    .map((trigger) =>
      sanitizeTrigger(trigger, {
        id: trigger.id as string,
        label: typeof trigger.label === 'string' ? trigger.label : 'Custom Document Rule',
        fromStep: trigger.fromStep as string,
        toStep: trigger.toStep as string,
        enabled: typeof trigger.enabled === 'boolean' ? trigger.enabled : true,
        systemProvided: false,
        condition: {
          field: trigger.fromStep === 'opportunity' ? 'stage' : 'status',
          operator: 'equals',
          value: '',
        },
        action: typeof trigger.action === 'string' ? trigger.action : 'create_next',
        resultStatus: typeof trigger.resultStatus === 'string' ? trigger.resultStatus : '',
      }),
    )

  const rawApprovals = Array.isArray(root.approvals) ? root.approvals : []
  const approvals: OtcApproval[] = DEFAULT_CONFIG.approvals.map((def) => {
    const match = rawApprovals.find((approval: Record<string, unknown>) => approval && approval.id === def.id) as Record<string, unknown> | undefined
    if (!match) return { ...def }
    return sanitizeApproval(match, def)
  })
  const defaultApprovalIds = new Set(DEFAULT_CONFIG.approvals.map((approval) => approval.id))
  const customApprovals: OtcApproval[] = rawApprovals
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
    .filter((approval) => typeof approval.id === 'string' && !defaultApprovalIds.has(approval.id))
    .filter((approval) => typeof approval.step === 'string' && steps.some((step) => step.id === approval.step))
    .map((approval) =>
      sanitizeApproval(approval, {
        id: approval.id as string,
        label: typeof approval.label === 'string' ? approval.label : 'Custom Approval',
        step: approval.step as string,
        enabled: typeof approval.enabled === 'boolean' ? approval.enabled : true,
        tiers: [
          {
            level: 1,
            operator: '>=',
            value: 0,
            approverType: 'role',
            approverValue: 'manager',
          },
        ],
      }),
    )

  return { steps, transitions: [...transitions, ...customTransitions], triggers: [...triggers, ...customTriggers], approvals: [...approvals, ...customApprovals] }
}

export async function loadOtcWorkflow(): Promise<OtcWorkflowConfig> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    return sanitize(JSON.parse(raw))
  } catch {
    return sanitize(structuredClone(DEFAULT_CONFIG))
  }
}

export async function saveOtcWorkflow(input: unknown): Promise<OtcWorkflowConfig> {
  const config = sanitize(input)
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  return config
}
