import { invoke } from '@tauri-apps/api/core'

const WINDOW_WIDTH = 500
const WINDOW_HEIGHT = 500

interface UIElement {
  type: 'circle' | 'rect' | 'roundedRect'
  x: number
  y: number
  radius?: number
  width?: number
  height?: number
  cornerRadius?: number
}

export function generateAlphaMask(elements: UIElement[]): Uint8Array {
  const alphaData = new Uint8Array(WINDOW_WIDTH * WINDOW_HEIGHT)
  alphaData.fill(0)

  for (const element of elements) {
    drawElement(alphaData, element)
  }

  return alphaData
}

function drawElement(alphaData: Uint8Array, element: UIElement) {
  switch (element.type) {
    case 'circle':
      drawCircle(alphaData, element.x, element.y, element.radius || 0)
      break
    case 'rect':
      drawRect(alphaData, element.x, element.y, element.width || 0, element.height || 0)
      break
    case 'roundedRect':
      drawRoundedRect(
        alphaData,
        element.x,
        element.y,
        element.width || 0,
        element.height || 0,
        element.cornerRadius || 0
      )
      break
  }
}

function drawCircle(alphaData: Uint8Array, cx: number, cy: number, radius: number) {
  const r2 = radius * radius
  for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(WINDOW_HEIGHT, Math.ceil(cy + radius)); y++) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(WINDOW_WIDTH, Math.ceil(cx + radius)); x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r2) {
        alphaData[y * WINDOW_WIDTH + x] = 255
      }
    }
  }
}

function drawRect(alphaData: Uint8Array, x: number, y: number, width: number, height: number) {
  const startX = Math.max(0, Math.floor(x))
  const startY = Math.max(0, Math.floor(y))
  const endX = Math.min(WINDOW_WIDTH, Math.ceil(x + width))
  const endY = Math.min(WINDOW_HEIGHT, Math.ceil(y + height))

  for (let py = startY; py < endY; py++) {
    for (let px = startX; px < endX; px++) {
      alphaData[py * WINDOW_WIDTH + px] = 255
    }
  }
}

function drawRoundedRect(
  alphaData: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: number
) {
  const startX = Math.max(0, Math.floor(x))
  const startY = Math.max(0, Math.floor(y))
  const endX = Math.min(WINDOW_WIDTH, Math.ceil(x + width))
  const endY = Math.min(WINDOW_HEIGHT, Math.ceil(y + height))

  for (let py = startY; py < endY; py++) {
    for (let px = startX; px < endX; px++) {
      let isInside = true

      const relX = px - x
      const relY = py - y

      if (relX < cornerRadius && relY < cornerRadius) {
        const dx = cornerRadius - relX
        const dy = cornerRadius - relY
        isInside = dx * dx + dy * dy <= cornerRadius * cornerRadius
      }
      else if (relX > width - cornerRadius && relY < cornerRadius) {
        const dx = relX - (width - cornerRadius)
        const dy = cornerRadius - relY
        isInside = dx * dx + dy * dy <= cornerRadius * cornerRadius
      }
      else if (relX < cornerRadius && relY > height - cornerRadius) {
        const dx = cornerRadius - relX
        const dy = relY - (height - cornerRadius)
        isInside = dx * dx + dy * dy <= cornerRadius * cornerRadius
      }
      else if (relX > width - cornerRadius && relY > height - cornerRadius) {
        const dx = relX - (width - cornerRadius)
        const dy = relY - (height - cornerRadius)
        isInside = dx * dx + dy * dy <= cornerRadius * cornerRadius
      }

      if (isInside) {
        alphaData[py * WINDOW_WIDTH + px] = 255
      }
    }
  }
}

export async function updateBackendAlphaMask(elements: UIElement[]): Promise<void> {
  const alphaData = generateAlphaMask(elements)
  const dataArray = Array.from(alphaData)

  await invoke('update_alpha_mask', {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    data: dataArray
  })
}

export function getDefaultElements(): UIElement[] {
  return [
    { type: 'circle', x: 250, y: 250, radius: 40 }
  ]
}

export function getMenuElements(): UIElement[] {
  const elements: UIElement[] = [
    { type: 'circle', x: 250, y: 250, radius: 40 },
    { type: 'circle', x: 250, y: 250, radius: 25 }
  ]

  const menuRadius = 85
  const menuItemRadius = 25
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 90) * (Math.PI / 180)
    const x = 250 + Math.cos(angle) * menuRadius
    const y = 250 + Math.sin(angle) * menuRadius
    elements.push({ type: 'circle', x, y, radius: menuItemRadius })
  }

  return elements
}

export function getPanelElements(menuIndex: number, panelX?: number, panelY?: number): UIElement[] {
  const elements: UIElement[] = getMenuElements()

  const menuRadius = 85
  const panelOffset = 80
  const angle = (menuIndex * 60 - 90) * (Math.PI / 180)
  const px = panelX ?? 250 + Math.cos(angle) * (menuRadius + panelOffset)
  const py = panelY ?? 250 + Math.sin(angle) * (menuRadius + panelOffset)

  elements.push({
    type: 'roundedRect',
    x: px - 70,
    y: py - 75,
    width: 140,
    height: 150,
    cornerRadius: 12
  })

  return elements
}

export function getFullscreenElements(): UIElement[] {
  return [
    { type: 'rect', x: 0, y: 0, width: WINDOW_WIDTH, height: WINDOW_HEIGHT }
  ]
}
