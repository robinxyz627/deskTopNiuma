<template>
  <div class="app-container">
    <PetAvatar @dblclick="toggleMenu" />

    <RadialMenu
      v-if="showMenu"
      :x="250" :y="250"
      @close="showMenu = false"
      @select="handleMenuSelect"
    />

    <SidePanel
      v-if="showPanel"
      :type="panelType"
      :menuIndex="selectedMenuIndex"
      @close="showPanel = false"
    />

    <PongGameWrapper v-if="showPongGame" @close="showPongGame = false" />
    <NovelPanel v-if="showNovel" @close="showNovel = false" />
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
import NovelPanel from './components/NovelPanel.vue'
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
const showNovel = ref(false)
const reportSession = ref<WorkSession | null>(null)
const selectedMenuIndex = ref(0)

// 更新透明遮罩
function updateAlphaMask() {
  let elements

  if (showSettings.value || showReport.value || showPongGame.value || showNovel.value) {
    elements = getFullscreenElements()
  } else if (showPanel.value) {
    elements = getPanelElements(selectedMenuIndex.value)
  } else if (showMenu.value) {
    elements = getMenuElements()
  } else {
    elements = getDefaultElements()
  }

  updateBackendAlphaMask(elements).catch(console.error)
}

watch([showMenu, showPanel, showSettings, showReport, showPongGame, showNovel, selectedMenuIndex], () => {
  updateAlphaMask()
})

onMounted(() => {
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
    'novel': 1,
    'wage': 2,
    'pong': 3,
    'settings': 4,
    'report': 5,
  }
  selectedMenuIndex.value = actionToIndex[action] ?? 0

  switch (action) {
    case 'clockin':
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
    case 'novel':
      showNovel.value = true
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
