import { useEffect, useMemo, useRef, useState } from 'react'
import LearningInput from './LearningInput'
import TaskRow from './TaskRow'
import Timeline from './Timeline'
import { TimerState } from './FocusTimer'
import { addDays, loadDay, saveDay, toDateKey } from './storage'
import { DayEntry, Learning, Project, Settings, Task } from './types'

const WEEKDAYS_EN = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

interface Props {
  dateKey: string
  onDateChange: (key: string) => void
  projects: Project[]
  settings: Settings
  onSettingsChange: (s: Settings) => void
  timer: TimerState | null
  onStartFocus: (taskIndex: number, taskText: string) => void
  /** 計時器完成一段時，由 App 呼叫塗圈＋寫時間軸 */
  registerSessionSink: (fn: (taskIndex: number, startMs: number, endMs: number) => void) => void
}

export default function DayView({
  dateKey,
  onDateChange,
  projects,
  settings,
  onSettingsChange,
  timer,
  onStartFocus,
  registerSessionSink,
}: Props) {
  const [entry, setEntry] = useState<DayEntry>(() => loadDay(dateKey))
  const [rolloverDone, setRolloverDone] = useState(false)
  const todayKey = toDateKey(new Date())
  const isToday = dateKey === todayKey
  const dropRef = useRef<((x: number, y: number, text: string, taskIndex: number) => boolean) | null>(
    null
  )

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
    const prevProjectId = entry.tasks[i].projectId
    tasks[i] = t
    update({ tasks })
    if (t.projectId !== prevProjectId)
      onSettingsChange({ ...settings, lastProjectId: t.projectId })
  }

  const updateLearnings = (learnings: Learning[]) => {
    update({ learnings })
    const last = learnings[learnings.length - 1]
    if (last && last.projectId !== settings.lastProjectId)
      onSettingsChange({ ...settings, lastProjectId: last.projectId })
  }

  // Focus Timer 完成一段 → 塗圈 ＋ 把真實時段寫進時間軸（永遠記在今天）
  useEffect(() => {
    registerSessionSink((taskIndex, startMs, endMs) => {
      setEntry((prev) => {
        const tasks = prev.tasks.slice()
        const t = tasks[taskIndex]
        if (t) {
          const done = Math.min(t.done + 1, 8)
          tasks[taskIndex] = { ...t, done, actual: done }
        }
        const toMin = (ms: number) => {
          const dd = new Date(ms)
          return dd.getHours() * 60 + dd.getMinutes()
        }
        const bStart = Math.max(6 * 60, Math.min(23 * 60 - 15, toMin(startMs)))
        const bEnd = Math.max(bStart + 15, Math.min(23 * 60, toMin(endMs)))
        const blocks = prev.blocks.slice()
        const tail = blocks
          .filter((b) => b.taskIndex === taskIndex)
          .sort((x, y) => y.end - x.end)[0]
        if (tail && Math.abs(bStart - tail.end) <= 6) {
          tail.end = bEnd
        } else {
          blocks.push({
            id: `f${Date.now().toString(36)}`,
            start: bStart,
            end: bEnd,
            text: t?.text ?? '專注',
            taskIndex,
          })
        }
        const next = { ...prev, tasks, blocks }
        saveDay(todayKey, next)
        return next
      })
    })
  }, [registerSessionSink, todayKey])

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

  // 任務拖到時間軸：掉在時間軸上就排該時段，否則自動排進下一個空檔
  const dropTask = (x: number, y: number, t: Task, i: number) => {
    const landed = dropRef.current?.(x, y, t.text, i)
    if (!landed && t.text.trim()) {
      const now = new Date()
      const nowMin = now.getHours() * 60 + now.getMinutes()
      const dur = Math.min(120, 30 * Math.max(1, (t.target ?? 1) - t.done))
      let start = Math.max(6 * 60, Math.ceil(nowMin / 30) * 30)
      const blocks = entry.blocks
      const overlaps = (s0: number, e0: number) => blocks.some((b) => s0 < b.end && e0 > b.start)
      while (start + dur <= 23 * 60 && overlaps(start, start + dur)) start += 30
      if (start + dur > 23 * 60) start = Math.max(6 * 60, 23 * 60 - dur)
      update({
        blocks: [
          ...blocks,
          { id: `a${Date.now().toString(36)}`, start, end: start + dur, text: t.text, taskIndex: i },
        ],
      })
    }
  }

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

        <div className="day-grid">
          <div>
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
                  <button
                    className="rollover-dismiss"
                    onClick={() => setRolloverDone(true)}
                    title="忽略"
                  >
                    ✕
                  </button>
                </span>
              </div>
            )}

            {entry.tasks.map((t, i) => (
              <span key={i}>
                {sectionLabel(i)}
                <TaskRow
                  index={i}
                  task={t}
                  projects={projects}
                  onChange={(nt) => updateTask(i, nt)}
                  isRunning={timer?.phase === 'focus' && timer.taskIndex === i && isToday}
                  onStartFocus={() => onStartFocus(i, t.text)}
                  onDropToTimeline={(x, y) => dropTask(x, y, t, i)}
                />
                {i === 0 && isToday && t.text.trim() && !t.completed && !timer && (
                  <div className="mit-focus-row">
                    <button className="mit-focus" onClick={() => onStartFocus(0, t.text)}>
                      <span className="mit-focus-ring">▶</span>
                      專注 {settings.focusMinutes} 分鐘
                    </button>
                    <span className="mit-focus-sub">
                      結束自動刻一筆{t.target ? `・目標 ${t.target}` : ''}
                    </span>
                  </div>
                )}
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

          <div className="day-side">
            <Timeline
              blocks={entry.blocks}
              tasks={entry.tasks}
              projects={projects}
              isToday={isToday}
              onChange={(blocks) => update({ blocks })}
              dropRef={dropRef}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
