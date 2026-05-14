import { getDimensionConfigurationRows } from '@/lib/dimension-control-plane'
import { getTransactionLineDimensionPolicy } from '@/lib/transaction-line-dimensions'

type SourceLineDimensions = {
  departmentId?: string | null
  locationId?: string | null
  classId?: string | null
}

export type SettlementLineDimensions = {
  departmentId?: string | null
  locationId?: string | null
  classId?: string | null
}

function commonValue(values: Array<string | null | undefined>) {
  const populated = Array.from(new Set(values.filter((value): value is string => Boolean(value))))
  return populated.length === 1 ? populated[0] : null
}

export async function deriveSettlementLineDimensions(sourceLines: SourceLineDimensions[]) {
  const rows = await getDimensionConfigurationRows()
  const journalPolicy = getTransactionLineDimensionPolicy('journal', rows)
  const dimensions: SettlementLineDimensions = {}

  const candidates = {
    department: commonValue(sourceLines.map((line) => line.departmentId)),
    location: commonValue(sourceLines.map((line) => line.locationId)),
    class: commonValue(sourceLines.map((line) => line.classId)),
  }

  if (journalPolicy.department !== 'not-modeled') dimensions.departmentId = candidates.department
  if (journalPolicy.location !== 'not-modeled') dimensions.locationId = candidates.location
  if (journalPolicy.class !== 'not-modeled') dimensions.classId = candidates.class

  const missingRequired = [
    journalPolicy.department === 'required' && !dimensions.departmentId ? 'Department' : null,
    journalPolicy.location === 'required' && !dimensions.locationId ? 'Location' : null,
    journalPolicy.class === 'required' && !dimensions.classId ? 'Class' : null,
  ].filter((value): value is string => Boolean(value))

  if (missingRequired.length > 0) {
    throw new Error(`Cannot post settlement journal because required dimension is unresolved: ${missingRequired.join(', ')}.`)
  }

  return dimensions
}
