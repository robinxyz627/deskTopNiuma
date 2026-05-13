<template>
  <div class="app-container">
    <!-- 牛牛头像 -->
    <PetAvatar 
      @dblclick="toggleMenu" 
    />

    <!-- 径向菜单 -->
    <RadialMenu
      v-if="showMenu"
      :x="250"
      :y="250"
      @close="showMenu = false"
      @select="handleMenuSelect"
    />

    <!-- 侧边面板 -->
    <SidePanel
      v-if="showPanel"
      :type="panelType"
      :menuIndex="selectedMenuIndex"
      @close="showPanel = false"
    />

    <!-- 弹窗 -->
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    <DailyReport v-if="showReport" :session="reportSession" @close="showReport = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'
import PetAvatar from './components/PetAvatar.vue'
import RadialMenu from './components/RadialMenu.vue'
import SidePanel from './components/SidePanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import DailyReport from './components/DailyReport.vue'
import type { WorkSession } from './types'

const showMenu = ref(false)
const showPanel = ref(false)
const panelType = ref<'wage' | 'control' | null>(null)
const showSettings = ref(false)
const showReport = ref(false)
const reportSession = ref<WorkSession | null>(null)
const selectedMenuIndex = ref(0)

// 切换菜单（固定窗口大小，只切换菜单显示）
function toggleMenu() {
  if (showMenu.value) {
    showMenu.value = false
    showPanel.value = false
  } else {
    showMenu.value = true
  }
}

// 菜单选择
function handleMenuSelect(action: string) {
  const actionToIndex: Record<string, number> = {
    'clockin': 0,
    'slacking': 1,
    'wage': 2,
    'pong': 3,
    'settings': 4,
    'report': 5,
  }
  selectedMenuIndex.value = actionToIndex[action] ?? 0

  switch (action) {
    case 'clockin':
    case 'slacking':
      panelType.value = 'control'
      showPanel.value = true
      break
    case 'wage':
      panelType.value = 'wage'
      showPanel.value = true
      break
    case 'pong':
      showMenu.value = false
      break
    case 'settings':
      showSettings.value = true
      showMenu.value = false
      break
    case 'report':
      showMenu.value = false
      break
  }
}

provide('openSettings', () => showSettings.value = true)
provide('openReport', (s: WorkSession) => { reportSession.value = s; showReport.value = true })
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: transparent;
}
</style>
