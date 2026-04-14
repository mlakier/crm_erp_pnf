'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dagre from 'dagre'
import jsPDF from 'jspdf'

type SubsidiaryEntity = {
  id: string
  code: string
  name: string
  country: string | null
  entityType: string | null
  taxId: string | null
  parentEntityId: string | null
}

const NODE_WIDTH = 300
const NODE_HEIGHT = 112
const PADDING_X = 32
const PADDING_Y = 24
const TITLE_HEIGHT = 44
const EXPORT_PADDING = 24

function truncateCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text
  }

  const ellipsis = '...'
  let value = text
  while (value.length > 0 && ctx.measureText(`${value}${ellipsis}`).width > maxWidth) {
    value = value.slice(0, -1)
  }
  return `${value}${ellipsis}`
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function normalizeCountryCode(countryCode: string | null): string | null {
  if (!countryCode) {
    return null
  }

  const normalized = countryCode.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return null
  }

  return normalized
}

function getFlagUrl(countryCode: string | null): string | null {
  const normalized = normalizeCountryCode(countryCode)
  if (!normalized) {
    return null
  }

  return `https://flagcdn.com/w20/${normalized.toLowerCase()}.png`
}

export default function SubsidiaryHierarchyFlow({
  entities,
  title = 'Tillster Group of Companies',
}: {
  entities: SubsidiaryEntity[]
  title?: string
}) {
  const chartCanvasRef = useRef<HTMLDivElement>(null)
  const [isSavingImage, setIsSavingImage] = useState(false)
  const [isSavingPdf, setIsSavingPdf] = useState(false)

  const captureChartCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!chartCanvasRef.current) {
      return null
    }

    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(frameWidth * scale)
    canvas.height = Math.ceil(frameHeight * scale)

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return null
    }

    ctx.scale(scale, scale)

    ctx.fillStyle = '#020817'
    ctx.fillRect(0, 0, frameWidth, frameHeight)

    ctx.fillStyle = 'rgba(148,163,184,0.12)'
    for (let y = 1; y < frameHeight; y += 18) {
      for (let x = 1; x < frameWidth; x += 18) {
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const titleX = EXPORT_PADDING
    const titleY = EXPORT_PADDING
    const titleWidth = frameWidth - EXPORT_PADDING * 2

    ctx.fillStyle = 'rgba(15,23,42,0.45)'
    ctx.fillRect(titleX, titleY, titleWidth, TITLE_HEIGHT)
    ctx.strokeStyle = 'rgba(100,116,139,0.35)'
    ctx.lineWidth = 1
    ctx.strokeRect(titleX, titleY, titleWidth, TITLE_HEIGHT)

    ctx.fillStyle = '#cbd5e1'
    ctx.font = '600 15px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, frameWidth / 2, titleY + TITLE_HEIGHT / 2)

    const chartTop = EXPORT_PADDING + TITLE_HEIGHT

    ctx.save()
    ctx.translate(chartLeft, chartTop)
    ctx.strokeStyle = 'rgba(148,163,184,0.7)'
    ctx.lineWidth = 1.8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const edge of edges) {
      if (!edge.d) {
        continue
      }
      ctx.stroke(new Path2D(edge.d))
    }

    const flagUrls = Array.from(new Set(nodes.map((node) => getFlagUrl(node.country)).filter((url): url is string => Boolean(url))))
    const flagImageMap = new Map<string, HTMLImageElement>()
    await Promise.all(
      flagUrls.map(
        (url) =>
          new Promise<void>((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              flagImageMap.set(url, img)
              resolve()
            }
            img.onerror = () => resolve()
            img.src = url
          })
      )
    )

    for (const node of nodes) {
      const nodeX = node.x
      const nodeY = node.y

      const gradient = ctx.createLinearGradient(0, nodeY, 0, nodeY + NODE_HEIGHT)
      gradient.addColorStop(0, 'rgba(30,41,59,0.96)')
      gradient.addColorStop(1, 'rgba(15,23,42,0.95)')
      drawRoundedRect(ctx, nodeX, nodeY, NODE_WIDTH, NODE_HEIGHT, 12)
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.strokeStyle = 'rgba(71,85,105,0.9)'
      ctx.lineWidth = 1
      ctx.stroke()

      const contentX = nodeX + NODE_WIDTH / 2
      const textMaxWidth = NODE_WIDTH - 32

      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#3b82f6'
      ctx.font = '600 20px system-ui, sans-serif'
      const nameText = truncateCanvasText(ctx, `${node.code} - ${node.name}`, textMaxWidth)
      ctx.fillText(nameText, contentX, nodeY + 16)

      ctx.fillStyle = '#cbd5e1'
      ctx.font = '500 18px system-ui, sans-serif'
      const typeText = truncateCanvasText(ctx, `Type: ${node.entityType ?? '-'}`, textMaxWidth)
      ctx.fillText(typeText, contentX, nodeY + 46)

      const taxText = truncateCanvasText(ctx, `Tax ID: ${node.taxId ?? '-'}`, textMaxWidth)
      ctx.fillText(taxText, contentX, nodeY + 72)

      const flagUrl = getFlagUrl(node.country)
      if (flagUrl) {
        const flagImage = flagImageMap.get(flagUrl)
        if (flagImage) {
          const flagX = nodeX + 14
          const flagY = nodeY + NODE_HEIGHT - 20
          const flagWidth = 20
          const flagHeight = 14
          ctx.drawImage(flagImage, flagX, flagY, flagWidth, flagHeight)
          ctx.strokeStyle = 'rgba(255,255,255,0.25)'
          ctx.lineWidth = 1
          ctx.strokeRect(flagX, flagY, flagWidth, flagHeight)
        }
      }
    }

    ctx.restore()
    return canvas
  }

  const handleSaveAsImage = async (format: 'png' | 'jpg') => {
    if (isSavingImage || isSavingPdf) {
      return
    }

    setIsSavingImage(true)
    try {
      const canvas = await captureChartCanvas()
      if (!canvas) {
        return
      }

      const timestamp = new Date().toISOString().slice(0, 10)
      const isJpg = format === 'jpg'
      const mimeType = isJpg ? 'image/jpeg' : 'image/png'
      const quality = isJpg ? 0.95 : undefined
      const imageData = canvas.toDataURL(mimeType, quality)

      const anchor = document.createElement('a')
      anchor.href = imageData
      anchor.download = `subsidiary_hierarchy_${timestamp}.${format}`
      anchor.click()
    } catch (error) {
      console.error('Failed to save hierarchy image:', error)
    } finally {
      setIsSavingImage(false)
    }
  }

  const handleSaveToPdf = async () => {
    if (!chartCanvasRef.current || isSavingPdf) {
      return
    }

    setIsSavingPdf(true)
    try {
      const canvas = await captureChartCanvas()
      if (!canvas) {
        return
      }

      const imageData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 20
      const firstPageTop = 20
      const continuationTop = 20
      const imageWidth = pageWidth - margin * 2
      const imageHeight = (canvas.height * imageWidth) / canvas.width
      const pageOverlap = 28

      let consumedHeight = 0
      let currentPageTop = firstPageTop
      let availablePageHeight = pageHeight - currentPageTop - margin
      let pageStep = availablePageHeight

      pdf.addImage(
        imageData,
        'PNG',
        margin,
        currentPageTop,
        imageWidth,
        imageHeight,
        undefined,
        'FAST',
        0
      )
      consumedHeight += pageStep

      while (consumedHeight < imageHeight) {
        pdf.addPage()
        currentPageTop = continuationTop
        availablePageHeight = pageHeight - currentPageTop - margin
        pageStep = Math.max(40, availablePageHeight - pageOverlap)
        const offsetY = currentPageTop - consumedHeight

        pdf.addImage(
          imageData,
          'PNG',
          margin,
          offsetY,
          imageWidth,
          imageHeight,
          undefined,
          'FAST',
          0
        )

        consumedHeight += pageStep
      }

      const timestamp = new Date().toISOString().slice(0, 10)
      pdf.save(`subsidiary_hierarchy_${timestamp}.pdf`)
    } catch (error) {
      console.error('Failed to save hierarchy PDF:', error)
    } finally {
      setIsSavingPdf(false)
    }
  }

  const { nodes, edges, width, height, frameWidth, frameHeight, chartLeft } = useMemo(() => {
    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 62, marginx: 12, marginy: 12 })

    const entityById = new Map(entities.map((entity) => [entity.id, entity]))

    for (const entity of entities) {
      g.setNode(entity.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
    }

    const validEdges: Array<{ parentId: string; childId: string }> = []
    for (const entity of entities) {
      if (entity.parentEntityId && entityById.has(entity.parentEntityId)) {
        g.setEdge(entity.parentEntityId, entity.id)
        validEdges.push({ parentId: entity.parentEntityId, childId: entity.id })
      }
    }

    dagre.layout(g)

    const positionedNodes = entities.map((entity) => {
      const position = g.node(entity.id)
      return {
        id: entity.id,
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
        code: entity.code,
        name: entity.name,
        country: entity.country,
        entityType: entity.entityType,
        taxId: entity.taxId,
      }
    })

    const minX = Math.min(...positionedNodes.map((node) => node.x))
    const minY = Math.min(...positionedNodes.map((node) => node.y))

    const shiftedNodes = positionedNodes.map((node) => ({
      ...node,
      x: node.x - minX + PADDING_X,
      y: node.y - minY + PADDING_Y,
    }))

    const nodeById = new Map(shiftedNodes.map((node) => [node.id, node]))

    const connectorPaths = validEdges.map(({ parentId, childId }, index) => {
      const parent = nodeById.get(parentId)
      const child = nodeById.get(childId)
      if (!parent || !child) {
        return { id: `edge-${index}`, d: '' }
      }

      const startX = parent.x + NODE_WIDTH / 2
      const startY = parent.y + NODE_HEIGHT
      const endX = child.x + NODE_WIDTH / 2
      const endY = child.y
      const midY = startY + (endY - startY) / 2
      const d = `M ${startX} ${startY} V ${midY} H ${endX} V ${endY}`
      return { id: `edge-${parentId}-${childId}-${index}`, d }
    })

    const contentWidth = Math.max(...shiftedNodes.map((node) => node.x + NODE_WIDTH)) + PADDING_X
    const contentHeight = Math.max(...shiftedNodes.map((node) => node.y + NODE_HEIGHT)) + PADDING_Y

    const computedWidth = Math.max(980, Math.ceil(contentWidth))
    const computedHeight = Math.max(420, Math.ceil(contentHeight))
    const computedFrameWidth = Math.max(computedWidth + EXPORT_PADDING * 2, 980)
    const computedFrameHeight = computedHeight + TITLE_HEIGHT + EXPORT_PADDING * 2

    return {
      nodes: shiftedNodes,
      edges: connectorPaths,
      width: computedWidth,
      height: computedHeight,
      frameWidth: computedFrameWidth,
      frameHeight: computedFrameHeight,
      chartLeft: Math.max(EXPORT_PADDING, Math.floor((computedFrameWidth - computedWidth) / 2)),
    }
  }, [entities])

  return (
    <div>
      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => handleSaveAsImage('png')}
          disabled={isSavingImage || isSavingPdf}
          className="rounded-md border px-3 py-2 text-sm font-medium"
          style={{
            borderColor: 'var(--border-muted)',
            color: 'var(--text-secondary)',
            opacity: isSavingImage || isSavingPdf ? 0.65 : 1,
            cursor: isSavingImage || isSavingPdf ? 'not-allowed' : 'pointer',
          }}
        >
          {isSavingImage ? 'Saving Image...' : 'Save as PNG'}
        </button>
        <button
          type="button"
          onClick={() => handleSaveAsImage('jpg')}
          disabled={isSavingImage || isSavingPdf}
          className="rounded-md border px-3 py-2 text-sm font-medium"
          style={{
            borderColor: 'var(--border-muted)',
            color: 'var(--text-secondary)',
            opacity: isSavingImage || isSavingPdf ? 0.65 : 1,
            cursor: isSavingImage || isSavingPdf ? 'not-allowed' : 'pointer',
          }}
        >
          {isSavingImage ? 'Saving Image...' : 'Save as JPG'}
        </button>
        <button
          type="button"
          onClick={handleSaveToPdf}
          disabled={isSavingPdf || isSavingImage}
          className="rounded-md border px-3 py-2 text-sm font-medium"
          style={{
            borderColor: 'var(--border-muted)',
            color: 'var(--text-secondary)',
            opacity: isSavingPdf || isSavingImage ? 0.65 : 1,
            cursor: isSavingPdf || isSavingImage ? 'not-allowed' : 'pointer',
          }}
        >
          {isSavingPdf ? 'Saving PDF...' : 'Save to PDF'}
        </button>
      </div>

      <div className="w-full overflow-auto rounded-xl border" style={{ borderColor: 'var(--border-muted)' }}>
        <div
          ref={chartCanvasRef}
          className="relative"
          style={{
            width: frameWidth,
            minWidth: '100%',
            height: frameHeight,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.12) 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        >
          <div
            className="absolute left-0 right-0 top-0 flex items-center justify-center border-b text-sm font-semibold"
            style={{
              left: EXPORT_PADDING,
              right: EXPORT_PADDING,
              top: EXPORT_PADDING,
              height: TITLE_HEIGHT,
              borderColor: 'var(--border-muted)',
              color: 'var(--text-secondary)',
              background: 'rgba(15,23,42,0.45)',
            }}
          >
            {title}
          </div>

          <div
            className="absolute"
            style={{
              left: chartLeft,
              top: EXPORT_PADDING + TITLE_HEIGHT,
              width,
              height,
            }}
          >
          <svg width={width} height={height} className="absolute inset-0" aria-hidden="true">
            {edges.map((edge) => (
              <path
                key={edge.id}
                d={edge.d}
                fill="none"
                stroke="rgba(148,163,184,0.7)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {nodes.map((node) => {
            const flagUrl = getFlagUrl(node.country)

            return (
              <div
                key={node.id}
                className="absolute rounded-xl border px-4 py-3 text-center"
                style={{
                  left: node.x,
                  top: node.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                  borderColor: 'var(--border-muted)',
                  background: 'linear-gradient(180deg, rgba(30,41,59,0.96) 0%, rgba(15,23,42,0.95) 100%)',
                  boxShadow: '0 6px 16px rgba(2,6,23,0.28)',
                }}
              >
                <Link
                  href={`/subsidiaries/${node.id}`}
                  className="block text-[13px] font-semibold leading-5 hover:underline"
                  style={{ color: 'var(--accent-primary-strong)' }}
                >
                  {node.code} - {node.name}
                </Link>
                <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                  Type: {node.entityType ?? '-'}
                </p>
                <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                  Tax ID: {node.taxId ?? '-'}
                </p>
                {flagUrl ? (
                  <img
                    src={flagUrl}
                    crossOrigin="anonymous"
                    alt={node.country ? `${node.country} flag` : 'Country flag'}
                    className="absolute bottom-2 left-3 h-3.5 w-5 rounded-[2px] border"
                    style={{ borderColor: 'rgba(255,255,255,0.25)' }}
                  />
                ) : (
                  <span
                    className="absolute bottom-2 left-3 text-[10px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    --
                  </span>
                )}
              </div>
            )
          })}
          </div>
        </div>
      </div>
    </div>
  )
}
