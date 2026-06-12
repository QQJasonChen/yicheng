import { useState } from 'react'
import ProjectPicker from './ProjectPicker'
import { Learning, Project } from './types'

interface Props {
  learnings: Learning[]
  projects: Project[]
  defaultProjectId: string | null
  onChange: (learnings: Learning[]) => void
}

/** 「今日學到」：一行式輸入（學到什麼 / 來源 / 專案，Enter 即存）＋ 當日列表 */
export default function LearningInput({ learnings, projects, defaultProjectId, onChange }: Props) {
  const [text, setText] = useState('')
  const [source, setSource] = useState('')
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId)

  const add = () => {
    const t = text.trim()
    if (!t) return
    onChange([
      ...learnings,
      { id: crypto.randomUUID(), text: t, source: source.trim(), projectId },
    ])
    setText('')
    setSource('')
  }

  const remove = (id: string) => onChange(learnings.filter((l) => l.id !== id))

  const projOf = (id: string | null) => projects.find((p) => p.id === id)

  return (
    <>
      {learnings.map((l) => {
        const p = projOf(l.projectId)
        return (
          <div className="learn-row" key={l.id}>
            <span className="learn-text">{l.text}</span>
            {l.source && <span className="learn-src">{l.source}</span>}
            {p && (
              <span
                className="proj-select"
                style={{ '--proj': `var(--proj-${p.color})` } as React.CSSProperties}
              >
                {p.emoji} {p.name}
              </span>
            )}
            <button className="learn-del" onClick={() => remove(l.id)} title="刪除">
              ✕
            </button>
          </div>
        )
      })}
      <div className="learn-add">
        <div className="line-input">
          <input
            placeholder="今天學到什麼？Enter 記下"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
        </div>
        <div className="line-input learn-src-input">
          <input
            placeholder="來源（可空）"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
        </div>
        <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />
      </div>
    </>
  )
}
