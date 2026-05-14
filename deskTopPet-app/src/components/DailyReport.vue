<template>
  <div class="report-panel" :style="panelStyle" :class="{ 'is-dragging': isDragging }">
    <div class="panel-header" @mousedown="onHeaderMouseDown">
      <h3>📊 今日工资报表</h3>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="panel-body" v-if="session">
      <!-- 基本信息 -->
      <div class="info-section">
        <div class="info-row">
          <span class="info-label">📅 日期</span>
          <span class="info-value">{{ session.date }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">🕐 上班</span>
          <span class="info-value">{{ formatTime(session.clockInTime) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">🎉 下班</span>
          <span class="info-value">{{ formatTime(session.clockOutTime!) }}</span>
        </div>
      </div>

      <!-- 统计数据 -->
      <div class="stats-section" v-if="session.summary">
        <div class="stat-card">
          <div class="stat-label">今日收入</div>
          <div class="stat-value accent-green">¥ {{ session.summary.totalEarned.toFixed(2) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">平均分均</div>
          <div class="stat-value accent-blue">¥ {{ session.summary.averageMinuteRate.toFixed(2) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">最高分均</div>
          <div class="stat-value accent-peach">¥ {{ session.summary.peakMinuteRate.toFixed(2) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">摸鱼时长</div>
          <div class="stat-value accent-red">{{ formatMinutes(session.summary.totalSlackingMinutes) }}</div>
        </div>
      </div>

      <!-- 各小时分均收入 -->
      <div class="hourly-section">
        <div class="section-title">各小时分均收入</div>
        <div class="hourly-list">
          <div v-for="snap in session.hourlySnapshots" :key="snap.hour" class="hourly-row">
            <span class="hour-label">{{ String(snap.hour).padStart(2, '0') }}:00</span>
            <div class="hour-bar-wrapper">
              <div
                class="hour-bar"
                :style="{ width: getBarWidth(snap.minuteRate) + '%' }"
                :class="{ 'bar-high': isHighRate(snap.minuteRate) }"
              ></div>
            </div>
            <span class="hour-rate" :class="{ 'rate-high': isHighRate(snap.minuteRate) }">
              ¥{{ snap.minuteRate.toFixed(2) }}
            </span>
            <span v-if="snap.slackingMinutes > 0" class="hour-slack">🐟{{ snap.slackingMinutes }}m</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WorkSession } from '@/types'
import { useDraggable } from '@/composables/useDraggable'

const props = defineProps<{
  session: WorkSession | null
}>()

defineEmits(['close'])

const session = computed(() => props.session)

const { x, y, isDragging, onHeaderMouseDown } = useDraggable(250, 250)
const panelStyle = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
}))

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h > 0) return `${h}小时${m}分`
  return `${m}分钟`
}

function getBarWidth(rate: number): number {
  if (!session.value) return 0
  const maxRate = Math.max(...session.value.hourlySnapshots.map(s => s.minuteRate))
  if (maxRate === 0) return 0
  return Math.max(5, (rate / maxRate) * 100)
}

function isHighRate(rate: number): boolean {
  if (!session.value) return false
  const normalRate = (session.value.dailyIncome / session.value.workHoursPerDay) / 60
  return rate > normalRate * 1.2
}
</script>

<style scoped>
.report-panel {
  position: absolute;
  width: 260px;
  max-height: 360px;
  background: rgba(25, 25, 35, 0.85);
  backdrop-filter: blur(8px);
  border-radius: 10px;
  border: 1px solid rgba(137, 180, 250, 0.2);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
  z-index: 100;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-size: 12px;
  animation: fadeIn 0.15s ease;
}

.report-panel.is-dragging {
  transition: none !important;
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
  flex-shrink: 0;
}

.panel-header h3 {
  font-size: 12px; font-weight: 600; color: #ccc; margin: 0;
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
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-body::-webkit-scrollbar { width: 4px; }
.panel-body::-webkit-scrollbar-thumb { background: rgba(137,180,250,0.2); border-radius: 2px; }

.info-section { display: flex; flex-direction: column; gap: 3px; }
.info-row { display: flex; justify-content: space-between; font-size: 11px; }
.info-label { color: #888; }
.info-value { color: #ddd; font-variant-numeric: tabular-nums; }

.stats-section { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }

.stat-card {
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
  padding: 6px 8px;
  text-align: center;
  border: 1px solid rgba(137,180,250,0.1);
}

.stat-label { font-size: 9px; color: #888; margin-bottom: 2px; }
.stat-value { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
.accent-green { color: #a6e3a1; }
.accent-blue { color: #89b4fa; }
.accent-peach { color: #fab387; }
.accent-red { color: #f38ba8; }

.hourly-section { display: flex; flex-direction: column; gap: 4px; }
.section-title { font-size: 10px; color: #888; font-weight: 600; }
.hourly-list { display: flex; flex-direction: column; gap: 3px; }
.hourly-row { display: flex; align-items: center; gap: 4px; font-size: 10px; }
.hour-label { width: 32px; color: #888; flex-shrink: 0; }
.hour-bar-wrapper { flex: 1; height: 10px; background: rgba(0,0,0,0.2); border-radius: 2px; overflow: hidden; }
.hour-bar { height: 100%; border-radius: 2px; background: #89b4fa; min-width: 3px; }
.hour-bar.bar-high { background: linear-gradient(90deg, #fab387, #f38ba8); }
.hour-rate { width: 48px; text-align: right; color: #ddd; flex-shrink: 0; }
.hour-rate.rate-high { color: #fab387; font-weight: 600; }
.hour-slack { width: 36px; font-size: 9px; color: #f38ba8; flex-shrink: 0; }
</style>
