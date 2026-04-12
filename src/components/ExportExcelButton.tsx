'use client'

import { exportTableToExcel } from '@/lib/export-excel'

export default function ExportExcelButton({
  tableId,
  fileName = 'export',
}: {
  tableId: string
  fileName?: string
}) {
  const handleExport = () => {
    exportTableToExcel(tableId, fileName)
  }

  return (
    <button
      onClick={handleExport}
      className="rounded-md border px-3 py-2 text-sm font-medium"
      style={{
        borderColor: 'var(--border-muted)',
        color: 'var(--text-secondary)',
        backgroundColor: 'transparent',
        cursor: 'pointer',
      }}
      title="Download visible rows as Excel file"
    >
      Export to Excel
    </button>
  )
}
