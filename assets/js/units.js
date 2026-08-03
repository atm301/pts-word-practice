/* 四單元作答邏輯 + 揭曉自評 + 錯題本 / 統計 / 規則頁 */
(function () {
  "use strict";
  var P = window.PWP;
  var $ = P.$, $$ = P.$$, esc = P.esc, S = P.S, UNITS = P.UNITS;

  // ══════════════════════════════════════════ 通用回合引擎
  function startRound(root, cfg) {
    var items = cfg.items;
    if (!items.length) {
      root.innerHTML = '<section class="panel"><h2>沒有題目</h2><p class="muted">錯題本是空的，先去練一輪吧。</p><a class="btn" href="#/' + cfg.unit + '">回單元</a></section>';
      return;
    }

    var pads = [], inputs = [], marks = [], overs = [];
    var hand = S.settings.input === "hand";
    var finished = false, timer = null;
    P.current = { unit: cfg.unit, mode: cfg.mode, items: items };   // 供除錯／自動化測試讀取

    var qs = items.map(function (item, qi) {
      var slots = cfg.slotsOf(item);
      marks[qi] = slots.map(function () { return null; });
      overs[qi] = slots.map(function () { return false; });
      var ans = slots.map(function (sl, si) {
        var id = "q" + qi + "s" + si;
        if (hand) {
          return '<div class="slot">' + (sl.hint ? '<span class="slot__hint">' + esc(sl.hint) + "</span>" : "") +
            '<div class="padhost" data-q="' + qi + '" data-s="' + si + '" data-cells="' + sl.cells + '"></div></div>';
        }
        return '<div class="slot">' + (sl.hint ? '<span class="slot__hint">' + esc(sl.hint) + "</span>" : "") +
          '<input class="tin" id="' + id + '" data-q="' + qi + '" data-s="' + si + '" maxlength="' + (sl.cells + 2) +
          '" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text" placeholder="' +
          (sl.cells === 1 ? "寫一個字" : sl.cells + " 個字") + '"></div>';
      }).join("");

      return '<article class="qitem" data-q="' + qi + '">' +
        '<div class="qitem__no">' + (qi + 1) + "</div>" +
        '<div class="qitem__q">' + cfg.renderQ(item) + "</div>" +
        '<div class="qitem__a">' + ans + "</div>" +
        '<div class="qitem__r" hidden></div>' +
        "</article>";
    }).join("");

    root.innerHTML =
      '<section class="round">' +
        '<span class="sr-only" aria-live="assertive" id="srLive"></span>' +
        '<div class="round__head">' +
          '<div class="round__meta"><b>' + esc(cfg.label) + "</b>" +
            '<span class="muted">' + esc(cfg.sub || "") + "</span></div>" +
          '<div class="round__clock" aria-hidden="true"><span id="rClock">' + cfg.sec.toFixed(1) + '</span><small>秒</small></div>' +
          '<button class="btn btn--sm" id="rDone" type="button" title="也可按 Esc 交卷">交卷 <kbd>Esc</kbd></button>' +
        "</div>" +
        '<div class="round__bar"><div class="round__fill" id="rFill"></div></div>' +
        '<div class="qlist' + (cfg.wide ? " is-wide" : "") + '">' + qs + "</div>" +
        '<div class="result" id="rResult" hidden></div>' +
      "</section>";

    // 手寫板
    if (hand) {
      $$(".padhost", root).forEach(function (h) {
        var pad = new window.HandwritingPad(h, {
          cells: +h.getAttribute("data-cells"),
          penOnly: S.settings.penOnly,
          guide: S.settings.guide,
          ratio: +h.getAttribute("data-cells") === 1 ? 0.9 : 0.34   // 格子放大：筆畫解析度越高辨識越準
        });
        var qi = +h.getAttribute("data-q"), si = +h.getAttribute("data-s");
        (pads[qi] || (pads[qi] = []))[si] = pad;
      });
    } else {
      $$(".tin", root).forEach(function (el) {
        var qi = +el.getAttribute("data-q"), si = +el.getAttribute("data-s");
        (inputs[qi] || (inputs[qi] = []))[si] = el;
        el.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            var all = $$(".tin", root), i = all.indexOf(el);
            if (i < all.length - 1) all[i + 1].focus(); else finish();
          }
        });
      });
      var f = $(".tin", root); if (f) f.focus();
    }

    // 手寫 + 開自動辨識 → 先在背景載引擎（首次 ~830KB）
    if (hand && S.settings.recog && window.PWPRecog) {
      window.PWPRecog.load().catch(function () {});
    }

    // 計時（7-1：剩 10 秒用 aria-live 報時）
    var announced10 = false;
    timer = new P.Timer(cfg.sec, function (left, total) {
      $("#rClock").textContent = left.toFixed(1);
      $("#rFill").style.width = (left / total * 100) + "%";
      $("#rFill").classList.toggle("is-hot", left / total < 0.25);
      if (!announced10 && left <= 10 && left > 0 && total > 12) {
        announced10 = true;
        var live = $("#srLive"); if (live) live.textContent = "剩下 10 秒";
      }
    }, finish);
    timer.start();
    $("#rDone").addEventListener("click", finish);

    // 7-2：Esc 交卷
    function onKey(e) { if (e.key === "Escape") { e.preventDefault(); finish(); } }
    document.addEventListener("keydown", onKey);

    function textOf(qi, si) {
      var el = inputs[qi] && inputs[qi][si];
      return el ? el.value.trim() : "";
    }

    function finish() {
      if (finished) return;
      finished = true;
      timer.stop();
      document.removeEventListener("keydown", onKey);
      $("#rDone").disabled = true;
      $("#rClock").parentNode.classList.add("is-off");
      var live = $("#srLive"); if (live) live.textContent = "時間到，開始核對答案";

      // 1-2 鎖書寫並加「重播筆跡」
      if (hand) pads.forEach(function (qa) { (qa || []).forEach(function (p) { if (p) p.freezeWithReplay(); }); });

      // 1-1 手寫辨識：轉錄文字後走與打字相同的自動批改
      var useRecog = hand && S.settings.recog && window.PWPRecog && window.PWPRecog.isReady();
      if (hand && S.settings.recog && !useRecog && window.PWPRecog && !window.PWPRecog.hasFailed()) {
        P.toast("辨識引擎還在載入，本輪請手動自評");
      }

      // 揭曉列：sr 文字（7-3 不只靠顏色）
      function signOf(ok) {
        return '<span class="rrow__sign">' + (ok ? "✓" : "✗") +
          '<span class="sr-only">' + (ok ? "答對" : "答錯") + "</span></span>";
      }

      items.forEach(function (item, qi) {
        var slots = cfg.slotsOf(item);
        var wrap = root.querySelector('.qitem[data-q="' + qi + '"] .qitem__r');
        var ctx = { used: {} };
        var rows = slots.map(function (sl, si) {
          var ref = cfg.refOf(item, si);
          var ynBtns =
            '<span class="rrow__btns">' +
              '<button type="button" class="mk mk--y" data-mk="1">✓ 寫對了</button>' +
              '<button type="button" class="mk mk--n" data-mk="0">✗ 沒寫對</button>' +
            "</span>";

          if (hand && !useRecog) {
            marks[qi][si] = null;
            return '<div class="rrow" data-q="' + qi + '" data-s="' + si + '">' +
              '<span class="rrow__ref">' + esc(ref) + "</span>" + ynBtns + "</div>";
          }

          var txt, srcLabel = "";
          if (hand) {
            var pad = pads[qi] && pads[qi][si];
            var rOpts = cfg.recogOpts ? cfg.recogOpts(item, si) : {};
            if (!rOpts.expected && cfg.expectedOf) rOpts.expected = cfg.expectedOf(item, si);
            txt = pad && !pad.isBlank() ? window.PWPRecog.transcribe(pad, rOpts).text : "";
            srcLabel = '<span class="rrow__tag">辨識</span>';
          } else {
            txt = textOf(qi, si);
          }
          var res = cfg.gradeOf(item, si, txt, ctx);
          marks[qi][si] = !!res.ok;
          return '<div class="rrow ' + (res.ok ? "is-ok" : "is-no") + '" data-q="' + qi + '" data-s="' + si + '">' +
            srcLabel +
            '<span class="rrow__you">' + (txt ? esc(txt) : "（空白）") + "</span>" +
            signOf(res.ok) +
            '<span class="rrow__ref">' + esc(ref) + "</span>" +
            (!res.ok && res.why ? '<span class="rrow__why">' + esc(res.why) + "</span>" : "") +
            (hand ? ynBtns
                  : (!res.ok && res.canOverride ? '<button type="button" class="mk mk--ov" data-ov="1">我確定這是對的</button>' : "")) +
            "</div>";
        }).join("");

        wrap.innerHTML = rows + (cfg.extraReveal ? cfg.extraReveal(item) : "") +
          (cfg.noteOf && cfg.noteOf(item) ? '<p class="qnote">🎯 ' + esc(cfg.noteOf(item)) + "</p>" : "");
        wrap.hidden = false;
      });

      // 自評 / 覆核
      $$(".mk", root).forEach(function (b) {
        b.addEventListener("click", function () {
          var row = b.closest(".rrow");
          var qi = +row.getAttribute("data-q"), si = +row.getAttribute("data-s");
          if (b.hasAttribute("data-ov")) {
            marks[qi][si] = true; overs[qi][si] = true;
            row.classList.remove("is-no"); row.classList.add("is-ok");
            row.querySelector(".rrow__sign").innerHTML = '✓<span class="sr-only">答對</span>';
            b.remove();
          } else {
            var v = b.getAttribute("data-mk") === "1";
            marks[qi][si] = v;
            $$(".mk", row).forEach(function (x) { x.classList.remove("is-on"); });
            b.classList.add("is-on");
            row.classList.toggle("is-ok", v);
            row.classList.toggle("is-no", !v);
            var sg = row.querySelector(".rrow__sign");
            if (sg) sg.innerHTML = (v ? "✓" : "✗") + '<span class="sr-only">' + (v ? "答對" : "答錯") + "</span>";
          }
          renderResult();
        });
      });

      if (hand) {
        var quick = document.createElement("div");
        quick.className = "quick";
        quick.innerHTML = '<button type="button" class="btn btn--sm" id="allY">全部我都寫對了</button>' +
                          '<button type="button" class="btn btn--sm" id="allN">全部沒寫對</button>';
        $(".qlist", root).insertAdjacentElement("afterend", quick);
        $("#allY").addEventListener("click", function () { setAll(true); });
        $("#allN").addEventListener("click", function () { setAll(false); });
      }
      function setAll(v) {
        items.forEach(function (item, qi) {
          marks[qi] = marks[qi].map(function () { return v; });
        });
        $$(".rrow", root).forEach(function (row) {
          $$(".mk", row).forEach(function (x) {
            if (x.hasAttribute("data-mk")) x.classList.toggle("is-on", (x.getAttribute("data-mk") === "1") === v);
          });
          row.classList.toggle("is-ok", v);
          row.classList.toggle("is-no", !v);
          var sg = row.querySelector(".rrow__sign");
          if (sg) sg.innerHTML = (v ? "✓" : "✗") + '<span class="sr-only">' + (v ? "答對" : "答錯") + "</span>";
        });
        renderResult();
      }

      P.markPlayed();
      renderResult();
      P.track("round_finish", { unit: cfg.unit, mode: cfg.mode || "practice" });
      root.querySelector(".qitem").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function renderResult() {
      var box = $("#rResult");
      if (box.getAttribute("data-saved")) return;   // 已記錄就凍結結算區
      var got = 0, max = 0, unmarked = 0;
      items.forEach(function (item, qi) {
        max += cfg.maxOf(item);
        var m = marks[qi];
        if (m.some(function (x) { return x === null; })) unmarked++;
        got += cfg.scoreOf(item, m.map(function (x) { return x === true; }));
      });

      var pct = max ? Math.round(got / max * 100) : 0;
      var pts = cfg.pointsOf ? cfg.pointsOf(got, max) : got * 10;

      box.hidden = false;
      box.innerHTML =
        '<div class="result__score"><b>' + got + "</b><span>/ " + max + " 分</span>" +
        '<em>' + pct + "%</em></div>" +
        (unmarked && hand ? '<p class="result__warn">還有 ' + unmarked + " 題沒自評，分數只算已評的部分。</p>" : "") +
        '<p class="result__pts">本輪可得 <b>' + pts + "</b> 積分</p>" +
        '<div class="result__btns">' +
          '<button class="btn btn--primary" id="rSave" type="button">收下積分並記錄</button>' +
          '<button class="btn" id="rAgain" type="button">再來一輪</button>' +
          '<a class="btn" href="#/">回首頁</a>' +
        "</div>";

      $("#rSave").addEventListener("click", function () {
        if (box.getAttribute("data-saved")) { P.toast("這一輪已經記錄過了"); return; }
        box.setAttribute("data-saved", "1");
        P.addPoints(pts);
        P.logRound(cfg.unit, got, max);
        items.forEach(function (item, qi) {
          var allOk = marks[qi].every(function (x) { return x === true; });
          if (allOk) P.clearWrong(cfg.unit, item.id); else P.addWrong(cfg.unit, item.id);
        });
        var t = P.todayStr();
        if (cfg.mode === "daily") {
          (S.daily[t] || (S.daily[t] = {}))[cfg.unit] = true;
          P.save();
          var d = S.daily[t];
          if (Object.keys(UNITS).every(function (k) { return d[k]; }) && !d.__bonus) {
            d.__bonus = true; P.save(); P.addPoints(50); P.toast("🎉 今日四關全清，+50 分");
          }
        }
        $$(".mk", root).forEach(function (b) { b.disabled = true; });
        $("#rSave").textContent = "已記錄 ✓";
        $("#rSave").disabled = true;
        P.toast("已記錄：" + got + "/" + max + " 分，+" + pts + " 積分");
        if (cfg.onSaved) cfg.onSaved(got, max);
      });
      $("#rAgain").addEventListener("click", function () { P.route(); });
    }
  }

  // ══════════════════════════════════════════ 單元啟動頁
  function unitHome(root, key, sub) {
    var u = UNITS[key];
    var dueN = P.dueIds(key).length, allWrongN = P.wrongIds(key).length;
    var st = S.stats[key] || { rounds: 0, got: 0, total: 0 };
    root.innerHTML =
      '<section class="panel">' +
        '<div class="uhead"><span class="uhead__ic">' + u.icon + "</span>" +
          "<div><h2>" + u.name + (u.ver ? " " + u.ver : "") + "</h2>" +
          '<p class="muted">' + esc(u.rule) + "</p></div></div>" +
        '<p class="tvnote">' + esc(u.real) + "</p>" +
        P.settingsBar() +
        '<div class="opts" id="opts"></div>' +
        '<div class="hero__row">' +
          '<button class="btn btn--primary" id="startBtn" type="button">開始實戰</button>' +
          '<button class="btn" id="slowBtn" type="button">慢練（放寬 3 倍時間）</button>' +
          (allWrongN ? '<button class="btn" id="wrongBtn" type="button">複習錯題（今日到期 ' + dueN + "／全部 " + allWrongN + "）</button>" : "") +
        "</div>" +
        (st.rounds ? '<p class="muted">你在這個單元練了 ' + st.rounds + " 輪，累積正確率 " +
          Math.round(st.got / Math.max(1, st.total) * 100) + "%。</p>" : "") +
      "</section>";

    P.bindSettings(root, function () { P.route(); });
    var opts = $("#opts");
    if (key === "cross") {
      opts.innerHTML = '<label class="fld">同時開幾個路口 <select id="optN">' +
        [1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + (n === 2 ? " selected" : "") + ">" + n + "</option>"; }).join("") +
        "</select></label>";
    } else if (key === "gem") {
      opts.innerHTML =
        '<label class="fld">一輪幾題 <select id="optN">' +
        [1, 3, 5, 8].map(function (n) { return '<option value="' + n + '"' + (n === 3 ? " selected" : "") + ">" + n + "</option>"; }).join("") +
        "</select></label>" +
        '<label class="fld">難度 <select id="optL">' +
        '<option value="0">全部</option>' +
        '<option value="1">單向 3 字</option>' +
        '<option value="2">單向 4 字</option>' +
        '<option value="3">雙向（最難）</option>' +
        "</select></label>";
    } else if (key === "pic") {
      opts.innerHTML = '<label class="fld">一版幾題 <select id="optN">' +
        [5, 10].map(function (n) { return '<option value="' + n + '"' + (n === 10 ? " selected" : "") + ">" + n + "</option>"; }).join("") +
        "</select></label>";
    } else if (key === "chain") {
      var bank = window.CHAIN_BANK;
      opts.innerHTML = '<label class="fld">題型 <select id="optK">' +
        bank.map(function (b, i) {
          var lb = b.label || ("提示字「" + b.key + "」");
          return '<option value="' + i + '">' + esc(lb) + "</option>";
        }).join("") + "</select></label>" +
        '<p class="muted">留空就隨機抽。三個關卡連著跑：40 秒 3 句 → 50 秒 4 句 → 60 秒 5 句。</p>';
    }

    $("#startBtn").addEventListener("click", function () { launch(root, key, 1, sub); });
    $("#slowBtn").addEventListener("click", function () { launch(root, key, 3, sub); });
    var wb = $("#wrongBtn");
    if (wb) wb.addEventListener("click", function () { launch(root, key, 3, "wrong"); });
  }

  function seededRnd(key) {
    return P.mulberry32(P.seedFrom(P.todayStr() + ":" + key));
  }

  function launch(root, key, slow, mode) {
    var rnd = mode === "daily" ? seededRnd(key) : Math.random;
    var n = 1, level = 0, chainIdx = null;
    var sel = $("#optN"); if (sel) n = +sel.value;
    var selL = $("#optL"); if (selL) level = +selL.value;
    var selK = $("#optK"); if (selK) chainIdx = +selK.value;

    if (key === "pic") return runPic(root, n || UNITS.pic.count, slow, mode, rnd);
    if (key === "cross") return runCross(root, n || 2, slow, mode, rnd);
    if (key === "gem") return runGem(root, n || 3, level, slow, mode, rnd);
    if (key === "chain") return runChain(root, chainIdx, slow, mode, rnd);
  }

  function bankFor(key, bank, mode) {
    if (mode !== "wrong") return bank;
    var due = P.dueIds(key);
    var ids = due.length ? due : P.wrongIds(key);   // 今日到期優先，沒到期就全部錯題
    var f = bank.filter(function (x) { return ids.indexOf(x.id) >= 0; });
    return f.length ? f : bank;
  }

  // ══════════════════════════════════════════ 畫中有話
  function runPic(root, n, slow, mode, rnd) {
    var bank = bankFor("pic", window.PIC_BANK, mode);
    var items = P.pick(bank, Math.min(n, bank.length), rnd);
    startRound(root, {
      unit: "pic", mode: mode, wide: true,
      label: "畫中有話 2.0",
      sub: (mode === "daily" ? "今日挑戰 · " : mode === "wrong" ? "錯題重練 · " : "") + items.length + " 題 / " + (UNITS.pic.sec * slow) + " 秒",
      sec: UNITS.pic.sec * slow,
      items: items,
      renderQ: function (it) { return window.renderPic(it); },
      slotsOf: function () { return [{ cells: 4 }]; },
      refOf: function (it) { return it.answer; },
      expectedOf: function (it) { return it.answer; },
      recogOpts: function (it) { return { expected: it.answer, lexicon: [it.answer].concat(it.alt || []) }; },
      gradeOf: function (it, si, txt) {
        var ok = txt === it.answer || (it.alt || []).indexOf(txt) >= 0;
        return { ok: ok, why: txt ? "" : "沒作答", canOverride: false };
      },
      scoreOf: function (it, m) { return m[0] ? 1 : 0; },
      maxOf: function () { return 1; },
      noteOf: function (it) { return it.mk || ""; },
      pointsOf: function (got) { return got * 10; }
    });
  }

  // ══════════════════════════════════════════ 拾字路口
  var POSNAME = { 1: "首字", 2: "中間", 3: "尾字" };
  function crossQ(it) {
    var cells = [1, 2, 3].map(function (i) {
      return i === it.pos
        ? '<span class="xc xc--key">' + esc(it.key) + "</span>"
        : '<span class="xc">？</span>';
    }).join("");
    return '<div class="xroad">' +
      '<div class="xroad__row">' + cells + "</div>" +
      '<p class="xroad__tip">關鍵字「<b>' + esc(it.key) + "</b>」放在<b>" + POSNAME[it.pos] + "</b>，寫出兩句不同的三字詞</p>" +
      "</div>";
  }
  function runCross(root, n, slow, mode, rnd) {
    var bank = bankFor("cross", window.CROSS_BANK, mode);
    var items = P.pick(bank, Math.min(n, bank.length), rnd);
    startRound(root, {
      unit: "cross", mode: mode,
      label: "拾字路口 2.0",
      sub: (mode === "daily" ? "今日挑戰 · " : mode === "wrong" ? "錯題重練 · " : "") + items.length + " 個路口 / " + (UNITS.cross.sec * slow) + " 秒（1 句 1 分，2 句都對 3 分）",
      sec: UNITS.cross.sec * slow,
      items: items,
      renderQ: crossQ,
      slotsOf: function () { return [{ cells: 3, hint: "第 1 句" }, { cells: 3, hint: "第 2 句" }]; },
      refOf: function (it, si) { return it.answers.slice(si * 3, si * 3 + 3).join("、"); },
      recogOpts: function (it) {
        // 關鍵字位置鎖定 + 已知合法答案當字典：像哪個詞就認哪個詞
        return { lockPos: { i: it.pos - 1, ch: it.key }, lexicon: it.answers };
      },
      gradeOf: function (it, si, txt, ctx) {
        if (!txt) return { ok: false, why: "沒作答" };
        if (txt.length !== 3) return { ok: false, why: "必須是三個字" };
        if (txt[it.pos - 1] !== it.key) return { ok: false, why: "「" + it.key + "」沒放在" + POSNAME[it.pos] };
        if (ctx.used[txt]) return { ok: false, why: "和上一句重複" };
        ctx.used[txt] = 1;
        if (it.answers.indexOf(txt) >= 0) return { ok: true };
        return { ok: false, why: "位置正確，但不在本站收錄清單內", canOverride: true };
      },
      scoreOf: function (it, m) {
        var c = m.filter(Boolean).length;
        return c === 2 ? 3 : c;
      },
      maxOf: function () { return 3; },
      noteOf: function (it) { return it.mk || ""; },
      extraReveal: function (it) {
        return '<details class="more"><summary>看更多可接受的答案（共 ' + it.answers.length + " 個）</summary><p>" +
          esc(it.answers.join("、")) + "</p></details>";
      },
      pointsOf: function (got) { return got * 5; }
    });
  }

  // ══════════════════════════════════════════ 字字珠璣
  function gemQ(it) {
    var before = it.hints.filter(function (h) { return h.order === "after"; });   // 提示字 + 答案
    var after = it.hints.filter(function (h) { return h.order === "before"; });   // 答案 + 提示字
    function col(list, side) {
      return list.map(function (h) {
        return '<span class="gemw">' +
          (side === "L" ? '<b>' + esc(h.ch) + "</b><i>？</i>" : '<i>？</i><b>' + esc(h.ch) + "</b>") +
          "</span>";
      }).join("");
    }
    return '<div class="gem">' +
      '<div class="gem__side">' + col(before, "L") + "</div>" +
      '<div class="gem__q">？</div>' +
      '<div class="gem__side">' + col(after, "R") + "</div>" +
      '<p class="gem__tip">找出一個字填進「？」，讓上面每一組都變成合理的二字詞</p>' +
      "</div>";
  }
  function runGem(root, n, level, slow, mode, rnd) {
    var bank = bankFor("gem", window.GEM_BANK, mode);
    if (level) bank = bank.filter(function (x) { return x.level === level; });
    if (!bank.length) bank = window.GEM_BANK;
    var items = P.pick(bank, Math.min(n, bank.length), rnd);
    startRound(root, {
      unit: "gem", mode: mode,
      label: "字字珠璣",
      sub: (mode === "daily" ? "今日挑戰 · " : mode === "wrong" ? "錯題重練 · " : "") + items.length + " 題 / " + (UNITS.gem.sec * slow) + " 秒",
      sec: UNITS.gem.sec * slow,
      items: items,
      renderQ: gemQ,
      slotsOf: function () { return [{ cells: 1 }]; },
      refOf: function (it) { return it.answer; },
      expectedOf: function (it) { return it.answer; },
      gradeOf: function (it, si, txt) {
        if (!txt) return { ok: false, why: "沒作答" };
        return { ok: txt === it.answer, why: txt.length > 1 ? "只能寫一個字" : "" };
      },
      scoreOf: function (it, m) { return m[0] ? 1 : 0; },
      maxOf: function () { return 1; },
      noteOf: function (it) { return it.mk || ""; },
      extraReveal: function (it) {
        return '<p class="gemwords">組成：' + esc(it.words.join("、")) + "</p>";
      },
      pointsOf: function (got) { return got * 12; }
    });
  }

  // ══════════════════════════════════════════ 洞築機先（三關累進）
  function runChain(root, idx, slow, mode, rnd) {
    var bank = window.CHAIN_BANK;
    var item = idx == null || isNaN(idx) ? P.pick(bank, 1, rnd)[0] : bank[idx];
    var refs = P.chainMatches(item);
    var used = {}, totalGot = 0, totalMax = 0, stageNo = 0;

    function label() {
      return item.type === "char" ? "提示字「" + item.key + "」" : (item.label || item.key);
    }

    function nextStage() {
      var st = window.CHAIN_STAGES[stageNo];
      if (!st) return summary();
      startRound(root, {
        unit: "chain", mode: mode,
        label: "洞築機先 · 第 " + st.stage + " 關",
        sub: label() + " · " + (st.sec * slow) + " 秒寫 " + st.need + " 句成語（每句 1 分）",
        sec: st.sec * slow,
        items: [Object.assign({}, item, { id: item.id, __need: st.need })],
        renderQ: function (it) {
          return '<div class="chainq">' +
            '<div class="chainq__key">' + esc(item.key) + "</div>" +
            "<p>寫出 <b>" + st.need + "</b> 句" +
            (item.type === "char"
              ? '含有「<b>' + esc(item.key) + "</b>」這個字的成語"
              : '含有<b>' + esc(item.label || item.key) + "</b>偏旁的成語") +
            "</p>" +
            '<p class="muted">本站成語庫收錄符合條件的共 ' + refs.length + " 句</p>" +
            "</div>";
        },
        slotsOf: function (it) {
          var a = [];
          for (var i = 0; i < it.__need; i++) a.push({ cells: 4, hint: "第 " + (i + 1) + " 句" });
          return a;
        },
        recogOpts: function () { return { lexicon: P.idioms().list }; },   // 全成語庫當字典：像成語就往成語認
        refOf: function (it, si) {
          if (S.settings.input === "hand") return "任一符合條件的成語（參考解答見下方）";
          return refs[si % Math.max(1, refs.length)] || "—";
        },
        gradeOf: function (it, si, txt) {
          if (!txt) return { ok: false, why: "沒作答" };
          if (txt.length !== 4) return { ok: false, why: "四字成語才算分", canOverride: true };
          if (used[txt]) return { ok: false, why: "這句已經寫過了" };
          var inBank = !!P.idioms().set[txt];
          var hit = item.type === "char"
            ? txt.indexOf(item.key) >= 0
            : Array.prototype.some.call(txt, function (c) {
                return ((window.RADICAL_CHARS || {})[item.key] || "").indexOf(c) >= 0;
              });
          if (!hit) return { ok: false, why: item.type === "char" ? "沒有含「" + item.key + "」" : "沒有含這個偏旁", canOverride: false };
          if (!inBank) return { ok: false, why: "條件符合，但不在本站成語庫內", canOverride: true };
          used[txt] = 1;
          return { ok: true };
        },
        scoreOf: function (it, m) { return m.filter(Boolean).length; },
        maxOf: function (it) { return it.__need; },
        noteOf: function () { return stageNo === 0 ? (item.mk || "") : ""; },
        extraReveal: function () {
          return '<details class="more"><summary>參考解答（庫內共 ' + refs.length + " 句）</summary><p>" +
            esc(refs.slice(0, 60).join("、")) + (refs.length > 60 ? " …" : "") + "</p></details>";
        },
        pointsOf: function (got) { return got * 10; },
        onSaved: function (got, max) {
          totalGot += got; totalMax += max; stageNo++;
          if (stageNo < window.CHAIN_STAGES.length) {
            var b = document.createElement("button");
            b.className = "btn btn--primary";
            b.type = "button";
            b.textContent = "進入第 " + window.CHAIN_STAGES[stageNo].stage + " 關 →";
            b.addEventListener("click", nextStage);
            $(".result__btns").prepend(b);
          } else {
            if (totalGot >= 12) P.grantBadge("chain12");
            P.toast("三關結束：共 " + totalGot + " / " + totalMax + " 分");
          }
        }
      });
    }

    function summary() { P.go("#/chain"); }
    nextStage();
  }

  // ══════════════════════════════════════════ 註冊視圖
  /* 8-2 lazy load：進單元才載題庫（chain 另需成語庫做批改） */
  var DATA_DEPS = { pic: ["pic"], cross: ["cross"], gem: ["gem"], chain: ["chain", "idioms", "moe", "mkt"] };
  ["pic", "cross", "gem", "chain"].forEach(function (k) {
    P.VIEWS[k] = function (root, args) {
      root.innerHTML = '<section class="panel"><p class="muted">題庫載入中…</p></section>';
      P.ensureData(DATA_DEPS[k]).then(function () {
        var sub = args[0];
        if (sub === "daily") {
          var rnd = seededRnd(k);
          if (k === "pic") return runPic(root, UNITS.pic.count, 1, "daily", rnd);
          if (k === "cross") return runCross(root, 2, 1, "daily", rnd);
          if (k === "gem") return runGem(root, 3, 0, 1, "daily", rnd);
          if (k === "chain") return runChain(root, null, 1, "daily", rnd);
        }
        if (sub === "wrong") {
          if (k === "pic") return runPic(root, 10, 3, "wrong", Math.random);
          if (k === "cross") return runCross(root, 3, 3, "wrong", Math.random);
          if (k === "gem") return runGem(root, 5, 0, 3, "wrong", Math.random);
          if (k === "chain") return runChain(root, null, 3, "wrong", Math.random);
        }
        unitHome(root, k, sub);
      }).catch(function () {
        root.innerHTML = '<section class="panel"><h2>題庫載入失敗</h2><p class="muted">請檢查網路後重新整理。</p><a class="btn" href="#/">回首頁</a></section>';
      });
    };
  });

  // ══════════════════════════════════════════ 行銷人成語包
  P.VIEWS.mkt = function (root) {
    root.innerHTML = '<section class="panel"><p class="muted">成語包載入中…</p></section>';
    P.ensureData(["mkt"]).then(function () {
      var cats = window.MKT_CATS, bank = window.MKT_BANK;
      var cur = "全部", q = "";

      function cards() {
        var list = bank.filter(function (x) {
          if (cur !== "全部" && x.cat !== cur) return false;
          if (q && (x.w + x.mk + x.ex).indexOf(q) < 0) return false;
          return true;
        });
        if (!list.length) return '<p class="muted">沒有符合的成語，換個關鍵字試試。</p>';
        return list.map(function (x, i) {
          return '<article class="mcard">' +
            '<div class="mcard__top"><span class="mcard__w">' + esc(x.w) + '</span>' +
            '<span class="chip">' + esc(x.cat) + "</span></div>" +
            '<p class="mcard__mk">' + esc(x.mk) + "</p>" +
            '<blockquote class="mcard__ex">' + esc(x.ex) + "</blockquote>" +
            '<button type="button" class="btn btn--sm mcard__copy" data-i="' + bank.indexOf(x) + '">複製例句</button>' +
            "</article>";
        }).join("");
      }

      function paint() {
        $("#mktCount").textContent = "共 " + bank.length + " 句 · 顯示 " +
          bank.filter(function (x) { return (cur === "全部" || x.cat === cur) && (!q || (x.w + x.mk + x.ex).indexOf(q) >= 0); }).length + " 句";
        $("#mktList").innerHTML = cards();
        $$(".mcard__copy").forEach(function (b) {
          b.addEventListener("click", function () {
            var x = bank[+b.getAttribute("data-i")];
            var txt = x.w + "——" + x.ex;
            if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { P.toast("已複製：" + x.w); });
            P.track("mkt_copy", { idiom: x.w });
          });
        });
      }

      root.innerHTML =
        '<section class="panel">' +
          '<div class="uhead"><span class="uhead__ic">📣</span>' +
            "<div><h2>行銷人成語包</h2>" +
            '<p class="muted">' + bank.length + " 句廣告行銷工作用得上的成語，" + cats.length + " 個工作情境：提案、文案、投放、數據、消費心理、口碑、危機都有。每句附行銷解讀＋可直接抄的例句，也全部併入「洞築機先」的批改詞庫。</p></div></div>" +
          '<div class="mkt-bar">' +
            '<div class="mkt-cats">' +
              ["全部"].concat(cats).map(function (c) {
                return '<button type="button" class="mchip' + (c === "全部" ? " is-on" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + "</button>";
              }).join("") +
            "</div>" +
            '<input class="mkt-q" id="mktQ" type="search" placeholder="搜成語或關鍵字…" aria-label="搜尋成語">' +
          "</div>" +
          '<p class="muted" id="mktCount"></p>' +
          '<div class="mgrid" id="mktList"></div>' +
        "</section>";

      $$(".mchip").forEach(function (b) {
        b.addEventListener("click", function () {
          cur = b.getAttribute("data-cat");
          $$(".mchip").forEach(function (x) { x.classList.toggle("is-on", x === b); });
          paint();
        });
      });
      var qEl = $("#mktQ");
      qEl.addEventListener("input", function () { q = qEl.value.trim(); paint(); });
      paint();
      P.track("mkt_open");
    });
  };

  // ══════════════════════════════════════════ 統計
  P.VIEWS.stats = function (root) {
    var rows = Object.keys(UNITS).map(function (k) {
      var st = S.stats[k] || { rounds: 0, got: 0, total: 0 };
      var acc = st.total ? Math.round(st.got / st.total * 100) : 0;
      var w = P.wrongIds(k).length, due = P.dueIds(k).length;
      return "<tr><td>" + UNITS[k].icon + " " + UNITS[k].name + "</td>" +
        "<td>" + st.rounds + "</td>" +
        "<td>" + st.got + " / " + st.total + "</td>" +
        '<td><div class="mini"><i style="width:' + acc + '%"></i></div>' + acc + "%</td>" +
        "<td>" + w + (due ? '<span class="chip chip--due">今日到期 ' + due + "</span>" : "") + "</td></tr>";
    }).join("");

    var badges = P.BADGES.map(function (b) {
      var on = S.badges.indexOf(b.id) >= 0;
      return '<li class="bdg' + (on ? " is-on" : "") + '"><b>' + (on ? "🏅" : "🔒") + " " + esc(b.name) +
        "</b><small>" + esc(b.desc) + "</small></li>";
    }).join("");

    var lv = P.levelOf(S.points);
    root.innerHTML =
      '<section class="panel">' +
        "<h2>練習紀錄</h2>" +
        '<p class="muted">稱號 <b>' + esc(lv.name) + "</b>　累積 <b>" + S.points + "</b> 積分　連續 <b>" + S.streak.days + "</b> 天</p>" +
        '<div class="tw"><table class="tb"><thead><tr><th>單元</th><th>輪數</th><th>得分</th><th>正確率</th><th>錯題</th></tr></thead><tbody>' +
        rows + "</tbody></table></div>" +
        "<h3>徽章</h3><ul class=\"bdgs\">" + badges + "</ul>" +
        '<div class="hero__row"><a class="btn" href="#/">回首頁</a>' +
        '<button class="btn btn--ghost" id="wipe" type="button">清除本機紀錄</button></div>' +
      "</section>";

    $("#wipe").addEventListener("click", function () {
      if (!confirm("確定清除這台裝置上的所有練習紀錄？此動作無法復原。")) return;
      localStorage.removeItem("pwp.v1");
      location.reload();
    });
  };

  // ══════════════════════════════════════════ 規則
  P.VIEWS.rules = function (root) {
    var blocks = Object.keys(UNITS).map(function (k) {
      var u = UNITS[k];
      return '<article class="rblk"><h3>' + u.icon + " " + u.name + (u.ver ? " " + u.ver : "") +
        ' <span class="rblk__sec">' + u.sec + "″</span></h3>" +
        "<p>" + esc(u.rule) + "</p>" +
        '<p class="muted">' + esc(u.real) + "</p>" +
        '<a class="btn btn--sm" href="#/' + k + '">去練這個單元</a></article>';
    }).join("");

    root.innerHTML =
      '<section class="panel">' +
        "<h2>單元規則</h2>" +
        '<p class="muted">規則以節目「21 季單人賽單元規則（B 版）」為準；書寫一律正體字，答案認定依教育部《重編國語辭典修訂本》《成語典》。</p>' +
        '<div class="rblks">' + blocks + "</div>" +
        "<h3>作答方式</h3>" +
        "<ul class=\"steps\">" +
          "<li><b>手寫模式</b>：模擬節目的平板書寫。時間到揭曉正解，自己按 ✓／✗ 評分——這也是節目的判定方式（人工認定）。</li>" +
          "<li><b>打字模式</b>：自動批改，適合通勤時大量刷題。收錄清單以外的合理答案，可按「我確定這是對的」自行加分。</li>" +
          "<li><b>只接受觸控筆</b>：開了之後手掌碰到螢幕不會畫出線，接近節目現場的手感。</li>" +
          "<li><b>自動辨識怎麼寫最準</b>：辨識引擎是照「標準筆順」比對筆畫的——一筆一筆分開寫、照筆順、字寫在格子中央越大越好；連筆草寫或筆順亂跳會明顯掉準度。辨識錯了直接按 ✓/✗ 改判即可，不影響計分權在你手上。</li>" +
        "</ul>" +
        "<h3>資料來源</h3>" +
        '<ul class="steps">' +
          '<li>節目官網：<a href="https://www.pts.org.tw/ptsword/" target="_blank" rel="noopener">公視 一字千金</a></li>' +
          '<li>字詞認定：<a href="https://dict.revised.moe.edu.tw/" target="_blank" rel="noopener">教育部重編國語辭典修訂本</a>、<a href="https://dict.idioms.moe.edu.tw/" target="_blank" rel="noopener">成語典</a></li>' +
          '<li>同類工具：<a href="https://github.com/yutinglaitw/PTS-Word-Tool" target="_blank" rel="noopener">PTS-Word-Tool</a>（查詢型，桌面程式）</li>' +
        "</ul>" +
        '<p class="muted">本站為粉絲自製練習工具，與公共電視及節目製作單位無關。題庫為自行編寫，非節目原始題目。</p>' +
        '<a class="btn" href="#/">回首頁</a>' +
      "</section>";
  };
})();
