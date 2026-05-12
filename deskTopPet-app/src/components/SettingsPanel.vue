<template>
  <div class="settings-overlay" @click.self="$emit('close')">
    <div class="settings-panel">
      <div class="panel-header">
        <h3>⚙️ 设置</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="panel-body">
        <!-- 日薪设置 -->
        <div class="setting-item">
          <label>日薪（元）</label>
          <input 
            type="number" 
            v-model.number="form.dailyIncome" 
            min="0" 
            step="10"
            class="setting-input"
          />
        </div>

        <!-- 工作时长 -->
        <div class="setting-item">
          <label>工作时长（小时）</label>
          <input 
            type="number" 
            v-model.number="form.workHoursPerDay" 
            min="1" 
            max="24"
            step="0.5"
            class="setting-input"
          />
        </div>

        <!-- 每小时工资预览 -->
        <div class="preview-info">
          <span>每小时工资：</span>
          <span class="preview-value">¥ {{ hourlyWagePreview }}</span>
        </div>
        <div class="preview-info">
          <span>正常分均收入：</span>
          <span class="preview-value">¥ {{ normalMinuteRate }}</span>
        </div>

        <!-- 宠物形象 -->
        <div class="setting-item">
          <label>宠物形象</label>
          <button class="btn-change-image" @click="changeImage">
            {{ form.petImagePath ? '更换图片' : '选择图片' }}
          </button>
          <div v-if="form.petImagePath" class="image-preview">
            <img :src="form.petImagePath" @error="form.petImagePath = ''" />
            <button class="btn-remove-image" @click="form.petImagePath = ''">✕</button>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <button class="btn-save" @click="handleSave">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useSettings } from '@/composables/useSettings'
import { selectImage } from '@/composables/useTauri'
import { useWageStore } from '@/stores/wageStore'

const emit = defineEmits(['close'])
const { settings, saveSettings } = useSettings()
const wageStore = useWageStore()

const form = reactive({
  dailyIncome: settings.value.dailyIncome,
  workHoursPerDay: settings.value.workHoursPerDay,
  petImagePath: settings.value.petImagePath
})

const hourlyWagePreview = computed(() => {
  return (form.dailyIncome / form.workHoursPerDay).toFixed(2)
})

const normalMinuteRate = computed(() => {
  return (form.dailyIncome / form.workHoursPerDay / 60).toFixed(4)
})

async function changeImage() {
  const result = await selectImage()
  if (result) {
    form.petImagePath = result
  }
}

function handleSave() {
  saveSettings({ ...form })
  // 同步更新 wageStore
  wageStore.dailyIncome = form.dailyIncome
  wageStore.workHoursPerDay = form.workHoursPerDay
  emit('close')
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.2s ease;
}

.settings-panel {
  width: 280px;
  background: var(--bg-primary);
  border-radius: var(--radius);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  animation: slideUp 0.3s ease;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
  font-size: 14px;
  font-weight: 600;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.close-btn:hover {
  background: var(--bg-button);
}

.panel-body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-item label {
  font-size: 11px;
  color: var(--text-secondary);
}

.setting-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.setting-input:focus {
  border-color: var(--accent-blue);
}

.preview-info {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
}

.preview-value {
  color: var(--accent-blue);
  font-weight: 500;
}

.btn-change-image {
  padding: 6px 12px;
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-change-image:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  background: rgba(137, 180, 250, 0.1);
}

.image-preview {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-remove-image {
  position: absolute;
  top: 0;
  right: 0;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: var(--accent-red);
  color: white;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
}

.btn-save {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: var(--accent-blue);
  color: #1e1e2e;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
