<template>
  <div class="settings-panel" :style="panelStyle" :class="{ 'is-dragging': isDragging }">
    <!-- 拖拽手柄 -->
    <div class="panel-header" @mousedown="onHeaderMouseDown">
      <h3>⚙️ 设置</h3>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="panel-body">
      <!-- 日薪设置 -->
      <div class="setting-row">
        <label>日薪</label>
        <input type="number" v-model.number="form.dailyIncome" min="0" step="10" class="setting-input" />
      </div>

      <!-- 工作时长 -->
      <div class="setting-row">
        <label>工时</label>
        <input type="number" v-model.number="form.workHoursPerDay" min="1" max="24" step="0.5" class="setting-input" />
      </div>

      <!-- 预览 -->
      <div class="preview-row">
        <span>时薪 <b>¥{{ hourlyWagePreview }}</b></span>
        <span>分均 <b>¥{{ normalMinuteRate }}</b></span>
      </div>

      <!-- 宠物形象 -->
      <div class="setting-row">
        <label>宠物</label>
        <button class="btn-image" @click="changeImage">
          {{ form.petImagePath ? '换图' : '选图' }}
        </button>
        <img v-if="form.petImagePath" :src="form.petImagePath" class="pet-preview" @error="form.petImagePath = ''" />
        <button v-if="form.petImagePath" class="btn-remove" @click="form.petImagePath = ''">✕</button>
      </div>
    </div>

    <div class="panel-footer">
      <button class="btn-save" @click="handleSave">保存</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useSettings } from '@/composables/useSettings'
import { selectImage } from '@/composables/useTauri'
import { useWageStore } from '@/stores/wageStore'
import { useDraggable } from '@/composables/useDraggable'

const emit = defineEmits(['close'])
const { settings, saveSettings } = useSettings()
const wageStore = useWageStore()

const form = reactive({
  dailyIncome: settings.value.dailyIncome,
  workHoursPerDay: settings.value.workHoursPerDay,
  petImagePath: settings.value.petImagePath
})

const hourlyWagePreview = computed(() => (form.dailyIncome / form.workHoursPerDay).toFixed(2))
const normalMinuteRate = computed(() => (form.dailyIncome / form.workHoursPerDay / 60).toFixed(4))

const { x, y, isDragging, onHeaderMouseDown } = useDraggable(250, 180)
const panelStyle = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
}))

async function changeImage() {
  const result = await selectImage()
  if (result) form.petImagePath = result
}

function handleSave() {
  saveSettings({ ...form })
  wageStore.dailyIncome = form.dailyIncome
  wageStore.workHoursPerDay = form.workHoursPerDay
  emit('close')
}
</script>

<style scoped>
.settings-panel {
  position: absolute;
  width: 200px;
  background: rgba(25, 25, 35, 0.85);
  backdrop-filter: blur(8px);
  border-radius: 10px;
  border: 1px solid rgba(137, 180, 250, 0.25);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
  z-index: 100;
  transform: translate(-50%, -50%);
  overflow: hidden;
  font-size: 12px;
  animation: fadeIn 0.15s ease;
}

.settings-panel.is-dragging {
  transition: none !important;
  opacity: 0.85;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(137, 180, 250, 0.15);
  cursor: grab;
  user-select: none;
}

.panel-header h3 {
  font-size: 12px;
  font-weight: 600;
  color: #ccc;
  margin: 0;
}

.close-btn {
  width: 20px; height: 20px;
  border: none; border-radius: 4px;
  background: transparent; color: #666;
  cursor: pointer; font-size: 11px;
}

.close-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.panel-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-row label {
  width: 32px;
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
}

.setting-input {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  border: 1px solid rgba(137, 180, 250, 0.2);
  border-radius: 4px;
  background: rgba(0,0,0,0.3);
  color: #ddd;
  font-size: 12px;
  outline: none;
}

.setting-input:focus {
  border-color: #89b4fa;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #888;
}

.preview-row b {
  color: #89b4fa;
  font-weight: 600;
}

.btn-image {
  padding: 3px 8px;
  border: 1px dashed rgba(137, 180, 250, 0.3);
  border-radius: 4px;
  background: transparent;
  color: #999;
  font-size: 11px;
  cursor: pointer;
}

.btn-image:hover {
  border-color: #89b4fa;
  color: #89b4fa;
}

.pet-preview {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(137, 180, 250, 0.3);
}

.btn-remove {
  width: 16px; height: 16px;
  border: none; border-radius: 50%;
  background: #e74c3c; color: #fff;
  font-size: 8px; cursor: pointer;
  line-height: 16px; text-align: center;
}

.panel-footer {
  padding: 8px 12px;
  border-top: 1px solid rgba(137, 180, 250, 0.15);
}

.btn-save {
  width: 100%;
  padding: 5px;
  border: none;
  border-radius: 4px;
  background: #89b4fa;
  color: #1e1e2e;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save:hover {
  opacity: 0.9;
}
</style>
