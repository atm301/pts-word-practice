/* 2-1 題庫 schema 驗證（純 Node，CI 與 pre-push 共用）：node tools/validate.mjs
 * 檢查：四單元題庫結構、成語庫、拾字路口位置一致性、字字珠璣詞組對應、
 *      洞築機先每組可滿分（庫內 ≥12 句）、HTML 安全（CSP、noopener）、必要資產存在。
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errs = [];
const warn = [];

function load(file, ctx) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), ctx, { filename: file });
}
const ctx = vm.createContext({ window: {} });
["data/idioms.js", "data/idioms-moe.js", "data/pic.js", "data/cross.js", "data/gem.js", "data/chain.js", "data/mkt.js"]
  .forEach(f => load(f, ctx));
const W = ctx.window;

// ── 成語庫
const set = new Set([...(W.IDIOMS || []), ...(W.IDIOMS_MOE || [])]);
if ((W.IDIOMS || []).length < 500) errs.push(`idioms.js 僅 ${W.IDIOMS.length} 條（<500）`);
if ((W.IDIOMS_MOE || []).length < 4000) warn.push(`idioms-moe.js 僅 ${(W.IDIOMS_MOE || []).length} 條`);
W.IDIOMS.forEach(s => { if (s.length !== 4) errs.push(`idioms 非四字：${s}`); });

// ── 畫中有話
const LAYOUTS = new Set(["count", "stack", "nest", "size", "arrow", "grid", "pile", "flip", "scatter", "overlap", "row", "updown"]);
W.PIC_BANK.forEach(it => {
  if (!it.id || !it.answer || !it.layout || !it.spec) errs.push(`pic ${it.id || "?"} 欄位缺漏`);
  if (it.answer && it.answer.length !== 4) errs.push(`pic ${it.id} 答案非四字：${it.answer}`);
  if (it.answer && !set.has(it.answer)) errs.push(`pic ${it.id} 答案不在成語庫：${it.answer}`);
  if (!LAYOUTS.has(it.layout)) errs.push(`pic ${it.id} 未知 layout：${it.layout}`);
});
if (new Set(W.PIC_BANK.map(i => i.id)).size !== W.PIC_BANK.length) errs.push("pic id 重複");

// ── 拾字路口
W.CROSS_BANK.forEach(it => {
  if (![1, 2, 3].includes(it.pos)) errs.push(`cross ${it.id} pos 非 1~3`);
  if ((it.answers || []).length < 4) errs.push(`cross ${it.id} 答案少於 4 個`);
  if (new Set(it.answers).size !== it.answers.length) errs.push(`cross ${it.id} 答案重複`);
  it.answers.forEach(w => {
    if (w.length !== 3) errs.push(`cross ${it.id} 非三字：${w}`);
    else if (w[it.pos - 1] !== it.key) errs.push(`cross ${it.id} 位置不符：${w}（key=${it.key} pos=${it.pos}）`);
  });
});

// ── 字字珠璣
W.GEM_BANK.forEach(it => {
  if ((it.answer || "").length !== 1) errs.push(`gem ${it.id} 答案非單字`);
  (it.hints || []).forEach(h => {
    const w = h.order === "after" ? h.ch + it.answer : it.answer + h.ch;
    if (!it.words.includes(w)) errs.push(`gem ${it.id} words 缺 ${w}`);
  });
  it.words.forEach(w => {
    if (w.length !== 2) errs.push(`gem ${it.id} 詞非二字：${w}`);
    if (!w.includes(it.answer)) errs.push(`gem ${it.id} 詞不含答案：${w}`);
  });
});

// ── 洞築機先（每組庫內至少 12 句才能滿分）
const all = [...set];
W.CHAIN_BANK.forEach(it => {
  let n;
  if (it.type === "char") n = all.filter(s => s.includes(it.key)).length;
  else {
    const chars = (W.RADICAL_CHARS || {})[it.key] || "";
    if (!chars) { errs.push(`chain ${it.id} RADICAL_CHARS 缺 ${it.key}`); return; }
    n = all.filter(s => [...s].some(c => chars.includes(c))).length;
  }
  if (n < 12) errs.push(`chain ${it.id}（${it.label || it.key}）庫內僅 ${n} 句 <12`);
});

// ── 行銷成語包（詞庫同步併入批改）
const setPlusMkt = new Set([...set, ...W.MKT_BANK.map(x => x.w)]);
{
  const seen = new Set();
  W.MKT_BANK.forEach(x => {
    if (!/^[一-鿿]{4}$/.test(x.w || "")) errs.push(`mkt 非四字成語：${x.w}`);
    if (!W.MKT_CATS.includes(x.cat)) errs.push(`mkt ${x.w} 分類不在 MKT_CATS：${x.cat}`);
    if (!x.mk || !x.ex) errs.push(`mkt ${x.w} 缺 mk/ex`);
    if (seen.has(x.w)) errs.push(`mkt 重複：${x.w}`);
    seen.add(x.w);
  });
}

// ── HTML 安全（6-1/6-3）
for (const f of ["index.html", "privacy.html"]) {
  const html = fs.readFileSync(path.join(ROOT, f), "utf8");
  const blanks = html.match(/<a [^>]*target="_blank"[^>]*>/g) || [];
  blanks.forEach(tag => { if (!/rel="[^"]*noopener/.test(tag)) errs.push(`${f} target=_blank 少 noopener：${tag.slice(0, 60)}`); });
  if (f === "index.html") {
    if (!html.includes("Content-Security-Policy")) errs.push("index.html 缺 CSP meta");
    if (!html.includes("manifest.webmanifest")) errs.push("index.html 缺 manifest 連結");
    if (!html.includes("serviceWorker")) errs.push("index.html 缺 SW 註冊");
  }
}

// ── 必要資產
["sw.js", "manifest.webmanifest", "assets/img/og.png", "assets/img/icon-192.png", "assets/img/icon-512.png",
 "vendor/hanzilookup.min.js", "vendor/mmah.json"]
  .forEach(f => { if (!fs.existsSync(path.join(ROOT, f))) errs.push(`缺檔案：${f}`); });

// ── SW 預快取清單指向的檔案要存在
const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
(sw.match(/"([^"]+\.(?:js|css|png|html|webmanifest))"/g) || []).map(s => s.slice(1, -1)).forEach(f => {
  if (!fs.existsSync(path.join(ROOT, f))) errs.push(`sw.js 預快取指向不存在的檔案：${f}`);
});

console.log(`題庫：pic ${W.PIC_BANK.length}、cross ${W.CROSS_BANK.length}、gem ${W.GEM_BANK.length}、chain ${W.CHAIN_BANK.length}、mkt ${W.MKT_BANK.length}(${W.MKT_CATS.length}類)、成語 ${setPlusMkt.size}`);
warn.forEach(w => console.log("⚠", w));
if (errs.length) {
  console.error(`\n✗ ${errs.length} 個問題：`);
  errs.forEach(e => console.error("  -", e));
  process.exit(1);
}
console.log("✓ validate 全部通過");
