// 帳號制雲端同步（共用 yike 的 Supabase 專案，獨立 worklog 資料表）
// - Email + 密碼登入（純自用，公開註冊關閉，不做 signUp）
// - worklog 資料表：每個 localStorage key 一列，Row Level Security 隔離用戶
// - 同步策略：逐 key 比時間戳，新的贏（pull 先、push 後）
import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, cloudEnabled } from './cloudConfig'
import { allDataKeys, loadMeta, setOnDataWrite, writeFromCloud } from './storage'

const TABLE = 'worklog'

let client: SupabaseClient | null = null

// 動態載入：沒登入的用戶照樣不必下載 supabase-js（這裡仍 import 型別，執行期 lazy）
const supa = async (): Promise<SupabaseClient> => {
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js')
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return client
}

export { cloudEnabled }

/** 登入（純自用，帳號由站方既有 yike 帳號提供） */
export const signIn = async (email: string, password: string): Promise<void> => {
  const db = await supa()
  const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
  if (error) {
    if (/invalid login credentials/i.test(error.message))
      throw new Error('Email 或密碼不對（用你 yike 的那組帳密）')
    throw new Error(error.message)
  }
}

export const currentEmail = async (): Promise<string | null> => {
  const { data } = await (await supa()).auth.getSession()
  return data.session?.user.email ?? null
}

export const signOut = async () => (await supa()).auth.signOut()

interface Row {
  key: string
  value: unknown
  updated_at: string
}

/** 雙向同步：回傳 { pulled, pushed } */
export const syncNow = async (): Promise<{ pulled: number; pushed: number }> => {
  const db = await supa()
  const { data: sess } = await db.auth.getSession()
  const user = sess.session?.user
  if (!user) throw new Error('請先登入')

  const meta = loadMeta()

  // 1) Pull：伺服器比本機新的 key 落地
  const { data: rows, error } = await db.from(TABLE).select('key,value,updated_at')
  if (error) throw new Error(`下載失敗：${error.message}`)
  const serverTs: Record<string, number> = {}
  let pulled = 0
  for (const r of (rows ?? []) as Row[]) {
    const ts = new Date(r.updated_at).getTime()
    serverTs[r.key] = ts
    if (ts > (meta[r.key] ?? 0)) {
      writeFromCloud(r.key, r.value, ts)
      pulled++
    }
  }

  // 2) Push：本機比伺服器新的 key 上傳
  const freshMeta = loadMeta()
  const toPush = allDataKeys()
    .filter((k) => (freshMeta[k] ?? 0) > (serverTs[k] ?? 0))
    .map((k) => ({
      user_id: user.id,
      key: k,
      value: JSON.parse(localStorage.getItem(k)!),
      updated_at: new Date(freshMeta[k] ?? Date.now()).toISOString(),
    }))
  if (toPush.length) {
    const { error: upErr } = await db.from(TABLE).upsert(toPush, { onConflict: 'user_id,key' })
    if (upErr) throw new Error(`上傳失敗：${upErr.message}`)
  }

  return { pulled, pushed: toPush.length }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null

/** 啟動自動同步：登入狀態下，開站先同步一次，之後每次寫入 4 秒後自動推送 */
export const startAutoSync = async (onChange?: (msg: string) => void): Promise<void> => {
  if (!cloudEnabled()) return
  const email = await currentEmail()
  if (!email) return

  try {
    const { pulled } = await syncNow()
    onChange?.(`已同步（${email}）`)
    if (pulled > 0 && !sessionStorage.getItem('wj:justSynced')) {
      sessionStorage.setItem('wj:justSynced', '1')
      location.reload()
      return
    }
    sessionStorage.removeItem('wj:justSynced')
  } catch {
    onChange?.('自動同步失敗，稍後會再試')
  }

  setOnDataWrite(() => {
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      syncNow()
        .then(() => onChange?.('已自動同步'))
        .catch(() => onChange?.('同步失敗，下次寫入時重試'))
    }, 4000)
  })

  // 切回 app／分頁時立刻拉一次（手機-電腦輪流用時幾乎即時）
  let lastVisPull = 0
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    if (Date.now() - lastVisPull < 15_000) return
    lastVisPull = Date.now()
    syncNow().catch(() => {})
  })
}

export const stopAutoSync = () => {
  setOnDataWrite(null)
  if (pushTimer) clearTimeout(pushTimer)
}
