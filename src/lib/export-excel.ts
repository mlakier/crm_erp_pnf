import * as XLSX from 'xlsx'

function getFileTimestamp() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const timePart = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  return `${datePart}_${timePart}`
}

export function exportTableToExcel(tableId: string, fileName: string = 'export.xlsx') {
  const table = document.querySelector<HTMLTableElement>(`table[id="${tableId}"]`)
  if (!table) {
    console.error(`Table with ID "${tableId}" not found`)
    return
  }

  const thead = table.tHead
  const tbody = table.tBodies[0]
  if (!thead || !tbody) {
    console.error('Table structure is invalid')
    return
  }

  // Extract headers from the first row, skipping filter row
  const headerCells = Array.from(thead.rows[0].cells)
  const headers = headerCells.map((cell) => {
    const text = cell.textContent?.replace(/\s*[↑↓↕]$/, '').trim() ?? ''
    return text
  })

  // Extract visible rows only (those with display !== 'none')
  const rows = Array.from(tbody.rows)
    .filter((row) => row.style.display !== 'none' && row.querySelector('td[data-column]'))
    .map((row) => {
      return Array.from(row.cells)
        .slice(0, headers.length)
        .map((cell) => cell.textContent?.trim() ?? '')
    })

  // Create workbook
  const worksheetData = [headers, ...rows]
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

  // Auto-size columns
  const colWidths = headers.map((header, idx) => {
    const maxLength = Math.max(
      header.length,
      ...rows.map((row) => (row[idx] ?? '').length)
    )
    return { wch: Math.min(maxLength + 2, 50) }
  })
  worksheet['!cols'] = colWidths

  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

  // Generate filename with timestamp
  const timestamp = getFileTimestamp()
  const finalFileName = `${fileName.replace(/\.xlsx$/, '')}_${timestamp}.xlsx`

  // Write file
  XLSX.writeFile(workbook, finalFileName)
}
