import { useEffect, useMemo, useState } from 'react'
import LearningInput from './LearningInput'
import TaskRow from './TaskRow'
import { addDays, loadDay, saveDay, toDateKey } from './storage'
import { DayEntry, Learning, Project, Settings, Task } from './types'

const WEEKDAYS_EN = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

interface Props {
  dateKey: string
  onDateChange: (key: string) => void
  projects: Project[]
  settings: Settings
  onSettingsChange: (s: Settings) => void
}

export default function DayView({ dateKey, onDateChange, projects, settings, onSettingsChange }: Props) {
  const [entry, setEntry] = useState<DayEntry>(() => loadDay(dateKey))
  const [rolloverDone, setRolloverDone] = useState(false)
  const todayKey = toDateKey(new Date())
  const isToday = dateKey === todayKey

  // 換日期時重新載入
  useEffect(() => {
    setEntry(loadDay(dateKey))
  }, [dateKey])

  // 任何修改即時存檔（零儲存按鈕）
  const update = (patch: Partial<DayEntry>) => {
    setEntry((prev) => {
      const next = { ...prev, ...patch }
      saveDay(dateKey, next)
      return next
    })
  }

  const updateTask = (i: number, t: Task) => {
    const tasks = entry.tasks.slice()
    tasks[i] = t
    update({ tasks })
    // 記住最後選的專案 → 之後的新任務/學習預設掛它（30 秒原則）
    if (t.projectId !== entry.tasks[i].projectId)
      onSettingsChange({ ...settings, lastProjectId: t.projectId })
  }

  const updateLearnings = (learnings: Learning[]) => {
    update({ learnings })
    const last = learnings[learnings.length - 1]
    if (last && last.projectId !== settings.lastProjectId)
      onSettingsChange({ ...settings, lastProjectId: last.projectId })
  }

  // 昨日未完成任務 → 一鍵帶入今天
  const yesterdayUnfinished = useMemo(() => {
    if (!isToday) return []
    const prev = loadDay(addDays(dateKey, -1))
    const todayTexts = new Set(entry.tasks.map((t) => t.text.trim()).filter(Boolean))
    return prev.tasks.filter((t) => t.text.trim() && !t.completed && !todayTexts.has(t.text.trim()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, isToday, rolloverDone])

  const rollover = () => {
    setEntry((prev) => {
      const tasks = prev.tasks.slice()
      let qi = 0
      for (let i = 0; i < tasks.length && qi < yesterdayUnfinished.length; i++) {
        if (!tasks[i].text.trim()) {
          const src = yesterdayUnfinished[qi++]
          tasks[i] = {
            text: src.text,
            projectId: src.projectId,
            target: src.target,
            done: 0,
            actual: null,
            completed: false,
          }
        }
      }
      const next = { ...prev, tasks }
      saveDay(dateKey, next)
      return next
    })
    setRolloverDone(true)
  }

  const d = new Date(
    Number(dateKey.slice(0, 4)),
    Number(dateKey.slice(5, 7)) - 1,
    Number(dateKey.slice(8, 10))
  )

  const sectionLabel = (i: number) =>
    i === 0 ? (
      <div className="label" key={`l${i}`}>
        <span className="star">★</span> 最重要任務
        <span className="hint">最不舒服、最常拖延的那一件</span>
      </div>
    ) : i === 1 ? (
      <div className="label" key={`l${i}`}>
        次要任務 <span className="hint">完成它們會讓今天更好</span>
      </div>
    ) : i === 3 ? (
      <div className="label" key={`l${i}`}>
        額外任務 <span className="hint">先做完上面的再說</span>
      </div>
    ) : null

  return (
    <div className="page">
      <div className="page-inner">
        <div className="day-head">
          <div className="day-title">
            <span className="day-weekday">{WEEKDAYS_EN[d.getDay()]}</span>
            <span className="day-date">
              {d.getMonth() + 1} 月 {d.getDate()} 日 {d.getFullYear()}
            </span>
          </div>
          <div className="day-nav">
            <button onClick={() => onDateChange(addDays(dateKey, -1))} title="前一天">
              ‹
            </button>
            {!isToday && (
              <button className="today-btn" onClick={() => onDateChange(todayKey)}>
                回到今天
              </button>
            )}
            <button onClick={() => onDateChange(addDays(dateKey, 1))} title="後一天">
              ›
            </button>
          </div>
        </div>

        {yesterdayUnfinished.length > 0 && (
          <div className="rollover">
            <span>
              昨天有 <b>{yesterdayUnfinished.length}</b> 件未完成：
              {yesterdayUnfinished.map((t) => t.text).join('、').slice(0, 40)}
            </span>
            <span>
              <button className="rollover-btn" onClick={rollover}>
                帶入今天 →
              </button>
              <button className="rollover-dismiss" onClick={() => setRolloverDone(true)} title="忽略">
                ✕
              </button>
            </span>
          </div>
        )}

        {entry.tasks.map((t, i) => (
          <span key={i}>
            {sectionLabel(i)}
            <TaskRow index={i} task={t} projects={projects} onChange={(nt) => updateTask(i, nt)} />
          </span>
        ))}

        <div className="label">
          今日學到 <span className="hint">一句話就好，掛上專案它會累積成資產</span>
        </div>
        <LearningInput
          learnings={entry.learnings}
          projects={projects}
          defaultProjectId={settings.lastProjectId}
          onChange={updateLearnings}
        />

        <div className="label">收工一句話</div>
        <div className="line-input">
          <input
            value={entry.note}
            onChange={(e) => update({ note: e.target.value })}
            placeholder="今天工作的一句話總結⋯"
          />
        </div>

        <div className="eval-bar">
          <div className="eval-row">
            <div className="eval-group" title="今天的生產力 1-5 分">
              <span className="eval-label">評分</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={`score-btn ${entry.score === n ? 'on celebrate' : ''}`}
                  onClick={() => update({ score: entry.score === n ? null : n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
