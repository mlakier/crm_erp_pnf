import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateNextBankDepositId } from '@/lib/banking-number'
import { logActivity } from '@/lib/activity'

function text(value: unknown) {
  return String(value ?? '').trim()
}

function parseDate(value: unknown) {
  const date = new Date(text(value))
  return Number.isNaN(date.getTime()) ? null : date
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const bankFeedTransactionId = text(body.bankFeedTransactionId)
    let bankAccountId = text(body.bankAccountId)
    let currencyId = text(body.currencyId)
    let subsidiaryId = text(body.subsidiaryId)
    const amount = Number(body.amount)
    let depositDate = parseDate(body.depositDate)
    const memo = text(body.memo) || null

    const bankFeedTransaction = bankFeedTransactionId
      ? await prisma.bankFeedTransaction.findUnique({
          where: { id: bankFeedTransactionId },
          select: {
            id: true,
            status: true,
            amount: true,
            currencyId: true,
            bankAccountId: true,
            transactionDate: true,
          },
        })
      : null

    bankAccountId ||= bankFeedTransaction?.bankAccountId ?? ''
    currencyId ||= bankFeedTransaction?.currencyId ?? ''
    subsidiaryId ||= bankFeedTransaction
      ? (await prisma.bankAccount.findUnique({ where: { id: bankFeedTransaction.bankAccountId }, select: { subsidiaryId: true } }))?.subsidiaryId ?? ''
      : ''
    depositDate ||= bankFeedTransaction?.transactionDate ?? null

    if (!bankAccountId) return NextResponse.json({ error: 'Bank account is required.' }, { status: 400 })
    if (!currencyId) return NextResponse.json({ error: 'Currency is required.' }, { status: 400 })
    if (!subsidiaryId) return NextResponse.json({ error: 'Subsidiary is required.' }, { status: 400 })
    if (!depositDate) return NextResponse.json({ error: 'Deposit date is required.' }, { status: 400 })
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Deposit amount must be greater than zero.' }, { status: 400 })

    if (bankFeedTransactionId && !bankFeedTransaction) {
      return NextResponse.json({ error: 'Bank feed transaction was not found.' }, { status: 404 })
    }
    if (bankFeedTransaction?.status === 'matched') {
      return NextResponse.json({ error: 'Bank feed transaction is already matched.' }, { status: 400 })
    }
    if (bankFeedTransaction && bankFeedTransaction.bankAccountId !== bankAccountId) {
      return NextResponse.json({ error: 'Deposit bank account must match the bank feed line.' }, { status: 400 })
    }
    if (bankFeedTransaction && bankFeedTransaction.currencyId !== currencyId) {
      return NextResponse.json({ error: 'Deposit currency must match the bank feed line.' }, { status: 400 })
    }
    if (bankFeedTransaction && Math.abs(Number(bankFeedTransaction.amount) - amount) > 0.01) {
      return NextResponse.json({ error: 'Deposit amount must equal the bank feed amount.' }, { status: 400 })
    }
    if (bankFeedTransaction && depositDate.getTime() < bankFeedTransaction.transactionDate.getTime()) {
      return NextResponse.json({ error: 'Deposit date cannot be earlier than the bank feed transaction date.' }, { status: 400 })
    }

    const depositNumber = await generateNextBankDepositId()
    const deposit = await prisma.$transaction(async (tx) => {
      const created = await tx.bankDeposit.create({
        data: {
          depositNumber,
          status: 'posted',
          depositDate,
          amount,
          memo,
          bankAccountId,
          subsidiaryId,
          currencyId,
          bankFeedTransactionId: bankFeedTransactionId || null,
        },
      })

      if (bankFeedTransactionId) {
        await tx.bankFeedTransaction.update({
          where: { id: bankFeedTransactionId },
          data: {
            status: 'matched',
            matchedRecordType: 'bank_deposit',
            matchedRecordId: created.id,
            matchConfidence: 100,
            suggestedMatchReason: `Matched deposit batch ${created.depositNumber}`,
          },
        })
      }

      return created
    })

    await logActivity({
      entityType: 'bank-deposit',
      entityId: deposit.id,
      action: 'create',
      summary: `Created bank deposit ${deposit.depositNumber}`,
    })

    return NextResponse.json(deposit, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create bank deposit.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const deposit = await prisma.bankDeposit.findUnique({
      where: { id },
      select: { id: true, journalEntryId: true },
    })
    if (!deposit) return NextResponse.json({ error: 'Bank deposit not found.' }, { status: 404 })
    if (deposit.journalEntryId) {
      return NextResponse.json({ error: 'Posted bank deposits cannot be deleted.' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.bankFeedTransaction.updateMany({
        where: { matchedRecordType: 'bank_deposit', matchedRecordId: id },
        data: {
          status: 'unmatched',
          matchedRecordType: null,
          matchedRecordId: null,
          matchConfidence: null,
          suggestedMatchReason: null,
        },
      })
      await tx.bankDeposit.delete({ where: { id } })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to delete bank deposit.' },
      { status: 500 },
    )
  }
}
