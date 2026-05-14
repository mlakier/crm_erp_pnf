import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateNextSubsidiaryCode } from '@/lib/subsidiary-code'

const subsidiaryInclude = {
  localCurrency: true,
  functionalCurrency: true,
  groupCurrency: true,
  parentSubsidiary: true,
  eliminationTargetParent: true,
  retainedEarningsAccount: true,
  ctaAccount: true,
  intercompanyClearingAccount: true,
  dueToAccount: true,
  dueFromAccount: true,
  investmentInSubsidiaryAccount: true,
  nciEquityAccount: true,
  nciIncomeStatementAccount: true,
  realizedFxGainAccount: true,
  realizedFxLossAccount: true,
  unrealizedFxGainAccount: true,
  unrealizedFxLossAccount: true,
}

function cleanString(value: unknown) {
  return String(value ?? '').trim() || null
}

function parseOptionalNumber(value: unknown) {
  const text = String(value ?? '').trim()
  return text ? Number(text) : null
}

function parseOptionalDate(value: unknown) {
  const text = String(value ?? '').trim()
  return text ? new Date(`${text}T00:00:00.000Z`) : null
}

function parseOptionalBoolean(value: unknown, fallback: boolean) {
  if (value === undefined) return fallback
  return String(value).trim().toLowerCase() === 'true'
}

