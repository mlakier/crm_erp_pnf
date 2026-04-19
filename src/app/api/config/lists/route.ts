import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const DISPLAY_ORDER_PATH = join(process.cwd(), 'config', 'list-display-order.json')
const CUSTOM_LISTS_PATH = join(process.cwd(), 'config', 'custom-lists.json')

function readDisplayOrder(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(DISPLAY_ORDER_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function writeDisplayOrder(data: Record<string, string>) {
  writeFileSync(DISPLAY_ORDER_PATH, JSON.stringify(data, null, 2))
}

type CustomList = { key: string; label: string; whereUsed: string[] }

function readCustomLists(): CustomList[] {
  try {
    const data = JSON.parse(readFileSync(CUSTOM_LISTS_PATH, 'utf-8'))
    return Array.isArray(data.lists) ? data.lists : []
  } catch {
    return []
  }
}

function writeCustomLists(lists: CustomList[]) {
  writeFileSync(CUSTOM_LISTS_PATH, JSON.stringify({ lists }, null, 2))
}

const LIST_KEY_LABELS: Record<string, string> = {
  'BILL-STATUS': 'Bill Status',
  DIVISION: 'Division',
  'FULFILL-STATUS': 'Fulfillment Status',
  'INV-RECEIPT-STATUS': 'Invoice Receipt Status',
  'FULFILL-STATUS': 'Fulfillment Status',
  'INV-RECEIPT-STATUS': 'Invoice Receipt Status',
  INDUSTRY: 'Industry',
  'INV-STATUS': 'Invoice Status',
  'ITEM-TYPE': 'Item Type',
  'LEAD-RAT': 'Lead Rating',
  'LEAD-SRC': 'Lead Source',
  'LEAD-STATUS': 'Lead Status',
  'OPP-STAGE': 'Opportunity Stage',
  'PO-STATUS': 'Purchase Order Status',
  'QUOTE-STATUS': 'Quote Status',
  'RECEIPT-STATUS': 'Receipt Status',
  'REQ-STATUS': 'Requisition Status',
  'SO-STATUS': 'Sales Order Status',
}

const WHERE_USED: Record<string, string[]> = {
  'BILL-STATUS': ['Bills'],
  DIVISION: ['Departments'],
  'FULFILL-STATUS': ['Fulfillments'],
  'INV-RECEIPT-STATUS': ['Invoice Receipts'],
  'FULFILL-STATUS': ['Fulfillments'],
  'INV-RECEIPT-STATUS': ['Invoice Receipts'],
  INDUSTRY: ['Customers'],
  'INV-STATUS': ['Invoices'],
  'ITEM-TYPE': ['Items'],
  'LEAD-RAT': ['Leads'],
  'LEAD-SRC': ['Leads'],
  'LEAD-STATUS': ['Leads'],
  'OPP-STAGE': ['Opportunities'],
  'PO-STATUS': ['Purchase Orders'],
  'QUOTE-STATUS': ['Quotes'],
  'RECEIPT-STATUS': ['Receipts'],
  'REQ-STATUS': ['Purchase Requisitions'],
  'SO-STATUS': ['Sales Orders'],
}

function labelForKey(key: string): string {
  if (LIST_KEY_LABELS[key]) return LIST_KEY_LABELS[key]
  const custom = readCustomLists().find((l) => l.key === key)
  if (custom) return custom.label
  return key.charAt(0).toUpperCase() + key.slice(1)
}

function whereUsedForKey(key: string): string[] {
  if (WHERE_USED[key]) return WHERE_USED[key]
  const custom = readCustomLists().find((l) => l.key === key)
  if (custom) return custom.whereUsed
  return []
}

async function buildResponsePayload() {
  const allOptions = await prisma.listOption.findMany({
    orderBy: [{ key: 'asc' }, { sortOrder: 'asc' }],
  })

  const listMap = new Map<string, Array<{ id: string; value: string; sortOrder: number }>>()
  for (const row of allOptions) {
    if (!listMap.has(row.key)) listMap.set(row.key, [])
    listMap.get(row.key)!.push({
      id: row.listId,
      value: row.value,
      sortOrder: row.sortOrder,
    })
  }

  const displayOrderConfig = readDisplayOrder()

  // Include all keys from DB rows
  const allKeys = new Set(listMap.keys())
  // Also include custom lists (may have no rows yet)
  for (const cl of readCustomLists()) {
    allKeys.add(cl.key)
  }

  const lists = Array.from(allKeys).map((key) => ({
    key,
    label: labelForKey(key),
    whereUsed: whereUsedForKey(key),
    displayOrder: displayOrderConfig[key] ?? 'list',
  }))

  return {
    lists,
    rowsByKey: Object.fromEntries(listMap),
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

function formatListId(code: string, sequence: number): string {
  return `LIST-${code}-${String(sequence).padStart(4, '0')}`
}

function parseListIdSequence(id: string, code: string): number | null {
  const match = id.match(new RegExp(`^LIST-${code}-(\\d{4})$`))
  if (!match) return null
  const seq = Number.parseInt(match[1], 10)
  return Number.isNaN(seq) ? null : seq
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const key = String((body as { key?: unknown })?.key ?? '').trim()
    const incomingRows = (body as { rows?: unknown })?.rows
    const incomingDisplayOrder = (body as { displayOrder?: unknown })?.displayOrder

    // Handle display order update (can be sent alone or with rows)
    if (key && typeof incomingDisplayOrder === 'string' && ['alpha', 'list'].includes(incomingDisplayOrder)) {
      const config = readDisplayOrder()
      config[key] = incomingDisplayOrder
      writeDisplayOrder(config)
      if (!incomingRows) {
        return NextResponse.json(await buildResponsePayload())
      }
    }

    // Handle create-list action
    const action = (body as { action?: string })?.action
    if (action === 'create-list') {
      const label = String((body as { label?: unknown })?.label ?? '').trim()
      const whereUsed = Array.isArray((body as { whereUsed?: unknown })?.whereUsed)
        ? (body as { whereUsed: string[] }).whereUsed
        : []
      if (!key) return NextResponse.json({ error: 'List key is required' }, { status: 400 })
      if (!label) return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
      // Check if key already exists
      const existing = readCustomLists()
      if (LIST_KEY_LABELS[key] || existing.some((l) => l.key === key)) {
        return NextResponse.json({ error: 'A list with this key already exists' }, { status: 409 })
      }
      existing.push({ key, label, whereUsed })
      writeCustomLists(existing)
      return NextResponse.json(await buildResponsePayload())
    }



    if (!key) {
      return NextResponse.json({ error: 'Missing list key' }, { status: 400 })
    }

    if (!Array.isArray(incomingRows)) {
      return NextResponse.json({ error: 'Missing rows array' }, { status: 400 })
    }

    const code = key.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'LIST'

    const currentDbRows = await prisma.listOption.findMany({
      where: { key },
      orderBy: { sortOrder: 'asc' },
    })

    const currentMaxSeq = currentDbRows
      .map((r) => parseListIdSequence(r.listId, code))
      .filter((s): s is number => s !== null)

    let nextSeq = Math.max(0, ...currentMaxSeq) + 1

    const currentByValue = new Map<string, string>()
    for (const r of currentDbRows) {
      if (!currentByValue.has(r.value)) currentByValue.set(r.value, r.listId)
    }

    const finalRows = incomingRows.map((row: { id?: string; value?: string }, sortOrder: number) => {
      const value = String(row.value ?? '').trim()
      let listId = row.id ? String(row.id).trim() : ''

      if (!listId || parseListIdSequence(listId, code) === null) {
        const existing = currentByValue.get(value)
        if (existing) {
          listId = existing
        } else {
          listId = formatListId(code, nextSeq)
          nextSeq += 1
        }
      }

      return { listId, value, sortOrder }
    })

    await prisma.$transaction(async (tx) => {
      await tx.listOption.deleteMany({ where: { key } })
      if (finalRows.length > 0) {
        await tx.listOption.createMany({
          data: finalRows.map((r) => ({
            key,
            listId: r.listId,
            value: r.value,
            label: r.value,
            sortOrder: r.sortOrder,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        })
      }
    })

    return NextResponse.json(await buildResponsePayload())
  } catch (error) {
    console.error('Failed to save list options', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save list options' },
      { status: 500 },
    )
  }
}
