import { useCallback, useRef, useState } from 'react'
import CloudButton from './CloudButton'
import DayView from './DayView'
import FocusTimer, { TimerState } from './FocusTimer'
import ProjectDetail from './ProjectDetail'
import ProjectsView from './ProjectsView'
import SettingsView from './SettingsView'
import WeekView from './WeekView'
import {
  currentStreak,
  loadProjects,
  loadSettings,
  mondayOf,
  saveProjects,
  saveSettings,
  toDateKey,
} from './storage'
import { Project, Settings } from './types'

type Tab = 'day' | 'projects' | 'week' | 'settings'

export default function App() {
  const todayKey = toDateKey(new Date())
  const [tab, setTab] = useState<Tab>('day')
  const [dateKey, setDateKey] = useState(todayKey)
  const [mondayKey, setMondayKey] = useState(() => mondayOf(todayKey))
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [projects, setProjects] = useState<Project[]>(loadProjects)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [timer, setTimer] = useState<TimerState | null>(null)
  const sessionSink = useRef<((taskIndex: number, startMs: number, endMs: number) => void) | null>(
    null
  )

  const updateSettings = (s: Settings) => {
    setSettings(s)
    saveSettings(s)
  }

  const updateProjects = (ps: Project[]) => {
    setProjects(ps)
    saveProjects(ps)
  }

  const startFocus = (taskIndex: number, taskText: string) => {
    setDateKey(todayKey) // 計時永遠記在今天
    setTab('day')
    const ms = settings.focusMinutes * 60_000
    setTimer({
      taskIndex,
      taskText,
      phase: 'focus',
      totalMs: ms,
      endsAt: Date.now() + ms,
      pausedRemaining: null,
      startedAt: Date.now(),
    })
  }

  const registerSessionSink = useCallback(
    (fn: (taskIndex: number, startMs: number, endMs: number) => void) => {
      sessionSink.current = fn
    },
    []
  )

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
          <button className={tab === 'week' ? 'active' : ''} onClick={() => setTab('week')}>
            本週
          </button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
            設定
          </button>
        </nav>
        <span className="streak">
          <CloudButton />
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
          timer={timer}
          onStartFocus={startFocus}
          registerSessionSink={registerSessionSink}
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
      {tab === 'week' && (
        <WeekView mondayKey={mondayKey} onWeekChange={setMondayKey} projects={projects} />
      )}
      {tab === 'settings' && <SettingsView settings={settings} onChange={updateSettings} />}

      {timer && (
        <FocusTimer
          timer={timer}
          onUpdate={setTimer}
          breakMinutes={settings.breakMinutes}
          onSessionDone={(ti, s, e) => sessionSink.current?.(ti, s, e)}
        />
      )}
    </>
  )
}
