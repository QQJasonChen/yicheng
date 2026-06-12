import {
  DayEntry,
  Learning,
  Project,
  Settings,
  Task,
  defaultSettings,
  emptyDay,
} from './types'

const DAY_PREFIX = 'wj:day:'
const PROJECTS_KEY = 'wj:projects'
const SETTINGS_KEY = 'wj:settings'
const META_KEY = 'wj:meta' // 各 key 最後修改時間（未來同步用）

// ---- 日期工具（一律使用本地時區） ----

export const toDateKey = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const fromDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (key: string, n: number): string => {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

/** 該日期所屬週的星期一（週為 一 ~ 日） */
export const mondayOf = (key: string): string => {
  const d = fromDateKey(key)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return toDateKey(d)
}

// ---- 讀寫 ----

const read = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

const loadMeta = (): Record<string, number> => read<Record<string, number>>(META_KEY) ?? {}

const write = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value))
  if (key !== META_KEY) {
    const m = loadMeta()
    m[key] = Date.now()
    localStorage.setItem(META_KEY, JSON.stringify(m))
  }
}

export const loadDay = (dateKey: string): DayEntry => {
  const stored = read<Partial<DayEntry>>(DAY_PREFIX + dateKey)
  // 新欄位以 emptyDay 補齊 → 之後加欄位零成本
  return stored ? { ...emptyDay(), ...stored } : emptyDay()
}

export const saveDay = (dateKey: string, entry: DayEntry) => write(DAY_PREFIX + dateKey, entry)

export const loadProjects = (): Project[] => read<Project[]>(PROJECTS_KEY) ?? []

export const saveProjects = (projects: Project[]) => write(PROJECTS_KEY, projects)

export const loadSettings = (): Settings => ({
  ...defaultSettings(),
  ...(read<Partial<Settings>>(SETTINGS_KEY) ?? {}),
})

export const saveSettings = (s: Settings) => write(SETTINGS_KEY, s)

/** 所有已記錄的日期 key，新到舊 */
export const allDayKeys = (): string[] => {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(DAY_PREFIX)) keys.push(k.slice(DAY_PREFIX.length))
  }
  return keys.sort().reverse()
}

/** 連續記錄天數（從今天或昨天往回算） */
export const currentStreak = (todayKey: string): number => {
  const recorded = new Set(allDayKeys())
  let streak = 0
  let cursor = recorded.has(todayKey) ? todayKey : addDays(todayKey, -1)
  while (recorded.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

// ---- 專案聚合（讀取面：掃所有 day keys） ----

export interface ProjectDayLog {
  date: string
  tasks: Task[]
  learnings: Learning[]
  minutes: number
}

/** 某專案的累積日誌，新到舊。projectId 傳 null 可看「未掛專案」的雜事 */
export const projectLog = (projectId: string | null, focusMinutes: number): ProjectDayLog[] => {
  const logs: ProjectDayLog[] = []
  for (const date of allDayKeys()) {
    const d = loadDay(date)
    const tasks = d.tasks.filter((t) => t.text.trim() && t.projectId === projectId)
    const learnings = d.learnings.filter((l) => l.projectId === projectId)
    if (tasks.length === 0 && learnings.length === 0) continue
    const minutes = tasks.reduce((sum, t) => sum + t.done * focusMinutes, 0)
    logs.push({ date, tasks, learnings, minutes })
  }
  return logs
}

export interface ProjectStats {
  activeDays: number
  sessions: number
  minutes: number
  learningCount: number
  firstDate: string | null
  last7dSessions: number
}

export const projectStats = (logs: ProjectDayLog[], todayKey: string): ProjectStats => {
  const weekAgo = addDays(todayKey, -6)
  let sessions = 0
  let minutes = 0
  let learningCount = 0
  let last7dSessions = 0
  for (const log of logs) {
    const s = log.tasks.reduce((sum, t) => sum + t.done, 0)
    sessions += s
    minutes += log.minutes
    learningCount += log.learnings.length
    if (log.date >= weekAgo) last7dSessions += s
  }
  return {
    activeDays: logs.length,
    sessions,
    minutes,
    learningCount,
    firstDate: logs.length > 0 ? logs[logs.length - 1].date : null,
    last7dSessions,
  }
}

// ---- 匯出 / 匯入 ----

const allDataKeys = (): string[] => {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith('wj:') && k !== META_KEY) keys.push(k)
  }
  return keys
}

export const exportAll = (): string => {
  const data: Record<string, unknown> = {}
  for (const k of allDataKeys()) data[k] = JSON.parse(localStorage.getItem(k)!)
  return JSON.stringify(
    { app: 'yicheng', version: 1, exportedAt: new Date().toISOString(), data },
    null,
    2
  )
}

export const importAll = (json: string): number => {
  const parsed = JSON.parse(json) as { data?: Record<string, unknown> }
  if (!parsed.data) throw new Error('格式不正確')
  let count = 0
  for (const [k, v] of Object.entries(parsed.data)) {
    if (k.startsWith('wj:') && k !== META_KEY) {
      write(k, v)
      count++
    }
  }
  return count
}
