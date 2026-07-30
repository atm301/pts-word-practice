/* 一字千金 練習場 — 主程式
 * 四單元：畫中有話 2.0 / 拾字路口 2.0 / 字字珠璣 / 洞築機先
 * 兩種作答模式：手寫（模擬節目平板，答完自評）／打字（自動批改，適合快速刷題）
 */
(function () {
  "use strict";

  // ────────────────────────────────────────── 工具
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedFrom(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function shuffle(arr, rnd) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor((rnd || Math.random)() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pick(arr, n, rnd) { return shuffle(arr, rnd).slice(0, n); }
  function track(name, params) {
    if (window.gtag) window.gtag("event", name, params || {});
    if (window.fbq) window.fbq("trackCustom", name, params || {});
  }

  // ────────────────────────────────────────── 狀態
  var KEY = "pwp.v1";
  var DEF = {
    points: 0,
    streak: { days: 0, last: "" },
    stats: {},              // unit -> {rounds, got, total}
    wrong: {},              // unit -> { itemId: {step, due} }  間隔重複：錯→明天，答對後 +3 天、+7 天，三關全過畢業
    daily: {},              // date -> {unit:true}
    badges: [],
    settings: { input: "hand", penOnly: false, guide: true, sound: true, recog: true }
  };
  var S = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEF));
      var o = JSON.parse(raw);
      var st = Object.assign(JSON.parse(JSON.stringify(DEF)), o, {
        settings: Object.assign({}, DEF.settings, o.settings || {})
      });
      // v1 → v1.1 遷移：wrong 由 [id] 陣列改為 {id:{step,due}}
      Object.keys(st.wrong || {}).forEach(function (u) {
        if (Array.isArray(st.wrong[u])) {
          var m = {};
          st.wrong[u].forEach(function (id) { m[id] = { step: 0, due: "" }; });
          st.wrong[u] = m;
        }
      });
      return st;
    } catch (e) { return JSON.parse(JSON.stringify(DEF)); }
  }
  var saveWarned = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) {
      // 6-2 quota 滿或無痕模式：紀錄降級為僅存在記憶體，提示一次
      if (!saveWarned) {
        saveWarned = true;
        toast("⚠ 無法寫入本機儲存（空間滿或無痕模式），本次紀錄關閉分頁後會消失");
      }
    }
  }

  /* 8-2 題庫 lazy load：進單元才載對應資料檔 */
  var DATA_FILES = {
    idioms: "data/idioms.js",
    moe: "data/idioms-moe.js",
    pic: "data/pic.js",
    cross: "data/cross.js",
    gem: "data/gem.js",
    chain: "data/chain.js",
    mkt: "data/mkt.js"
  };
  var _dataP = {};
  function ensureData(keys) {
    return Promise.all(keys.map(function (k) {
      if (_dataP[k]) return _dataP[k];
      _dataP[k] = new Promise(function (res, rej) {
        var s = document.createElement("script");
        s.src = DATA_FILES[k];
        s.onload = res;
        s.onerror = function () { delete _dataP[k]; rej(new Error("load " + k)); };
        document.head.appendChild(s);
      });
      return _dataP[k];
    }));
  }

  var LEVELS = [
    [0, "實習文案"], [200, "社群小編"], [600, "行銷專員"], [1200, "資深操盤手"],
    [2400, "品牌總監"], [4000, "文字狙擊手"], [6500, "一字千金"]
  ];
  function levelOf(p) {
    var cur = LEVELS[0], next = null;
    for (var i = 0; i < LEVELS.length; i++) {
      if (p >= LEVELS[i][0]) cur = LEVELS[i]; else { next = LEVELS[i]; break; }
    }
    return { name: cur[1], at: cur[0], next: next };
  }

  var BADGES = [
    { id: "first", name: "初次登板", desc: "完成第一輪練習" },
    { id: "picfull", name: "滿版成語", desc: "畫中有話一版全對" },
    { id: "gem8", name: "珠璣在手", desc: "字字珠璣單輪 8 題以上全對" },
    { id: "chain12", name: "三關全開", desc: "洞築機先三關達標（12 句）" },
    { id: "cross3", name: "路口老手", desc: "拾字路口單一路口拿滿 3 分" },
    { id: "streak3", name: "三日不輟", desc: "連續練習 3 天" },
    { id: "streak7", name: "七日鐵人", desc: "連續練習 7 天" },
    { id: "p1000", name: "千金入袋", desc: "累積 1000 分" }
  ];
  function grantBadge(id) {
    if (S.badges.indexOf(id) >= 0) return;
    S.badges.push(id); save();
    var b = BADGES.filter(function (x) { return x.id === id; })[0];
    if (b) toast("🏅 解鎖徽章：" + b.name);
    track("badge_unlock", { badge: id });
  }
  function addPoints(n) {
    S.points += n; save();
    if (S.points >= 1000) grantBadge("p1000");
    paintHeader();
  }
  function markPlayed() {
    var t = todayStr();
    if (S.streak.last === t) return;
    var y = new Date(); y.setDate(y.getDate() - 1);
    var ys = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0");
    S.streak.days = S.streak.last === ys ? S.streak.days + 1 : 1;
    S.streak.last = t;
    addPoints(20);
    toast("🔥 連續練習 " + S.streak.days + " 天，每日首練 +20 分");
    if (S.streak.days >= 3) grantBadge("streak3");
    if (S.streak.days >= 7) grantBadge("streak7");
    save();
  }
  function logRound(unit, got, total) {
    var st = S.stats[unit] || (S.stats[unit] = { rounds: 0, got: 0, total: 0 });
    st.rounds++; st.got += got; st.total += total;
    grantBadge("first");
    save();
  }
  /* 1-3 間隔重複：答錯 → 明天到期；復習答對 → +3 天 → +7 天 → 畢業移除 */
  var SRS_GAP = [1, 3, 7];
  function dateAdd(days) {
    var d = new Date(); d.setDate(d.getDate() + days);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function addWrong(unit, id) {
    var m = S.wrong[unit] || (S.wrong[unit] = {});
    m[id] = { step: 0, due: dateAdd(SRS_GAP[0]) };
    save();
  }
  function clearWrong(unit, id) {
    var m = S.wrong[unit]; if (!m || !m[id]) return;
    var rec = m[id];
    rec.step++;
    if (rec.step >= SRS_GAP.length) delete m[id];        // 三關全過，畢業
    else rec.due = dateAdd(SRS_GAP[rec.step]);
    save();
  }
  function wrongIds(unit) { return Object.keys(S.wrong[unit] || {}); }
  function dueIds(unit) {
    var t = todayStr(), m = S.wrong[unit] || {};
    return Object.keys(m).filter(function (id) { return !m[id].due || m[id].due <= t; });
  }

  // ────────────────────────────────────────── 單元設定
  var UNITS = {
    pic: {
      key: "pic", name: "畫中有話", ver: "2.0", cells: 4, sec: 30, count: 10, icon: "🖼",
      rule: "題目由若干提示字組成的圖形，寫出所代表的四字成語即可得分。",
      real: "節目實戰：整版 10 題、30 秒，每題 1 分。"
    },
    cross: {
      key: "cross", name: "拾字路口", ver: "2.0", cells: 3, sec: 30, count: 2, icon: "➕",
      rule: "題目出一關鍵字，寫出符合題目字位置的兩句三字詞，1 句 1 分，2 句都寫對 3 分。",
      real: "節目實戰：30 秒。電視牆會同時亮出數種位置類型，本站預設 2 個路口，可自行加到 5 個。"
    },
    gem: {
      key: "gem", name: "字字珠璣", ver: "", cells: 1, sec: 30, count: 3, icon: "💎",
      rule: "題目出 3~4 字，寫出一字能與提示字各自成立合理的 2 字詞答案。",
      real: "節目實戰：30 秒。最難的是「雙向題」——答案有時放前面、有時放後面。"
    },
    chain: {
      key: "chain", name: "洞築機先", ver: "", cells: 4, sec: 40, count: 3, icon: "🧩",
      rule: "依提示字與部件進行三個關卡挑戰：40 秒寫 3 句成語、50 秒寫 4 句、60 秒寫 5 句，每句 1 分，累積分數高者獲勝。",
      real: "節目實戰：三關累進計分，共 12 句滿分。"
    }
  };

  // ────────────────────────────────────────── 成語庫索引
  var IDIOM_SET = null, IDIOM_LIST = null, IDIOM_KEY = -1;
  function idioms() {
    var src = (window.IDIOMS || []);
    var moe = (window.IDIOMS_MOE || []);
    var mkt = (window.MKT_BANK || []).map(function (x) { return x.w; });
    var key = src.length + moe.length + mkt.length;   // 資料檔 lazy 載入後自動重建索引
    if (!IDIOM_SET || IDIOM_KEY !== key) {
      IDIOM_KEY = key;
      IDIOM_SET = {};
      IDIOM_LIST = [];
      src.concat(mkt, moe).forEach(function (s) {
        if (!IDIOM_SET[s]) { IDIOM_SET[s] = 1; IDIOM_LIST.push(s); }
      });
    }
    return { set: IDIOM_SET, list: IDIOM_LIST };
  }
  function chainMatches(item) {
    var all = idioms().list;
    if (item.type === "char") {
      return all.filter(function (s) { return s.indexOf(item.key) >= 0; });
    }
    var chars = (window.RADICAL_CHARS || {})[item.key] || "";
    return all.filter(function (s) {
      for (var i = 0; i < s.length; i++) if (chars.indexOf(s[i]) >= 0) return true;
      return false;
    });
  }

  // ────────────────────────────────────────── UI 基礎
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    $("#toasts").appendChild(t);
    setTimeout(function () { t.classList.add("is-out"); }, 2600);
    setTimeout(function () { t.remove(); }, 3200);
  }

  function paintHeader() {
    var lv = levelOf(S.points);
    $("#hPoints").textContent = S.points;
    $("#hStreak").textContent = S.streak.days;
    $("#hLevel").textContent = lv.name;
    var bar = $("#hBar");
    if (lv.next) {
      var span = lv.next[0] - lv.at;
      bar.style.width = Math.min(100, Math.round(((S.points - lv.at) / span) * 100)) + "%";
      bar.parentNode.title = "再 " + (lv.next[0] - S.points) + " 分升「" + lv.next[1] + "」";
    } else {
      bar.style.width = "100%";
      bar.parentNode.title = "已達最高稱號";
    }
  }

  function Timer(sec, onTick, onEnd) {
    this.total = sec; this.left = sec; this.onTick = onTick; this.onEnd = onEnd;
    this.t0 = Date.now(); this.paused = false; this._h = null;
  }
  Timer.prototype.start = function () {
    var self = this;
    this.t0 = Date.now();
    this._h = setInterval(function () {
      if (self.paused) return;
      var el = (Date.now() - self.t0) / 1000;
      self.left = Math.max(0, self.total - el);
      self.onTick(self.left, self.total);
      if (self.left <= 0) { self.stop(); self.onEnd(); }
    }, 100);
    this.onTick(this.left, this.total);
  };
  Timer.prototype.stop = function () { if (this._h) clearInterval(this._h); this._h = null; };

  // ────────────────────────────────────────── 路由
  var VIEWS = {};
  function go(hash) { location.hash = hash; }
  function route() {
    var h = (location.hash || "#/").replace(/^#/, "");
    var parts = h.split("/").filter(Boolean);
    var name = parts[0] || "home";
    var fn = VIEWS[name] || VIEWS.home;
    var root = $("#view");
    root.innerHTML = "";
    window.scrollTo(0, 0);
    fn(root, parts.slice(1));
    $$("[data-nav]").forEach(function (a) {
      a.classList.toggle("is-on", a.getAttribute("data-nav") === name);
    });
  }

  // ────────────────────────────────────────── 首頁
  VIEWS.home = function (root) {
    var d = S.daily[todayStr()] || {};
    var doneCount = Object.keys(UNITS).filter(function (k) { return d[k]; }).length;

    var cards = Object.keys(UNITS).map(function (k) {
      var u = UNITS[k];
      var st = S.stats[k] || { rounds: 0, got: 0, total: 0 };
      var acc = st.total ? Math.round((st.got / st.total) * 100) : null;
      return '<a class="ucard" href="#/' + k + '">' +
        '<div class="ucard__top"><span class="ucard__icon">' + u.icon + "</span>" +
        (d[k] ? '<span class="chip chip--done">今日已練</span>' : "") + "</div>" +
        '<h3 class="ucard__name">' + u.name + (u.ver ? ' <em>' + u.ver + "</em>" : "") + "</h3>" +
        '<p class="ucard__rule">' + esc(u.rule) + "</p>" +
        '<div class="ucard__meta"><span>⏱ ' + u.sec + ' 秒</span>' +
        (acc == null ? "<span>尚未練習</span>" : "<span>正確率 " + acc + "%（" + st.rounds + " 輪）</span>") +
        "</div></a>";
    }).join("");

    root.innerHTML =
      '<section class="hero">' +
        '<h1 class="hero__h1">一字千金 <span>練習場</span></h1>' +
        '<p class="hero__sub">給行銷人與廣告人的手寫國文特訓。四個單元、真實秒數、平板手寫作答——把「腦子裡有但寫不出來」練成反射動作。</p>' +
        '<div class="hero__row">' +
          '<a class="btn btn--primary" href="#/daily">今日挑戰 <b>' + doneCount + "/4</b></a>" +
          '<a class="btn" href="#/mkt">📣 行銷成語包</a>' +
          '<a class="btn" href="#/rules">單元規則</a>' +
          '<button class="btn" id="shareBtn" type="button">分享給隊友</button>' +
        "</div>" +
        '<p class="hero__note">建議用平板 + 觸控筆開這一頁。手機直式也能練，但格子會比較擠。</p>' +
      "</section>" +
      '<section class="grid-u">' + cards + "</section>" +
      '<section class="panel">' +
        "<h2>怎麼練最有效</h2>" +
        '<ol class="steps">' +
          "<li><b>先用手寫模式跑一輪實戰</b>——時間壓力下寫得出來，才是真的會。寫完自評對錯。</li>" +
          "<li><b>錯的進錯題本</b>，隔天用打字模式快速刷一遍，把記憶補起來。</li>" +
          "<li><b>洞築機先每天各刷一個提示字</b>，這關最吃平常累積，臨場硬想沒有用。</li>" +
          "<li><b>字字珠璣練「雙向」</b>——答案放前面還是後面都要能轉，節目最愛考這個。</li>" +
        "</ol>" +
        '<p class="muted">紀錄只存在你這台裝置的瀏覽器（localStorage），沒有帳號、沒有上傳。</p>' +
      "</section>";

    var sb = $("#shareBtn");
    if (sb) sb.addEventListener("click", doShare);
  };

  // ────────────────────────────────────────── 今日挑戰
  VIEWS.daily = function (root) {
    var t = todayStr();
    var d = S.daily[t] || (S.daily[t] = {});
    var rows = Object.keys(UNITS).map(function (k) {
      var u = UNITS[k];
      return '<li class="dlist__i' + (d[k] ? " is-done" : "") + '">' +
        '<span class="dlist__ic">' + u.icon + "</span>" +
        "<span><b>" + u.name + "</b><small>" + u.real + "</small></span>" +
        (d[k] ? '<span class="chip chip--done">完成</span>'
              : '<a class="btn btn--sm btn--primary" href="#/' + k + '/daily">開始</a>') +
        "</li>";
    }).join("");
    // 1-3 今日到期的復習題摘要
    var dueRows = Object.keys(UNITS).map(function (k) {
      var n = dueIds(k).length;
      return n ? '<li class="dlist__i"><span class="dlist__ic">📒</span>' +
        "<span><b>" + UNITS[k].name + " 複習</b><small>間隔重複排程：今天到期 " + n + " 題</small></span>" +
        '<a class="btn btn--sm" href="#/' + k + '/wrong">複習</a></li>' : "";
    }).join("");

    root.innerHTML =
      '<section class="panel">' +
        "<h2>今日挑戰 · " + t + "</h2>" +
        '<p class="muted">每天題目固定（同一天所有人抽到同一組），四個單元各跑一輪。四關全清 +50 分。</p>' +
        '<ul class="dlist">' + rows + "</ul>" +
        (dueRows ? "<h3>今日複習佇列</h3><ul class=\"dlist\">" + dueRows + "</ul>" : "") +
        '<a class="btn" href="#/">回首頁</a>' +
      "</section>";
  };

  // ────────────────────────────────────────── 設定面板（共用）
  function settingsBar() {
    var s = S.settings;
    return '<div class="setbar">' +
      '<div class="seg" role="group" aria-label="作答方式">' +
        '<button type="button" class="seg__b' + (s.input === "hand" ? " is-on" : "") + '" data-input="hand">✍ 手寫</button>' +
        '<button type="button" class="seg__b' + (s.input === "type" ? " is-on" : "") + '" data-input="type">⌨ 打字</button>' +
      "</div>" +
      '<label class="tog"><input type="checkbox" id="setPen"' + (s.penOnly ? " checked" : "") + "> 只接受觸控筆</label>" +
      '<label class="tog"><input type="checkbox" id="setGuide"' + (s.guide ? " checked" : "") + "> 田字格</label>" +
      (s.input === "hand"
        ? '<label class="tog"><input type="checkbox" id="setRecog"' + (s.recog ? " checked" : "") + "> 自動辨識（實驗）</label>"
        : "") +
      "</div>";
  }
  function bindSettings(host, onChange) {
    $$("[data-input]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        S.settings.input = b.getAttribute("data-input"); save();
        if (onChange) onChange();
      });
    });
    var p = $("#setPen", host), g = $("#setGuide", host), r = $("#setRecog", host);
    if (p) p.addEventListener("change", function () { S.settings.penOnly = p.checked; save(); if (onChange) onChange(); });
    if (g) g.addEventListener("change", function () { S.settings.guide = g.checked; save(); if (onChange) onChange(); });
    if (r) r.addEventListener("change", function () { S.settings.recog = r.checked; save(); if (onChange) onChange(); });
  }

  // ────────────────────────────────────────── 分享
  function doShare() {
    var url = location.origin + location.pathname;
    var text = "《一字千金》練習場：四個單元、真實秒數、平板手寫作答。我現在是「" + levelOf(S.points).name + "」。";
    track("share_click");
    if (navigator.share) {
      navigator.share({ title: "一字千金 練習場", text: text, url: url }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text + " " + url).then(function () { toast("連結已複製"); });
    } else {
      toast(url);
    }
  }

  // 對外
  window.PWP = {
    $: $, $$: $$, esc: esc, S: S, save: save, UNITS: UNITS,
    Timer: Timer, toast: toast, addPoints: addPoints, markPlayed: markPlayed,
    logRound: logRound, addWrong: addWrong, clearWrong: clearWrong, grantBadge: grantBadge,
    wrongIds: wrongIds, dueIds: dueIds, ensureData: ensureData,
    VIEWS: VIEWS, go: go, route: route, paintHeader: paintHeader,
    shuffle: shuffle, pick: pick, mulberry32: mulberry32, seedFrom: seedFrom, todayStr: todayStr,
    idioms: idioms, chainMatches: chainMatches, settingsBar: settingsBar, bindSettings: bindSettings,
    levelOf: levelOf, BADGES: BADGES, track: track, doShare: doShare
  };

  // ────────────────────────────────────────── 啟動
  document.addEventListener("DOMContentLoaded", function () {
    paintHeader();
    window.addEventListener("hashchange", route);
    route();
    $("#year").textContent = new Date().getFullYear();
    var cc = $("#cookie");
    if (localStorage.getItem("pwp.cc") === "1") cc.remove();
    else $("#ccOk").addEventListener("click", function () {
      localStorage.setItem("pwp.cc", "1"); cc.remove();
    });
  });
})();
