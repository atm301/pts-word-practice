# 一字千金 練習場（PTS Word Practice）

模擬公視《一字千金》單人賽四大單元的線上練習工具，為行銷人／廣告人參賽特訓而做。

**Live**：https://atm301.github.io/pts-word-practice/

## 四大單元（規則依 21 季單人賽 B 版）

| 單元 | 玩法 | 時間 | 計分 |
|---|---|---|---|
| 畫中有話 2.0 | 看提示字組成的圖形，寫四字成語 | 30″ | 每題 1 分（一版 10 題） |
| 拾字路口 2.0 | 關鍵字在指定位置，寫兩句三字詞 | 30″ | 1 句 1 分、2 句都對 3 分 |
| 字字珠璣 | 寫一個字與 3~4 個提示字各組成二字詞 | 30″ | 每題 1 分 |
| 洞築機先 | 依提示字/部件寫成語，三關累進 | 40/50/60″ | 3+4+5 句，每句 1 分 |

## 特色

- ✍ **手寫模式**：Canvas 手寫板模擬節目平板，支援觸控筆壓感、掌拒（只接受觸控筆）、田字格、單筆復原
- 🤖 **手寫辨識（實驗）**：交卷後把筆跡逐格辨識成文字自動批改（HanziLookupJS），仍可 ✓/✗ 人工覆核；關掉就回到純自評
- ▶ **筆跡重播**：揭曉後可重播自己的書寫過程，對照正解檢討
- ⌨ **打字模式**：自動批改快速刷題，庫外合理答案可人工加分
- 📒 **錯題間隔重複**：答錯隔天到期，複習答對再排 +3、+7 天，三關全過畢業（SRS）
- 🗓 **每日挑戰**：每天固定題組（日期種子隨機），四關全清加碼；附今日複習佇列
- 🏅 **遊戲化**：積分、稱號、連續天數、8 枚徽章
- 📴 **離線可用**：Service Worker 全站快取，進棚沒網路也能練；可「加到主畫面」當 App（PWA）
- 純靜態、零後端，紀錄存 localStorage

## 開發

```bash
node tools/validate.mjs        # 題庫 schema + 安全檢查（CI 與 pre-push 都跑這支）
node tools/test.mjs            # 起靜態站 + Playwright 實跑四單元 + 截圖
node tools/recogtest.mjs       # 手寫辨識引擎煙霧測試
node tools/shot.mjs            # 重新產生 OG 圖 / icons
node tools/expand-idioms.mjs   # 由教育部成語典開放資料重建 data/idioms-moe.js
git config core.hooksPath .githooks   # 啟用 pre-push 驗證（clone 後跑一次）
```

題庫在 `data/`：`idioms.js`（自編 680+ 條）＋`idioms-moe.js`（教育部成語典 5309 條）、`pic.js`（50 題）、`cross.js`（36 題）、`gem.js`（37 題）、`chain.js`（30 題）。改題庫後 push，GitHub Actions 會自動再驗一次。

## 授權與致謝

- 手寫辨識：[HanziLookupJS](https://github.com/gugray/HanziLookupJS)（GPL-3.0，vendored 於 `vendor/`）
- 成語資料：中華民國教育部《成語典》（版本 2020），創用CC-姓名標示-禁止改作 臺灣3.0，經 [rschiang/idioine](https://github.com/rschiang/idioine) 整理；本站僅使用詞目字串作批改對照，未修改條目內容
- 字詞認定依教育部《重編國語辭典修訂本》《成語典》

## 聲明

粉絲自製練習工具，與公共電視及節目製作單位無關；題庫自行編寫，非節目原始題目。
