import { promises as fs } from 'fs'
import path from 'path'
import {
  BILL_PAYMENT_DETAIL_FIELDS,
  defaultBillPaymentDetailCustomization,
  BILL_PAYMENT_REFERENCE_SOURCES,
  type BillPaymentDetailFieldKey,
  type BillPaymentDetailCustomizationConfig,
} from '@/lib/bill-payment-detail-customization'
import { mergeTransactionReferenceLayouts } from '@/lib/transaction-reference-layouts'
import {
  defaultTransactionGlImpactSettings,
  TRANSACTION_GL_IMPACT_COLUMNS,
  type TransactionGlImpactColumnKey,
} from '@/lib/transaction-gl-impact'

const STORE_PATH = path.join(process.cwd(), 'config', 'bill-payment-detail-customization.json')

function cloneDefaults(): BillPaymentDetailCustomizationConfig {
  return JSON.parse(JSON.stringify(defaultBillPaymentDetailCustomization())) as BillPaymentDetailCustomizationConfig
}

function normalizeText(value: unknown): string | null {
  const text = String(value ?? '').trim()
  return text || null
}

function normalizeColumnCount(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(4, Math.max(1, Math.trunc(value)))
}

function normalizeRowCount(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(12, Math.max(1, Math.trunc(value)))
}

function normalizeFieldPlacements(config: BillPaymentDetailCustomizationConfig): BillPaymentDetailCustomizationConfig {
  const nextConfig: BillPaymentDetailCustomizationConfig = {
    ...config,
    sectionRows: { ...config.sectionRows },
    fields: Object.fromEntries(
      BILL_PAYMENT_DETAIL_FIELDS.map((field) => [field.id, { ...config.fields[field.id] }]),
    ) as BillPaymentDetailCustomizationConfig['fields'],
  }

  for (const section of nextConfig.sections) {
    const sectionFields = BILL_PAYMENT_DETAIL_FIELDS.filter((field) => nextConfig.fields[field.id].section === section)
    const occupied = new Set<string>()
    let sectionRows = nextConfig.sectionRows[section] ?? 2

    for (const field of sectionFields) {
      const fieldConfig = nextConfig.fields[field.id]
      let column = Math.min(nextConfig.formColumns, Math.max(1, fieldConfig.column))
      let row = Math.max(0, Math.trunc(fieldConfig.order))
      let key = `${column}:${row}`

      while (row >= sectionRows || occupied.has(key)) {
        let placed = false
        for (let candidateRow = 0; candidateRow < sectionRows; candidateRow += 1) {
          for (let candidateColumn = 1; candidateColumn <= nextConfig.formColumns; candidateColumn += 1) {
            const candidateKey = `${candidateColumn}:${candidateRow}`
            if (!occupied.has(candidateKey)) {
              column = candidateColumn
              row = candidateRow
              key = candidateKey
              placed = true
              break
            }
          }
          if (placed) break
        }

        if (!placed) {
          row = sectionRows
          column = 1
          sectionRows += 1
          key = `${column}:${row}`
        }
      }

      occupied.add(key)
      nextConfig.fields[field.id] = {
        ...fieldConfig,
        column,
        order: row,
      }
    }

    nextConfig.sectionRows[section] = sectionRows
  }

  return nextConfig
}

