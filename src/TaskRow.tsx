import ProjectPicker from './ProjectPicker'
import { Project, Task } from './types'

interface Props {
  index: number
  task: Task
  projects: Project[]
  onChange: (t: Task) => void
}

export default function TaskRow({ index, task, projects, onChange }: Props) {
  const setDone = (n: number) => {
    const done = Math.max(0, Math.min(8, n))
    onChange({ ...task, done, actual: done > 0 ? done : null })
  }

  const toggleDone = () => {
    onChange({
      ...task,
      completed: !task.completed,
      actual: !task.completed && task.done > 0 ? task.done : task.actual,
    })
  }

  return (
    <div className={`task-row ${task.completed ? 'done-task' : ''}`}>
      <span className="task-num">{index + 1}.</span>
      <div className="task-text line-input" style={{ borderBottom: 'none' }}>
        <input
          placeholder={index === 0 ? '今天就算只做成這一件，也值得了' : ''}
          value={task.text}
          onChange={(e) => onChange({ ...task, text: e.target.value })}
        />
      </div>

      <ProjectPicker
        projects={projects}
        value={task.projectId}
        onChange={(projectId) => onChange({ ...task, projectId })}
      />

      {/* 稿紙方格：一格＝一段 30 分鐘。塗滿＝完成，超標變專案色，＋−調整預期 */}
      <div className="focus-track sq-track">
        <div className="sq-row">
          {(() => {
            const planned = task.target ?? 0
            const count = Math.max(planned, task.done, 1)
            return Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                className={`sq ${i < task.done ? (planned > 0 && i >= planned ? 'gold' : 'fill') : ''}`}
                title={`第 ${i + 1} 段（30 分鐘）`}
                onClick={() => setDone(task.done === i + 1 ? i : i + 1)}
              />
            ))
          })()}
        </div>
        <span className="sq-adj">
          <button
            title="少排一段"
            onClick={() => {
              const cur = task.target ?? Math.max(task.done, 1)
              onChange({ ...task, target: cur > 1 ? cur - 1 : null })
            }}
          >
            −
          </button>
          <button
            title="多排一段"
            onClick={() => {
              const cur = task.target ?? Math.max(task.done, 1)
              onChange({ ...task, target: Math.min(8, cur + 1) })
            }}
          >
            ＋
          </button>
        </span>
      </div>

      <button className={`task-check ${task.completed ? 'on' : ''}`} onClick={toggleDone} title="完成任務">
        ✓
      </button>
    </div>
  )
}
