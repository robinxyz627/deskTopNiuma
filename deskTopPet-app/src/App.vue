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

    <!-- 弹球游戏 -->
    <PongGameWrapper v-if="showPongGame" @close="showPongGame = false" />

    <!-- 弹窗 -->
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    <DailyReport v-if="showReport" :session="reportSession" @close="showReport = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, provide, watch, onMounted } from 'vue'
import PetAvatar from './components/PetAvatar.vue'
import RadialMenu from './components/RadialMenu.vue'
import SidePanel from './components/SidePanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import DailyReport from './components/DailyReport.vue'
import PongGameWrapper from './components/PongGameWrapper.vue'
import type { WorkSession } from './types'
import {
  updateBackendAlphaMask,
  getDefaultElements,
  getMenuElements,
  getPanelElements,
  getFullscreenElements
} from './utils/alphaMask'

const showMenu = ref(false)
const showPanel = ref(false)
const panelType = ref<'wage' | 'control' | null>(null)
const showSettings = ref(false)
const showReport = ref(false)
const showPongGame = ref(false)
const reportSession = ref<WorkSession | null>(null)
const selectedMenuIndex = ref(0)

// 更新透明遮罩
function updateAlphaMask() {
  let elements

  if (showSettings.value || showReport.value || showPongGame.value) {
    // 全屏弹窗：整个窗口可点击
    elements = getFullscreenElements()
  } else if (showPanel.value) {
    // 侧边面板展开
    elements = getPanelElements(selectedMenuIndex.value)
  } else if (showMenu.value) {
    // 菜单展开
    elements = getMenuElements()
  } else {
    // 只有牛牛
    elements = getDefaultElements()
  }

  updateBackendAlphaMask(elements).catch(console.error)
}

// 监听 UI 变化，更新遮罩
watch([showMenu, showPanel, showSettings, showReport, showPongGame, selectedMenuIndex], () => {
  updateAlphaMask()
})

// 初始化时更新遮罩
onMounted(() => {
  // 延迟一下，确保后端线程已启动
  setTimeout(updateAlphaMask, 600)
})

// 切换菜单
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
      showPongGame.value = true
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
