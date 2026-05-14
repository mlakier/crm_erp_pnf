import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { authOptions } from '@/lib/auth'
import { runFxRevaluation } from '@/lib/fx-revaluation'
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
      let failed = 0

      for (const subsidiary of scope) {
        try {
          const result = await runFxRevaluation({
            accountingPeriodId,
            asOfDate,
            subsidiaryId: subsidiary.id,
            requestedById: session?.user?.id ?? null,
            triggerType: 'manual_parent_scope',
          })
          completed += 1
          results.push({ ...subsidiary, result })
        } catch (error) {
          failed += 1
          results.push({
            ...subsidiary,
            result: null,
            error: error instanceof Error ? error.message : 'Unable to run FX revaluation.',
          })
        }
      }

      return NextResponse.json({
        status: failed > 0 ? 'completed_with_exceptions' : 'completed',
        message: `Parent-scope FX remeasurement finished for ${scope.length} subsidiar${scope.length === 1 ? 'y' : 'ies'}. Completed ${completed}, failed ${failed}.`,
        summary: {
          includeChildren: true,
          parentSubsidiaryId: subsidiaryId,
          scopeCount: scope.length,
          completed,
          failed,
          results,
        },
      })
    }

    const result = await runFxRevaluation({
      accountingPeriodId,
      asOfDate,
      subsidiaryId,
      requestedById: session?.user?.id ?? null,
      triggerType: 'manual',
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to run FX revaluation.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
