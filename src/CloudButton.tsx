import { useEffect, useState } from 'react'
import { cloudEnabled, currentEmail, signIn, signOut, startAutoSync, syncNow } from './cloud'

export default function CloudButton() {
  const [email, setEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!cloudEnabled()) return
    currentEmail().then(setEmail)
    startAutoSync(setMsg)
  }, [])

  if (!cloudEnabled()) return null

  const doSignIn = async () => {
    setBusy(true)
    setMsg('')
    try {
      await signIn(form.email, form.password)
      await syncNow()
      setMsg('已登入並同步，重整中…')
      location.reload()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '登入失敗')
      setBusy(false)
    }
  }

  const doSignOut = async () => {
    await signOut()
    setEmail(null)
    setMsg('已登出（本機資料還在）')
  }

  const doSync = async () => {
    setBusy(true)
    try {
      const { pulled, pushed } = await syncNow()
      setMsg(`同步完成 ↓${pulled} ↑${pushed}`)
      if (pulled > 0) location.reload()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '同步失敗')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="cloud-wrap">
      <button
        className={`cloud-badge ${email ? 'on' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title={email ? '雲端同步中，點擊管理' : '登入啟用跨裝置自動同步'}
      >
        {email ? '☁ 同步中' : '☁ 登入'}
      </button>
      {open && (
        <>
          <div className="cloud-backdrop" onClick={() => setOpen(false)} />
          <div className="cloud-panel">
            {email ? (
              <>
                <div className="cloud-email">{email}</div>
                <div className="cloud-hint">手機、電腦用同一組帳號，寫入後自動同步。</div>
                <div className="cloud-actions">
                  <button className="cloud-signin" onClick={doSync} disabled={busy}>
                    {busy ? '同步中…' : '立即同步'}
                  </button>
                  <button className="cloud-out" onClick={doSignOut}>
                    登出
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="cloud-title">登入啟用跨裝置同步</div>
                <input
                  className="cloud-input"
                  placeholder="Email"
                  autoComplete="username"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <input
                  className="cloud-input"
                  type="password"
                  placeholder="密碼"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && doSignIn()}
                />
                <button className="cloud-signin" onClick={doSignIn} disabled={busy}>
                  {busy ? '登入中…' : '登入'}
                </button>
                <div className="cloud-hint">用你 yike 的同一組帳密即可。</div>
              </>
            )}
            {msg && <div className="cloud-msg">{msg}</div>}
          </div>
        </>
      )}
    </span>
  )
}
