<template>
  <div
    class="side-panel"
    :style="panelStyle"
    :class="{ 'is-dragging': isDragging }"
    @click.stop
  >
    <!-- 拖拽手柄 -->
    <div class="panel-header" @mousedown="onHeaderMouseDown">
      <span class="panel-icon">{{ type === 'wage' ? '💰' : '💼' }}</span>
      <span class="panel-title">{{ type === 'wage' ? '工资详情' : '打卡控制' }}</span>
      <button class="panel-close" @click.stop="$emit('close')">✕</button>
    </div>

    <!-- 工资面板 -->
    <template v-if="type === 'wage'">
      <div class="panel-content wage-content">
        <div class="wage-item">
          <span class="label">今日已赚</span>
          <span class="value earned">¥ {{ earnedAmount }}</span>
        </div>
        <div class="wage-item">
          <span class="label">实时分均</span>
          <span class="value rate" :class="{ 'high': wageStore.isSlacking }">
            ¥ {{ minuteRate }}
          </span>
        </div>
        <div class="wage-item" v-if="wageStore.isWorking">
          <span class="label">上班时间</span>
          <span class="value">{{ clockInTime }}</span>
        </div>
        <div class="wage-item" v-if="wageStore.isSlacking">
          <span class="label">摸鱼时长</span>
          <span class="value slacking">{{ slackingTime }}</span>
        </div>
      </div>
    </template>

    <!-- 控制面板 -->
    <template v-if="type === 'control'">
      <div class="panel-content control-content">
        <template v-if="!wageStore.isWorking">
          <button class="action-btn primary" @click="handleClockIn">
            <span class="btn-icon">🚀</span>
            <span>开始上班</span>
          </button>
          <div class="hint">点击开始记录工作时间</div>
        </template>
        <template v-else>
          <div class="status-badge" :class="{ 'slacking': wageStore.isSlacking }">
            {{ wageStore.isSlacking ? '🐟 摸鱼中' : '💪 工作中' }}
          </div>
          <button
            v-if="!wageStore.isSlacking"
            class="action-btn slacking"
            @click="wageStore.startSlacking"
          >
            <span class="btn-icon">🐟</span>
            <span>开始摸鱼</span>
          </button>
          <button
            v-else
            class="action-btn working"
            @click="wageStore.stopSlacking"
          >
            <span class="btn-icon">💪</span>
            <span>停止摸鱼</span>
          </button>
          <button class="action-btn danger" @click="handleClockOut">
            <span class="btn-icon">🏠</span>
            <span>下班打卡</span>
          </button>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWageStore } from '@/stores/wageStore'
import { useDraggable } from '@/composables/useDraggable'

const props = defineProps<{
  type: 'wage' | 'control' | null
  menuIndex: number
}>()

const emit = defineEmits<{
  close: []
}>()

const wageStore = useWageStore()

// 根据菜单索引计算初始位置
const menuRadius = 85
const panelOffset = 80
const angle = computed(() => (props.menuIndex * 60 - 90) * (Math.PI / 180))
const initPanelX = computed(() => 250 + Math.cos(angle.value) * (menuRadius + panelOffset))
const initPanelY = computed(() => 250 + Math.sin(angle.value) * (menuRadius + panelOffset))

const { x, y, isDragging, onHeaderMouseDown } = useDraggable(initPanelX.value, initPanelY.value)

const panelStyle = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
}))

// 工资数据
const earnedAmount = computed(() => wageStore.earnedAmount.toFixed(2))
const minuteRate = computed(() => wageStore.currentMinuteRate.toFixed(2))
const clockInTime = computed(() => {
  if (!wageStore.clockInTime) return '--:--'
  return wageStore.clockInTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
})
const slackingTime = computed(() => {
  const mins = Math.floor(wageStore.totalSlackingMinutes)
  if (mins < 60) return `${mins}分钟`
  const hours = Math.floor(mins / 60)
  const remaining = mins % 60
  return `${hours}小时${remaining}分钟`
})

// 打卡操作
function handleClockIn() {
  wageStore.clockIn()
}

function handleClockOut() {
  wageStore.clockOut()
  emit('close')
}
</script>

<style scoped>
.side-panel {
  position: absolute;
  width: 140px;
  background: linear-gradient(135deg, rgba(30, 30, 46, 0.95), rgba(40, 40, 60, 0.95));
  border-radius: 12px;
  border: 1px solid rgba(137, 180, 250, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  animation: fadeIn 0.2s ease;
  z-index: 50;
  transform: translate(-50%, -50%);
}

.side-panel.is-dragging {
  transition: none !important;
  opacity: 0.9;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(137, 180, 250, 0.1);
  border-bottom: 1px solid rgba(137, 180, 250, 0.2);
  cursor: grab;
  user-select: none;
}

.panel-header:active {
  cursor: grabbing;
}

.panel-icon { font-size: 16px; }
.panel-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.panel-close {
  width: 20px; height: 20px;
  border: none; border-radius: 4px;
  background: transparent; color: #888;
  cursor: pointer; font-size: 12px;
}

.panel-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.panel-content { padding: 12px; }

.wage-content { display: flex; flex-direction: column; gap: 10px; }
.wage-item { display: flex; flex-direction: column; gap: 3px; }
.wage-item .label { font-size: 10px; color: #888; }
.wage-item .value { font-size: 14px; font-weight: 600; color: #fff; }
.wage-item .earned { color: #a6e3a1; }
.wage-item .rate { color: #89b4fa; }
.wage-item .rate.high { color: #f38ba8; }
.wage-item .slacking { color: #f9e2af; }

.control-content { display: flex; flex-direction: column; gap: 10px; }

.status-badge {
  text-align: center; padding: 8px;
  background: rgba(166, 227, 161, 0.1);
  border-radius: 8px; font-size: 12px;
  color: #a6e3a1; font-weight: 500;
}
.status-badge.slacking {
  background: rgba(249, 226, 175, 0.1);
  color: #f9e2af;
}

.action-btn {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; padding: 10px;
  border: none; border-radius: 8px;
  cursor: pointer; font-size: 12px; font-weight: 500;
  transition: all 0.2s;
}
.action-btn .btn-icon { font-size: 14px; }
.action-btn.primary {
  background: linear-gradient(135deg, #89b4fa, #74c7ec);
  color: #1e1e2e;
}
.action-btn.slacking {
  background: linear-gradient(135deg, #f9e2af, #fab387);
  color: #1e1e2e;
}
.action-btn.working {
  background: linear-gradient(135deg, #a6e3a1, #94e2d5);
  color: #1e1e2e;
}
.action-btn.danger {
  background: linear-gradient(135deg, #f38ba8, #eba0ac);
  color: #1e1e2e;
}
.hint { text-align: center; font-size: 10px; color: #666; }
</style>
