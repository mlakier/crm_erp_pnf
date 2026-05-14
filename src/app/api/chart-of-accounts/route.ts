import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { generateNextChartOfAccountId } from '@/lib/chart-of-account-id'
import { deriveAccountRole, deriveRollforwardCategory } from '@/lib/chart-of-accounts-classification'
import {
  deriveGlAccountCategoryDefaults,
  deriveSuggestedMonetaryClassification,
  deriveSuggestedTranslationTreatment,
  getGlAccountingPolicyWarnings,
  normalizeMonetaryClassification,
  normalizeTranslationTreatment,
} from '@/lib/gl-account-accounting-policy'

type ScopeMode = 'selected' | 'parent'

const INCLUDE = {
  parentSubsidiary: { select: { id: true, subsidiaryId: true, name: true } },
  parentAccount: { select: { id: true, accountId: true, name: true } },
  closeToAccount: { select: { id: true, accountId: true, name: true } },
  subsidiaryAssignments: {
    include: {
      subsidiary: { select: { id: true, subsidiaryId: true, name: true, parentSubsidiaryId: true } },
    },
    orderBy: { subsidiary: { subsidiaryId: 'asc' as const } },
  },
} as const

function parseBool(value: unknown) {
  return value === true || value === 'true'
}

function isAdminRole(role: string | null | undefined) {
  return (role ?? '').trim().toLowerCase().includes('admin')
}

function parseIds(value: unknown) {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => String(entry ?? '').trim())
    .filter(Boolean)
}

