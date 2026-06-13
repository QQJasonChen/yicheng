import { useRef } from 'react'
import { currentStreak, exportAll, importAll, toDateKey } from './storage'
import { Settings } from './types'

interface Props {
  settings: Settings
  onChange: (s: Settings) => void
}

const FOCUS_OPTIONS = [15, 25, 30, 45, 50, 60]
const BREAK_OPTIONS = [5, 10, 15]

export default function SettingsView({ settings, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const todayKey = toDateKey(new Date())
  const streak = currentStreak(todayKey)

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

  return (
    <div className="page">
      <div className="page-inner">
        <div className="day-head">
          <div className="day-title">
            <span className="day-weekday">SETTINGS</span>
            <span className="day-date">設定</span>
          </div>
        </div>

        <div className="set-section">
          <div className="label" style={{ marginTop: 8 }}>
            專注一段多長
          </div>
          <div className="set-chips">
            {FOCUS_OPTIONS.map((m) => (
              <button
                key={m}
                className={`set-chip ${settings.focusMinutes === m ? 'on' : ''}`}
                onClick={() => onChange({ ...settings, focusMinutes: m })}
              >
                {m} 分
              </button>
            ))}
          </div>

          <div className="label">休息多長</div>
          <div className="set-chips">
            {BREAK_OPTIONS.map((m) => (
              <button
                key={m}
                className={`set-chip ${settings.breakMinutes === m ? 'on' : ''}`}
                onClick={() => onChange({ ...settings, breakMinutes: m })}
              >
                {m} 分
              </button>
            ))}
          </div>
        </div>

        <div className="set-section">
          <div className="label">紀錄</div>
          <div className="set-stat">
            {streak > 0 ? (
              <>
                連續記錄 <b>{streak}</b> 天
              </>
            ) : (
              '今天開始記第一天'
            )}
          </div>
        </div>

        <div className="set-section">
          <div className="label">資料</div>
          <div className="set-hint">
            全部存在這台裝置（localStorage）。登入後會自動跨裝置同步；也可手動備份。
          </div>
          <div className="set-actions">
            <button className="set-btn" onClick={exportJson}>
              匯出 JSON 備份
            </button>
            <button className="set-btn ghost" onClick={() => fileRef.current?.click()}>
              匯入
            </button>
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
    </div>
  )
}
