<template>
  <div class="wage-display">
    <!-- 当前时间 -->
    <div class="time-display">
      <span class="time-icon">🕐</span>
      <span class="time-text">{{ wageStore.currentTimeStr }}</span>
    </div>

    <!-- 已赚金额 -->
    <div class="earned-section">
      <div class="earned-label">今日已赚</div>
      <div class="earned-amount">
        <span class="currency">¥</span>
        <span class="amount">{{ earnedAmountStr }}</span>
      </div>
    </div>

    <!-- 分均收入 -->
    <div class="rate-section">
      <div class="rate-label">实时分均收入</div>
      <div class="rate-value" :class="{ 'rate-high': isSlacking }">
        ¥ {{ minuteRateStr }}
        <span class="rate-unit">/分钟</span>
      </div>
      <div class="rate-hint" v-if="isSlacking">🔥 摸鱼加成中</div>
    </div>

    <!-- 上班时间 -->
    <div class="clock-in-section" v-if="wageStore.isWorking">
      <span class="clock-in-label">打卡时间</span>
      <span class="clock-in-time">{{ wageStore.clockInTimeStr }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWageStore } from '@/stores/wageStore'

const wageStore = useWageStore()

const earnedAmountStr = computed(() => wageStore.earnedAmount.toFixed(2))

const minuteRateStr = computed(() => wageStore.currentMinuteRate.toFixed(2))

/** 是否正在摸鱼（显示摸鱼加成中） */
const isSlacking = computed(() => {
  return wageStore.isWorking && wageStore.isSlacking
})
</script>

<style scoped>
.wage-display {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
}

.time-display {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary);
}

.time-icon {
  font-size: 12px;
}

.earned-section {
  text-align: center;
}

.earned-label {
  font-size: 10px;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.earned-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
}

.currency {
  font-size: 14px;
  color: var(--accent-green);
  font-weight: 600;
}

.amount {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent-green);
  font-variant-numeric: tabular-nums;
}

.rate-section {
  text-align: center;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  width: 100%;
  border: 1px solid var(--border-color);
}

.rate-label {
  font-size: 10px;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.rate-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-blue);
  font-variant-numeric: tabular-nums;
  transition: color 0.3s;
}

.rate-value.rate-high {
  color: var(--accent-peach);
}

.rate-unit {
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 400;
}

.rate-hint {
  font-size: 10px;
  color: var(--accent-peach);
  margin-top: 2px;
  animation: pulse 2s ease-in-out infinite;
}

.clock-in-section {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
}

.clock-in-label {
  color: var(--text-muted);
}

.clock-in-time {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
</style>
