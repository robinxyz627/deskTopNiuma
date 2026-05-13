<template>
  <div 
    class="pet-avatar"
    :class="{ 'is-dragging': isDragging }"
    @click="onClick"
    @dblclick="onDblClick"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @mousemove="onMouseMove"
  >
    <div class="avatar-wrapper">
      <img 
        v-if="petImage" 
        :src="petImage" 
        class="pet-image"
        @error="petImage = ''"
      />
      <div v-else class="pet-placeholder">
        <span class="placeholder-text">🐂</span>
      </div>
    </div>
    <!-- 摸鱼动画 -->
    <div v-if="wageStore.isSlacking" class="slacking-indicator">
      <span class="zzz">Zzz</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSettings } from '@/composables/useSettings'
import { useWageStore } from '@/stores/wageStore'
import { invoke } from '@tauri-apps/api/core'

const { settings } = useSettings()
const wageStore = useWageStore()
const petImage = ref('')

// 拖动状态
const isMouseDown = ref(false)
const isDragging = ref(false)
const dragStartPos = ref({ x: 0, y: 0 })
const DRAG_THRESHOLD = 5

const emit = defineEmits<{
  dblclick: [e: MouseEvent]
}>()

onMounted(() => {
  petImage.value = settings.value.petImagePath
  document.addEventListener('mousemove', onGlobalMouseMove)
  document.addEventListener('mouseup', onGlobalMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onGlobalMouseMove)
  document.removeEventListener('mouseup', onGlobalMouseUp)
})

function onClick(e: MouseEvent) {
  console.log('CLICK event fired!', e)
}

function onDblClick(e: MouseEvent) {
  console.log('DBLCLICK event fired!', e)
  emit('dblclick', e)
}

function onMouseDown(e: MouseEvent) {
  console.log('MOUSEDOWN event fired!', e.button, e.screenX, e.screenY)
  if (e.button !== 0) return
  isMouseDown.value = true
  isDragging.value = false
  dragStartPos.value = { x: e.screenX, y: e.screenY }
}

function onMouseUp(e: MouseEvent) {
  console.log('MOUSEUP event fired!', e)
}

function onGlobalMouseMove(e: MouseEvent) {
  if (!isMouseDown.value) return

  const deltaX = Math.abs(e.screenX - dragStartPos.value.x)
  const deltaY = Math.abs(e.screenY - dragStartPos.value.y)

  if (deltaX <= DRAG_THRESHOLD && deltaY <= DRAG_THRESHOLD) {
    return
  }

  if (!isDragging.value) {
    isDragging.value = true
    invoke('start_drag', {
      mouseX: dragStartPos.value.x,
      mouseY: dragStartPos.value.y
    })
  }

  invoke('drag_to', { mouseX: e.screenX, mouseY: e.screenY })
}

function onGlobalMouseUp() {
  isMouseDown.value = false
  isDragging.value = false
}

function onMouseMove(_e: MouseEvent) {
  // 空实现
}
</script>

<style scoped>
.pet-avatar {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.pet-avatar.is-dragging {
  cursor: grabbing;
}

.avatar-wrapper {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(137, 180, 250, 0.5);
  background: linear-gradient(135deg, #1e1e2e, #2d2d44);
  box-shadow: 0 0 20px rgba(137, 180, 250, 0.3);
  transition: all 0.3s;
}

.avatar-wrapper:hover {
  border-color: #89b4fa;
  box-shadow: 0 0 30px rgba(137, 180, 250, 0.5);
}

.pet-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pet-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  font-size: 40px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.slacking-indicator {
  position: absolute;
  top: -5px;
  right: 0;
  pointer-events: none;
}

.zzz {
  font-size: 12px;
  color: #f9e2af;
  font-weight: bold;
  animation: zzz 2s ease-in-out infinite;
}

@keyframes zzz {
  0%, 100% { opacity: 0; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-10px); }
}
</style>
