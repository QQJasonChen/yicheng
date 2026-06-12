import { useMemo, useRef, useState } from 'react'
import { exportAll, importAll, projectLog, projectStats, toDateKey } from './storage'
import { PROJECT_COLORS, Project, ProjectColor } from './types'

interface Props {
  projects: Project[]
  focusMinutes: number
  onChange: (projects: Project[]) => void
  onOpen: (id: string) => void
}

const fmtHours = (minutes: number): string =>
  minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10} 小時` : `${minutes} 分`

export default function ProjectsView({ projects, focusMinutes, onChange, onOpen }: Props) {
  const [adding, setAdding] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const todayKey = toDateKey(new Date())

  const active = projects.filter((p) => p.status === 'active')
  const archived = projects.filter((p) => p.status === 'archived')

  // 每個專案的迷你統計（個人用量：全掃 day keys 無感）
  const stats = useMemo(
    () =>
      new Map(
        projects.map((p) => [p.id, projectStats(projectLog(p.id, focusMinutes), todayKey)])
      ),
    [projects, focusMinutes, todayKey]
  )

  const exportJson = () => {
    const blob = new Blob([exportAll()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `yicheng-${todayKey}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = async (file: File) => {
    try {
      const count = importAll(await file.text())
      alert(`已匯入 ${count} 筆資料，將重新整理`)
      location.reload()
    } catch {
      alert('匯入失敗：檔案格式不正確')
    }
  }

  const card = (p: Project) => {
    const s = stats.get(p.id)!
    return (
      <button
        key={p.id}
        className={`proj-card ${p.status === 'archived' ? 'archived' : ''}`}
        style={{ '--proj': `var(--proj-${p.color})` } as React.CSSProperties}
        onClick={() => onOpen(p.id)}
      >
        <span className="proj-name">
          {p.emoji} {p.name}
        </span>
        {p.goal && <div className="proj-goal">{p.goal}</div>}
        <div className="proj-mini">
          <span>
            本週 <b>{s.last7dSessions}</b> 刻
          </span>
          <span>
            累積 <b>{fmtHours(s.minutes)}</b>
          </span>
          <span>
            學到 <b>{s.learningCount}</b> 則
          </span>
        </div>
      </button>
    )
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div className="day-head">
          <div className="day-title">
            <span className="day-weekday">PROJECTS</span>
            <span className="day-date">專案</span>
          </div>
        </div>

        <div className="proj-grid">
          {active.map(card)}
          {!adding && (
            <button className="proj-card proj-new" onClick={() => setAdding(true)}>
              ＋ 新專案
            </button>
          )}
        </div>

        {adding && (
          <ProjectForm
            onSave={(p) => {
              onChange([...projects, p])
              setAdding(false)
            }}
            onCancel={() => setAdding(false)}
          />
        )}

        {archived.length > 0 && (
          <>
            <button className="proj-archived-toggle" onClick={() => setShowArchived(!showArchived)}>
              已封存（{archived.length}）{showArchived ? ' ▲' : ' ▼'}
            </button>
            {showArchived && <div className="proj-grid">{archived.map(card)}</div>}
          </>
        )}

        <div className="data-bar">
          <span>資料都在這台裝置上</span>
          <button onClick={exportJson}>匯出 JSON 備份</button>
          <button onClick={() => fileRef.current?.click()}>匯入</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
          />
        </div>
      </div>
    </div>
  )
}

export function ProjectForm({
  project,
  onSave,
  onCancel,
  onArchiveToggle,
  onDelete,
}: {
  project?: Project
  onSave: (p: Project) => void
  onCancel: () => void
  onArchiveToggle?: () => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(project?.name ?? '')
  const [emoji, setEmoji] = useState(project?.emoji ?? '◆')
  const [color, setColor] = useState<ProjectColor>(project?.color ?? 'indigo')
  const [goal, setGoal] = useState(project?.goal ?? '')

  const save = () => {
    const n = name.trim()
    if (!n) return
    onSave({
      id: project?.id ?? crypto.randomUUID(),
      name: n,
      emoji: emoji.trim() || '◆',
      color,
      status: project?.status ?? 'active',
      goal: goal.trim() || undefined,
      createdAt: project?.createdAt ?? toDateKey(new Date()),
    })
  }

  return (
    <div className="proj-form">
      <div className="proj-form-row">
        <input
          className="emoji-input"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          title="emoji"
        />
        <div className="line-input" style={{ flex: 1 }}>
          <input
            autoFocus
            placeholder="專案名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </div>
      </div>
      <div className="proj-form-row">
        <span className="label">顏色</span>
        <div className="color-dots">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              className={`color-dot ${color === c ? 'on' : ''}`}
              style={{ '--proj': `var(--proj-${c})` } as React.CSSProperties}
              onClick={() => setColor(c)}
              title={c}
            />
          ))}
        </div>
      </div>
      <div className="proj-form-row">
        <span className="label">目標</span>
        <div className="line-input" style={{ flex: 1 }}>
          <input
            placeholder="一句話目標（可空）"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </div>
      </div>
      <div className="proj-form-actions">
        {onDelete && (
          <button
            className="danger"
            onClick={() => confirm('確定刪除？已記錄的日誌會顯示為（已刪除專案）') && onDelete()}
          >
            刪除
          </button>
        )}
        {onArchiveToggle && (
          <button className="rollover-dismiss" onClick={onArchiveToggle}>
            {project?.status === 'archived' ? '取消封存' : '封存'}
          </button>
        )}
        <button className="rollover-dismiss" onClick={onCancel}>
          取消
        </button>
        <button className="rollover-btn" onClick={save}>
          儲存
        </button>
      </div>
    </div>
  )
}