function mergeWithDefaults(overrides: Partial<BillPaymentDetailCustomizationConfig>): BillPaymentDetailCustomizationConfig {
  const merged = cloneDefaults()
  merged.formColumns = normalizeColumnCount(overrides.formColumns, merged.formColumns)

  const inputSections = Array.isArray(overrides.sections)
    ? overrides.sections.map((section) => normalizeText(section)).filter((section): section is string => Boolean(section))
    : []
  if (inputSections.length > 0) {
    merged.sections = Array.from(new Set(inputSections))
  }

  const sectionRowsInput =
    overrides.sectionRows && typeof overrides.sectionRows === 'object'
      ? (overrides.sectionRows as Record<string, unknown>)
      : {}

  for (const section of merged.sections) {
    merged.sectionRows[section] = normalizeRowCount(sectionRowsInput[section], merged.sectionRows[section] ?? 2)
  }

  const fieldOverrides =
    overrides.fields && typeof overrides.fields === 'object'
      ? (overrides.fields as Partial<Record<BillPaymentDetailFieldKey, Partial<BillPaymentDetailCustomizationConfig['fields'][BillPaymentDetailFieldKey]>>>)
      : {}

  for (const field of BILL_PAYMENT_DETAIL_FIELDS) {
    const override = fieldOverrides[field.id]
    if (!override || typeof override !== 'object') continue

    const section = normalizeText(override.section)
    merged.fields[field.id] = {
      visible: override.visible === undefined ? merged.fields[field.id].visible : override.visible === true,
      section: section ?? merged.fields[field.id].section,
      order:
        typeof override.order === 'number' && Number.isFinite(override.order)
          ? override.order
          : merged.fields[field.id].order,
      column: normalizeColumnCount(override.column, merged.fields[field.id].column),
    }
  }

  for (const field of BILL_PAYMENT_DETAIL_FIELDS) {
    const section = merged.fields[field.id].section
    if (!merged.sections.includes(section)) {
      merged.sections.push(section)
    }
    merged.sectionRows[section] = normalizeRowCount(sectionRowsInput[section], merged.sectionRows[section] ?? 2)
    merged.fields[field.id].column = Math.min(merged.formColumns, Math.max(1, merged.fields[field.id].column))
  }

  merged.referenceLayouts = mergeTransactionReferenceLayouts(
    overrides.referenceLayouts,
    merged.referenceLayouts,
    BILL_PAYMENT_REFERENCE_SOURCES,
  )

  merged.glImpactSettings =
    overrides.glImpactSettings && typeof overrides.glImpactSettings === 'object'
      ? {
          ...merged.glImpactSettings,
          ...(overrides.glImpactSettings.fontSize === 'xs' || overrides.glImpactSettings.fontSize === 'sm'
            ? { fontSize: overrides.glImpactSettings.fontSize }
            : {}),
        }
      : defaultTransactionGlImpactSettings()

  merged.glImpactColumns = normalizeGlImpactColumns(overrides.glImpactColumns, merged.glImpactColumns)

  return normalizeFieldPlacements(merged)
}

function normalizeGlImpactColumns(
  candidate: unknown,
  fallback: BillPaymentDetailCustomizationConfig['glImpactColumns'],
): BillPaymentDetailCustomizationConfig['glImpactColumns'] {
  const source =
    candidate && typeof candidate === 'object'
      ? (candidate as Partial<
          Record<
            TransactionGlImpactColumnKey,
            Partial<BillPaymentDetailCustomizationConfig['glImpactColumns'][TransactionGlImpactColumnKey]>
          >
        >)
      : {}

  const normalizedEntries: Array<[
    TransactionGlImpactColumnKey,
    BillPaymentDetailCustomizationConfig['glImpactColumns'][TransactionGlImpactColumnKey],
  ]> = TRANSACTION_GL_IMPACT_COLUMNS.map((column, index) => {
      const override = source[column.id]
      return [
        column.id,
        {
          visible: override?.visible === undefined ? fallback[column.id].visible : override.visible === true,
          order:
            typeof override?.order === 'number' && Number.isFinite(override.order)
              ? Math.max(0, Math.trunc(override.order))
              : fallback[column.id].order ?? index,
          widthMode:
            override?.widthMode === 'auto' ||
            override?.widthMode === 'compact' ||
            override?.widthMode === 'normal' ||
            override?.widthMode === 'wide'
              ? override.widthMode
              : fallback[column.id].widthMode,
        },
      ]
    })

  return Object.fromEntries(
    normalizedEntries
      .sort((left, right) => left[1].order - right[1].order)
      .map(([id, value], index) => [id, { ...value, order: index }]),
  ) as BillPaymentDetailCustomizationConfig['glImpactColumns']
}

export async function loadBillPaymentDetailCustomization(): Promise<BillPaymentDetailCustomizationConfig> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<BillPaymentDetailCustomizationConfig>
    return mergeWithDefaults(parsed)
  } catch {
    return cloneDefaults()
  }
}

export async function saveBillPaymentDetailCustomization(nextConfig: BillPaymentDetailCustomizationConfig): Promise<BillPaymentDetailCustomizationConfig> {
  const normalized = mergeWithDefaults(nextConfig)
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
  return normalized
}
