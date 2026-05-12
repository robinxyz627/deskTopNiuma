import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SlackingRecord, HourlySnapshot, WorkSummary, WorkSession } from '@/types'

/** 生成唯一ID */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export const useWageStore = defineStore('wage', () => {
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

  // 启动时钟
  function startTicking() {
    if (tickInterval) return
    tickInterval = setInterval(() => {
      currentTime.value = new Date()
    }, 1000)
  }

  // 立即启动时钟
  startTicking()

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

  /** 总摸鱼时长（分钟） */
  const totalSlackingMinutes = computed(() => {
    let total = 0
    for (const record of slackingRecords.value) {
      total += record.duration
    }
    if (isSlacking.value && currentSlackingStart.value) {
      const dur = (currentTime.value.getTime() - currentSlackingStart.value.getTime()) / 60000
      total += dur
    }
    return total
  })

  /** 总经过秒数（从打卡到现在的全部时间） */
  const totalElapsedSeconds = computed(() => {
    if (!clockInTime.value || !isWorking.value) return 0
    return (currentTime.value.getTime() - clockInTime.value.getTime()) / 1000
  })

  /** 已赚金额 = 每秒收入 × 总经过秒数（摸鱼时间也照常赚钱） */
  const earnedAmount = computed(() => {
    if (!clockInTime.value || !isWorking.value) return 0
    return incomePerSecond.value * totalElapsedSeconds.value
  })

  /** 当前小时内已摸鱼分钟数 */
  const currentHourSlackingMinutes = computed(() => {
    const now = currentTime.value
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0)
    let total = 0
    
    // 计算已记录的摸鱼
    for (const record of slackingRecords.value) {
      const start = new Date(record.startTime)
      const end = record.endTime ? new Date(record.endTime) : now
      const overlapStart = new Date(Math.max(start.getTime(), hourStart.getTime()))
      const overlapEnd = new Date(Math.min(end.getTime(), now.getTime()))
      if (overlapEnd > overlapStart) {
        total += (overlapEnd.getTime() - overlapStart.getTime()) / 60000
      }
    }
    
    // 计算当前正在进行的摸鱼
    if (isSlacking.value && currentSlackingStart.value) {
      const start = currentSlackingStart.value
      const overlapStart = new Date(Math.max(start.getTime(), hourStart.getTime()))
      const overlapEnd = now
      if (overlapEnd > overlapStart) {
        total += (overlapEnd.getTime() - overlapStart.getTime()) / 60000
      }
    }
    
    return total
  })

  /** 当前小时的实时分均收入
   *  公式：实时分均 = (已过分钟 × 基础分均a) / (已过分钟 - 当小时摸鱼分钟)
   *  其中 基础分均a = hourlyWage / 60
   *  已过分钟 = 从本小时开始(或打卡时间，取较晚者)到现在的分钟数
   *  注意：此值每分钟更新一次，不是每秒
   */
  const currentMinuteRate = computed(() => {
    if (!isWorking.value || !clockInTime.value) return 0
    const now = currentTime.value
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0)
    // 实际进入当前小时的起始时间 = 本小时整点 和 打卡时间 取较晚者
    const effectiveStart = new Date(Math.max(hourStart.getTime(), clockInTime.value.getTime()))
    // 已过分钟数（向下取整，确保每分钟内数值稳定）
    const elapsedMinutes = Math.floor((now.getTime() - effectiveStart.getTime()) / 60000)
    if (elapsedMinutes <= 0) return hourlyWage.value / 60 // 刚开始，返回基础分均
    // 当小时摸鱼分钟数（向下取整）
    const slackMin = Math.floor(currentHourSlackingMinutes.value)
    // 实际工作分钟数
    const workMinutes = Math.max(1, elapsedMinutes - slackMin)
    // 基础分均 a = hourlyWage / 60
    const baseMinuteRate = hourlyWage.value / 60
    // 实时分均 = 已赚(该小时) / 实际工作分钟 = (elapsedMinutes × baseMinuteRate) / workMinutes
    return (elapsedMinutes * baseMinuteRate) / workMinutes
  })

  /** 当前摸鱼时长（分钟） */
  const currentSlackingDuration = computed(() => {
    if (!isSlacking.value || !currentSlackingStart.value) return 0
    return (currentTime.value.getTime() - currentSlackingStart.value.getTime()) / 60000
  })

  // ===== 方法 =====

  /** 上班打卡 */
  function clockIn() {
    clockInTime.value = new Date()
    clockOutTime.value = null
    isWorking.value = true
    isSlacking.value = false
    slackingRecords.value = []
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

    if (isSlacking.value) {
      stopSlacking()
    }

    const outTime = new Date()
    clockOutTime.value = outTime
    isWorking.value = false

    const snapshots = generateHourlySnapshots(clockInTime.value, outTime)
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

      const totalMinutes = (effectiveEnd.getTime() - effectiveStart.getTime()) / 60000

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
    totalElapsedSeconds,
    earnedAmount,
    currentMinuteRate,
    currentSlackingDuration,
    totalSlackingMinutes,
    // 方法
    clockIn,
    startSlacking,
    stopSlacking,
    clockOut
  }
})
