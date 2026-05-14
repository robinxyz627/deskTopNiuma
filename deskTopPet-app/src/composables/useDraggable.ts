import { ref, type Ref } from 'vue'

/**
 * 面板拖拽 Composable
 * 用于在 500x500 窗口内拖动任意面板
 * @param initialX - 初始 X 位置（相对于窗口左上角）
 * @param initialY - 初始 Y 位置（相对于窗口左上角）
 * @param elRef - 面板根元素 ref（用于设置 dragTarget）
 */
export function useDraggable(initialX: number, initialY: number, elRef?: Ref<HTMLElement | null>) {
  const x = ref(initialX)
  const y = ref(initialY)
  const isDragging = ref(false)

  let startMouseX = 0
  let startMouseY = 0
  let startX = 0
  let startY = 0

  function onHeaderMouseDown(e: MouseEvent) {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    isDragging.value = true
    startMouseX = e.clientX
    startMouseY = e.clientY
    startX = x.value
    startY = y.value

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function onMouseMove(e: MouseEvent) {
    const dx = e.clientX - startMouseX
    const dy = e.clientY - startMouseY

    // 限制在窗口内（500x500），留边距
    x.value = Math.max(10, Math.min(490, startX + dx))
    y.value = Math.max(10, Math.min(490, startY + dy))
  }

  function onMouseUp() {
    isDragging.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  return {
    x,
    y,
    isDragging,
    onHeaderMouseDown,
  }
}
