import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function getFileTimestamp() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const timePart = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  return `${datePart}_${timePart}`
}

export async function exportTableToPDF(tableId: string, fileName: string = 'export') {
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

  try {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    autoTable(pdf, {
      head: [headers],
      body: rows,
      startY: 10,
      theme: 'striped',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
      },
      margin: { top: 10, right: 8, bottom: 10, left: 8 },
    })

    // Generate filename with timestamp
    const timestamp = getFileTimestamp()
    const finalFileName = `${fileName.replace(/\.pdf$/, '')}_${timestamp}.pdf`

    // Save PDF
    pdf.save(finalFileName)
  } catch (error) {
    console.error('Error generating PDF:', error)
  }
}
