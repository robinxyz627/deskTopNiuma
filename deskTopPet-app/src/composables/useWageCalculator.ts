import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { SlackingRecord, HourlySnapshot, WorkSummary, WorkSession } from '@/types'

/** 生成唯一ID */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/**
 * 核心工资计算逻辑
 * 
 * 关键逻辑：每小时工资是固定的，摸鱼不减少收入，只减少工作时间，从而拉高分均收入。
 * 
 * 公式：
 * - 每小时工资 = 日薪 / 工作时长
 * - 某小时分均收入 = 每小时工资 / 该小时实际工作分钟数
 * - 实时分均收入 = 每小时工资 / (当前分钟数 - 当前小时已摸鱼分钟数)
 */
export function useWageCalculator() {
  // ===== 状态 =====
  const clockInTime = ref<Date | null>(null)
  const clockOutTime = ref<Date | null>(null)
  const isWorking = ref(false)
  const isSlacking = ref(false)
  const currentSlackingStart = ref<Date | null>(null)
  const slackingRecords = ref<SlackingRecord[]>([])
  const dailyIncome = ref(200)
  const workHoursPerDay = ref(8)
  const currentTime = ref(new Date())

  // 定时器
  let tickInterval: ReturnType<typeof setInterval> | null = null

  // 组件挂载时启动时钟
  onMounted(() => {
    startTicking()
  })

  // ===== 计算属性 =====
  const hourlyWage = computed(() => dailyIncome.value / workHoursPerDay.value)

  /** 每秒收入 */
  const incomePerSecond = computed(() => dailyIncome.value / (workHoursPerDay.value * 3600))

  /** 当前时间字符串 HH:MM:SS */
  const currentTimeStr = computed(() => {
    const t = currentTime.value
    return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`
  })

  /** 上班打卡时间字符串 */
  const clockInTimeStr = computed(() => {
    if (!clockInTime.value) return '--:--:--'
    const t = clockInTime.value
    return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`
  })

  /** 已工作秒数（排除摸鱼时间） */
  const workedSeconds = computed(() => {
    if (!clockInTime.value) return 0
    const totalSeconds = (currentTime.value.getTime() - clockInTime.value.getTime()) / 1000
    const slackSeconds = totalSlackingMinutes.value * 60
    return Math.max(0, totalSeconds - slackSeconds)
  })

  /** 已赚金额 = 每秒收入 × 实际工作秒数 */
  const earnedAmount = computed(() => {
    if (!clockInTime.value || !isWorking.value) return 0
    return incomePerSecond.value * workedSeconds.value
  })

  /** 当前小时内已摸鱼分钟数 */
  const currentHourSlackingMinutes = computed(() => {
    const now = currentTime.value
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0)
    let total = 0
    for (const record of slackingRecords.value) {
      const start = new Date(record.startTime)
      const end = record.endTime ? new Date(record.endTime) : now
      // 计算该记录在当前小时内的重叠部分
      const overlapStart = new Date(Math.max(start.getTime(), hourStart.getTime()))
      const overlapEnd = new Date(Math.min(end.getTime(), now.getTime()))
      if (overlapEnd > overlapStart) {
        total += (overlapEnd.getTime() - overlapStart.getTime()) / 60000
      }
    }
    return total
  })

  /** 当前小时的实时分均收入 */
  const currentMinuteRate = computed(() => {
    if (!isWorking.value) return 0
    const now = currentTime.value
    const currentMinute = now.getMinutes() // 当前小时内的分钟数
    const totalMinutes = currentMinute + 1 // 包含当前分钟
    const slackMin = currentHourSlackingMinutes.value
    const workMinutes = Math.max(1, totalMinutes - slackMin)
    return hourlyWage.value / workMinutes
  })

  /** 当前摸鱼时长（分钟） */
  const currentSlackingDuration = computed(() => {
    if (!isSlacking.value || !currentSlackingStart.value) return 0
    return (currentTime.value.getTime() - currentSlackingStart.value.getTime()) / 60000
  })

  /** 总摸鱼时长（分钟） */
  const totalSlackingMinutes = computed(() => {
    let total = 0
    for (const record of slackingRecords.value) {
      total += record.duration
    }
    if (isSlacking.value && currentSlackingStart.value) {
      total += currentSlackingDuration.value
    }
    return total
  })

  // ===== 方法 =====

  /** 上班打卡 */
  function clockIn(time?: Date) {
    clockInTime.value = time || new Date()
    clockOutTime.value = null
    isWorking.value = true
    isSlacking.value = false
    slackingRecords.value = []
    startTicking()
  }

  /** 开始摸鱼 */
  function startSlacking() {
    if (!isWorking.value || isSlacking.value) return
    isSlacking.value = true
    currentSlackingStart.value = new Date()
  }

  /** 结束摸鱼 */
  function stopSlacking() {
    if (!isSlacking.value || !currentSlackingStart.value) return
    const endTime = new Date()
    const duration = (endTime.getTime() - currentSlackingStart.value.getTime()) / 60000
    slackingRecords.value.push({
      id: generateId(),
      startTime: currentSlackingStart.value.toISOString(),
      endTime: endTime.toISOString(),
      duration: Math.round(duration * 100) / 100
    })
    isSlacking.value = false
    currentSlackingStart.value = null
  }

  /** 下班打卡 */
  function clockOut(): WorkSession {
    if (!isWorking.value || !clockInTime.value) {
      throw new Error('未上班，无法下班')
    }

    // 如果正在摸鱼，先结束
    if (isSlacking.value) {
      stopSlacking()
    }

    const outTime = new Date()
    clockOutTime.value = outTime
    isWorking.value = false
    stopTicking()

    // 生成小时快照
    const snapshots = generateHourlySnapshots(clockInTime.value, outTime)

    // 生成总结
    const summary = generateSummary(snapshots)

    const session: WorkSession = {
      id: generateId(),
      date: clockInTime.value.toISOString().slice(0, 10),
      clockInTime: clockInTime.value.toISOString(),
      clockOutTime: outTime.toISOString(),
      dailyIncome: dailyIncome.value,
      workHoursPerDay: workHoursPerDay.value,
      slackingRecords: [...slackingRecords.value],
      hourlySnapshots: snapshots,
      summary
    }

    return session
  }

  /** 生成各小时快照 */
  function generateHourlySnapshots(start: Date, end: Date): HourlySnapshot[] {
    const snapshots: HourlySnapshot[] = []
    const startHour = start.getHours()
    const endHour = end.getHours()

    for (let h = startHour; h <= endHour; h++) {
      const hourStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h, 0, 0)
      const hourEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h + 1, 0, 0)
      const effectiveEnd = new Date(Math.min(hourEnd.getTime(), end.getTime()))
      const effectiveStart = new Date(Math.max(hourStart.getTime(), start.getTime()))

      // 计算该小时内的总分钟数
      const totalMinutes = (effectiveEnd.getTime() - effectiveStart.getTime()) / 60000

      // 计算该小时内的摸鱼分钟数
      let slackMin = 0
      for (const record of slackingRecords.value) {
        const rStart = new Date(record.startTime)
        const rEnd = record.endTime ? new Date(record.endTime) : end
        const overlapStart = new Date(Math.max(rStart.getTime(), effectiveStart.getTime()))
        const overlapEnd = new Date(Math.min(rEnd.getTime(), effectiveEnd.getTime()))
        if (overlapEnd > overlapStart) {
          slackMin += (overlapEnd.getTime() - overlapStart.getTime()) / 60000
        }
      }

      const workMin = Math.max(1, totalMinutes - slackMin)
      const minuteRate = hourlyWage.value / workMin

      snapshots.push({
        hour: h,
        slackingMinutes: Math.round(slackMin * 100) / 100,
        workMinutes: Math.round(workMin * 100) / 100,
        minuteRate: Math.round(minuteRate * 100) / 100
      })
    }

    return snapshots
  }

  /** 生成工作总结 */
  function generateSummary(snapshots: HourlySnapshot[]): WorkSummary {
    const totalSlacking = snapshots.reduce((sum, s) => sum + s.slackingMinutes, 0)
    const totalWork = snapshots.reduce((sum, s) => sum + s.workMinutes, 0)
    const totalEarned = snapshots.length * hourlyWage.value
    const avgRate = totalWork > 0 ? totalEarned / totalWork : 0

    let peakRate = 0
    let peakHour = 0
    for (const s of snapshots) {
      if (s.minuteRate > peakRate) {
        peakRate = s.minuteRate
        peakHour = s.hour
      }
    }

    return {
      totalWorkMinutes: Math.round(totalWork * 100) / 100,
      totalSlackingMinutes: Math.round(totalSlacking * 100) / 100,
      totalEarned: Math.round(totalEarned * 100) / 100,
      averageMinuteRate: Math.round(avgRate * 100) / 100,
      peakMinuteRate: Math.round(peakRate * 100) / 100,
      peakHour
    }
  }

  /** 启动定时器 */
  function startTicking() {
    stopTicking()
    tickInterval = setInterval(() => {
      currentTime.value = new Date()
    }, 1000)
  }

  /** 停止定时器 */
  function stopTicking() {
    if (tickInterval) {
      clearInterval(tickInterval)
      tickInterval = null
    }
  }

  /** 重置状态 */
  function reset() {
    stopTicking()
    clockInTime.value = null
    clockOutTime.value = null
    isWorking.value = false
    isSlacking.value = false
    currentSlackingStart.value = null
    slackingRecords.value = []
    currentTime.value = new Date()
  }

  onUnmounted(() => {
    stopTicking()
  })

  return {
    // 状态
    clockInTime,
    clockOutTime,
    isWorking,
    isSlacking,
    slackingRecords,
    dailyIncome,
    workHoursPerDay,
    currentTime,
    // 计算属性
    hourlyWage,
    incomePerSecond,
    currentTimeStr,
    clockInTimeStr,
    workedSeconds,
    earnedAmount,
    currentMinuteRate,
    currentSlackingDuration,
    totalSlackingMinutes,
    // 方法
    clockIn,
    startSlacking,
    stopSlacking,
    clockOut,
    reset,
    startTicking
  }
}
