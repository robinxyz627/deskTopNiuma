/** 摸鱼记录 */
export interface SlackingRecord {
  id: string
  startTime: string       // ISO 格式
  endTime?: string        // ISO 格式，为空表示正在摸鱼
  duration: number        // 摸鱼时长（分钟）
}

/** 小时快照 - 记录每小时的分均收入（下班时生成） */
export interface HourlySnapshot {
  hour: number            // 小时数 (0-23)
  slackingMinutes: number // 该小时摸鱼分钟数
  workMinutes: number     // 该小时实际工作分钟数 = 60 - slackingMinutes
  minuteRate: number      // 分均收入 = hourlyWage / workMinutes
}

/** 工作总结 */
export interface WorkSummary {
  totalWorkMinutes: number
  totalSlackingMinutes: number
  totalEarned: number
  averageMinuteRate: number
  peakMinuteRate: number
  peakHour: number
}

/** 工作会话 - 一次上班到下班的过程 */
export interface WorkSession {
  id: string
  date: string            // YYYY-MM-DD
  clockInTime: string     // ISO 格式
  clockOutTime?: string
  dailyIncome: number
  workHoursPerDay: number
  slackingRecords: SlackingRecord[]
  hourlySnapshots: HourlySnapshot[]
  summary?: WorkSummary
}

/** 用户设置 */
export interface UserSettings {
  dailyIncome: number
  workHoursPerDay: number
  petImagePath: string
}

/** 工作状态枚举 */
export type WorkStatus = 'idle' | 'working' | 'slacking'
