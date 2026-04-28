import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendTransactionalEmail } from '@/lib/transactional-email'

const WORKFLOW_APPROVAL_PREFIX = 'WORKFLOW_EMAIL_APPROVAL:'

export type WorkflowEmailApprovalMetadata = {
  token: string
  step: string
  transitionId: string
  entityType: string
  entityId: string
  entityLabel: string
  detailPath: string
  requestedStatus: string
  successStatus: string
  declineStatus: string
  recipientEmail: string
  recipientSource: string
  integrationKey: string
  templateKey: string
  sentAt: string
}

export function createWorkflowEmailApprovalComments(metadata: WorkflowEmailApprovalMetadata) {
  return `${WORKFLOW_APPROVAL_PREFIX}${JSON.stringify(metadata)}`
}

export function parseWorkflowEmailApprovalComments(comments: string | null | undefined) {
  if (!comments?.startsWith(WORKFLOW_APPROVAL_PREFIX)) return null
  try {
    return JSON.parse(comments.slice(WORKFLOW_APPROVAL_PREFIX.length)) as WorkflowEmailApprovalMetadata
  } catch {
    return null
  }
}

export function buildWorkflowApprovalActionUrl(origin: string, token: string, decision: 'approve' | 'reject') {
  return `${origin}/api/workflow-approvals/${encodeURIComponent(token)}?decision=${decision}`
}

export async function createPendingWorkflowEmailApproval(metadata: Omit<WorkflowEmailApprovalMetadata, 'token' | 'sentAt'>) {
  const token = randomUUID()
  const fullMetadata: WorkflowEmailApprovalMetadata = {
    ...metadata,
    token,
    sentAt: new Date().toISOString(),
  }

  await prisma.approvalRecord.create({
    data: {
      entityId: metadata.entityId,
      entityType: metadata.entityType,
      approverId: token,
      status: 'pending',
      comments: createWorkflowEmailApprovalComments(fullMetadata),
    },
  })

  return fullMetadata
}

export async function deletePendingWorkflowEmailApproval(token: string) {
  await prisma.approvalRecord.deleteMany({
    where: {
      approverId: token,
      status: 'pending',
    },
  })
}

export async function sendWorkflowApprovalEmail({
  origin,
  metadata,
}: {
  origin: string
  metadata: WorkflowEmailApprovalMetadata
}) {
  const approveUrl = buildWorkflowApprovalActionUrl(origin, metadata.token, 'approve')
  const rejectUrl = buildWorkflowApprovalActionUrl(origin, metadata.token, 'reject')
  const subject = `Approval requested: ${metadata.entityLabel}`
  const text = [
    `An approval request is waiting for ${metadata.entityLabel}.`,
    '',
    `Current pending status: ${metadata.requestedStatus}`,
    metadata.successStatus ? `Approve result: ${metadata.successStatus}` : '',
    metadata.declineStatus ? `Reject result: ${metadata.declineStatus}` : '',
    '',
    `Approve: ${approveUrl}`,
    `Reject: ${rejectUrl}`,
    '',
    `Open record: ${origin}${metadata.detailPath}`,
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin:0 0 12px">Approval requested</h2>
      <p style="margin:0 0 12px">An approval request is waiting for <strong>${escapeHtml(metadata.entityLabel)}</strong>.</p>
      <p style="margin:0 0 20px">Pending status: <strong>${escapeHtml(metadata.requestedStatus)}</strong></p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin:0 0 20px">
        <a href="${approveUrl}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">Approve</a>
        <a href="${rejectUrl}" style="background:#dc2626;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">Reject</a>
      </div>
      <p style="margin:0 0 8px"><a href="${origin}${metadata.detailPath}" style="color:#2563eb">Open record</a></p>
    </div>
  `

  await sendTransactionalEmail({
    to: metadata.recipientEmail,
    subject,
    text,
    html,
  })
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
