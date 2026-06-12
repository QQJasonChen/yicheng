import { Project } from './types'

interface Props {
  projects: Project[]
  value: string | null
  onChange: (projectId: string | null) => void
}

/** 專案選擇 chip（原生 select，手機桌機通用） */
export default function ProjectPicker({ projects, value, onChange }: Props) {
  const active = projects.filter((p) => p.status === 'active')
  const current = projects.find((p) => p.id === value)
  // 掛在已封存/已刪除專案上的舊記錄仍要能顯示
  const orphan = value !== null && !current
  return (
    <select
      className={`proj-select ${value === null ? 'unset' : ''}`}
      style={current ? ({ '--proj': `var(--proj-${current.color})` } as React.CSSProperties) : undefined}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      title="掛到專案"
    >
      <option value="">雜事</option>
      {active.map((p) => (
        <option key={p.id} value={p.id}>
          {p.emoji} {p.name}
        </option>
      ))}
      {current && current.status === 'archived' && (
        <option value={current.id}>
          {p_label(current)}（已封存）
        </option>
      )}
      {orphan && <option value={value}>（已刪除專案）</option>}
    </select>
  )
}

const p_label = (p: Project) => `${p.emoji} ${p.name}`
