import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const transfer = await prisma.bankTransfer.findUnique({
      where: { id },
      select: { id: true, journalEntryId: true },
    })
    if (!transfer) return NextResponse.json({ error: 'Bank transfer not found.' }, { status: 404 })
    if (transfer.journalEntryId) {
      return NextResponse.json({ error: 'Posted bank transfers cannot be deleted.' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.bankFeedTransaction.updateMany({
        where: { matchedRecordType: 'bank_transfer', matchedRecordId: id },
        data: {
          status: 'unmatched',
          matchedRecordType: null,
          matchedRecordId: null,
          matchConfidence: null,
          suggestedMatchReason: null,
        },
      })
      await tx.bankTransfer.delete({ where: { id } })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to delete bank transfer.' },
      { status: 500 },
    )
  }
}
