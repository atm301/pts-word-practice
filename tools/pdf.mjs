/* 產出行銷成語包 PDF：node tools/pdf.mjs */
import { chromium } from "playwright";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const b = await chromium.launch();
const pg = await b.newPage();
await pg.goto(pathToFileURL(path.join(ROOT, "cheatsheet.html")).href);
await pg.waitForSelector(".row");
const out = path.join(ROOT, "行銷人成語包速覽.pdf");
await pg.pdf({
  path: out, format: "A4", printBackground: false,
  margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" }
});
console.log("✓", out);
await b.close();
