import { NextResponse } from 'next/server'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { generateNextBankTransactionId } from '@/lib/banking-number'

export const runtime = 'nodejs'

type ImportError = { row: number; message: string }

function normalizeKey(value: string): string {
  return value
    .trim()
    .replace(/\s*\((required|optional)\)\s*$/i, '')
    .replace(/\s*\*\s*$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function getRowText(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeKey(key)]
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim()
  }
  return ''
}

function parseRows(fileName: string, bytes: ArrayBuffer): Array<Record<string, string>> {
  const lowerName = fileName.toLowerCase()
  if (lowerName.endsWith('.xlsx')) {
    const workbook = XLSX.read(bytes, { type: 'array' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' })
    return rows.map((row) => {
      const output: Record<string, string> = {}
      Object.entries(row).forEach(([key, value]) => {
        output[normalizeKey(key)] = String(value ?? '').trim()
      })
      return output
    })
  }

  const parsed = Papa.parse<Record<string, string>>(Buffer.from(bytes).toString('utf8'), {
    header: true,
    skipEmptyLines: true,
  })
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((error) => error.message).join('; '))
  }
  return (parsed.data ?? []).map((row) => {
    const output: Record<string, string> = {}
    Object.entries(row).forEach(([key, value]) => {
      output[normalizeKey(key)] = String(value ?? '').trim()
    })
    return output
  })
}

function parseDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseAmount(value: string) {
  const normalized = value.replace(/[$,\s]/g, '')
  const negativeParentheses = /^\(.+\)$/.test(normalized)
  const number = Number(normalized.replace(/[()]/g, ''))
  if (!Number.isFinite(number)) return null
  return negativeParentheses ? -number : number
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const bankAccountId = String(formData.get('bankAccountId') ?? '').trim()
    const dryRun = String(formData.get('dryRun') ?? 'true').toLowerCase() !== 'false'
    const file = formData.get('file')

    if (!bankAccountId) return NextResponse.json({ error: 'Bank account is required.' }, { status: 400 })
    if (!(file instanceof File)) return NextResponse.json({ error: 'CSV or XLSX file is required.' }, { status: 400 })

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      include: { currency: true, connection: true },
    })
    if (!bankAccount) return NextResponse.json({ error: 'Bank account was not found.' }, { status: 400 })

    const rows = parseRows(file.name, await file.arrayBuffer())
    const errors: ImportError[] = []
    let succeeded = 0

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2
      const transactionDateRaw = getRowText(row, 'transactionDate', 'date', 'transaction date')
      const description = getRowText(row, 'description', 'memo', 'details', 'name')
      const amountRaw = getRowText(row, 'amount', 'transaction amount')
      const transactionDate = parseDate(transactionDateRaw)
      const amount = parseAmount(amountRaw)
      const currencyCode = getRowText(row, 'currency', 'currencyCode') || bankAccount.currency.code

      if (!transactionDate) {
        errors.push({ row: rowNumber, message: 'transactionDate/date is required and must be a valid date.' })
        continue
      }
      if (!description) {
        errors.push({ row: rowNumber, message: 'description is required.' })
        continue
      }
      if (amount === null) {
        errors.push({ row: rowNumber, message: 'amount is required and must be numeric.' })
        continue
      }
      if (currencyCode.toUpperCase() !== bankAccount.currency.code.toUpperCase()) {
        errors.push({ row: rowNumber, message: `currency must match the bank account currency (${bankAccount.currency.code}).` })
        continue
      }

      if (!dryRun) {
        const externalId = getRowText(row, 'externalId', 'bankReference', 'reference', 'id') || null
        const duplicate = externalId
          ? await prisma.bankFeedTransaction.findFirst({
              where: { bankAccountId, externalId },
              select: { id: true },
            })
          : null
        if (duplicate) {
          errors.push({ row: rowNumber, message: `duplicate external/reference id: ${externalId}` })
          continue
        }

        await prisma.bankFeedTransaction.create({
          data: {
            bankTransactionId: await generateNextBankTransactionId(),
            bankAccountId,
            connectionId: bankAccount.connectionId,
            externalId,
            transactionDate,
            postedDate: parseDate(getRowText(row, 'postedDate', 'posted date')),
            description,
            counterparty: getRowText(row, 'counterparty', 'payee', 'payer') || null,
            amount,
            currencyId: bankAccount.currencyId,
            direction: getRowText(row, 'direction') || (amount < 0 ? 'outflow' : 'inflow'),
            status: 'unmatched',
            suggestedMatchReason: getRowText(row, 'suggestedMatchReason', 'match reason') || null,
          },
        })
      }

      succeeded += 1
    }

    return NextResponse.json({
      bankAccountId,
      dryRun,
      totalRows: rows.length,
      succeeded,
      failed: errors.length,
      errors,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to import bank activity.' }, { status: 500 })
  }
}
