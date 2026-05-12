<template>
  <div class="control-panel">
    <!-- 空闲状态 -->
    <template v-if="!wageStore.isWorking">
      <button class="btn btn-primary" @click="handleClockIn">
        <span class="btn-icon">💼</span>
        <span>上班打卡</span>
      </button>
      <button class="btn btn-secondary" @click="openSettingsPanel">
        <span class="btn-icon">⚙️</span>
        <span>设置</span>
      </button>
    </template>

    <!-- 工作状态 -->
    <template v-else>
      <!-- 摸鱼按钮 -->
      <button 
        v-if="!wageStore.isSlacking" 
        class="btn btn-slacking" 
        @click="wageStore.startSlacking"
      >
        <span class="btn-icon">🐟</span>
        <span>开始摸鱼</span>
      </button>
      <button 
        v-else 
        class="btn btn-slacking active" 
        @click="wageStore.stopSlacking"
      >
        <span class="btn-icon">🐟</span>
        <span>结束摸鱼</span>
      </button>

      <!-- 摸鱼中状态 -->
      <div v-if="wageStore.isSlacking" class="slacking-status">
        <span class="slacking-dot"></span>
        摸鱼中 {{ slackingDurationStr }}
      </div>

      <!-- 下班按钮 -->
      <button class="btn btn-danger" @click="handleClockOut">
        <span class="btn-icon">🎉</span>
        <span>下班打卡</span>
      </button>

      <!-- 设置按钮 -->
      <button class="btn btn-small" @click="openSettingsPanel">
        ⚙️
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useWageStore } from '@/stores/wageStore'

const wageStore = useWageStore()
const openSettings = inject<() => void>('openSettings')!
const openReport = inject<(session: any) => void>('openReport')!

const slackingDurationStr = computed(() => {
  const min = Math.floor(wageStore.currentSlackingDuration)
  const sec = Math.floor((wageStore.currentSlackingDuration % 1) * 60)
  return `${min}分${String(sec).padStart(2, '0')}秒`
})

function handleClockIn() {
  wageStore.clockIn()
}

function handleClockOut() {
  try {
    const session = wageStore.clockOut()
    openReport(session)
  } catch (e: any) {
    alert(e.message)
  }
}

function openSettingsPanel() {
  openSettings()
}
</script>

<style scoped>
.control-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

.btn {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
  color: var(--text-primary);
  background: var(--bg-button);
}

.btn:hover {
  background: var(--bg-button-hover);
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
  background: var(--bg-button-active);
}

.btn-primary {
  background: rgba(166, 227, 161, 0.2);
  border-color: rgba(166, 227, 161, 0.3);
  color: var(--accent-green);
}

.btn-primary:hover {
  background: rgba(166, 227, 161, 0.35);
}

.btn-slacking {
  background: var(--bg-slacking);
  border-color: rgba(243, 139, 168, 0.3);
  color: var(--accent-red);
}

.btn-slacking:hover {
  background: var(--bg-slacking-hover);
}

.btn-slacking.active {
  background: rgba(243, 139, 168, 0.4);
  animation: pulse 2s ease-in-out infinite;
}

.btn-danger {
  background: rgba(249, 226, 175, 0.15);
  border-color: rgba(249, 226, 175, 0.3);
  color: var(--accent-yellow);
}

.btn-danger:hover {
  background: rgba(249, 226, 175, 0.3);
}

.btn-secondary {
  background: var(--bg-button);
}

.btn-small {
  width: auto;
  padding: 4px 12px;
  font-size: 12px;
  background: transparent;
  border-color: transparent;
  color: var(--text-muted);
}

.btn-small:hover {
  color: var(--text-secondary);
  background: var(--bg-button);
}

.btn-icon {
  font-size: 14px;
}

.slacking-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--accent-red);
  animation: pulse 2s ease-in-out infinite;
}

.slacking-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-red);
  animation: pulse 1s ease-in-out infinite;
}
</style>
