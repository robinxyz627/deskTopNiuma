import { ref } from 'vue'
import { isTauri } from './useTauri'

const DEFAULT_SETTINGS = {
  dailyIncome: 200,
  workHoursPerDay: 8,
  petImagePath: ''
}

const settings = ref({ ...DEFAULT_SETTINGS })
const isLoaded = ref(false)

/** 加载用户设置 */
export async function loadSettings() {
  if (!isTauri()) {
    settings.value = { ...DEFAULT_SETTINGS }
    isLoaded.value = true
    return
  }

  try {
    const { Store } = await import('@tauri-apps/plugin-store')
    const store = await Store.load('settings.json')
    const saved = await store.get('settings')
    if (saved) {
      settings.value = { ...DEFAULT_SETTINGS, ...(saved as Record<string, unknown>) }
    }
  } catch (e) {
    console.warn('加载设置失败，使用默认值:', e)
    settings.value = { ...DEFAULT_SETTINGS }
  }
  isLoaded.value = true
}

/** 保存用户设置 */
export async function saveSettings(newSettings: typeof settings.value) {
  settings.value = { ...newSettings }
  if (!isTauri()) return

  try {
    const { Store } = await import('@tauri-apps/plugin-store')
    const store = await Store.load('settings.json')
    await store.set('settings', settings.value)
    await store.save()
  } catch (e) {
    console.error('保存设置失败:', e)
  }
}

export function useSettings() {
  return {
    settings,
    isLoaded,
    loadSettings,
    saveSettings
  }
}
