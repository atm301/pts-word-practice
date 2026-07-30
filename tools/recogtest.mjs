/* 手寫辨識煙霧測試：node tools/recogtest.mjs
 * 1) 引擎基本辨識（一、十）
 * 2) 字典約束解碼：首選錯但正解在候選內 → 應被成語庫救回
 * 3) 拾字路口 lockPos + answers 字典
 */
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srv = http.createServer((req, res) => {
  let p = req.url.split("?")[0]; if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": p.endsWith(".js") ? "text/javascript" : p.endsWith(".json") ? "application/json" : "text/html" });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => srv.listen(4178, r));
const b = await chromium.launch(); const pg = await b.newPage();
pg.on("pageerror", e => console.log("ERR", e.message));
await pg.goto("http://localhost:4178/");
const out = await pg.evaluate(async () => {
  await window.PWPRecog.load();
  const one = [[[10,128],[60,128],[120,128],[200,128],[246,128]]];
  const ten = [[[20,128],[120,128],[236,128]],[[128,20],[128,120],[128,236]]];
  const c1 = window.PWPRecog.candidates(one, 5);
  const c2 = window.PWPRecog.candidates(ten, 5);

  await window.PWP.ensureData(["idioms", "moe", "mkt"]);
  const lex = window.PWP.idioms().list;

  // 模擬：四格候選首選都錯（正解排第 2~3 名）→ 字典解碼應組出「一目了然」
  const cands = [
    ["二", "一", "三"],
    ["自", "白", "目"],
    ["子", "了", "予"],
    ["然", "熱", "點"]
  ];
  const d1 = window.PWPRecog.decodeCells(cands, { lexicon: lex });

  // 沒有字典 → 逐格首選（應是 二自子然）
  const d2 = window.PWPRecog.decodeCells(cands, {});

  // 拾字路口：key「率」鎖第 3 格，answers 當字典；首選錯也要救回「轉換率」
  const cands3 = [
    ["輔", "轉", "車"],
    ["換", "接", "投"],
    ["律", "率", "力"]
  ];
  const d3 = window.PWPRecog.decodeCells(cands3, { lockPos: { i: 2, ch: "率" }, lexicon: ["轉換率", "點擊率", "開信率"] });

  return { c1, c2, d1, d2, d3 };
});
console.log("「一」候選:", out.c1.join(" "), "|", out.c1[0] === "一" ? "PASS" : "CHECK");
console.log("「十」候選:", out.c2.join(" "), "|", out.c2.includes("十") ? "PASS" : "CHECK");
console.log("字典解碼(首選全錯):", out.d1.text, out.d1.via, "|", out.d1.text === "一目了然" ? "PASS" : "FAIL");
console.log("無字典(逐格首選):", out.d2.text, out.d2.via, "|", out.d2.text === "二自子然" ? "PASS" : "FAIL");
console.log("拾字路口 lockPos:", out.d3.text, out.d3.via, "|", out.d3.text === "轉換率" ? "PASS" : "FAIL");
await b.close(); srv.close();
const fails = [out.d1.text === "一目了然", out.d2.text === "二自子然", out.d3.text === "轉換率"].filter(x => !x).length;
process.exit(fails ? 1 : 0);
