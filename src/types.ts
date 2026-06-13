export type ProjectColor = 'terra' | 'sage' | 'gold' | 'indigo' | 'plum' | 'slate'

export const PROJECT_COLORS: ProjectColor[] = ['indigo', 'terra', 'sage', 'gold', 'plum', 'slate']

export interface Project {
  id: string
  name: string
  emoji: string
  color: ProjectColor
  status: 'active' | 'archived'
  goal?: string
  createdAt: string // YYYY-MM-DD
}

export interface Task {
  text: string
  projectId: string | null // null = 不掛專案的雜事
  target: number | null // 預估 30 分鐘段數
  done: number // 已完成段數（塗格）
  actual: number | null
  completed: boolean
}

export interface Learning {
  id: string
  text: string // 學到什麼
  source: string // 來源（書/影片/URL，可空）
  projectId: string | null
}

export interface Block {
  id: string
  start: number // 從 00:00 起算的分鐘數
  end: number
  text: string
  taskIndex: number | null
}

export interface DayEntry {
  tasks: Task[] // [0] 最重要任務, [1-2] 次要, [3-4] 額外
  learnings: Learning[]
  note: string // 收工一句話
  score: number | null // 生產力 1-5
  blocks: Block[] // Phase 2 時間軸，欄位先留
}

export interface WeekEntry {
  review: { wins: string; learned: string; nextWeek: string }
}

export const emptyWeek = (): WeekEntry => ({
  review: { wins: '', learned: '', nextWeek: '' },
})

export interface Settings {
  focusMinutes: number
  breakMinutes: number
  lastProjectId: string | null // 新任務預設掛上次選的專案
}

export const emptyTask = (): Task => ({
  text: '',
  projectId: null,
  target: null,
  done: 0,
  actual: null,
  completed: false,
})

export const emptyDay = (): DayEntry => ({
  tasks: [emptyTask(), emptyTask(), emptyTask(), emptyTask(), emptyTask()],
  learnings: [],
  note: '',
  score: null,
  blocks: [],
})

export const defaultSettings = (): Settings => ({
  focusMinutes: 30,
  breakMinutes: 5,
  lastProjectId: null,
})
