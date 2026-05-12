<template>
  <div class="pet-avatar" @mousedown="handleDrag">
    <div class="avatar-wrapper" @dblclick="changeImage">
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
    <!-- 摸鱼状态动画 -->
    <div v-if="wageStore.isSlacking" class="slacking-indicator">
      <span class="zzz z1">Z</span>
      <span class="zzz z2">z</span>
      <span class="zzz z3">z</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettings } from '@/composables/useSettings'
import { selectImage } from '@/composables/useTauri'
import { useWageStore } from '@/stores/wageStore'

const { settings, saveSettings } = useSettings()
const wageStore = useWageStore()
const petImage = ref('')

onMounted(() => {
  petImage.value = settings.value.petImagePath
})

async function changeImage() {
  const result = await selectImage()
  if (result) {
    petImage.value = result
    saveSettings({ ...settings.value, petImagePath: result })
  }
}

function handleDrag(e: MouseEvent) {
  // 双击不触发拖动
  if (e.detail === 2) return
}
</script>

<style scoped>
.pet-avatar {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 4px 0;
  cursor: grab;
}

.avatar-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--border-color);
  transition: all 0.3s;
  background: var(--bg-card);
}

.avatar-wrapper:hover {
  border-color: var(--accent-blue);
  box-shadow: 0 0 15px rgba(137, 180, 250, 0.3);
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
  background: linear-gradient(135deg, var(--bg-card), rgba(137, 180, 250, 0.1));
}

.placeholder-text {
  font-size: 36px;
  animation: float 3s ease-in-out infinite;
}

.slacking-indicator {
  position: absolute;
  top: 0;
  right: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.zzz {
  font-size: 14px;
  color: var(--accent-yellow);
  font-weight: bold;
  opacity: 0;
}

.z1 {
  animation: zzz 2s ease-in-out infinite 0s;
}

.z2 {
  animation: zzz 2s ease-in-out infinite 0.4s;
}

.z3 {
  animation: zzz 2s ease-in-out infinite 0.8s;
}
</style>