function parseOptionalDecimal(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const numeric = Number(text)
  return Number.isFinite(numeric) ? text : null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const account = await prisma.chartOfAccounts.findUnique({
        where: { id },
        include: INCLUDE,
      })
      if (!account) {
        return NextResponse.json({ error: 'Chart account not found' }, { status: 404 })
      }
      return NextResponse.json(account)
    }

    const accounts = await prisma.chartOfAccounts.findMany({
      include: INCLUDE,
      orderBy: [{ accountId: 'asc' }],
    })

    return NextResponse.json(accounts)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chart of accounts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const providedAccountId = String(body?.accountId ?? '').trim()
    const accountNumber = String(body?.accountNumber ?? '').trim()
    const name = String(body?.name ?? '').trim()
    const description = String(body?.description ?? '').trim() || null
    const accountType = String(body?.accountType ?? '').trim()
    const category = String(body?.category ?? '').trim() || null

    const categoryDefaults = deriveGlAccountCategoryDefaults({ accountType, category })
    const inventory = body?.inventory !== undefined ? parseBool(body?.inventory) : categoryDefaults?.inventory ?? false
    const revalueOpenBalance = categoryDefaults?.revalueOpenBalance ?? parseBool(body?.revalueOpenBalance)
    const providedMonetaryClassification = normalizeMonetaryClassification(body?.monetaryClassification)
    const providedTranslationTreatment = normalizeTranslationTreatment(body?.translationTreatment)
    const eliminateIntercoTransactions = parseBool(body?.eliminateIntercoTransactions)
    const summary = parseBool(body?.summary)
    const normalBalance = String(body?.normalBalance ?? '').trim() || (categoryDefaults?.normalBalance ?? null)
    const financialStatementSection = String(body?.financialStatementSection ?? '').trim() || (categoryDefaults?.financialStatementSection ?? null)
    const financialStatementGroup = String(body?.financialStatementGroup ?? '').trim() || (categoryDefaults?.financialStatementGroup ?? null)
    const financialStatementCategory = String(body?.financialStatementCategory ?? '').trim() || (categoryDefaults?.financialStatementCategory ?? null)
    const accountRole = String(body?.accountRole ?? '').trim() || (categoryDefaults?.accountRole ?? null)
    const rollforwardCategory = String(body?.rollforwardCategory ?? '').trim() || (categoryDefaults?.rollforwardCategory ?? null)
    const isPosting = body?.isPosting !== undefined ? parseBool(body?.isPosting) : !summary
    const isControlAccount = body?.isControlAccount !== undefined ? parseBool(body?.isControlAccount) : categoryDefaults?.isControlAccount ?? false
    const allowsManualPosting = body?.allowsManualPosting !== undefined ? parseBool(body?.allowsManualPosting) : categoryDefaults?.allowsManualPosting ?? !isControlAccount
    const requiresSubledgerType = String(body?.requiresSubledgerType ?? '').trim() || (categoryDefaults?.requiresSubledgerType ?? null)
    const cashFlowCategory = String(body?.cashFlowCategory ?? '').trim() || (categoryDefaults?.cashFlowCategory ?? null)
    const requiresMonthlyReconciliation = body?.requiresMonthlyReconciliation !== undefined ? parseBool(body.requiresMonthlyReconciliation) : categoryDefaults?.requiresMonthlyReconciliation ?? false
    const reconciliationType = String(body?.reconciliationType ?? '').trim() || (categoryDefaults?.reconciliationType ?? null)
    const closeReviewOwnerId = String(body?.closeReviewOwnerId ?? '').trim() || null
    const closeReviewFrequency = String(body?.closeReviewFrequency ?? '').trim() || (categoryDefaults?.closeReviewFrequency ?? null)
    const aiReviewEnabled = body?.aiReviewEnabled !== undefined ? parseBool(body.aiReviewEnabled) : categoryDefaults?.aiReviewEnabled ?? false
    const aiRiskLevel = String(body?.aiRiskLevel ?? '').trim() || (categoryDefaults?.aiRiskLevel ?? null)
    const autoMatchStrategy = String(body?.autoMatchStrategy ?? '').trim() || (categoryDefaults?.autoMatchStrategy ?? null)
    const materialityThreshold = parseOptionalDecimal(body?.materialityThreshold) ?? categoryDefaults?.materialityThreshold
    const agingReviewRequired = body?.agingReviewRequired !== undefined ? parseBool(body.agingReviewRequired) : categoryDefaults?.agingReviewRequired ?? false
    const reserveReviewRequired = body?.reserveReviewRequired !== undefined ? parseBool(body.reserveReviewRequired) : categoryDefaults?.reserveReviewRequired ?? false
    const writeOffReviewRequired = body?.writeOffReviewRequired !== undefined ? parseBool(body.writeOffReviewRequired) : categoryDefaults?.writeOffReviewRequired ?? false
    const waterfallReviewRequired = body?.waterfallReviewRequired !== undefined ? parseBool(body.waterfallReviewRequired) : categoryDefaults?.waterfallReviewRequired ?? false
    const taxSensitive = body?.taxSensitive !== undefined ? parseBool(body.taxSensitive) : categoryDefaults?.taxSensitive ?? false
    const intercompanyAccount = body?.intercompanyAccount !== undefined ? parseBool(body.intercompanyAccount) : categoryDefaults?.intercompanyAccount ?? false
    const eliminationAccount = body?.eliminationAccount !== undefined ? parseBool(body.eliminationAccount) : categoryDefaults?.eliminationAccount ?? false
    const bankAccountRequired = body?.bankAccountRequired !== undefined ? parseBool(body.bankAccountRequired) : categoryDefaults?.bankAccountRequired ?? false
    const inventoryCostLayerAccount = body?.inventoryCostLayerAccount !== undefined ? parseBool(body.inventoryCostLayerAccount) : categoryDefaults?.inventoryCostLayerAccount ?? false
    const revenueRecognitionAccount = body?.revenueRecognitionAccount !== undefined ? parseBool(body.revenueRecognitionAccount) : categoryDefaults?.revenueRecognitionAccount ?? false
    const deferredCostAccount = body?.deferredCostAccount !== undefined ? parseBool(body.deferredCostAccount) : categoryDefaults?.deferredCostAccount ?? false
    const fixedAssetAccount = body?.fixedAssetAccount !== undefined ? parseBool(body.fixedAssetAccount) : categoryDefaults?.fixedAssetAccount ?? false
    const prepaidAccount = body?.prepaidAccount !== undefined ? parseBool(body.prepaidAccount) : categoryDefaults?.prepaidAccount ?? false
    const accrualAccount = body?.accrualAccount !== undefined ? parseBool(body.accrualAccount) : categoryDefaults?.accrualAccount ?? false
    const clearingAccount = body?.clearingAccount !== undefined ? parseBool(body.clearingAccount) : categoryDefaults?.clearingAccount ?? false
    const suspenseAccount = body?.suspenseAccount !== undefined ? parseBool(body.suspenseAccount) : categoryDefaults?.suspenseAccount ?? false
    const parentAccountId = String(body?.parentAccountId ?? '').trim() || null
    const closeToAccountId = String(body?.closeToAccountId ?? '').trim() || null

    const scopeMode = String(body?.scopeMode ?? 'selected').trim() as ScopeMode
    const parentSubsidiaryId = String(body?.parentSubsidiaryId ?? '').trim() || null
    const includeChildren = parseBool(body?.includeChildren)
    const subsidiaryIds = parseIds(body?.subsidiaryIds)

    if (!accountNumber || !name || !accountType) {
      return NextResponse.json({ error: 'Account Number, Name, and Account Type are required' }, { status: 400 })
    }

    if (scopeMode === 'parent' && !parentSubsidiaryId) {
      return NextResponse.json({ error: 'Parent subsidiary is required for parent scope mode' }, { status: 400 })
    }

    if (scopeMode === 'selected' && subsidiaryIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one subsidiary or switch to parent scope mode' }, { status: 400 })
    }

    const accountId = providedAccountId || await generateNextChartOfAccountId()
    const parentAccount = parentAccountId
      ? await prisma.chartOfAccounts.findUnique({
          where: { id: parentAccountId },
          select: {
            accountId: true,
            accountNumber: true,
            name: true,
            category: true,
          },
        })
      : null
    const resolvedRollforwardCategory = rollforwardCategory ?? deriveRollforwardCategory({
      accountId,
      accountNumber,
      name,
      accountType,
      financialStatementCategory,
      parentAccountId: parentAccount?.accountId ?? null,
      parentAccountNumber: parentAccount?.accountNumber ?? null,
      parentAccountName: parentAccount?.name ?? null,
      parentAccountCategory: parentAccount?.category ?? null,
    })
    const resolvedAccountRole = accountRole ?? deriveAccountRole({
      accountId,
      accountNumber,
      name,
      accountType,
      financialStatementCategory,
      rollforwardCategory: resolvedRollforwardCategory,
      parentAccountId: parentAccount?.accountId ?? null,
      parentAccountNumber: parentAccount?.accountNumber ?? null,
      parentAccountName: parentAccount?.name ?? null,
      parentAccountCategory: parentAccount?.category ?? null,
    })
    const monetaryClassification = categoryDefaults?.monetaryClassification ?? providedMonetaryClassification ?? deriveSuggestedMonetaryClassification({
      accountType,
      name,
      financialStatementCategory,
      accountRole: resolvedAccountRole,
      rollforwardCategory: resolvedRollforwardCategory,
      inventory,
      revalueOpenBalance,
      isPosting,
      summary,
    })
    const translationTreatment = categoryDefaults?.translationTreatment ?? providedTranslationTreatment ?? deriveSuggestedTranslationTreatment({
      accountType,
      name,
      financialStatementCategory,
      accountRole: resolvedAccountRole,
      rollforwardCategory: resolvedRollforwardCategory,
      inventory,
      isPosting,
      summary,
    })
    const policyErrors = getGlAccountingPolicyWarnings({
      accountType,
      name,
      financialStatementCategory,
      accountRole: resolvedAccountRole,
      rollforwardCategory: resolvedRollforwardCategory,
      inventory,
      revalueOpenBalance,
      monetaryClassification,
      translationTreatment,
      isPosting,
      summary,
    }).filter((warning) => warning.severity === 'error')
    if (policyErrors.length > 0) {
      return NextResponse.json({ error: policyErrors.map((warning) => warning.message).join(' ') }, { status: 400 })
    }

    const created = await prisma.chartOfAccounts.create({
      data: {
        accountId,
        accountNumber,
        name,
        description,
        accountType,
        category,
        inventory,
        revalueOpenBalance,
        monetaryClassification,
        translationTreatment,
        eliminateIntercoTransactions,
        summary,
        normalBalance,
        financialStatementSection,
        financialStatementGroup,
        financialStatementCategory,
        accountRole: resolvedAccountRole,
        rollforwardCategory: resolvedRollforwardCategory,
        isPosting,
        isControlAccount,
        allowsManualPosting,
        requiresSubledgerType,
        cashFlowCategory,
        requiresMonthlyReconciliation,
        reconciliationType,
        closeReviewOwnerId,
        closeReviewFrequency,
        aiReviewEnabled,
        aiRiskLevel,
        autoMatchStrategy,
        materialityThreshold,
        agingReviewRequired,
        reserveReviewRequired,
        writeOffReviewRequired,
        waterfallReviewRequired,
        taxSensitive,
        intercompanyAccount,
        eliminationAccount,
        bankAccountRequired,
        inventoryCostLayerAccount,
        revenueRecognitionAccount,
        deferredCostAccount,
        fixedAssetAccount,
        prepaidAccount,
        accrualAccount,
        clearingAccount,
        suspenseAccount,
        parentAccountId,
        closeToAccountId,
        parentSubsidiaryId: scopeMode === 'parent' ? parentSubsidiaryId : null,
        includeChildren,
        subsidiaryAssignments: scopeMode === 'selected'
          ? {
              create: subsidiaryIds.map((subsidiaryId) => ({ subsidiaryId })),
            }
          : undefined,
      },
      include: INCLUDE,
    })

    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create chart account' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await request.json()
    if (parseBool(body?.inlineEdit)) {
      const session = await getServerSession(authOptions)
      if (!isAdminRole(session?.user?.role)) {
        return NextResponse.json({ error: 'Only administrators can use inline chart account editing.' }, { status: 403 })
      }
    }

    const accountId = body?.accountId !== undefined ? String(body.accountId).trim() : undefined
    const accountNumber = body?.accountNumber !== undefined ? String(body.accountNumber).trim() : undefined
    const name = body?.name !== undefined ? String(body.name).trim() : undefined
    const description = body?.description !== undefined ? (String(body.description).trim() || null) : undefined
    const accountType = body?.accountType !== undefined ? String(body.accountType).trim() : undefined
    const category = body?.category !== undefined ? (String(body.category).trim() || null) : undefined

    const inventory = body?.inventory !== undefined ? parseBool(body.inventory) : undefined
    const allowAccountingPolicyOverride = parseBool(body?.allowAccountingPolicyOverride)
    const revalueOpenBalance = allowAccountingPolicyOverride && body?.revalueOpenBalance !== undefined ? parseBool(body.revalueOpenBalance) : undefined
    const monetaryClassification = allowAccountingPolicyOverride && body?.monetaryClassification !== undefined ? normalizeMonetaryClassification(body.monetaryClassification) : undefined
    const translationTreatment = allowAccountingPolicyOverride && body?.translationTreatment !== undefined ? normalizeTranslationTreatment(body.translationTreatment) : undefined
    const eliminateIntercoTransactions = body?.eliminateIntercoTransactions !== undefined ? parseBool(body.eliminateIntercoTransactions) : undefined
    const summary = body?.summary !== undefined ? parseBool(body.summary) : undefined
    const active = body?.active !== undefined ? parseBool(body.active) : undefined
    const normalBalance = body?.normalBalance !== undefined ? (String(body.normalBalance).trim() || null) : undefined
    const financialStatementSection = body?.financialStatementSection !== undefined ? (String(body.financialStatementSection).trim() || null) : undefined
    const financialStatementGroup = body?.financialStatementGroup !== undefined ? (String(body.financialStatementGroup).trim() || null) : undefined
    const financialStatementCategory = body?.financialStatementCategory !== undefined ? (String(body.financialStatementCategory).trim() || null) : undefined
    const accountRole = body?.accountRole !== undefined ? (String(body.accountRole).trim() || null) : undefined
    const rollforwardCategory = body?.rollforwardCategory !== undefined ? (String(body.rollforwardCategory).trim() || null) : undefined
    const isPosting = body?.isPosting !== undefined ? parseBool(body.isPosting) : undefined
    const isControlAccount = body?.isControlAccount !== undefined ? parseBool(body.isControlAccount) : undefined
    const allowsManualPosting = body?.allowsManualPosting !== undefined ? parseBool(body.allowsManualPosting) : undefined
    const requiresSubledgerType = body?.requiresSubledgerType !== undefined ? (String(body.requiresSubledgerType).trim() || null) : undefined
    const cashFlowCategory = body?.cashFlowCategory !== undefined ? (String(body.cashFlowCategory).trim() || null) : undefined
    const requiresMonthlyReconciliation = body?.requiresMonthlyReconciliation !== undefined ? parseBool(body.requiresMonthlyReconciliation) : undefined
    const reconciliationType = body?.reconciliationType !== undefined ? (String(body.reconciliationType).trim() || null) : undefined
    const closeReviewOwnerId = body?.closeReviewOwnerId !== undefined ? (String(body.closeReviewOwnerId).trim() || null) : undefined
    const closeReviewFrequency = body?.closeReviewFrequency !== undefined ? (String(body.closeReviewFrequency).trim() || null) : undefined
    const aiReviewEnabled = body?.aiReviewEnabled !== undefined ? parseBool(body.aiReviewEnabled) : undefined
    const aiRiskLevel = body?.aiRiskLevel !== undefined ? (String(body.aiRiskLevel).trim() || null) : undefined
    const autoMatchStrategy = body?.autoMatchStrategy !== undefined ? (String(body.autoMatchStrategy).trim() || null) : undefined
    const materialityThreshold = body?.materialityThreshold !== undefined ? parseOptionalDecimal(body.materialityThreshold) : undefined
    const agingReviewRequired = body?.agingReviewRequired !== undefined ? parseBool(body.agingReviewRequired) : undefined
    const reserveReviewRequired = body?.reserveReviewRequired !== undefined ? parseBool(body.reserveReviewRequired) : undefined
    const writeOffReviewRequired = body?.writeOffReviewRequired !== undefined ? parseBool(body.writeOffReviewRequired) : undefined
    const waterfallReviewRequired = body?.waterfallReviewRequired !== undefined ? parseBool(body.waterfallReviewRequired) : undefined
    const taxSensitive = body?.taxSensitive !== undefined ? parseBool(body.taxSensitive) : undefined
    const intercompanyAccount = body?.intercompanyAccount !== undefined ? parseBool(body.intercompanyAccount) : undefined
    const eliminationAccount = body?.eliminationAccount !== undefined ? parseBool(body.eliminationAccount) : undefined
    const bankAccountRequired = body?.bankAccountRequired !== undefined ? parseBool(body.bankAccountRequired) : undefined
    const inventoryCostLayerAccount = body?.inventoryCostLayerAccount !== undefined ? parseBool(body.inventoryCostLayerAccount) : undefined
    const revenueRecognitionAccount = body?.revenueRecognitionAccount !== undefined ? parseBool(body.revenueRecognitionAccount) : undefined
    const deferredCostAccount = body?.deferredCostAccount !== undefined ? parseBool(body.deferredCostAccount) : undefined
    const fixedAssetAccount = body?.fixedAssetAccount !== undefined ? parseBool(body.fixedAssetAccount) : undefined
    const prepaidAccount = body?.prepaidAccount !== undefined ? parseBool(body.prepaidAccount) : undefined
    const accrualAccount = body?.accrualAccount !== undefined ? parseBool(body.accrualAccount) : undefined
    const clearingAccount = body?.clearingAccount !== undefined ? parseBool(body.clearingAccount) : undefined
    const suspenseAccount = body?.suspenseAccount !== undefined ? parseBool(body.suspenseAccount) : undefined
    const parentAccountId = body?.parentAccountId !== undefined ? (String(body.parentAccountId).trim() || null) : undefined
    const closeToAccountId = body?.closeToAccountId !== undefined ? (String(body.closeToAccountId).trim() || null) : undefined

    const scopeMode = body?.scopeMode !== undefined ? String(body.scopeMode).trim() as ScopeMode : undefined
    const parentSubsidiaryId = body?.parentSubsidiaryId !== undefined ? (String(body.parentSubsidiaryId).trim() || null) : undefined
    const includeChildren = body?.includeChildren !== undefined ? parseBool(body.includeChildren) : undefined
    const subsidiaryIds = body?.subsidiaryIds !== undefined ? parseIds(body.subsidiaryIds) : undefined

    if (accountId !== undefined && !accountId) {
      return NextResponse.json({ error: 'Account Id cannot be empty' }, { status: 400 })
    }
    if (accountNumber !== undefined && !accountNumber) {
      return NextResponse.json({ error: 'Account Number cannot be empty' }, { status: 400 })
    }
    if (name !== undefined && !name) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }
    if (accountType !== undefined && !accountType) {
      return NextResponse.json({ error: 'Account Type cannot be empty' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.chartOfAccounts.findUnique({
        where: { id },
        select: {
          id: true,
          accountId: true,
          accountNumber: true,
          name: true,
          accountType: true,
          category: true,
          normalBalance: true,
          financialStatementSection: true,
          financialStatementGroup: true,
          financialStatementCategory: true,
          accountRole: true,
          rollforwardCategory: true,
          inventory: true,
          revalueOpenBalance: true,
          monetaryClassification: true,
          translationTreatment: true,
          requiresSubledgerType: true,
          cashFlowCategory: true,
          requiresMonthlyReconciliation: true,
          reconciliationType: true,
          closeReviewOwnerId: true,
          closeReviewFrequency: true,
          aiReviewEnabled: true,
          aiRiskLevel: true,
          autoMatchStrategy: true,
          materialityThreshold: true,
          agingReviewRequired: true,
          reserveReviewRequired: true,
          writeOffReviewRequired: true,
          waterfallReviewRequired: true,
          taxSensitive: true,
          intercompanyAccount: true,
          eliminationAccount: true,
          bankAccountRequired: true,
          inventoryCostLayerAccount: true,
          revenueRecognitionAccount: true,
          deferredCostAccount: true,
          fixedAssetAccount: true,
          prepaidAccount: true,
          accrualAccount: true,
          clearingAccount: true,
          suspenseAccount: true,
          isPosting: true,
          summary: true,
          parentAccountId: true,
          parentAccount: {
            select: {
              accountId: true,
              accountNumber: true,
              name: true,
              category: true,
            },
          },
        },
      })
      if (!existing) {
        throw new Error('Chart account not found')
      }

      const resolvedParentAccountId =
        parentAccountId !== undefined
          ? parentAccountId
          : existing.parentAccountId

      const resolvedParentAccount = resolvedParentAccountId
        ? await tx.chartOfAccounts.findUnique({
            where: { id: resolvedParentAccountId },
            select: {
              accountId: true,
              accountNumber: true,
              name: true,
              category: true,
            },
          })
        : null
      const resolvedCategory = category !== undefined ? category : existing.category
      const categoryDefaults = deriveGlAccountCategoryDefaults({
        accountType: accountType ?? existing.accountType,
        category: resolvedCategory,
      })
      const resolvedFinancialStatementCategory =
        financialStatementCategory !== undefined
          ? financialStatementCategory
          : existing.financialStatementCategory ?? categoryDefaults?.financialStatementCategory ?? null

      const resolvedRollforwardCategory =
        rollforwardCategory !== undefined
          ? rollforwardCategory
          : existing.rollforwardCategory
            ?? categoryDefaults?.rollforwardCategory
            ?? deriveRollforwardCategory({
                accountId: accountId ?? existing.accountId,
                accountNumber: accountNumber ?? existing.accountNumber,
                name: name ?? existing.name,
                accountType: accountType ?? existing.accountType,
                financialStatementCategory: resolvedFinancialStatementCategory,
                parentAccountId: resolvedParentAccount?.accountId ?? null,
                parentAccountNumber: resolvedParentAccount?.accountNumber ?? null,
                parentAccountName: resolvedParentAccount?.name ?? null,
                parentAccountCategory: resolvedParentAccount?.category ?? null,
              })
      const resolvedAccountRole =
        accountRole !== undefined
          ? accountRole
          : existing.accountRole
            ?? categoryDefaults?.accountRole
            ?? deriveAccountRole({
                accountId: accountId ?? existing.accountId,
                accountNumber: accountNumber ?? existing.accountNumber,
                name: name ?? existing.name,
                accountType: accountType ?? existing.accountType,
                financialStatementCategory: resolvedFinancialStatementCategory,
                rollforwardCategory: resolvedRollforwardCategory,
                parentAccountId: resolvedParentAccount?.accountId ?? null,
                parentAccountNumber: resolvedParentAccount?.accountNumber ?? null,
                parentAccountName: resolvedParentAccount?.name ?? null,
                parentAccountCategory: resolvedParentAccount?.category ?? null,
              })

      const resolvedInventory = inventory ?? existing.inventory
      const resolvedRemeasureOpenBalance = revalueOpenBalance ?? existing.revalueOpenBalance
      const resolvedIsPosting = isPosting ?? existing.isPosting
      const resolvedSummary = summary ?? existing.summary
      const resolvedMonetaryClassification =
        monetaryClassification !== undefined
          ? monetaryClassification
        : existing.monetaryClassification
          ?? categoryDefaults?.monetaryClassification
            ?? deriveSuggestedMonetaryClassification({
              accountType: accountType ?? existing.accountType,
              name: name ?? existing.name,
              financialStatementCategory: resolvedFinancialStatementCategory,
              accountRole: resolvedAccountRole,
              rollforwardCategory: resolvedRollforwardCategory,
              inventory: resolvedInventory,
              revalueOpenBalance: resolvedRemeasureOpenBalance,
              isPosting: resolvedIsPosting,
              summary: resolvedSummary,
            })
      const resolvedTranslationTreatment =
        translationTreatment !== undefined
          ? translationTreatment
        : existing.translationTreatment
          ?? categoryDefaults?.translationTreatment
            ?? deriveSuggestedTranslationTreatment({
              accountType: accountType ?? existing.accountType,
              name: name ?? existing.name,
              financialStatementCategory: resolvedFinancialStatementCategory,
              accountRole: resolvedAccountRole,
              rollforwardCategory: resolvedRollforwardCategory,
              inventory: resolvedInventory,
              isPosting: resolvedIsPosting,
              summary: resolvedSummary,
            })
      const categoryPolicyChanged = accountType !== undefined || category !== undefined
      const resolvedRequiresSubledgerType =
        requiresSubledgerType !== undefined
          ? requiresSubledgerType
          : categoryPolicyChanged
            ? categoryDefaults?.requiresSubledgerType ?? null
            : existing.requiresSubledgerType ?? categoryDefaults?.requiresSubledgerType ?? null
      const resolvedCashFlowCategory =
        cashFlowCategory !== undefined
          ? cashFlowCategory
          : categoryPolicyChanged
            ? categoryDefaults?.cashFlowCategory ?? null
            : existing.cashFlowCategory ?? categoryDefaults?.cashFlowCategory ?? null
      const resolvedRequiresMonthlyReconciliation = requiresMonthlyReconciliation ?? (categoryPolicyChanged ? categoryDefaults?.requiresMonthlyReconciliation ?? false : existing.requiresMonthlyReconciliation)
      const resolvedReconciliationType = reconciliationType !== undefined ? reconciliationType : categoryPolicyChanged ? categoryDefaults?.reconciliationType ?? null : existing.reconciliationType ?? categoryDefaults?.reconciliationType ?? null
      const resolvedCloseReviewFrequency = closeReviewFrequency !== undefined ? closeReviewFrequency : categoryPolicyChanged ? categoryDefaults?.closeReviewFrequency ?? null : existing.closeReviewFrequency ?? categoryDefaults?.closeReviewFrequency ?? null
      const resolvedAiReviewEnabled = aiReviewEnabled ?? (categoryPolicyChanged ? categoryDefaults?.aiReviewEnabled ?? false : existing.aiReviewEnabled)
      const resolvedAiRiskLevel = aiRiskLevel !== undefined ? aiRiskLevel : categoryPolicyChanged ? categoryDefaults?.aiRiskLevel ?? null : existing.aiRiskLevel ?? categoryDefaults?.aiRiskLevel ?? null
      const resolvedAutoMatchStrategy = autoMatchStrategy !== undefined ? autoMatchStrategy : categoryPolicyChanged ? categoryDefaults?.autoMatchStrategy ?? null : existing.autoMatchStrategy ?? categoryDefaults?.autoMatchStrategy ?? null
      const resolvedMaterialityThreshold = materialityThreshold !== undefined ? materialityThreshold : existing.materialityThreshold
      const resolvedAgingReviewRequired = agingReviewRequired ?? (categoryPolicyChanged ? categoryDefaults?.agingReviewRequired ?? false : existing.agingReviewRequired)
      const resolvedReserveReviewRequired = reserveReviewRequired ?? (categoryPolicyChanged ? categoryDefaults?.reserveReviewRequired ?? false : existing.reserveReviewRequired)
      const resolvedWriteOffReviewRequired = writeOffReviewRequired ?? (categoryPolicyChanged ? categoryDefaults?.writeOffReviewRequired ?? false : existing.writeOffReviewRequired)
      const resolvedWaterfallReviewRequired = waterfallReviewRequired ?? (categoryPolicyChanged ? categoryDefaults?.waterfallReviewRequired ?? false : existing.waterfallReviewRequired)
      const resolvedTaxSensitive = taxSensitive ?? (categoryPolicyChanged ? categoryDefaults?.taxSensitive ?? false : existing.taxSensitive)
      const resolvedIntercompanyAccount = intercompanyAccount ?? (categoryPolicyChanged ? categoryDefaults?.intercompanyAccount ?? false : existing.intercompanyAccount)
      const resolvedEliminationAccount = eliminationAccount ?? (categoryPolicyChanged ? categoryDefaults?.eliminationAccount ?? false : existing.eliminationAccount)
      const resolvedBankAccountRequired = bankAccountRequired ?? (categoryPolicyChanged ? categoryDefaults?.bankAccountRequired ?? false : existing.bankAccountRequired)
      const resolvedInventoryCostLayerAccount = inventoryCostLayerAccount ?? (categoryPolicyChanged ? categoryDefaults?.inventoryCostLayerAccount ?? false : existing.inventoryCostLayerAccount)
      const resolvedRevenueRecognitionAccount = revenueRecognitionAccount ?? (categoryPolicyChanged ? categoryDefaults?.revenueRecognitionAccount ?? false : existing.revenueRecognitionAccount)
      const resolvedDeferredCostAccount = deferredCostAccount ?? (categoryPolicyChanged ? categoryDefaults?.deferredCostAccount ?? false : existing.deferredCostAccount)
      const resolvedFixedAssetAccount = fixedAssetAccount ?? (categoryPolicyChanged ? categoryDefaults?.fixedAssetAccount ?? false : existing.fixedAssetAccount)
      const resolvedPrepaidAccount = prepaidAccount ?? (categoryPolicyChanged ? categoryDefaults?.prepaidAccount ?? false : existing.prepaidAccount)
      const resolvedAccrualAccount = accrualAccount ?? (categoryPolicyChanged ? categoryDefaults?.accrualAccount ?? false : existing.accrualAccount)
      const resolvedClearingAccount = clearingAccount ?? (categoryPolicyChanged ? categoryDefaults?.clearingAccount ?? false : existing.clearingAccount)
      const resolvedSuspenseAccount = suspenseAccount ?? (categoryPolicyChanged ? categoryDefaults?.suspenseAccount ?? false : existing.suspenseAccount)
      const policyErrors = getGlAccountingPolicyWarnings({
        accountType: accountType ?? existing.accountType,
        name: name ?? existing.name,
        financialStatementCategory: resolvedFinancialStatementCategory,
        accountRole: resolvedAccountRole,
        rollforwardCategory: resolvedRollforwardCategory,
        inventory: resolvedInventory,
        revalueOpenBalance: resolvedRemeasureOpenBalance,
        monetaryClassification: resolvedMonetaryClassification,
        translationTreatment: resolvedTranslationTreatment,
        isPosting: resolvedIsPosting,
        summary: resolvedSummary,
      }).filter((warning) => warning.severity === 'error')
      if (policyErrors.length > 0) {
        throw new Error(policyErrors.map((warning) => warning.message).join(' '))
      }

      const updated = await tx.chartOfAccounts.update({
        where: { id },
        data: {
          ...(accountId !== undefined ? { accountId } : {}),
          ...(accountNumber !== undefined ? { accountNumber } : {}),
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(accountType !== undefined ? { accountType } : {}),
          ...(category !== undefined ? { category } : {}),
          ...(inventory !== undefined ? { inventory } : {}),
          ...(revalueOpenBalance !== undefined ? { revalueOpenBalance } : {}),
          ...(resolvedMonetaryClassification !== existing.monetaryClassification ? { monetaryClassification: resolvedMonetaryClassification } : {}),
          ...(resolvedTranslationTreatment !== existing.translationTreatment ? { translationTreatment: resolvedTranslationTreatment } : {}),
          ...(eliminateIntercoTransactions !== undefined ? { eliminateIntercoTransactions } : {}),
          ...(summary !== undefined ? { summary } : {}),
          ...(active !== undefined ? { active } : {}),
          ...(normalBalance !== undefined ? { normalBalance } : {}),
          ...(normalBalance === undefined && !existing.normalBalance && categoryDefaults?.normalBalance ? { normalBalance: categoryDefaults.normalBalance } : {}),
          ...(financialStatementSection !== undefined ? { financialStatementSection } : {}),
          ...(financialStatementSection === undefined && !existing.financialStatementSection && categoryDefaults?.financialStatementSection ? { financialStatementSection: categoryDefaults.financialStatementSection } : {}),
          ...(financialStatementGroup !== undefined ? { financialStatementGroup } : {}),
          ...(financialStatementGroup === undefined && !existing.financialStatementGroup && categoryDefaults?.financialStatementGroup ? { financialStatementGroup: categoryDefaults.financialStatementGroup } : {}),
          ...(financialStatementCategory !== undefined ? { financialStatementCategory } : {}),
          ...(financialStatementCategory === undefined && !existing.financialStatementCategory && categoryDefaults?.financialStatementCategory ? { financialStatementCategory: categoryDefaults.financialStatementCategory } : {}),
          ...(resolvedAccountRole !== undefined ? { accountRole: resolvedAccountRole } : {}),
          ...(resolvedRollforwardCategory !== undefined ? { rollforwardCategory: resolvedRollforwardCategory } : {}),
          ...(isPosting !== undefined ? { isPosting } : {}),
          ...(isControlAccount !== undefined ? { isControlAccount } : {}),
          ...(allowsManualPosting !== undefined ? { allowsManualPosting } : {}),
          ...(resolvedRequiresSubledgerType !== existing.requiresSubledgerType ? { requiresSubledgerType: resolvedRequiresSubledgerType } : {}),
          ...(resolvedCashFlowCategory !== existing.cashFlowCategory ? { cashFlowCategory: resolvedCashFlowCategory } : {}),
          ...(resolvedRequiresMonthlyReconciliation !== existing.requiresMonthlyReconciliation ? { requiresMonthlyReconciliation: resolvedRequiresMonthlyReconciliation } : {}),
          ...(resolvedReconciliationType !== existing.reconciliationType ? { reconciliationType: resolvedReconciliationType } : {}),
          ...(closeReviewOwnerId !== undefined ? { closeReviewOwnerId } : {}),
          ...(resolvedCloseReviewFrequency !== existing.closeReviewFrequency ? { closeReviewFrequency: resolvedCloseReviewFrequency } : {}),
          ...(resolvedAiReviewEnabled !== existing.aiReviewEnabled ? { aiReviewEnabled: resolvedAiReviewEnabled } : {}),
          ...(resolvedAiRiskLevel !== existing.aiRiskLevel ? { aiRiskLevel: resolvedAiRiskLevel } : {}),
          ...(resolvedAutoMatchStrategy !== existing.autoMatchStrategy ? { autoMatchStrategy: resolvedAutoMatchStrategy } : {}),
          ...(materialityThreshold !== undefined ? { materialityThreshold: resolvedMaterialityThreshold } : {}),
          ...(resolvedAgingReviewRequired !== existing.agingReviewRequired ? { agingReviewRequired: resolvedAgingReviewRequired } : {}),
          ...(resolvedReserveReviewRequired !== existing.reserveReviewRequired ? { reserveReviewRequired: resolvedReserveReviewRequired } : {}),
          ...(resolvedWriteOffReviewRequired !== existing.writeOffReviewRequired ? { writeOffReviewRequired: resolvedWriteOffReviewRequired } : {}),
          ...(resolvedWaterfallReviewRequired !== existing.waterfallReviewRequired ? { waterfallReviewRequired: resolvedWaterfallReviewRequired } : {}),
          ...(resolvedTaxSensitive !== existing.taxSensitive ? { taxSensitive: resolvedTaxSensitive } : {}),
          ...(resolvedIntercompanyAccount !== existing.intercompanyAccount ? { intercompanyAccount: resolvedIntercompanyAccount } : {}),
          ...(resolvedEliminationAccount !== existing.eliminationAccount ? { eliminationAccount: resolvedEliminationAccount } : {}),
          ...(resolvedBankAccountRequired !== existing.bankAccountRequired ? { bankAccountRequired: resolvedBankAccountRequired } : {}),
          ...(resolvedInventoryCostLayerAccount !== existing.inventoryCostLayerAccount ? { inventoryCostLayerAccount: resolvedInventoryCostLayerAccount } : {}),
          ...(resolvedRevenueRecognitionAccount !== existing.revenueRecognitionAccount ? { revenueRecognitionAccount: resolvedRevenueRecognitionAccount } : {}),
          ...(resolvedDeferredCostAccount !== existing.deferredCostAccount ? { deferredCostAccount: resolvedDeferredCostAccount } : {}),
          ...(resolvedFixedAssetAccount !== existing.fixedAssetAccount ? { fixedAssetAccount: resolvedFixedAssetAccount } : {}),
          ...(resolvedPrepaidAccount !== existing.prepaidAccount ? { prepaidAccount: resolvedPrepaidAccount } : {}),
          ...(resolvedAccrualAccount !== existing.accrualAccount ? { accrualAccount: resolvedAccrualAccount } : {}),
          ...(resolvedClearingAccount !== existing.clearingAccount ? { clearingAccount: resolvedClearingAccount } : {}),
          ...(resolvedSuspenseAccount !== existing.suspenseAccount ? { suspenseAccount: resolvedSuspenseAccount } : {}),
          ...(parentAccountId !== undefined ? { parentAccountId } : {}),
          ...(closeToAccountId !== undefined ? { closeToAccountId } : {}),
          ...(scopeMode === 'parent'
            ? {
                parentSubsidiaryId: parentSubsidiaryId ?? null,
                includeChildren: includeChildren ?? false,
              }
            : {}),
          ...(scopeMode === 'selected'
            ? {
                parentSubsidiaryId: null,
                includeChildren: includeChildren ?? false,
              }
            : {}),
          ...((scopeMode === undefined && includeChildren !== undefined) ? { includeChildren } : {}),
        },
      })

      if (scopeMode === 'selected') {
        await tx.chartOfAccountSubsidiary.deleteMany({ where: { chartOfAccountId: id } })
        if (subsidiaryIds && subsidiaryIds.length > 0) {
          await tx.chartOfAccountSubsidiary.createMany({
            data: subsidiaryIds.map((subsidiaryId) => ({ chartOfAccountId: id, subsidiaryId })),
            skipDuplicates: true,
          })
        }
      }

      if (scopeMode === 'parent') {
        await tx.chartOfAccountSubsidiary.deleteMany({ where: { chartOfAccountId: id } })
      }

      if (scopeMode === undefined && subsidiaryIds !== undefined) {
        await tx.chartOfAccounts.update({
          where: { id },
          data: { parentSubsidiaryId: null },
        })
        await tx.chartOfAccountSubsidiary.deleteMany({ where: { chartOfAccountId: id } })
        if (subsidiaryIds.length > 0) {
          await tx.chartOfAccountSubsidiary.createMany({
            data: subsidiaryIds.map((subsidiaryId) => ({ chartOfAccountId: id, subsidiaryId })),
            skipDuplicates: true,
          })
        }
      }

      return updated
    })

    const hydrated = await prisma.chartOfAccounts.findUnique({ where: { id: result.id }, include: INCLUDE })
    return NextResponse.json(hydrated)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('Remeasure Open Balance')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update chart account' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await prisma.chartOfAccounts.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete chart account' }, { status: 500 })
  }
}
