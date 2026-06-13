import { useEffect, useMemo, useState } from 'react'
import {
  addDays,
  fromDateKey,
  loadWeek,
  mondayOf,
  saveWeek,
  toDateKey,
  weekProjectStats,
} from './storage'
import { Project, WeekEntry } from './types'

interface Props {
  mondayKey: string
  onWeekChange: (mondayKey: string) => void
  projects: Project[]
}

const fmtHours = (m: number): string => (m >= 60 ? `${Math.round((m / 60) * 10) / 10}h` : `${m}m`)
const md = (key: string): string => {
  const d = fromDateKey(key)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function WeekView({ mondayKey, onWeekChange, projects }: Props) {
  const [entry, setEntry] = useState<WeekEntry>(() => loadWeek(mondayKey))
  const thisMonday = mondayOf(toDateKey(new Date()))
  const isThisWeek = mondayKey === thisMonday

  useEffect(() => {
    setEntry(loadWeek(mondayKey))
  }, [mondayKey])

  const stats = useMemo(() => weekProjectStats(mondayKey), [mondayKey])

  const update = (review: Partial<WeekEntry['review']>) => {
    setEntry((prev) => {
      const next = { review: { ...prev.review, ...review } }
      saveWeek(mondayKey, next)
      return next
    })
  }

  // 有資料的專案優先，依塗圈數排序
  const rows = projects
    .map((p) => ({ project: p, stat: stats.get(p.id) }))
    .filter((r) => r.stat && (r.stat.sessions > 0 || r.stat.blockMinutes > 0 || r.stat.learningCount > 0))
    .sort((a, b) => (b.stat!.blockMinutes + b.stat!.sessions * 30) - (a.stat!.blockMinutes + a.stat!.sessions * 30))

  return (
    <div className="page">
      <div className="page-inner">
        <div className="day-head">
          <div className="day-title">
            <span className="day-weekday">WEEK</span>
            <span className="day-date">
              {md(mondayKey)} – {md(addDays(mondayKey, 6))}
              {isThisWeek && <span className="week-no">・本週</span>}
            </span>
          </div>
          <div className="day-nav">
            <button onClick={() => onWeekChange(addDays(mondayKey, -7))} title="上一週">
              ‹
            </button>
            {!isThisWeek && (
              <button className="today-btn" onClick={() => onWeekChange(thisMonday)}>
                回到本週
              </button>
            )}
            <button onClick={() => onWeekChange(addDays(mondayKey, 7))} title="下一週">
              ›
            </button>
          </div>
        </div>

        <div className="label" style={{ marginTop: 8 }}>
          本週各專案投入 <span className="hint">自動統計，不用手填</span>
        </div>
        {rows.length === 0 ? (
          <div className="plog-empty">這一週還沒有掛專案的記錄。</div>
        ) : (
          <table className="wk-table">
            <thead>
              <tr>
                <th>專案</th>
                <th>刻</th>
                <th>時間軸</th>
                <th>學到</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ project, stat }) => (
                <tr key={project.id}>
                  <td>
                    <span
                      className="wk-proj"
                      style={{ '--proj': `var(--proj-${project.color})` } as React.CSSProperties}
                    >
                      {project.emoji} {project.name}
                    </span>
                  </td>
                  <td>{stat!.sessions || '—'}</td>
                  <td>{stat!.blockMinutes > 0 ? fmtHours(stat!.blockMinutes) : '—'}</td>
                  <td>{stat!.learningCount || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="label">本週回顧</div>
        <div className="wk-review">
          <div className="wk-q">做到了什麼</div>
          <textarea
            value={entry.review.wins}
            onChange={(e) => update({ wins: e.target.value })}
            placeholder="這週推進了哪些事⋯"
            rows={2}
          />
          <div className="wk-q">學到了什麼</div>
          <textarea
            value={entry.review.learned}
            onChange={(e) => update({ learned: e.target.value })}
            placeholder="這週最重要的一個學習⋯"
            rows={2}
          />
          <div className="wk-q">下週的一件主事</div>
          <textarea
            value={entry.review.nextWeek}
            onChange={(e) => update({ nextWeek: e.target.value })}
            placeholder="下週只做成這一件也值得⋯"
            rows={2}
          />
        </div>
      </div>
    </div>
  )
}
