/* 本機驗證：node tools/test.mjs  （起靜態站 → 跑四單元 → 截圖 → 回報 console 錯誤） */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOT = path.join(ROOT, "tools", "shots");
fs.mkdirSync(SHOT, { recursive: true });

const MIME = { ".html": "text/html;charset=utf-8", ".js": "text/javascript;charset=utf-8", ".css": "text/css;charset=utf-8", ".png": "image/png", ".xml": "application/xml", ".txt": "text/plain;charset=utf-8" };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => srv.listen(4177, r));
const BASE = "http://localhost:4177";

const errors = [];
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1180, height: 1500 }, deviceScaleFactor: 1 });
page.on("console", m => { if (m.type() === "error") errors.push("[console] " + m.text()); });
page.on("pageerror", e => errors.push("[pageerror] " + e.message));

function log(...a) { console.log(...a); }

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(300);
log("首頁標題:", await page.title());
log("單元卡數:", await page.locator(".ucard").count());
await page.screenshot({ path: path.join(SHOT, "01-home.png"), fullPage: true });

// ── 資料完整性（8-2 lazy load：先手動載入全部題庫）
await page.evaluate(() => window.PWP.ensureData(["idioms", "moe", "pic", "cross", "gem", "chain"]));
await page.waitForFunction(() => window.PIC_BANK && window.CHAIN_BANK && window.IDIOMS_MOE);
const audit = await page.evaluate(() => {
  const uniq = new Set([...window.IDIOMS, ...window.IDIOMS_MOE]);
  const bad = { pic: [], cross: [], gem: [], chain: [] };

  window.PIC_BANK.forEach(it => {
    if (it.answer.length !== 4) bad.pic.push(it.id + " 答案非四字:" + it.answer);
    if (!uniq.has(it.answer)) bad.pic.push(it.id + " 不在成語庫:" + it.answer);
    if (!window.renderPic(it) || window.renderPic(it).indexOf(">?<") >= 0) bad.pic.push(it.id + " 渲染失敗 layout=" + it.layout);
  });

  window.CROSS_BANK.forEach(it => {
    it.answers.forEach(w => {
      if (w.length !== 3) bad.cross.push(it.id + " 非三字:" + w);
      else if (w[it.pos - 1] !== it.key) bad.cross.push(it.id + " 位置不符:" + w + "（key=" + it.key + " pos=" + it.pos + "）");
    });
    if (it.answers.length < 4) bad.cross.push(it.id + " 答案太少:" + it.answers.length);
    if (new Set(it.answers).size !== it.answers.length) bad.cross.push(it.id + " 有重複答案");
  });

  window.GEM_BANK.forEach(it => {
    if (it.answer.length !== 1) bad.gem.push(it.id + " 答案非單字");
    it.hints.forEach(h => {
      const w = h.order === "after" ? h.ch + it.answer : it.answer + h.ch;
      if (it.words.indexOf(w) < 0) bad.gem.push(it.id + " words 缺少:" + w);
    });
    it.words.forEach(w => {
      if (w.length !== 2) bad.gem.push(it.id + " 詞非二字:" + w);
      if (w.indexOf(it.answer) < 0) bad.gem.push(it.id + " 詞不含答案:" + w);
    });
  });

  window.CHAIN_BANK.forEach(it => {
    const n = window.PWP.chainMatches(it).length;
    if (n < 12) bad.chain.push(it.id + " " + (it.label || it.key) + " 庫內僅 " + n + " 句（滿分需 12）");
  });

  return { idioms: window.IDIOMS.length, moe: window.IDIOMS_MOE.length, uniq: uniq.size, bad };
});
log("\n成語庫: 自編", audit.idioms, "+ 教育部", audit.moe, "＝去重後", audit.uniq);
for (const k of Object.keys(audit.bad)) {
  const arr = audit.bad[k];
  log(k + " 題庫問題:", arr.length ? "\n  - " + arr.join("\n  - ") : "無");
}

