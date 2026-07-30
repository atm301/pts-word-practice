/* 產生 OG 圖與 apple-touch-icon：node tools/shot.mjs */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, "..", "assets", "img");
fs.mkdirSync(out, { recursive: true });

const jobs = [
  { file: "og.html", w: 1200, h: 630, png: "og.png" },
  { file: "icon.html", w: 180, h: 180, png: "icon-180.png" },
  { file: "icon.html", w: 192, h: 192, png: "icon-192.png" },
  { file: "icon.html", w: 512, h: 512, png: "icon-512.png" }
];

const b = await chromium.launch();
for (const j of jobs) {
  const p = await b.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1 });
  await p.goto("file:///" + path.join(dir, j.file).replace(/\\/g, "/"));
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(out, j.png) });
  console.log("✓", j.png, j.w + "x" + j.h);
  await p.close();
}
await b.close();
