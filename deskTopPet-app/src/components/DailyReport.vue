<template>
  <div class="report-overlay" @click.self="$emit('close')">
    <div class="report-panel">
      <div class="panel-header">
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
            <div 
              v-for="snap in session.hourlySnapshots" 
              :key="snap.hour"
              class="hourly-row"
            >
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
              <span v-if="snap.slackingMinutes > 0" class="hour-slack">
                🐟{{ snap.slackingMinutes }}m
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WorkSession } from '@/types'

const props = defineProps<{
  session: WorkSession | null
}>()

defineEmits(['close'])

const session = computed(() => props.session)

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

/** 获取柱状图宽度百分比 */
function getBarWidth(rate: number): number {
  if (!session.value) return 0
  const maxRate = Math.max(...session.value.hourlySnapshots.map(s => s.minuteRate))
  if (maxRate === 0) return 0
  return Math.max(5, (rate / maxRate) * 100)
}

/** 是否为高分均（摸鱼加成） */
function isHighRate(rate: number): boolean {
  if (!session.value) return false
  const normalRate = (session.value.dailyIncome / session.value.workHoursPerDay) / 60
  return rate > normalRate * 1.2
}
</script>

<style scoped>
.report-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.2s ease;
}

.report-panel {
  width: 320px;
  max-height: 500px;
  background: var(--bg-primary);
  border-radius: var(--radius);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  animation: slideUp 0.3s ease;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
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
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.info-label {
  color: var(--text-muted);
}

.info-value {
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.stats-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-card {
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  padding: 8px;
  text-align: center;
  border: 1px solid var(--border-color);
}

.stat-label {
  font-size: 10px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.accent-green { color: var(--accent-green); }
.accent-blue { color: var(--accent-blue); }
.accent-peach { color: var(--accent-peach); }
.accent-red { color: var(--accent-red); }

.hourly-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-title {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}

.hourly-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hourly-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.hour-label {
  width: 36px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.hour-bar-wrapper {
  flex: 1;
  height: 12px;
  background: var(--bg-card);
  border-radius: 3px;
  overflow: hidden;
}

.hour-bar {
  height: 100%;
  border-radius: 3px;
  background: var(--accent-blue);
  transition: width 0.5s ease;
  min-width: 4px;
}

.hour-bar.bar-high {
  background: linear-gradient(90deg, var(--accent-peach), var(--accent-red));
}

.hour-rate {
  width: 55px;
  text-align: right;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.hour-rate.rate-high {
  color: var(--accent-peach);
  font-weight: 600;
}

.hour-slack {
  width: 40px;
  font-size: 10px;
  color: var(--accent-red);
  flex-shrink: 0;
}
</style>
