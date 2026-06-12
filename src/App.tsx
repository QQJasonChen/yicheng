import { useState } from 'react'
import DayView from './DayView'
import ProjectDetail from './ProjectDetail'
import ProjectsView from './ProjectsView'
import {
  currentStreak,
  loadProjects,
  loadSettings,
  saveProjects,
  saveSettings,
  toDateKey,
} from './storage'
import { Project, Settings } from './types'

type Tab = 'day' | 'projects'

export default function App() {
  const todayKey = toDateKey(new Date())
  const [tab, setTab] = useState<Tab>('day')
  const [dateKey, setDateKey] = useState(todayKey)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [projects, setProjects] = useState<Project[]>(loadProjects)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const updateSettings = (s: Settings) => {
    setSettings(s)
    saveSettings(s)
  }

  const updateProjects = (ps: Project[]) => {
    setProjects(ps)
    saveProjects(ps)
  }

  const selected = projects.find((p) => p.id === selectedId) ?? null
  const streak = currentStreak(todayKey)

  return (
    <>
      <div className="topbar">
        <span className="brand">一程工作誌</span>
        <nav className="tabs">
          <button className={tab === 'day' ? 'active' : ''} onClick={() => setTab('day')}>
            今天
          </button>
          <button
            className={tab === 'projects' ? 'active' : ''}
            onClick={() => {
              setTab('projects')
              setSelectedId(null)
            }}
          >
            專案
          </button>
        </nav>
        <span className="streak">
          {streak > 0 ? (
            <>
              <strong>{streak}</strong> 天連續
            </>
          ) : (
            '今天開始'
          )}
        </span>
      </div>

      {tab === 'day' && (
        <DayView
          dateKey={dateKey}
          onDateChange={setDateKey}
          projects={projects}
          settings={settings}
          onSettingsChange={updateSettings}
        />
      )}
      {tab === 'projects' && !selected && (
        <ProjectsView
          projects={projects}
          focusMinutes={settings.focusMinutes}
          onChange={updateProjects}
          onOpen={setSelectedId}
        />
      )}
      {tab === 'projects' && selected && (
        <ProjectDetail
          project={selected}
          focusMinutes={settings.focusMinutes}
          onBack={() => setSelectedId(null)}
          onChange={(p) => updateProjects(projects.map((x) => (x.id === p.id ? p : x)))}
          onDelete={() => {
            updateProjects(projects.filter((x) => x.id !== selected.id))
            setSelectedId(null)
          }}
          onOpenDay={(k) => {
            setDateKey(k)
            setTab('day')
          }}
        />
      )}
    </>
  )
}
