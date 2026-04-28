import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { parseWorkflowEmailApprovalComments } from '@/lib/workflow-email-approval'

function renderHtml(title: string, message: string) {
  return new NextResponse(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;background:#0f172a;color:#e5e7eb;font-family:Arial,sans-serif">
    <div style="max-width:720px;margin:64px auto;padding:24px;border:1px solid rgba(148,163,184,0.28);border-radius:16px;background:#111827">
      <h1 style="margin:0 0 12px;font-size:28px;color:#fff">${title}</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6">${message}</p>
    </div>
  </body>
</html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    },
  )
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const decision = request.nextUrl.searchParams.get('decision')

  if (decision !== 'approve' && decision !== 'reject') {
    return renderHtml('Approval link error', 'This approval link is missing a valid decision.')
  }

  const approval = await prisma.approvalRecord.findFirst({
    where: {
      approverId: token,
    },
  })

  if (!approval) {
    return renderHtml('Approval link expired', 'This approval link could not be found.')
  }

  const metadata = parseWorkflowEmailApprovalComments(approval.comments)
  if (!metadata) {
    return renderHtml('Approval link error', 'This approval link is not attached to a supported workflow action.')
  }

  if (approval.status !== 'pending') {
    return renderHtml('Already handled', `This approval request was already marked ${approval.status}.`)
  }

  if (metadata.entityType !== 'lead') {
    return renderHtml('Unsupported workflow', 'This first pass only supports lead email approvals right now.')
  }

  const nextStatus = decision === 'approve' ? metadata.successStatus : metadata.declineStatus
  if (!nextStatus) {
    return renderHtml('Approval setup error', 'This workflow transition is missing the target status for this decision.')
  }

  const lead = await prisma.lead.findUnique({
    where: { id: metadata.entityId },
    select: { id: true, leadNumber: true, company: true, firstName: true, lastName: true, email: true, status: true, userId: true },
  })

  if (!lead) {
    return renderHtml('Record not found', 'The related lead no longer exists.')
  }

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: nextStatus,
      },
    }),
    prisma.approvalRecord.update({
      where: { id: approval.id },
      data: {
        status: decision === 'approve' ? 'approved' : 'rejected',
      },
    }),
  ])

  await logActivity({
    entityType: 'lead',
    entityId: lead.id,
    action: decision === 'approve' ? 'approve' : 'reject',
    summary: `${decision === 'approve' ? 'Approved' : 'Rejected'} lead workflow email approval for ${lead.leadNumber ?? lead.company ?? lead.email ?? lead.id}`,
    userId: null,
  })

  return renderHtml(
    decision === 'approve' ? 'Approved' : 'Rejected',
    `The lead has been updated to ${nextStatus}. You can close this window.`,
  )
}