// ── 四單元跑一輪（打字模式，自動批改）
const CASES = [
  { key: "pic", name: "畫中有話", fill: async () => {
      const ans = await page.evaluate(() => window.PWP.current.items.map(i => i.answer));
      const ins = page.locator(".tin");
      for (let i = 0; i < ans.length; i++) await ins.nth(i).fill(ans[i]);
    } },
  { key: "cross", name: "拾字路口", fill: async () => {
      const ans = await page.evaluate(() => window.PWP.current.items.map(i => i.answers.slice(0, 2)));
      const ins = page.locator(".tin");
      let n = 0;
      for (const pair of ans) for (const w of pair) await ins.nth(n++).fill(w);
    } },
  { key: "gem", name: "字字珠璣", fill: async () => {
      const ans = await page.evaluate(() => window.PWP.current.items.map(i => i.answer));
      const ins = page.locator(".tin");
      for (let i = 0; i < ans.length; i++) await ins.nth(i).fill(ans[i]);
    } },
  { key: "chain", name: "洞築機先", fill: async () => {
      const ans = await page.evaluate(() => window.PWP.chainMatches(window.PWP.current.items[0]).slice(0, 3));
      const ins = page.locator(".tin");
      for (let i = 0; i < ans.length; i++) await ins.nth(i).fill(ans[i] || "");
    } }
];

log("");
for (const c of CASES) {
  await page.goto(BASE + "/#/" + c.key, { waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  await page.click('[data-input="type"]');
  await page.waitForTimeout(150);
  await page.click("#slowBtn");                        // 慢練 = 3 倍時間，夠填答
  await page.waitForSelector(".tin", { timeout: 5000 });
  await c.fill();
  await page.screenshot({ path: path.join(SHOT, "10-" + c.key + "-play.png"), fullPage: true });
  await page.click("#rDone");
  await page.waitForSelector("#rResult:not([hidden])", { timeout: 5000 });
  const score = (await page.locator(".result__score").innerText()).replace(/\s+/g, " ");
  log(`${c.name}：${score}`);
  await page.click("#rSave");
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(SHOT, "11-" + c.key + "-result.png"), fullPage: true });
}

// ── 手寫模式 + 畫幾筆
await page.goto(BASE + "/#/pic", { waitUntil: "networkidle" });
await page.click('[data-input="hand"]');
await page.waitForTimeout(150);
await page.click("#slowBtn");
await page.waitForSelector(".pad__cv");
const cv = page.locator(".pad__cv").first();
const box = await cv.boundingBox();
await page.mouse.move(box.x + 30, box.y + 30);
await page.mouse.down();
for (let i = 0; i < 12; i++) await page.mouse.move(box.x + 30 + i * 4, box.y + 30 + Math.sin(i) * 14);
await page.mouse.up();
await page.waitForTimeout(150);
const strokes = await page.evaluate(() => document.querySelectorAll(".pad").length);
log("\n手寫板數量:", strokes);
await page.screenshot({ path: path.join(SHOT, "20-hand.png"), fullPage: true });
await page.click("#rDone");
await page.waitForSelector(".mk", { timeout: 5000 });
await page.click("#allY");
await page.waitForTimeout(200);
log("手寫自評後:", (await page.locator(".result__score").innerText()).replace(/\s+/g, " "));
await page.screenshot({ path: path.join(SHOT, "21-hand-result.png"), fullPage: true });

// ── 行銷成語包
await page.goto(BASE + "/#/mkt", { waitUntil: "networkidle" });
await page.waitForSelector(".mcard", { timeout: 5000 });
log("\n行銷成語包卡片:", await page.locator(".mcard").count());
await page.click('.mchip[data-cat="危機處理"]');
await page.waitForTimeout(150);
log("危機處理分類:", await page.locator(".mcard").count(), "張");
await page.click('.mchip[data-cat="全部"]');
await page.fill("#mktQ", "提案");
await page.waitForTimeout(150);
log("搜「提案」（全部分類）:", await page.locator(".mcard").count(), "張");
await page.screenshot({ path: path.join(SHOT, "50-mkt.png"), fullPage: false });

// ── 紀錄 / 規則頁
for (const [h, f] of [["#/stats", "30-stats.png"], ["#/rules", "31-rules.png"], ["#/daily", "32-daily.png"]]) {
  await page.goto(BASE + "/" + h, { waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOT, f), fullPage: true });
}

// ── 手機視圖
const m = await b.newPage({ viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true });
await m.goto(BASE + "/#/gem", { waitUntil: "networkidle" });
await m.click("#slowBtn");
await m.waitForTimeout(400);
await m.screenshot({ path: path.join(SHOT, "40-mobile.png"), fullPage: true });
await m.close();

log("\n=== Console 錯誤 " + errors.length + " 筆 ===");
errors.slice(0, 20).forEach(e => log(" " + e));

await b.close();
srv.close();
