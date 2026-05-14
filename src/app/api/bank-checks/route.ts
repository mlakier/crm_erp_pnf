import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const check = await prisma.bankCheck.findUnique({
      where: { id },
      select: { id: true, billPaymentId: true, status: true },
    })
    if (!check) return NextResponse.json({ error: 'Check not found.' }, { status: 404 })
    if (check.billPaymentId) {
      return NextResponse.json({ error: 'Checks generated from bill payments must be managed from the bill payment.' }, { status: 400 })
    }
    if (check.status === 'cleared') {
      return NextResponse.json({ error: 'Cleared checks cannot be deleted.' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.bankFeedTransaction.updateMany({
        where: { matchedRecordType: 'bank_check', matchedRecordId: id },
        data: {
          status: 'unmatched',
          matchedRecordType: null,
          matchedRecordId: null,
          matchConfidence: null,
          suggestedMatchReason: null,
        },
      })
      await tx.bankCheck.delete({ where: { id } })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to delete check.' },
      { status: 500 },
    )
  }
}
