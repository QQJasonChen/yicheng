import { useMemo, useState } from 'react'
import { ProjectForm } from './ProjectsView'
import { ProjectDayLog, fromDateKey, projectLog, projectStats, projectTrend, toDateKey } from './storage'
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

/** 專案日誌轉 Markdown（給 Heptabase / 部落格 / 週報） */
const projectToMarkdown = (project: Project, logs: ProjectDayLog[]): string => {
  const lines: string[] = [`# ${project.emoji} ${project.name}`]
  if (project.goal) lines.push(`> ${project.goal}`, '')
  for (const log of logs) {
    lines.push(`## ${log.date}${log.minutes > 0 ? `（${fmtHours(log.minutes)}）` : ''}`)
    for (const t of log.tasks)
      lines.push(`- [${t.completed ? 'x' : ' '}] ${t.text}${t.done > 0 ? ` ·${t.done}刻` : ''}`)
    for (const l of log.learnings)
      lines.push(`- 💡 ${l.text}${l.source ? `（${l.source}）` : ''}`)
    lines.push('')
  }
  return lines.join('\n')
}

/** 趨勢小圖：近 N 週塗圈數 → SVG sparkline */
function Sparkline({ data }: { data: number[] }) {
  const W = 132
  const H = 28
  const max = Math.max(1, ...data)
  const step = data.length > 1 ? W / (data.length - 1) : W
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(H - (v / max) * (H - 4) - 2).toFixed(1)}`)
  const last = data[data.length - 1]
  const [lx, ly] = pts[pts.length - 1].split(',').map(Number)
  return (
    <div className="pd-spark" title={`近 ${data.length} 週每週塗圈：${data.join(' ')}`}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <polyline points={pts.join(' ')} fill="none" stroke="var(--proj, var(--gold))" strokeWidth="1.5" />
        <circle cx={lx} cy={ly} r="2.5" fill="var(--proj, var(--gold))" />
      </svg>
      <span className="pd-spark-label">近 8 週・本週 {last} 刻</span>
    </div>
  )
}

export default function ProjectDetail({
  project,
  focusMinutes,
  onBack,
  onChange,
  onDelete,
  onOpenDay,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const todayKey = toDateKey(new Date())

  const logs = useMemo(() => projectLog(project.id, focusMinutes), [project.id, focusMinutes])
  const stats = useMemo(() => projectStats(logs, todayKey), [logs, todayKey])
  const trend = useMemo(() => projectTrend(project.id, todayKey), [project.id, todayKey])

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(projectToMarkdown(project, logs))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('複製失敗')
    }
  }

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
          <button className="pd-edit" onClick={copyMarkdown} title="複製成 Markdown（貼到 Heptabase / 部落格 / 週報）">
            {copied ? '✓ 已複製' : '⧉ MD'}
          </button>
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
          <div className="pd-trend-row">
            <div className="hint" style={{ fontSize: 12.5 }}>
              從 {stats.firstDate} 走到現在
            </div>
            {trend.some((v) => v > 0) && <Sparkline data={trend} />}
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
