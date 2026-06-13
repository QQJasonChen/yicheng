# 一程工作誌 — 施工日誌

## 2026-06-13 Phase 1 MVP

### 拍板的設計決策

1. **全新獨立 repo（不放 yike、不放 qq-website）** — yike 有付費用戶不宜大改；工作日誌是私人工具不適合放品牌站。技術棧整套沿用 yike（Vite + React + TS + GitHub Pages PWA）。
2. **Day 是寫入面、Project 是讀取面** — 每天只寫 `wj:day:YYYY-MM-DD` 一個 key（30 秒原則）；專案頁聚合時全掃 day keys（yike `nameStats()` 已驗證此模式效能無虞，個人用量毫無壓力）。
3. **Learning 放在 DayEntry 內，不開獨立 collection** — 匯出/聚合單位維持「一天一 key」；專案頁掃 day 時順便撈 learnings，不用第二條掃描路徑。
4. **CSS fork 自 yike，`--gold` 變數值改靛青 `#3d5a73`、變數名不改** — 2593 行樣式全保留（含 Phase 2 要用的 timer/timeline 樣式），改值不改名讓所有既有 class 直接生效。專案六色盤另開 `--proj-*` 變數，資料裡存色名不存 hex。
5. **刪專案不級聯** — task.projectId 留著，UI 顯示「（已刪除專案）」；主推「封存」，刪除藏在編輯表單裡。
6. **Phase 1 砍掉**：FocusTimer（手動塗圈即可）、拖拉 Timeline、週/月/年視圖、習慣、心情、晨晚問題組（縮成「收工一句話」）、雲端同步。`DayEntry.blocks` 欄位先留空陣列，Phase 2 加 Timeline 零遷移。

### 踩過的坑

- **npm 全域 cache 被 root 污染**（`~/.npm` 部分目錄 root-owned）→ `npm install` 噴 `react@undefined` 假錯誤。解法：`--cache /tmp/npm-cache-yicheng` 繞過。根治要跑 `sudo chown -R 501:20 ~/.npm`。
- **缺 `src/vite-env.d.ts`** → `import.meta.env` 型別錯誤。scaffold 失敗手寫專案時容易漏這個。
- **gstack browse 共用 daemon**：同時有別的 session 在 QA yike，分頁被搶、server 被重啟（localStorage 跟著清空）。對策：核心聚合邏輯改用 esbuild bundle + node shim localStorage 直接測（`/tmp/yc-logic-test.mjs` 模式），UI 用 seed localStorage + 截圖驗收。

### 驗收記錄（Phase 1）

- ✅ `npm run build` 過 tsc + vite
- ✅ Node 邏輯測試：projectLog 排序/過濾、projectStats 聚合、currentStreak、匯出→清空→匯入 round-trip
- ✅ UI：建專案（色盤/emoji/目標）、任務掛專案、塗圈、＋−調 target、今日學到（來源+專案）、收工一句話、評分寫入 localStorage
- ✅ 專案詳情：統計列（投入天數/總刻數/累積時間/學到）與日誌時間軸正確
- ✅ 手機 375px 兩個主視圖可用

## 2026-06-13 Phase 2（全部完成）

### 拍板決策
1. **時間軸 + FocusTimer**：從 yike fork。差異化 = 時間塊經 `taskIndex → task → projectId` 解析，套**專案色 + emoji**（yike 沒有專案維度）。`projectLog` 的 minutes 改「時間軸實際分鐘優先，無 block 才用塗圈估算」；新增 `blockMinutes`/`sessions` 欄位。FocusTimer 完成自動塗圈 + 寫 block。`pip.ts` 先 stub（浮窗按鈕自動隱藏）。
2. **登入同步：共用 yike 的 Supabase 專案**（`ofhupqifavtafiylehkj`）+ 獨立 `worklog` 表（與 yike `journal` 表互不干擾、`auth.users` 共用）。純自用 → 公開註冊已關閉故只 `signInWithPassword`（不做 signUp）。QQ 用既有帳號 `qqleveragelearning@gmail.com` 登入。同 origin（github.io）下 yike/yicheng 共用 auth session = 一次登入兩邊都同步（feature 非 bug）。
3. **本週/設定/MD匯出/趨勢圖**：tabs 擴成 今天|專案|本週|設定。匯出/匯入從專案頁集中到設定頁。

### 建表方式（無 psql）
`/tmp/pgtool` 裝 `pg` + pooler url（`aws-0-eu-west-1.pooler.supabase.com:6543`，db password 在 `~/.inkday-supabase-db-password`）跑 DDL。service key（`~/.yike-supabase-service-key`）用於查 auth settings / admin 建刪測試帳號。`supabase/setup.sql` 記錄 schema。

### 驗證
- 同步：建臨時測試帳號 → 登入 push 201 → 清空本機 reload 自動 pull 還原 → 刪測試帳號（cascade 清 worklog）
- 新聚合函數 `weekProjectStats`/`projectTrend`：Node esbuild bundle + localStorage shim 測試通過
- UI 截圖：時間軸專案色、FocusTimer、本週統計表、設定頁、趨勢 sparkline（8 點）、跨多週日誌

### 踩雷
- **zsh 的 `UID` 是唯讀內建變數**：腳本用 `UID=$(...)` 會壞，改 `TID`
- **gstack browse daemon 被多 session 共用**：`click`/`goto` 作用在全域 active tab，常被別的 session 切走 → 改用 `$B js "el.click()"` 在當前 page context 觸發，繞過 active-tab race
- 測試 seed 用 `localStorage.setItem` 繞過 `write()` → meta 無時間戳 → 同步不 push（非 bug，實際操作都經 write）

### Phase 3 backlog（想到再做）
- pip.ts 完整版（FocusTimer 置頂浮窗）
- 封存專案的「結案回顧」一頁
- 本週頁的 intention（週意圖）欄位
