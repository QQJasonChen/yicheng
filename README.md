# 一程工作誌 Yicheng

> 一刻記當下，一程記累積。

紙本手帳質感的工作日誌 PWA：每天寫任務與學習，掛上專案，每個專案自動長出自己的累積日誌。[一刻手帳 Yike](https://github.com/QQJasonChen/yike) 的姊妹作。

**線上使用 → https://qqjasonchen.github.io/yicheng/**

手機開啟後「加入主畫面」即可當 app 使用（支援離線）。

## 核心方法

1. **Day 是寫入面**：每天打開 30 秒內能記錄 — 最重要任務（MIT）＋最多 5 個任務＋塗圈
2. **Project 是讀取面**：任務與學習掛上專案，專案頁自動聚合出「這個專案的故事」— 投入天數、總刻數、累積時間、學到什麼
3. **學習是一等記錄**：「今日學到」一句話＋來源，掛上專案就累積成資產
4. **收工一句話 + 評分 1–5**：反思砍到最低摩擦

## 功能

- **今天**：5 格任務（MIT + 次要 + 額外）× 專案 chip × 30 分鐘塗圈 + 內建專注計時器（完成自動塗圈+寫時間軸）+ 拖拉時間軸（時間塊套專案色）+ 今日學到 + 收工一句話 + 昨日未完成一鍵帶入
- **專案**：專案卡（本週刻數/累積時數/學到幾則）→ 點入專案詳情：累積統計 + 近 8 週投入趨勢圖 + 按日期的專案日誌時間軸 + 一鍵複製成 Markdown
- **本週**：自動產生的每專案投入統計表（不用手填）+ 回顧三問
- **設定**：專注/休息分鐘、JSON 匯出/匯入
- **資料自主**：全部存在你的裝置（localStorage）；**登入後跨裝置自動同步**（手機記、電腦看）；JSON 匯出/匯入

## 開發

```bash
npm install
npm run dev      # 開發
npm run build    # 打包（輸出 dist/）
```

Vite + React + TypeScript，無其他執行期依賴。push 到 main 自動經 GitHub Actions 部署到 GitHub Pages。

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
