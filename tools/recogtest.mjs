import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = "c:/myclaude/pts-word-practice";
const srv = http.createServer((req,res)=>{ let p=req.url.split("?")[0]; if(p==="/")p="/index.html";
  const f=path.join(ROOT,p); if(!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.writeHead(200,{"content-type":p.endsWith(".js")?"text/javascript":p.endsWith(".json")?"application/json":"text/html"});
  fs.createReadStream(f).pipe(res); });
await new Promise(r=>srv.listen(4178,r));
const b = await chromium.launch(); const pg = await b.newPage();
pg.on("pageerror",e=>console.log("ERR",e.message));
await pg.goto("http://localhost:4178/");
const out = await pg.evaluate(async () => {
  await window.PWPRecog.load();
  const one = [[[10,128],[60,128],[120,128],[200,128],[246,128]]];                 // 一
  const ten = [[[20,128],[120,128],[236,128]],[[128,20],[128,120],[128,236]]];     // 十
  const c1 = new HanziLookup.AnalyzedCharacter(one);
  const c2 = new HanziLookup.AnalyzedCharacter(ten);
  const m = new HanziLookup.Matcher("mmah");
  let r1,r2; m.match(c1,5,x=>r1=x.map(y=>y.character)); m.match(c2,5,x=>r2=x.map(y=>y.character));
  return { one:r1, ten:r2 };
});
console.log("「一」候選:", out.one.join(" "), "|", out.one[0]==="一"?"PASS":"CHECK");
console.log("「十」候選:", out.ten.join(" "), "|", out.ten.includes("十")?"PASS":"CHECK");
await b.close(); srv.close();
