import { useMemo, useState } from 'react'
import { ProjectForm } from './ProjectsView'
import { fromDateKey, projectLog, projectStats, toDateKey } from './storage'
import { Project } from './types'

interface Props {
  project: Project
  focusMinutes: number
  onBack: () => void
  onChange: (p: Project) => void
  onDelete: () => void
  onOpenDay: (dateKey: string) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const fmtDate = (key: string): string => {
  const d = fromDateKey(key)
  return `${d.getMonth() + 1}/${d.getDate()} 週${WEEKDAYS[d.getDay()]}`
}

const fmtHours = (minutes: number): string =>
  minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10}h` : `${minutes}m`

export default function ProjectDetail({
  project,
  focusMinutes,
  onBack,
  onChange,
  onDelete,
  onOpenDay,
}: Props) {
  const [editing, setEditing] = useState(false)
  const todayKey = toDateKey(new Date())

  const logs = useMemo(() => projectLog(project.id, focusMinutes), [project.id, focusMinutes])
  const stats = useMemo(() => projectStats(logs, todayKey), [logs, todayKey])

  const projVar = { '--proj': `var(--proj-${project.color})` } as React.CSSProperties

  return (
    <div className="page" style={projVar}>
      <div className="page-inner">
        <button className="pd-back" onClick={onBack}>
          ‹ 專案
        </button>

        <div className="pd-head">
          <h2>
            {project.emoji} {project.name}
            {project.status === 'archived' && <span className="hint">（已封存）</span>}
          </h2>
          {project.goal && <span className="pd-goal">{project.goal}</span>}
          <button className="pd-edit" onClick={() => setEditing(!editing)}>
            編輯
          </button>
        </div>

        {editing && (
          <ProjectForm
            project={project}
            onSave={(p) => {
              onChange(p)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
            onArchiveToggle={() => {
              onChange({ ...project, status: project.status === 'archived' ? 'active' : 'archived' })
              setEditing(false)
            }}
            onDelete={onDelete}
          />
        )}

        <div className="pd-stats">
          <div className="pd-stat">
            <b>{stats.activeDays}</b>
            <span>投入天數</span>
          </div>
          <div className="pd-stat">
            <b>{stats.sessions}</b>
            <span>總刻數</span>
          </div>
          <div className="pd-stat">
            <b>{fmtHours(stats.minutes)}</b>
            <span>累積時間</span>
          </div>
          <div className="pd-stat">
            <b>{stats.learningCount}</b>
            <span>學到</span>
          </div>
        </div>
        {stats.firstDate && (
          <div className="hint" style={{ fontSize: 12.5 }}>
            從 {stats.firstDate} 走到現在・最近 7 天 {stats.last7dSessions} 刻
          </div>
        )}

        {logs.length === 0 ? (
          <div className="plog-empty">
            還沒有記錄。回到「今天」，把任務掛上這個專案，這裡就會長出它的故事。
          </div>
        ) : (
          <div className="plog">
            {logs.map((log) => (
              <div className="plog-day" key={log.date}>
                <div className="plog-date">
                  <button onClick={() => onOpenDay(log.date)} title="打開這一天">
                    {log.date === todayKey ? '今天' : fmtDate(log.date)}
                  </button>
                  {log.minutes > 0 && <span className="plog-min">{fmtHours(log.minutes)}</span>}
                </div>
                {log.tasks.map((t, i) => (
                  <div className={`plog-task ${t.completed ? 'done-task' : ''}`} key={i}>
                    {t.text}
                    {t.done > 0 && <span className="plog-sq">{'▪'.repeat(Math.min(t.done, 8))}</span>}
                  </div>
                ))}
                {log.learnings.map((l) => (
                  <div className="plog-learn" key={l.id}>
                    {l.text}
                    {l.source && <span className="plog-src">（{l.source}）</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
