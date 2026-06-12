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

### Phase 2 backlog

- FocusTimer（從 yike 複製，接 `onSessionDone` 塗圈）
- Timeline 拖拉時間塊（複製 yike Timeline.tsx；專案 minutes 改 blocks 實際分鐘優先）
- WeekView：intention + 自動每專案週統計表 + 回顧三問
- HistoryView：streak 月曆、設定（focusMinutes）
- 每專案 Markdown 匯出（改寫 yike exportMd.ts）
