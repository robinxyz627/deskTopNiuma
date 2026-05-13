import { invoke } from '@tauri-apps/api/core'

/**
 * 透明遮罩管理器
 * 用于生成和更新窗口的透明遮罩缓存
 */

// 窗口尺寸
const WINDOW_WIDTH = 500
const WINDOW_HEIGHT = 500

// UI 元素配置
interface UIElement {
  type: 'circle' | 'rect' | 'roundedRect'
  x: number
  y: number
  // 对于 circle: radius, 对于 rect: width/height
  radius?: number
  width?: number
  height?: number
  cornerRadius?: number
}

/**
 * 生成透明遮罩数据
 * @param elements UI 元素列表
 * @returns Alpha 数据数组 (每个像素一个字节)
 */
export function generateAlphaMask(elements: UIElement[]): Uint8Array {
  const alphaData = new Uint8Array(WINDOW_WIDTH * WINDOW_HEIGHT)

  // 初始化为全透明
  alphaData.fill(0)

  // 绘制每个元素
  for (const element of elements) {
    drawElement(alphaData, element)
  }

  return alphaData
}

/**
 * 在 Alpha 数据上绘制元素
 */
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

/**
 * 绘制圆形
 */
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

/**
 * 绘制矩形
 */
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

/**
 * 绘制圆角矩形
 */
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

      // 检查四个角
      const relX = px - x
      const relY = py - y

      // 左上角
      if (relX < cornerRadius && relY < cornerRadius) {
        const dx = cornerRadius - relX
        const dy = cornerRadius - relY
        isInside = dx * dx + dy * dy <= cornerRadius * cornerRadius
      }
      // 右上角
      else if (relX > width - cornerRadius && relY < cornerRadius) {
        const dx = relX - (width - cornerRadius)
        const dy = cornerRadius - relY
        isInside = dx * dx + dy * dy <= cornerRadius * cornerRadius
      }
      // 左下角
      else if (relX < cornerRadius && relY > height - cornerRadius) {
        const dx = cornerRadius - relX
        const dy = relY - (height - cornerRadius)
        isInside = dx * dx + dy * dy <= cornerRadius * cornerRadius
      }
      // 右下角
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

/**
 * 更新后端的透明遮罩缓存
 */
export async function updateBackendAlphaMask(elements: UIElement[]): Promise<void> {
  const alphaData = generateAlphaMask(elements)

  // 转换为普通数组发送给后端
  const dataArray = Array.from(alphaData)

  await invoke('update_alpha_mask', {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    data: dataArray
  })
}

/**
 * 获取默认的 UI 元素配置（只有牛牛头像）
 * PetAvatar: 80x80px，居中于 (250, 250)
 */
export function getDefaultElements(): UIElement[] {
  return [
    // 牛牛头像 - 居中，半径 40px
    { type: 'circle', x: 250, y: 250, radius: 40 }
  ]
}

/**
 * 获取菜单展开时的 UI 元素配置
 * menu-center: 50x50px，半径 25px
 * menu-item: 50x50px，半径 25px
 * 分布半径: 85px
 */
export function getMenuElements(): UIElement[] {
  const elements: UIElement[] = [
    // 牛牛头像
    { type: 'circle', x: 250, y: 250, radius: 40 },
    // 中心关闭按钮
    { type: 'circle', x: 250, y: 250, radius: 25 }
  ]

  // 6 个菜单项，围绕中心分布
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

/**
 * 获取侧边面板展开时的 UI 元素配置
 * SidePanel: width 140px，高度约 150px（根据内容变化）
 * 使用 transform: translate(-50%, -50%) 居中
 */
export function getPanelElements(menuIndex: number): UIElement[] {
  const elements: UIElement[] = getMenuElements()

  // 侧边面板位置计算
  const menuRadius = 85
  const panelOffset = 80
  const angle = (menuIndex * 60 - 90) * (Math.PI / 180)
  const panelX = 250 + Math.cos(angle) * (menuRadius + panelOffset)
  const panelY = 250 + Math.sin(angle) * (menuRadius + panelOffset)

  // 面板尺寸 140x150，圆角 12
  // 由于使用 translate(-50%, -50%) 居中，所以绘制时需要从中心点减去一半尺寸
  elements.push({
    type: 'roundedRect',
    x: panelX - 70,  // 140 / 2
    y: panelY - 75,  // 150 / 2
    width: 140,
    height: 150,
    cornerRadius: 12
  })

  return elements
}

/**
 * 获取全屏弹窗时的 UI 元素配置
 * 整个窗口都可点击（设置面板、日报、弹球游戏等）
 */
export function getFullscreenElements(): UIElement[] {
  return [
    // 整个窗口作为一个矩形
    { type: 'rect', x: 0, y: 0, width: WINDOW_WIDTH, height: WINDOW_HEIGHT }
  ]
}
