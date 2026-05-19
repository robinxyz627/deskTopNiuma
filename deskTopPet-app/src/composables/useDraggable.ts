import { ref, type Ref } from 'vue'

export function useDraggable(initialX: number, initialY: number, _elRef?: Ref<HTMLElement | null>, onMove?: (x: number, y: number) => void) {
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

    x.value = Math.max(10, Math.min(490, startX + dx))
    y.value = Math.max(10, Math.min(490, startY + dy))

    onMove?.(x.value, y.value)
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
