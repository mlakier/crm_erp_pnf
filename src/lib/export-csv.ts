function escapeCsvValue(value: string): string {
  const normalized = value.replace(/\r?\n|\r/g, ' ')
  if (/[",]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function getFileTimestamp() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const timePart = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  return `${datePart}_${timePart}`
}

export function exportTableToCSV(tableId: string, fileName: string = 'export') {
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

  const headerCells = Array.from(thead.rows[0].cells)
  const headers = headerCells.map((cell) => {
    const text = cell.textContent?.replace(/\s*[↑↓↕]$/, '').trim() ?? ''
    return text
  })

  const rows = Array.from(tbody.rows)
    .filter((row) => row.style.display !== 'none' && row.querySelector('td[data-column]'))
    .map((row) => {
      return Array.from(row.cells)
        .slice(0, headers.length)
        .map((cell) => cell.textContent?.trim() ?? '')
    })

  const csvLines = [headers, ...rows].map((line) => line.map(escapeCsvValue).join(','))
  const csvContent = csvLines.join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const timestamp = getFileTimestamp()
  const finalFileName = `${fileName.replace(/\.csv$/, '')}_${timestamp}.csv`

  const link = document.createElement('a')
  link.href = url
  link.download = finalFileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