export async function GET() {
  const data = await prisma.subsidiary.findMany({ include: subsidiaryInclude, orderBy: { subsidiaryId: 'asc' } })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body?.name ?? '').trim()
    const legalName = String(body?.legalName ?? '').trim() || null
    const entityType = String(body?.entityType ?? '').trim() || null
    const country = String(body?.country ?? '').trim() || null
    const address = String(body?.address ?? '').trim() || null
    const taxId = String(body?.taxId ?? '').trim() || null
    const registrationNumber = String(body?.registrationNumber ?? '').trim() || null
    const localCurrencyId = String(body?.localCurrencyId ?? body?.defaultCurrencyId ?? '').trim() || null
    const functionalCurrencyId = String(body?.functionalCurrencyId ?? '').trim() || null
    const groupCurrencyId = String(body?.groupCurrencyId ?? body?.reportingCurrencyId ?? '').trim() || null
    const fiscalCalendarId = cleanString(body?.fiscalCalendarId)
    const accountingStandard = cleanString(body?.accountingStandard)
    const parentSubsidiaryId = String(body?.parentSubsidiaryId ?? '').trim() || null
    const consolidationMethod = String(body?.consolidationMethod ?? '').trim() || null
    const ownershipPercent = parseOptionalNumber(body?.ownershipPercent)
    const directOwnershipPercent = parseOptionalNumber(body?.directOwnershipPercent)
    const ultimateOwnershipPercent = parseOptionalNumber(body?.ultimateOwnershipPercent)
    const ownershipEffectiveFrom = parseOptionalDate(body?.ownershipEffectiveFrom)
    const ownershipEffectiveThrough = parseOptionalDate(body?.ownershipEffectiveThrough)
    const consolidationEffectiveFrom = parseOptionalDate(body?.consolidationEffectiveFrom)
    const consolidationEffectiveThrough = parseOptionalDate(body?.consolidationEffectiveThrough)
    const controlIndicator = parseOptionalBoolean(body?.controlIndicator, true)
    const nciRequired = parseOptionalBoolean(body?.nciRequired, false)
    const eliminationTargetParentId = cleanString(body?.eliminationTargetParentId)
    const eliminationScope = cleanString(body?.eliminationScope)
    const eliminationCurrencyBasis = cleanString(body?.eliminationCurrencyBasis)
    const retainedEarningsAccountId = String(body?.retainedEarningsAccountId ?? '').trim() || null
    const ctaAccountId = String(body?.ctaAccountId ?? '').trim() || null
    const intercompanyClearingAccountId = String(body?.intercompanyClearingAccountId ?? '').trim() || null
    const dueToAccountId = String(body?.dueToAccountId ?? '').trim() || null
    const dueFromAccountId = String(body?.dueFromAccountId ?? '').trim() || null
    const investmentInSubsidiaryAccountId = cleanString(body?.investmentInSubsidiaryAccountId)
    const nciEquityAccountId = cleanString(body?.nciEquityAccountId)
    const nciIncomeStatementAccountId = cleanString(body?.nciIncomeStatementAccountId)
    const realizedFxGainAccountId = cleanString(body?.realizedFxGainAccountId)
    const realizedFxLossAccountId = cleanString(body?.realizedFxLossAccountId)
    const unrealizedFxGainAccountId = cleanString(body?.unrealizedFxGainAccountId)
    const unrealizedFxLossAccountId = cleanString(body?.unrealizedFxLossAccountId)
    const allowTransactions = parseOptionalBoolean(body?.allowTransactions, true)
    const allowBankAccounts = parseOptionalBoolean(body?.allowBankAccounts, true)
    const allowInventory = parseOptionalBoolean(body?.allowInventory, false)
    const allowPayroll = parseOptionalBoolean(body?.allowPayroll, false)
    const allowProjects = parseOptionalBoolean(body?.allowProjects, true)
    const inactive = String(body?.inactive ?? 'false').trim().toLowerCase() === 'true'
    const code = await generateNextSubsidiaryCode()

    if (!name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }

    const created = await prisma.subsidiary.create({
      data: {
        subsidiaryId: code,
        name,
        legalName,
        entityType,
        country,
        address,
        taxId,
        registrationNumber,
        localCurrencyId,
        functionalCurrencyId,
        groupCurrencyId,
        fiscalCalendarId,
        accountingStandard,
        parentSubsidiaryId,
        consolidationMethod,
        ownershipPercent,
        directOwnershipPercent,
        ultimateOwnershipPercent,
        ownershipEffectiveFrom,
        ownershipEffectiveThrough,
        consolidationEffectiveFrom,
        consolidationEffectiveThrough,
        controlIndicator,
        nciRequired,
        eliminationTargetParentId,
        eliminationScope,
        eliminationCurrencyBasis,
        retainedEarningsAccountId,
        ctaAccountId,
        intercompanyClearingAccountId,
        dueToAccountId,
        dueFromAccountId,
        investmentInSubsidiaryAccountId,
        nciEquityAccountId,
        nciIncomeStatementAccountId,
        realizedFxGainAccountId,
        realizedFxLossAccountId,
        unrealizedFxGainAccountId,
        unrealizedFxLossAccountId,
        allowTransactions,
        allowBankAccounts,
        allowInventory,
        allowPayroll,
        allowProjects,
        active: !inactive,
      },
      include: subsidiaryInclude,
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return NextResponse.json({ error: `Unable to create subsidiary: ${message}` }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const body = await request.json()
    const code = body?.code !== undefined ? String(body.code).trim().toUpperCase() : (body?.subsidiaryId !== undefined ? String(body.subsidiaryId).trim().toUpperCase() : undefined)
    const name = body?.name !== undefined ? String(body.name).trim() : undefined
    const legalName = body?.legalName !== undefined ? (String(body.legalName).trim() || null) : undefined
    const entityType = body?.entityType !== undefined ? (String(body.entityType).trim() || null) : undefined
    const country = body?.country !== undefined ? (String(body.country).trim() || null) : undefined
    const address = body?.address !== undefined ? (String(body.address).trim() || null) : undefined
    const localCurrencyId = body?.localCurrencyId !== undefined
      ? (String(body.localCurrencyId).trim() || null)
      : body?.defaultCurrencyId !== undefined
      ? (String(body.defaultCurrencyId).trim() || null)
      : undefined
    const functionalCurrencyId = body?.functionalCurrencyId !== undefined ? (String(body.functionalCurrencyId).trim() || null) : undefined
    const groupCurrencyId = body?.groupCurrencyId !== undefined
      ? (String(body.groupCurrencyId).trim() || null)
      : body?.reportingCurrencyId !== undefined
      ? (String(body.reportingCurrencyId).trim() || null)
      : undefined
    const parentSubsidiaryId = body?.parentSubsidiaryId !== undefined ? (String(body.parentSubsidiaryId).trim() || null) : undefined
    const fiscalCalendarId = body?.fiscalCalendarId !== undefined ? cleanString(body.fiscalCalendarId) : undefined
    const accountingStandard = body?.accountingStandard !== undefined ? cleanString(body.accountingStandard) : undefined
    const taxId = body?.taxId !== undefined ? (String(body.taxId).trim() || null) : undefined
    const registrationNumber = body?.registrationNumber !== undefined ? (String(body.registrationNumber).trim() || null) : undefined
    const consolidationMethod = body?.consolidationMethod !== undefined ? (String(body.consolidationMethod).trim() || null) : undefined
    const ownershipPercent = body?.ownershipPercent !== undefined ? parseOptionalNumber(body.ownershipPercent) : undefined
    const directOwnershipPercent = body?.directOwnershipPercent !== undefined ? parseOptionalNumber(body.directOwnershipPercent) : undefined
    const ultimateOwnershipPercent = body?.ultimateOwnershipPercent !== undefined ? parseOptionalNumber(body.ultimateOwnershipPercent) : undefined
    const ownershipEffectiveFrom = body?.ownershipEffectiveFrom !== undefined ? parseOptionalDate(body.ownershipEffectiveFrom) : undefined
    const ownershipEffectiveThrough = body?.ownershipEffectiveThrough !== undefined ? parseOptionalDate(body.ownershipEffectiveThrough) : undefined
    const consolidationEffectiveFrom = body?.consolidationEffectiveFrom !== undefined ? parseOptionalDate(body.consolidationEffectiveFrom) : undefined
    const consolidationEffectiveThrough = body?.consolidationEffectiveThrough !== undefined ? parseOptionalDate(body.consolidationEffectiveThrough) : undefined
    const controlIndicator = body?.controlIndicator !== undefined ? parseOptionalBoolean(body.controlIndicator, true) : undefined
    const nciRequired = body?.nciRequired !== undefined ? parseOptionalBoolean(body.nciRequired, false) : undefined
    const eliminationTargetParentId = body?.eliminationTargetParentId !== undefined ? cleanString(body.eliminationTargetParentId) : undefined
    const eliminationScope = body?.eliminationScope !== undefined ? cleanString(body.eliminationScope) : undefined
    const eliminationCurrencyBasis = body?.eliminationCurrencyBasis !== undefined ? cleanString(body.eliminationCurrencyBasis) : undefined
    const retainedEarningsAccountId = body?.retainedEarningsAccountId !== undefined ? (String(body.retainedEarningsAccountId).trim() || null) : undefined
    const ctaAccountId = body?.ctaAccountId !== undefined ? (String(body.ctaAccountId).trim() || null) : undefined
    const intercompanyClearingAccountId = body?.intercompanyClearingAccountId !== undefined ? (String(body.intercompanyClearingAccountId).trim() || null) : undefined
    const dueToAccountId = body?.dueToAccountId !== undefined ? (String(body.dueToAccountId).trim() || null) : undefined
    const dueFromAccountId = body?.dueFromAccountId !== undefined ? (String(body.dueFromAccountId).trim() || null) : undefined
    const investmentInSubsidiaryAccountId = body?.investmentInSubsidiaryAccountId !== undefined ? cleanString(body.investmentInSubsidiaryAccountId) : undefined
    const nciEquityAccountId = body?.nciEquityAccountId !== undefined ? cleanString(body.nciEquityAccountId) : undefined
    const nciIncomeStatementAccountId = body?.nciIncomeStatementAccountId !== undefined ? cleanString(body.nciIncomeStatementAccountId) : undefined
    const realizedFxGainAccountId = body?.realizedFxGainAccountId !== undefined ? cleanString(body.realizedFxGainAccountId) : undefined
    const realizedFxLossAccountId = body?.realizedFxLossAccountId !== undefined ? cleanString(body.realizedFxLossAccountId) : undefined
    const unrealizedFxGainAccountId = body?.unrealizedFxGainAccountId !== undefined ? cleanString(body.unrealizedFxGainAccountId) : undefined
    const unrealizedFxLossAccountId = body?.unrealizedFxLossAccountId !== undefined ? cleanString(body.unrealizedFxLossAccountId) : undefined
    const allowTransactions = body?.allowTransactions !== undefined ? parseOptionalBoolean(body.allowTransactions, true) : undefined
    const allowBankAccounts = body?.allowBankAccounts !== undefined ? parseOptionalBoolean(body.allowBankAccounts, true) : undefined
    const allowInventory = body?.allowInventory !== undefined ? parseOptionalBoolean(body.allowInventory, false) : undefined
    const allowPayroll = body?.allowPayroll !== undefined ? parseOptionalBoolean(body.allowPayroll, false) : undefined
    const allowProjects = body?.allowProjects !== undefined ? parseOptionalBoolean(body.allowProjects, true) : undefined
    const inactive = body?.inactive !== undefined
      ? String(body.inactive).trim().toLowerCase() === 'true'
      : undefined
    const active = inactive !== undefined
      ? !inactive
      : body?.active !== undefined
        ? String(body.active).trim().toLowerCase() === 'true'
        : undefined

    if (parentSubsidiaryId !== undefined && parentSubsidiaryId === id) {
      return NextResponse.json({ error: 'A subsidiary cannot be its own parent.' }, { status: 400 })
    }
    if (eliminationTargetParentId !== undefined && eliminationTargetParentId === id) {
      return NextResponse.json({ error: 'A subsidiary cannot target itself for eliminations.' }, { status: 400 })
    }

    const updated = await prisma.subsidiary.update({
      where: { id },
      data: Object.fromEntries(
        Object.entries({ subsidiaryId: code, name, legalName, entityType, country, address, localCurrencyId, functionalCurrencyId, groupCurrencyId, fiscalCalendarId, accountingStandard, parentSubsidiaryId, taxId, registrationNumber, consolidationMethod, ownershipPercent, directOwnershipPercent, ultimateOwnershipPercent, ownershipEffectiveFrom, ownershipEffectiveThrough, consolidationEffectiveFrom, consolidationEffectiveThrough, controlIndicator, nciRequired, eliminationTargetParentId, eliminationScope, eliminationCurrencyBasis, retainedEarningsAccountId, ctaAccountId, intercompanyClearingAccountId, dueToAccountId, dueFromAccountId, investmentInSubsidiaryAccountId, nciEquityAccountId, nciIncomeStatementAccountId, realizedFxGainAccountId, realizedFxLossAccountId, unrealizedFxGainAccountId, unrealizedFxLossAccountId, allowTransactions, allowBankAccounts, allowInventory, allowPayroll, allowProjects, active }).filter(([, v]) => v !== undefined)
      ),
      include: subsidiaryInclude,
    })
    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return NextResponse.json({ error: `Unable to update subsidiary: ${message}` }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await prisma.subsidiary.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return NextResponse.json({ error: `Unable to delete subsidiary: ${message}` }, { status: 500 })
  }
}
