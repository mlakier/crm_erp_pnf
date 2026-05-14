import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export type ParsedDimensionImportRow = Record<string, string>

export function normalizeImportKey(value: string): string {
  return value
    .trim()
    .replace(/\s*\((required|optional)\)\s*$/i, '')
    .replace(/\s*\*\s*$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function getImportText(row: ParsedDimensionImportRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeImportKey(key)]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

export function parseImportBoolean(input: unknown, fallback: boolean): boolean {
  if (input === undefined || input === null || String(input).trim() === '') return fallback
  const normalized = String(input).trim().toLowerCase()
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true
  if (['false', '0', 'no', 'n'].includes(normalized)) return false
  return fallback
}

export function parseDimensionImportRows(fileName: string, bytes: ArrayBuffer): ParsedDimensionImportRow[] {
  const lowerName = fileName.toLowerCase()

  if (lowerName.endsWith('.xlsx')) {
    const workbook = XLSX.read(bytes, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const firstSheet = workbook.Sheets[firstSheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' })
    return rows.map((row) => normalizeRow(row))
  }

  const csvText = Buffer.from(bytes).toString('utf8')
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    const message = parsed.errors.map((error) => error.message).join('; ')
    throw new Error(`CSV parse error: ${message}`)
  }

  return (parsed.data ?? []).map((row) => normalizeRow(row))
}

function normalizeRow(row: Record<string, unknown>): ParsedDimensionImportRow {
  const output: ParsedDimensionImportRow = {}
  Object.entries(row).forEach(([key, value]) => {
    output[normalizeImportKey(key)] = String(value ?? '').trim()
  })
  return output
}
