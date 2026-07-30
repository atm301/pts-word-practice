/* 1-1 手寫辨識 — HanziLookupJS（GPL-3.0，vendor/ 內含原始碼連結）
 * 流程：交卷 → 每格筆畫送辨識 → 轉成文字 → 走與打字模式相同的自動批改，仍可 ✓/✗ 人工覆核。
 * 引擎與資料（~830KB）只在手寫回合第一次開始時載入。
 */
(function () {
  "use strict";

  var state = "idle";        // idle | loading | ready | failed
  var waiters = [];

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = res;
      s.onerror = function () { rej(new Error(src)); };
      document.head.appendChild(s);
    });
  }

  function load() {
    if (state === "ready") return Promise.resolve();
    if (state === "loading" || state === "failed" && waiters.length) {
      return new Promise(function (res, rej) { waiters.push([res, rej]); });
    }
    state = "loading";
    return loadScript("vendor/hanzilookup.min.js").then(function () {
      return new Promise(function (res, rej) {
        window.HanziLookup.init("mmah", "vendor/mmah.json", function (ok) {
          if (ok) { state = "ready"; res(); waiters.forEach(function (w) { w[0](); }); }
          else { state = "failed"; rej(new Error("mmah")); waiters.forEach(function (w) { w[1](); }); }
          waiters = [];
        });
      });
    }).catch(function (e) { state = "failed"; throw e; });
  }

  /* 單格筆畫 → 候選字陣列（依信心排序），空格回 [] */
  function candidates(cellStrokes, limit) {
    if (!cellStrokes.length || state !== "ready") return [];
    try {
      var ac = new window.HanziLookup.AnalyzedCharacter(cellStrokes);
      var matcher = new window.HanziLookup.Matcher("mmah");
      var out = [];
      matcher.match(ac, limit || 8, function (matches) {
        out = (matches || []).map(function (m) { return m.character; });
      });
      return out;
    } catch (e) { return []; }
  }

  /* pad → 逐格轉錄。expected（可為 null）＝已知正解字串：
   * 若正解該位置的字出現在該格候選前 8 名，就採納正解字（降低辨識誤殺）。 */
  function transcribe(pad, expected) {
    var byCell = pad.strokesByCell();
    var chars = byCell.map(function (cs, ci) {
      var cand = candidates(cs, 8);
      if (!cand.length) return "";
      if (expected && expected[ci] && cand.indexOf(expected[ci]) >= 0) return expected[ci];
      return cand[0];
    });
    // 尾端空格剔除（寫三個字留一格空）
    var txt = chars.join("").replace(/\s+/g, "");
    return { text: txt, chars: chars };
  }

  window.PWPRecog = {
    load: load,
    transcribe: transcribe,
    isReady: function () { return state === "ready"; },
    hasFailed: function () { return state === "failed"; }
  };
})();
