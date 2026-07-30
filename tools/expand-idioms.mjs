/* 2-2 用教育部《成語典》開放資料擴充成語庫 → data/idioms-moe.js
 * 用法：node tools/expand-idioms.mjs <path-to-idioms.json>
 * 資料源：rschiang/idioine data/idioms.json（教育部成語典 2020 版，CC BY-ND 3.0 TW）
 * 僅取「詞目」四字條目作為批改對照清單，未修改任何條目內容。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const src = process.argv[2] || path.join(process.env.TEMP || "/tmp", "moe_idioms.json");
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "idioms-moe.js");

const raw = JSON.parse(fs.readFileSync(src, "utf8"));
const CJK = /^[一-鿿]{4}$/;
const words = [...new Set(raw.map(e => (e.word || "").trim()).filter(w => CJK.test(w)))].sort();

const header = `/* 教育部《成語典》詞目清單（僅四字條目，共 ${words.length} 條）
 * 姓名標示：中華民國教育部（Ministry of Education, R.O.C.）。《成語典》
 * 網址：http://dict.idioms.moe.edu.tw/ ・ 創用CC-姓名標示-禁止改作 臺灣3.0版
 * 本檔僅擷取詞目字串供批改對照，未修改任何條目內容。
 * 產生方式：node tools/expand-idioms.mjs（資料源 rschiang/idioine）
 */
`;
fs.writeFileSync(out, header + "window.IDIOMS_MOE=" + JSON.stringify(words) + ";\n", "utf8");
console.log("✓ data/idioms-moe.js:", words.length, "條，", Math.round(fs.statSync(out).size / 1024) + "KB");
