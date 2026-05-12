<template>
  <div class="app-container" @mousedown="handleDragStart">
    <!-- 标题栏 -->
    <div class="title-bar" @mousedown="handleDragStart">
      <span class="title-text">🐂 牛马计算器</span>
      <div class="title-buttons">
        <button class="title-btn" @click.stop="handleMinimize" title="最小化">─</button>
        <button class="title-btn close" @click.stop="handleClose" title="关闭">✕</button>
      </div>
    </div>

    <!-- 宠物形象 -->
    <PetAvatar />

    <!-- 工资显示 -->
    <WageDisplay />

    <!-- 控制面板 -->
    <ControlPanel />

    <!-- 设置面板弹窗 -->
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />

    <!-- 日报表弹窗 -->
    <DailyReport v-if="showReport" :session="reportSession" @close="showReport = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'
import PetAvatar from './components/PetAvatar.vue'
import WageDisplay from './components/WageDisplay.vue'
import ControlPanel from './components/ControlPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import DailyReport from './components/DailyReport.vue'
import type { WorkSession } from './types'

const showSettings = ref(false)
const showReport = ref(false)
const reportSession = ref<WorkSession | null>(null)

// 暴露给子组件的方法
function openSettings() {
  showSettings.value = true
}

function openReport(session: WorkSession) {
  reportSession.value = session
  showReport.value = true
}

// 窗口拖动
async function handleDragStart(e: MouseEvent) {
  // 只响应左键
  if (e.button !== 0) return
  // 排除按钮点击
  if ((e.target as HTMLElement).closest('button')) return
  
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().startDragging()
  } catch (err) {
    console.error('拖动失败:', err)
  }
}

// 窗口控制
async function handleMinimize() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().minimize()
  } catch (err) {
    console.error('最小化失败:', err)
  }
}

async function handleClose() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().close()
  } catch (err) {
    console.error('关闭失败:', err)
  }
}

provide('openSettings', openSettings)
provide('openReport', openReport)
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  gap: 6px;
  background: var(--bg-primary);
  border-radius: var(--radius);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  backdrop-filter: blur(20px);
  overflow: hidden;
}

.title-bar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  cursor: grab;
}

.title-bar:active {
  cursor: grabbing;
}

.title-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-blue);
  pointer-events: none;
}

.title-buttons {
  display: flex;
  gap: 4px;
}

.title-btn {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.title-btn:hover {
  background: var(--bg-button);
  color: var(--text-primary);
}

.title-btn.close:hover {
  background: var(--accent-red);
  color: white;
}
</style>
