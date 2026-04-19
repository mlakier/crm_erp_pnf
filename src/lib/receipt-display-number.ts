export function formatReceiptDisplayNumber(sequence: number) {
  return `REC-${String(sequence).padStart(4, '0')}`
}

export function buildReceiptDisplayNumberMap<T extends { id: string }>(receipts: T[]) {
  return new Map(receipts.map((receipt, index) => [receipt.id, formatReceiptDisplayNumber(index + 1)]))
}
