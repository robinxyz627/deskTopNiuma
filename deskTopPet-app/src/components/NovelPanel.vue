<template>
  <div class="novel-panel" :style="panelStyle" :class="{ 'is-dragging': isDragging }">
    <!-- 标题栏/拖拽手柄 -->
    <div class="novel-header" @mousedown="onHeaderMouseDown">
      <span class="novel-title">📖 小说阅读</span>
      <div class="novel-controls">
        <button class="ctrl-btn" @click.stop="fontSizeDown" title="缩小字号">A−</button>
        <span class="font-size-label">{{ fontSize }}px</span>
        <button class="ctrl-btn" @click.stop="fontSizeUp" title="增大字号">A+</button>
        <button v-if="!content" class="ctrl-btn import-btn" @click.stop="importTxt">导入</button>
        <button class="ctrl-btn close-btn" @click.stop="$emit('close')">✕</button>
      </div>
    </div>

    <!-- 正文区 -->
    <div class="novel-body" :style="{ fontSize: fontSize + 'px' }">
      <template v-if="content">
        <div class="novel-text">{{ content }}</div>
        <div class="novel-import-bar">
          <button class="btn-import" @click="importTxt">📂 换书</button>
        </div>
      </template>
      <template v-else>
        <div class="novel-empty">
          <div class="empty-icon">📚</div>
          <p>暂无书籍</p>
          <button class="btn-import" @click="importTxt">📂 导入TXT文件</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useDraggable } from '@/composables/useDraggable'

const emit = defineEmits<{ close: [] }>()

const content = ref('')
const fontSize = ref(14)

const { x, y, isDragging, onHeaderMouseDown } = useDraggable(250, 250)
const panelStyle = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
}))

function fontSizeUp() {
  fontSize.value = Math.min(32, fontSize.value + 2)
}

function fontSizeDown() {
  fontSize.value = Math.max(10, fontSize.value - 2)
}

async function importTxt() {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')

    const selected = await open({
      multiple: false,
      filters: [{ name: '文本文件', extensions: ['txt'] }]
    })

    if (!selected) return

    const filePath = selected as string
    const text = await readTextFile(filePath)

    // 限制最大字符数，避免性能问题
    if (text.length > 100000) {
      content.value = text.slice(0, 100000) + '\n\n...(已截断，文件过大)'
    } else {
      content.value = text
    }
  } catch (e) {
    console.error('导入TXT失败:', e)
  }
}
</script>

<style scoped>
.novel-panel {
  position: absolute;
  width: 240px;
  max-height: 340px;
  background: rgba(20, 20, 30, 0.75);
  backdrop-filter: blur(6px);
  border-radius: 10px;
  border: 1px solid rgba(137, 180, 250, 0.2);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  z-index: 100;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: fadeIn 0.15s ease;
}

.novel-panel.is-dragging {
  transition: none !important;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

.novel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid rgba(137, 180, 250, 0.15);
  cursor: grab;
  user-select: none;
  flex-shrink: 0;
}

.novel-title {
  font-size: 12px;
  color: #ccc;
  font-weight: 600;
}

.novel-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ctrl-btn {
  padding: 2px 6px;
  border: 1px solid rgba(137, 180, 250, 0.2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: #aaa;
  cursor: pointer;
  font-size: 10px;
  line-height: 1.4;
}

.ctrl-btn:hover {
  background: rgba(137, 180, 250, 0.15);
  color: #89b4fa;
}

.font-size-label {
  font-size: 10px;
  color: #666;
  min-width: 20px;
  text-align: center;
}

.close-btn {
  border-color: rgba(231, 76, 60, 0.3);
  color: #e74c3c;
}
.close-btn:hover {
  background: rgba(231, 76, 60, 0.2);
  color: #ff6b6b;
}

.novel-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  color: #bbb;
  line-height: 1.7;
  min-height: 100px;
}

.novel-body::-webkit-scrollbar {
  width: 4px;
}
.novel-body::-webkit-scrollbar-thumb {
  background: rgba(137, 180, 250, 0.2);
  border-radius: 2px;
}

.novel-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: left;
}

.novel-import-bar {
  text-align: center;
  padding: 10px 0 0;
}

.btn-import {
  padding: 5px 14px;
  border: 1px dashed rgba(137, 180, 250, 0.3);
  border-radius: 6px;
  background: rgba(137, 180, 250, 0.08);
  color: #89b4fa;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-import:hover {
  background: rgba(137, 180, 250, 0.15);
  border-color: #89b4fa;
}

.novel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 30px 0;
}

.empty-icon {
  font-size: 36px;
  opacity: 0.8;
}

.novel-empty p {
  margin: 0;
  font-size: 13px;
  color: #888;
}
</style>
