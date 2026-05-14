import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { authOptions } from '@/lib/auth'
import { runCurrencyTranslation } from '@/lib/currency-translation'
import { resolveSubsidiaryScope } from '@/lib/subsidiary-scope'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json() as {
      accountingPeriodId?: string
      asOfDate?: string
      subsidiaryId?: string | null
      includeChildren?: boolean
    }

    const accountingPeriodId = String(body.accountingPeriodId ?? '').trim()
    const asOfDate = String(body.asOfDate ?? '').trim()
    const subsidiaryId = String(body.subsidiaryId ?? '').trim() || null
    const includeChildren = body.includeChildren === true

    if (!accountingPeriodId) {
      return NextResponse.json({ error: 'Accounting period is required.' }, { status: 400 })
    }
    if (!asOfDate) {
      return NextResponse.json({ error: 'As-of date is required.' }, { status: 400 })
    }

    if (includeChildren) {
      if (!subsidiaryId) {
        return NextResponse.json({ error: 'Subsidiary scope is required when including children.' }, { status: 400 })
      }

      const scope = await resolveSubsidiaryScope(subsidiaryId, true)
      const results = []
      let completed = 0
      let skipped = 0
      let failed = 0

      for (const subsidiary of scope) {
        try {
          const result = await runCurrencyTranslation({
            accountingPeriodId,
            asOfDate,
            subsidiaryId: subsidiary.id,
            requestedById: session?.user?.id ?? null,
            triggerType: 'manual_parent_scope',
          })
          completed += 1
          results.push({ ...subsidiary, result })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to run currency translation.'
          const noTranslationNeeded = message.includes('functional currency already equals group currency')
          if (noTranslationNeeded) skipped += 1
          else failed += 1
          results.push({
            ...subsidiary,
            result: null,
            skipped: noTranslationNeeded,
            error: message,
          })
        }
      }

      return NextResponse.json({
        status: failed > 0 ? 'completed_with_exceptions' : 'completed',
        message: `Parent-scope translation finished for ${scope.length} subsidiar${scope.length === 1 ? 'y' : 'ies'}. Completed ${completed}, skipped ${skipped}, failed ${failed}.`,
        summary: {
          includeChildren: true,
          parentSubsidiaryId: subsidiaryId,
          scopeCount: scope.length,
          completed,
          skipped,
          failed,
          results,
        },
      })
    }

    const result = await runCurrencyTranslation({
      accountingPeriodId,
      asOfDate,
      subsidiaryId,
      requestedById: session?.user?.id ?? null,
      triggerType: 'manual',
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to run currency translation.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
