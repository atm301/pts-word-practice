/* 1-1 手寫辨識 — HanziLookupJS（GPL-3.0，vendor/ 內含原始碼連結）
 * 流程：交卷 → 每格筆畫送辨識取候選 → 「字典約束解碼」組出最合理的詞 → 走打字模式批改，仍可 ✓/✗ 覆核。
 * 準確度策略（v2）：
 *   1. looseness 0.15 → 0.30：筆形比對更寬容（寫醜一點也認得）
 *   2. 每格取前 20 名候選，而非只信第 1 名
 *   3. 字典約束：候選組合先對合法詞庫（成語庫／題目答案清單）比對，像哪個詞就認哪個詞
 *   4. 已知正解（expected）在候選前 20 名內就直接採納
 * 引擎與資料（~830KB）只在手寫回合第一次開始時載入。
 */
(function () {
  "use strict";

  var LOOSENESS = 0.30;
  var CAND_N = 20;        // 每格保留的候選數
  var LEX_DEPTH = 12;     // 字典比對時，每格看前幾名

  var state = "idle";
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
    if (state === "loading") {
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
      var matcher = new window.HanziLookup.Matcher("mmah", LOOSENESS);
      var out = [];
      matcher.match(ac, limit || CAND_N, function (matches) {
        out = (matches || []).map(function (m) { return m.character; });
      });
      return out;
    } catch (e) { return []; }
  }

  /* 字典約束解碼（純函式，可單測）
   * candLists：每格候選字陣列（空格為 []）
   * opts.expected：已知正解字串（逐格 snap，"＿" 表示該格不指定）
   * opts.lockPos：{ i, ch } 指定第 i 格必須是 ch（拾字路口的關鍵字位置）
   * opts.lexicon：合法詞清單；候選組合能拼出清單內的詞就採納（取各格名次和最小者）
   */
  function decodeCells(candLists, opts) {
    opts = opts || {};
    var n = candLists.length;
    var inked = [];                      // 有筆跡的格 index（保持順序）
    for (var i = 0; i < n; i++) if (candLists[i].length) inked.push(i);

    function rankOf(ci, ch, depth) {
      var r = candLists[ci].indexOf(ch);
      return (r >= 0 && r < (depth || CAND_N)) ? r : -1;
    }

    // 1) 字典比對：找「長度＝有墨格數」且每字都在該格前 LEX_DEPTH 名的詞，名次和最小者勝
    if (opts.lexicon && inked.length) {
      var best = null, bestScore = Infinity;
      for (var w = 0; w < opts.lexicon.length; w++) {
        var word = opts.lexicon[w];
        if (word.length !== inked.length) continue;
        if (opts.lockPos && word[opts.lockPos.i] !== opts.lockPos.ch) continue;
        var score = 0, ok = true;
        for (var k = 0; k < word.length; k++) {
          var r = rankOf(inked[k], word[k], LEX_DEPTH);
          if (r < 0) { ok = false; break; }
          score += r;
        }
        if (ok && score < bestScore) { bestScore = score; best = word; }
      }
      if (best) {
        var chars0 = candLists.map(function () { return ""; });
        for (var k2 = 0; k2 < best.length; k2++) chars0[inked[k2]] = best[k2];
        return { text: best, chars: chars0, via: "lexicon" };
      }
    }

    // 2) 逐格：expected / lockPos 在候選內就採納，否則取第 1 名
    var chars = candLists.map(function (cand, ci) {
      if (!cand.length) return "";
      if (opts.lockPos && opts.lockPos.i === ci && rankOf(ci, opts.lockPos.ch) >= 0) return opts.lockPos.ch;
      var exp = opts.expected && opts.expected[ci];
      if (exp && exp !== "＿" && rankOf(ci, exp) >= 0) return exp;
      return cand[0];
    });
    return { text: chars.join(""), chars: chars, via: "top1" };
  }

  /* pad → 逐格候選 → 解碼成文字 */
  function transcribe(pad, opts) {
    var byCell = pad.strokesByCell();
    var candLists = byCell.map(function (cs) { return candidates(cs, CAND_N); });
    return decodeCells(candLists, opts || {});
  }

  window.PWPRecog = {
    load: load,
    transcribe: transcribe,
    decodeCells: decodeCells,
    candidates: candidates,
    isReady: function () { return state === "ready"; },
    hasFailed: function () { return state === "failed"; }
  };
})();
