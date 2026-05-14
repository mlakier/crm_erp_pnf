import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateNextBankTransactionId, generateNextBankTransferId } from '@/lib/banking-number'
import { generateNextSystemJournalNumber } from '@/lib/journal-number'
import { logActivity } from '@/lib/activity'
import { loadCompanySetupSettings } from '@/lib/company-setup-settings-store'
import { deriveSettlementLineDimensions } from '@/lib/settlement-dimension-policy'

function text(value: unknown) {
  return String(value ?? '').trim()
}

function parseDate(value: unknown) {
  const date = new Date(text(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function isOutflow(amount: number) {
  return amount < 0
}

function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function matchesKeywordRule(textValue: string, keywords: string) {
  const normalizedText = normalizeSearch(textValue)
  return keywords
    .split(',')
    .map((entry) => normalizeSearch(entry))
    .filter(Boolean)
    .some((keyword) => normalizedText.includes(keyword))
}

function defaultBankActivityAccountId(input: {
  amount: number
  description: string
  counterparty: string | null
  settings: Awaited<ReturnType<typeof loadCompanySetupSettings>>
}) {
  const textValue = `${input.description} ${input.counterparty ?? ''}`
  if (matchesKeywordRule(textValue, input.settings.merchantFeeKeywords)) {
    return input.settings.defaultMerchantFeeExpenseAccountId || input.settings.defaultBankFeeExpenseAccountId
  }
  if (matchesKeywordRule(textValue, input.settings.bankFeeKeywords)) {
    return input.settings.defaultBankFeeExpenseAccountId
  }
  if (input.amount > 0 && matchesKeywordRule(textValue, input.settings.interestIncomeKeywords)) {
    return input.settings.defaultInterestIncomeAccountId
  }
  if (input.amount > 0 && matchesKeywordRule(textValue, input.settings.miscBankIncomeKeywords)) {
    return input.settings.defaultMiscBankIncomeAccountId
  }
  return ''
}

async function findMatchedRecordForValidation(matchedRecordType: string, matchedRecordId: string) {
  switch (matchedRecordType) {
    case 'invoice':
      return prisma.invoice.findUnique({ where: { id: matchedRecordId }, select: { id: true, currencyId: true } })
    case 'bill':
      return prisma.bill.findUnique({ where: { id: matchedRecordId }, select: { id: true, currencyId: true } })
    case 'cash_receipt':
      return prisma.cashReceipt.findUnique({ where: { id: matchedRecordId }, select: { id: true, currencyId: true } })
    case 'bill_payment':
      return prisma.billPayment.findUnique({ where: { id: matchedRecordId }, select: { id: true, currencyId: true } })
    case 'bank_check':
      return prisma.bankCheck.findUnique({ where: { id: matchedRecordId }, select: { id: true, currencyId: true, billPaymentId: true } })
    case 'journal_entry':
      return prisma.journalEntry.findUnique({ where: { id: matchedRecordId }, select: { id: true, currencyId: true } })
    default:
      return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')?.trim()
  const bankAccountId = searchParams.get('bankAccountId')?.trim()
  const data = await prisma.bankFeedTransaction.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(bankAccountId ? { bankAccountId } : {}),
    },
    include: { bankAccount: { include: { glAccount: true } }, currency: true, connection: true },
    orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    take: 250,
  })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const bankAccountId = text(body?.bankAccountId)
    const currencyId = text(body?.currencyId)
    const transactionDate = parseDate(body?.transactionDate)
    const amount = Number(body?.amount)
    const description = text(body?.description)
    if (!bankAccountId || !currencyId || !transactionDate || !Number.isFinite(amount) || !description) {
      return NextResponse.json({ error: 'Bank account, currency, transaction date, amount, and description are required.' }, { status: 400 })
    }

    const created = await prisma.bankFeedTransaction.create({
      data: {
        bankTransactionId: text(body?.bankTransactionId) || await generateNextBankTransactionId(),
        bankAccountId,
        connectionId: text(body?.connectionId) || null,
        externalId: text(body?.externalId) || null,
        transactionDate,
        postedDate: parseDate(body?.postedDate),
        description,
        counterparty: text(body?.counterparty) || null,
        amount,
        currencyId,
        direction: text(body?.direction || (amount < 0 ? 'outflow' : 'inflow')),
        status: text(body?.status || 'unmatched'),
        matchedRecordType: text(body?.matchedRecordType) || null,
        matchedRecordId: text(body?.matchedRecordId) || null,
        matchConfidence: body?.matchConfidence ? Number(body.matchConfidence) : null,
        suggestedMatchReason: text(body?.suggestedMatchReason) || null,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unable to create bank feed transaction.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await request.json()
    const action = text(body?.action || 'match')
    if (action === 'unmatch') {
      const updated = await prisma.$transaction(async (tx) => {
        const existing = await tx.bankFeedTransaction.findUnique({
          where: { id },
          select: { matchedRecordType: true, matchedRecordId: true },
        })
        if (existing?.matchedRecordType === 'bank_check' && existing.matchedRecordId) {
          await tx.bankCheck.updateMany({
            where: { id: existing.matchedRecordId, bankFeedTransactionId: id },
            data: { status: 'issued', bankFeedTransactionId: null },
          })
        }
        return tx.bankFeedTransaction.update({
          where: { id },
          data: {
            status: 'unmatched',
            matchedRecordType: null,
            matchedRecordId: null,
            matchConfidence: null,
            suggestedMatchReason: null,
          },
        })
      })
      return NextResponse.json(updated)
    }

    if (action === 'post_journal') {
      const bankTransaction = await prisma.bankFeedTransaction.findUnique({
        where: { id },
        include: {
          bankAccount: { include: { glAccount: true } },
          currency: true,
        },
      })
      if (!bankTransaction) {
        return NextResponse.json({ error: 'Bank feed transaction not found.' }, { status: 404 })
      }
      if (bankTransaction.status === 'matched') {
        return NextResponse.json({ error: 'This bank feed transaction is already matched.' }, { status: 400 })
      }

      const companySetupSettings = await loadCompanySetupSettings()
      const offsetAccountId = text(body?.offsetAccountId) || defaultBankActivityAccountId({
        amount: Number(bankTransaction.amount),
        description: bankTransaction.description,
        counterparty: bankTransaction.counterparty,
        settings: companySetupSettings,
      })
      if (!offsetAccountId) {
        return NextResponse.json({ error: 'Select a GL account or configure the matching bank activity default in Company Setup.' }, { status: 400 })
      }

      const offsetAccount = await prisma.chartOfAccounts.findFirst({
        where: {
          id: offsetAccountId,
          active: true,
          isPosting: true,
        },
        select: {
          id: true,
          accountNumber: true,
          name: true,
          category: true,
          accountRole: true,
          financialStatementCategory: true,
          bankAccountRequired: true,
          clearingAccount: true,
        },
      })
      if (!offsetAccount) {
        return NextResponse.json({ error: 'Selected GL account is not an active posting account.' }, { status: 400 })
      }

      const bankGlAccountId = bankTransaction.bankAccount.glAccountId
      const amount = Math.abs(Number(bankTransaction.amount))
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Bank journal amount must be non-zero.' }, { status: 400 })
      }
      const requestedPostingDate = parseDate(body?.postingDate)
      const postingDate = requestedPostingDate ?? bankTransaction.postedDate ?? bankTransaction.transactionDate
      if (startOfDay(postingDate).getTime() < startOfDay(bankTransaction.transactionDate).getTime()) {
        return NextResponse.json({ error: 'Posting date cannot be earlier than the selected bank transaction date.' }, { status: 400 })
      }

      const bankActivityType = text(body?.bankActivityType || 'bank_journal')
      const pairedBankFeedTransactionId = text(body?.pairedBankFeedTransactionId) || null
      if (bankActivityType === 'transfer') {
        const offsetText = `${offsetAccount.name} ${offsetAccount.category ?? ''} ${offsetAccount.accountRole ?? ''} ${offsetAccount.financialStatementCategory ?? ''}`.toLowerCase()
        const validTransferOffset = offsetAccount.id !== bankTransaction.bankAccount.glAccountId
          && (
            offsetAccount.bankAccountRequired
            || offsetAccount.clearingAccount
            || offsetText.includes('bank account')
            || offsetText.includes('cash and cash equivalents')
            || offsetText.includes('transfer clearing')
          )
        if (!validTransferOffset) {
          return NextResponse.json({ error: 'Bank transfers must use another bank GL account or a transfer clearing account.' }, { status: 400 })
        }
        if (pairedBankFeedTransactionId) {
          const pairedBankTransaction = await prisma.bankFeedTransaction.findUnique({
            where: { id: pairedBankFeedTransactionId },
            include: { bankAccount: true },
          })
          if (!pairedBankTransaction) {
            return NextResponse.json({ error: 'Paired bank feed transaction was not found.' }, { status: 400 })
          }
          if (pairedBankTransaction.id === bankTransaction.id) {
            return NextResponse.json({ error: 'A bank transfer cannot be paired to itself.' }, { status: 400 })
          }
          if (pairedBankTransaction.status === 'matched') {
            return NextResponse.json({ error: 'The paired bank feed transaction is already matched.' }, { status: 400 })
          }
          if (pairedBankTransaction.currencyId !== bankTransaction.currencyId) {
            return NextResponse.json({ error: 'The paired bank feed transaction currency does not match this transfer.' }, { status: 400 })
          }
          if (Math.sign(Number(pairedBankTransaction.amount)) === Math.sign(Number(bankTransaction.amount))) {
            return NextResponse.json({ error: 'The paired bank feed transaction must be the opposite cash direction.' }, { status: 400 })
          }
          if (Math.abs(Math.abs(Number(pairedBankTransaction.amount)) - amount) > 0.01) {
            return NextResponse.json({ error: 'The paired bank feed transaction amount does not match this transfer.' }, { status: 400 })
          }
          if (pairedBankTransaction.bankAccount.glAccountId !== offsetAccount.id) {
            return NextResponse.json({ error: 'Selected bank account does not match the paired bank feed line.' }, { status: 400 })
          }
        }
      }
      const activityLabel = bankActivityType === 'deposit'
        ? 'bank deposit'
        : bankActivityType === 'transfer'
          ? 'bank transfer'
          : bankActivityType === 'bank_fee'
            ? 'bank fee'
            : bankActivityType === 'merchant_fee'
              ? 'merchant fee'
              : bankActivityType === 'interest_income'
                ? 'interest income'
                : bankActivityType === 'unapplied_cash'
                  ? 'unapplied cash'
                : 'bank activity'
      const journalNumber = await generateNextSystemJournalNumber()
      const description = `${activityLabel.charAt(0).toUpperCase()}${activityLabel.slice(1)} journal: ${bankTransaction.description}`
      const settlementDimensions = await deriveSettlementLineDimensions([])
      const transferNumber = bankActivityType === 'transfer' ? await generateNextBankTransferId() : null
      const postingResult = await prisma.$transaction(async (tx) => {
        const createdJournal = await tx.journalEntry.create({
          data: {
            number: journalNumber,
            date: postingDate,
            description,
            journalType: 'standard',
            status: text(body?.journalStatus) || 'approved',
            total: amount,
            sourceType: 'bank-feed-transaction',
            sourceId: bankTransaction.id,
            subsidiaryId: bankTransaction.bankAccount.subsidiaryId,
            currencyId: bankTransaction.currencyId,
            isOpenItemRelevant: false,
            lineItems: {
              create: isOutflow(Number(bankTransaction.amount))
                ? [
                    {
                      displayOrder: 0,
                      accountId: offsetAccount.id,
                      ...settlementDimensions,
                      debit: amount,
                      credit: 0,
                      description: bankTransaction.description,
                      memo: bankTransaction.externalId ?? null,
                    },
                    {
                      displayOrder: 1,
                      accountId: bankGlAccountId,
                      ...settlementDimensions,
                      debit: 0,
                      credit: amount,
                      description: bankTransaction.description,
                      memo: bankTransaction.externalId ?? null,
                    },
                  ]
                : [
                    {
                      displayOrder: 0,
                      accountId: bankGlAccountId,
                      ...settlementDimensions,
                      debit: amount,
                      credit: 0,
                      description: bankTransaction.description,
                      memo: bankTransaction.externalId ?? null,
                    },
                    {
                      displayOrder: 1,
                      accountId: offsetAccount.id,
                      ...settlementDimensions,
                      debit: 0,
                      credit: amount,
                      description: bankTransaction.description,
                      memo: bankTransaction.externalId ?? null,
                    },
                  ],
            },
          },
        })

        const offsetBankAccount = bankActivityType === 'transfer'
          ? await tx.bankAccount.findFirst({ where: { glAccountId: offsetAccount.id } })
          : null
        const createdTransfer = bankActivityType === 'transfer' && transferNumber
          ? await tx.bankTransfer.create({
              data: {
                transferNumber,
                status: 'posted',
                transferDate: postingDate,
                amount,
                memo: bankTransaction.description,
                fromBankAccountId: isOutflow(Number(bankTransaction.amount))
                  ? bankTransaction.bankAccountId
                  : offsetBankAccount?.id ?? bankTransaction.bankAccountId,
                toBankAccountId: isOutflow(Number(bankTransaction.amount))
                  ? offsetBankAccount?.id ?? null
                  : bankTransaction.bankAccountId,
                subsidiaryId: bankTransaction.bankAccount.subsidiaryId,
                currencyId: bankTransaction.currencyId,
                bankFeedTransactionId: bankTransaction.id,
                journalEntryId: createdJournal.id,
              },
            })
          : null

        await tx.bankFeedTransaction.update({
          where: { id },
          data: {
            status: 'matched',
            matchedRecordType: createdTransfer ? 'bank_transfer' : 'journal_entry',
            matchedRecordId: createdTransfer?.id ?? createdJournal.id,
            matchConfidence: 100,
            suggestedMatchReason: createdTransfer
              ? `Posted bank transfer ${createdTransfer.transferNumber} to ${offsetAccount.accountNumber} - ${offsetAccount.name}`
              : `Posted ${activityLabel} journal to ${offsetAccount.accountNumber} - ${offsetAccount.name}`,
          },
        })

        if (pairedBankFeedTransactionId && createdTransfer) {
          await tx.bankFeedTransaction.update({
            where: { id: pairedBankFeedTransactionId },
            data: {
              status: 'matched',
              matchedRecordType: 'bank_transfer',
              matchedRecordId: createdTransfer.id,
              matchConfidence: 100,
              suggestedMatchReason: `Matched paired bank transfer ${createdTransfer.transferNumber}`,
            },
          })
        }

        return { journal: createdJournal, transfer: createdTransfer }
      })

      await logActivity({
        entityType: 'bank-feed-transaction',
        entityId: id,
        action: 'post',
        summary: postingResult.transfer
          ? `Posted bank feed transaction to bank transfer ${postingResult.transfer.transferNumber}`
          : `Posted bank feed transaction to journal ${postingResult.journal.number}`,
      })

      return NextResponse.json(
        postingResult.transfer
          ? {
              ...postingResult.journal,
              id: postingResult.transfer.id,
              number: postingResult.transfer.transferNumber,
              recordType: 'bank_transfer',
              journalEntryId: postingResult.journal.id,
              href: `/bank-transfers/${postingResult.transfer.id}`,
            }
          : {
              ...postingResult.journal,
              recordType: 'journal_entry',
              href: `/journals/${postingResult.journal.id}`,
            },
        { status: 201 },
      )
    }

    const matchedRecordType = text(body?.matchedRecordType)
    const matchedRecordId = text(body?.matchedRecordId)
    if (!matchedRecordType || !matchedRecordId) {
      return NextResponse.json({ error: 'Matched record type and matched record are required.' }, { status: 400 })
    }

    const bankTransaction = await prisma.bankFeedTransaction.findUnique({
      where: { id },
      select: {
        id: true,
        amount: true,
        currencyId: true,
        status: true,
      },
    })
    if (!bankTransaction) {
      return NextResponse.json({ error: 'Bank feed transaction not found.' }, { status: 404 })
    }
    if (bankTransaction.status === 'matched') {
      return NextResponse.json({ error: 'This bank feed transaction is already matched.' }, { status: 400 })
    }

    const direction = Number(bankTransaction.amount) >= 0 ? 'inflow' : 'outflow'
    if (['invoice', 'cash_receipt'].includes(matchedRecordType) && direction !== 'inflow') {
      return NextResponse.json({ error: 'Incoming bank activity can only match customer-side records.' }, { status: 400 })
    }
    if (['bill', 'bill_payment', 'bank_check'].includes(matchedRecordType) && direction !== 'outflow') {
      return NextResponse.json({ error: 'Outgoing bank activity can only match vendor-side records.' }, { status: 400 })
    }

    const matchedRecord = await findMatchedRecordForValidation(matchedRecordType, matchedRecordId)
    if (!matchedRecord) {
      return NextResponse.json({ error: 'Selected matched record does not exist.' }, { status: 400 })
    }
    if ('currencyId' in matchedRecord && matchedRecord.currencyId && matchedRecord.currencyId !== bankTransaction.currencyId) {
      return NextResponse.json({ error: 'Selected matched record currency does not match the bank transaction currency.' }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const bankFeedTransaction = await tx.bankFeedTransaction.update({
        where: { id },
        data: {
          status: 'matched',
          matchedRecordType,
          matchedRecordId,
          matchConfidence: body?.matchConfidence ? Number(body.matchConfidence) : 100,
          suggestedMatchReason: text(body?.suggestedMatchReason || 'Manual match'),
        },
      })

      if (matchedRecordType === 'cash_receipt') {
        await tx.cashReceipt.update({ where: { id: matchedRecordId }, data: { status: 'cleared' } })
      }
      if (matchedRecordType === 'bill_payment') {
        await tx.billPayment.update({ where: { id: matchedRecordId }, data: { status: 'cleared' } })
      }
      if (matchedRecordType === 'bank_check') {
        const check = await tx.bankCheck.update({
          where: { id: matchedRecordId },
          data: { status: 'cleared', bankFeedTransactionId: id },
          select: { billPaymentId: true },
        })
        if (check.billPaymentId) {
          await tx.billPayment.update({ where: { id: check.billPaymentId }, data: { status: 'cleared' } })
        }
      }

      return bankFeedTransaction
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unable to update bank feed transaction.' }, { status: 500 })
  }
}
