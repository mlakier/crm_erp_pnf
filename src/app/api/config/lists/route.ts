import { NextRequest, NextResponse } from 'next/server'
import { LIST_LABELS, LIST_PAGE_LABELS, ListOrderMode, ListPageKey, sanitizeListOrderMode } from '@/lib/list-options'
import { loadListOrderConfig, updateSingleListOrder } from '@/lib/list-order-store'
import { loadListOptionRows, loadListOptions, updateSingleList } from '@/lib/list-options-store'
import { createCustomList, loadCustomListState, updateCustomList } from '@/lib/custom-list-store'

function isListPageKey(value: string): value is ListPageKey {
  return Object.prototype.hasOwnProperty.call(LIST_PAGE_LABELS, value)
}

async function buildResponsePayload() {
  const [config, rows, orderConfig, customState] = await Promise.all([
    loadListOptions(),
    loadListOptionRows(),
    loadListOrderConfig(),
    loadCustomListState(),
  ])

  return {
    pageLabels: LIST_PAGE_LABELS,
    listLabels: LIST_LABELS,
    config,
    rows,
    orderConfig,
    customLists: customState.customLists,
    customRows: customState.customRows,
    customOrderConfig: customState.customOrderConfig,
  }
}

export async function GET() {
  try {
    return NextResponse.json(await buildResponsePayload())
  } catch (error) {
    console.error('Failed to load list options', error)
    return NextResponse.json({ error: 'Failed to load list options' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = String((body as { action?: unknown })?.action ?? '').trim()

    if (action === 'create-custom-list') {
      const label = String((body as { label?: unknown })?.label ?? '').trim()

      await createCustomList({ label })
      return NextResponse.json(await buildResponsePayload())
    }

    const customListId = String((body as { customListId?: unknown })?.customListId ?? '').trim()
    if (customListId) {
      await updateCustomList({
        id: customListId,
        values: (body as { values?: unknown })?.values,
        rows: (body as { rows?: unknown })?.rows,
        orderMode: (body as { orderMode?: unknown })?.orderMode,
      })

      return NextResponse.json(await buildResponsePayload())
    }

    const page = String((body as { page?: unknown })?.page ?? '').trim()
    const list = String((body as { list?: unknown })?.list ?? '').trim()
    const values = (body as { values?: unknown })?.values
    const rows = (body as { rows?: unknown })?.rows
    const orderMode = sanitizeListOrderMode((body as { orderMode?: unknown })?.orderMode)

    if (!isListPageKey(page)) {
      return NextResponse.json({ error: 'Invalid page key' }, { status: 400 })
    }

    if (!Object.prototype.hasOwnProperty.call(LIST_LABELS[page], list)) {
      return NextResponse.json({ error: 'Invalid list key' }, { status: 400 })
    }

    const [listState, orderConfig] = await Promise.all([
      updateSingleList(page, list, values, rows),
      updateSingleListOrder(page, list, orderMode as ListOrderMode),
    ])

    const customState = await loadCustomListState()

    return NextResponse.json({
      pageLabels: LIST_PAGE_LABELS,
      listLabels: LIST_LABELS,
      config: listState.config,
      rows: listState.rows,
      orderConfig,
      customLists: customState.customLists,
      customRows: customState.customRows,
      customOrderConfig: customState.customOrderConfig,
    })
  } catch (error) {
    console.error('Failed to save list options', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save list options' },
      { status: 500 }
    )
  }
}
