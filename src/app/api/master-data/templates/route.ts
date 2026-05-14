import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { getTemplateRows, isSupportedEntity, MASTER_DATA_IMPORT_SCHEMA } from '@/lib/master-data-import-schema'
import { normalizeCustomFieldEntityType } from '@/lib/custom-fields'

export const runtime = 'nodejs'

const REQUIRED_HEADER_SUFFIX = ' (Required)'

function getCustomFieldEntityType(entity: string) {
  return normalizeCustomFieldEntityType(entity === 'chart-of-accounts' ? 'chart-of-accounts' : entity.replace(/s$/, ''))
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawEntity = searchParams.get('entity') || 'currencies'

    if (!isSupportedEntity(rawEntity)) {
      return NextResponse.json({ error: 'Unsupported entity type.' }, { status: 400 })
    }

    const data = getTemplateRows(rawEntity)
    const schema = MASTER_DATA_IMPORT_SCHEMA[rawEntity]
    const requiredHeaderIndexes = new Set<number>()

    schema.fields.forEach((field, index) => {
      if (field.required) {
        requiredHeaderIndexes.add(index)
        data[0][index] = `${data[0][index]}${REQUIRED_HEADER_SUFFIX}`
      }
    })

    const customFields = await prisma.customFieldDefinition.findMany({
      where: { entityType: getCustomFieldEntityType(rawEntity), active: true },
      orderBy: [{ label: 'asc' }, { createdAt: 'asc' }],
      select: { label: true, required: true, defaultValue: true },
    })

    if (customFields.length > 0) {
      const customFieldStartIndex = data[0].length
      data[0].push(...customFields.map((field) => `${field.label}${field.required ? REQUIRED_HEADER_SUFFIX : ''}`))
      customFields.forEach((field, index) => {
        if (field.required) {
          requiredHeaderIndexes.add(customFieldStartIndex + index)
        }
      })
      for (let index = 1; index < data.length; index += 1) {
        data[index].push(...customFields.map((field) => field.defaultValue ?? ''))
      }
    }

    const worksheet = XLSX.utils.aoa_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

    // Set column widths
    const colWidths = data[0].map(() => 18)
    worksheet['!cols'] = colWidths.map((width) => ({ wch: width }))
    worksheet['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: Math.max(data.length - 1, 0), c: Math.max(data[0].length - 1, 0) },
      }),
    }

    data[0].forEach((_, index) => {
      const address = XLSX.utils.encode_cell({ r: 0, c: index })
      const cell = worksheet[address]
      if (!cell) {
        return
      }

      const required = requiredHeaderIndexes.has(index)
      cell.s = {
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: required ? 'FFC00000' : 'FF1F4E79' }, patternType: 'solid' },
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
      }
    })

    // Convert to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true })

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${rawEntity}_template_${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate template.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
