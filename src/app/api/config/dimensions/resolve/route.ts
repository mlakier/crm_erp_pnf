import { NextResponse } from 'next/server'

import { resolveSeededLineDimensionDefaults } from '@/lib/dimension-source-resolver'
import { TRANSACTION_DOCUMENT_LINE_REQUIREMENTS } from '@/lib/transaction-line-requirements'
import type { TransactionLineRequirementsDocumentType } from '@/lib/transaction-line-requirements'

function toOptionalString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function isDocumentType(value: string | null): value is TransactionLineRequirementsDocumentType {
  return Boolean(value && value in TRANSACTION_DOCUMENT_LINE_REQUIREMENTS)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const documentType = toOptionalString(body?.documentType)

    if (!isDocumentType(documentType)) {
      return NextResponse.json({ error: 'Supported documentType is required.' }, { status: 400 })
    }

    const result = await resolveSeededLineDimensionDefaults({
      documentType,
      itemId: toOptionalString(body?.itemId),
      expenseAccountId: toOptionalString(body?.expenseAccountId),
      projectId: toOptionalString(body?.projectId),
      departmentId: toOptionalString(body?.departmentId),
      locationId: toOptionalString(body?.locationId),
      classId: toOptionalString(body?.classId),
    })

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('Failed to resolve dimension defaults', error)
    return NextResponse.json({ error: 'Failed to resolve dimension defaults.' }, { status: 500 })
  }
}
