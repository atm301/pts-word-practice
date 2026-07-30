/* 手寫板元件 — 模擬節目平板書寫
 * 特性：Pointer Events（觸控筆 / 手指 / 滑鼠）、壓感筆畫粗細、田字格輔助線、
 *      單筆復原、全部清除、視窗縮放後筆畫不變形（點座標以比例儲存）。
 */
(function () {
  "use strict";

  var DEFAULTS = {
    cells: 4,          // 幾格（四字成語 = 4）
    ratio: 0.24,       // 高度 / 寬度
    penOnly: false,    // 只接受觸控筆（掌拒）
    guide: true        // 田字格輔助線
  };

  function HandwritingPad(host, opts) {
    this.o = Object.assign({}, DEFAULTS, opts || {});
    this.host = host;
    this.strokes = [];   // [{pts:[{x,y,p}], w}]
    this.cur = null;
    this.dirty = false;

    host.classList.add("pad");
    host.innerHTML =
      '<canvas class="pad__cv"></canvas>' +
      '<div class="pad__tools">' +
        '<button type="button" class="pad__btn" data-act="undo" aria-label="復原上一筆">↩ 復原</button>' +
        '<button type="button" class="pad__btn" data-act="clear" aria-label="清除全部筆畫">✕ 清除</button>' +
      "</div>";

    this.cv = host.querySelector(".pad__cv");
    this.ctx = this.cv.getContext("2d");

    var self = this;
    host.querySelector('[data-act="undo"]').addEventListener("click", function (e) {
      e.preventDefault(); self.undo();
    });
    host.querySelector('[data-act="clear"]').addEventListener("click", function (e) {
      e.preventDefault(); self.clear();
    });

    this._bind();
    this.resize();

    if (window.ResizeObserver) {
      // rAF 合併 + 寬度 guard：sub-pixel 變化不重繪，避免 RO→resize→RO 抖動循環
      this._ro = new ResizeObserver(function () {
        if (self._roRaf) return;
        self._roRaf = requestAnimationFrame(function () {
          self._roRaf = null;
          var w = self.host.clientWidth;
          if (Math.abs(w - (self._lastW || 0)) >= 1) self.resize();
        });
      });
      this._ro.observe(host);
    } else {
      this._onWinResize = function () { self.resize(); };
      window.addEventListener("resize", this._onWinResize);
    }
  }

  HandwritingPad.prototype._bind = function () {
    var self = this, cv = this.cv;

    function accept(e) {
      if (!self.o.penOnly) return true;
      return e.pointerType === "pen" || e.pointerType === "mouse";
    }
    function pos(e) {
      var r = cv.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / r.width,
        y: (e.clientY - r.top) / r.height,
        p: e.pressure > 0 && e.pressure < 1 ? e.pressure : 0.5
      };
    }

    cv.addEventListener("pointerdown", function (e) {
      if (!accept(e)) return;
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      self.cur = { pts: [pos(e)] };
      self.strokes.push(self.cur);
      self.dirty = true;
      self._draw();
    });

    cv.addEventListener("pointermove", function (e) {
      if (!self.cur || !accept(e)) return;
      e.preventDefault();
      var evts = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (var i = 0; i < evts.length; i++) self.cur.pts.push(pos(evts[i]));
      self._draw();
    });

    function end(e) {
      if (!self.cur) return;
      // 單點視為點（避免空筆畫）
      if (self.cur.pts.length === 1) self.cur.pts.push(Object.assign({}, self.cur.pts[0]));
      self.cur = null;
      self._draw();
      if (self.o.onChange) self.o.onChange(self);
    }
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.addEventListener("pointerleave", function (e) { if (self.cur) end(e); });

    // 避免瀏覽器把手寫當成捲動/選取
    cv.style.touchAction = "none";
    cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  };

  HandwritingPad.prototype.resize = function () {
    var w = this.host.clientWidth || 320;
    this._lastW = w;
    var h = Math.max(72, Math.round(w * this.o.ratio));
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.cv.style.width = "100%";
    this.cv.style.height = h + "px";
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.dpr = dpr;
    this._draw();
  };

  HandwritingPad.prototype._grid = function () {
    var ctx = this.ctx, W = this.cv.width, H = this.cv.height, n = this.o.cells;
    var pad = Math.round(H * 0.06);
    var cell = (W - pad * (n + 1)) / n;
    var top = pad, size = Math.min(cell, H - pad * 2);
    var y0 = (H - size) / 2;

    ctx.save();
    for (var i = 0; i < n; i++) {
      var x0 = pad + i * (cell + pad) + (cell - size) / 2;
      // 外框
      ctx.strokeStyle = "rgba(148,163,184,.55)";
      ctx.lineWidth = Math.max(1, this.dpr);
      ctx.strokeRect(x0, y0, size, size);
      if (!this.o.guide) continue;
      // 田字格
      ctx.strokeStyle = "rgba(148,163,184,.3)";
      ctx.setLineDash([Math.round(4 * this.dpr), Math.round(5 * this.dpr)]);
      ctx.beginPath();
      ctx.moveTo(x0 + size / 2, y0); ctx.lineTo(x0 + size / 2, y0 + size);
      ctx.moveTo(x0, y0 + size / 2); ctx.lineTo(x0 + size, y0 + size / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  };

  HandwritingPad.prototype._draw = function () {
    var ctx = this.ctx, W = this.cv.width, H = this.cv.height;
    ctx.clearRect(0, 0, W, H);
    this._grid();

    var base = Math.max(1.6, H * 0.028);
    ctx.strokeStyle = getComputedStyle(this.host).getPropertyValue("--ink") || "#0f172a";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (var s = 0; s < this.strokes.length; s++) {
      var pts = this.strokes[s].pts;
      if (pts.length < 2) continue;
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i];
        ctx.lineWidth = base * (0.55 + b.p * 1.2);
        ctx.beginPath();
        ctx.moveTo(a.x * W, a.y * H);
        ctx.lineTo(b.x * W, b.y * H);
        ctx.stroke();
      }
    }
  };

  HandwritingPad.prototype.undo = function () {
    this.strokes.pop();
    this._draw();
    if (this.o.onChange) this.o.onChange(this);
  };

  HandwritingPad.prototype.clear = function () {
    this.strokes = [];
    this.dirty = false;
    this._draw();
    if (this.o.onChange) this.o.onChange(this);
  };

  HandwritingPad.prototype.isBlank = function () { return this.strokes.length === 0; };

  /* 每格的外框（0~1 正規化座標），與 _grid 同一套幾何 */
  HandwritingPad.prototype.cellRects = function () {
    var W = this.cv.width, H = this.cv.height, n = this.o.cells;
    var pad = Math.round(H * 0.06);
    var cell = (W - pad * (n + 1)) / n;
    var size = Math.min(cell, H - pad * 2);
    var y0 = (H - size) / 2;
    var rects = [];
    for (var i = 0; i < n; i++) {
      var x0 = pad + i * (cell + pad) + (cell - size) / 2;
      rects.push({ x: x0 / W, y: y0 / H, w: size / W, h: size / H });
    }
    return rects;
  };

  /* 依「筆畫重心落在哪一格」分段，輸出各格筆畫（格內 0~256 座標，供辨識引擎） */
  HandwritingPad.prototype.strokesByCell = function () {
    var rects = this.cellRects();
    var out = rects.map(function () { return []; });
    this.strokes.forEach(function (st) {
      var pts = st.pts;
      if (!pts.length) return;
      var cx = 0;
      for (var i = 0; i < pts.length; i++) cx += pts[i].x;
      cx /= pts.length;
      // 重心最近的格（用格中心距離，寫超出邊界也能歸位）
      var best = 0, bd = Infinity;
      rects.forEach(function (r, ri) {
        var d = Math.abs(cx - (r.x + r.w / 2));
        if (d < bd) { bd = d; best = ri; }
      });
      var r = rects[best];
      out[best].push(pts.map(function (p) {
        return [
          Math.round(((p.x - r.x) / r.w) * 256),
          Math.round(((p.y - r.y) / r.h) * 256)
        ];
      }));
    });
    return out;
  };

  /* 交卷後重播筆跡（依書寫順序動畫重繪） */
  HandwritingPad.prototype.replay = function () {
    if (this._replaying || !this.strokes.length) return;
    var self = this, ctx = this.ctx, W = this.cv.width, H = this.cv.height;
    var flat = [];
    this.strokes.forEach(function (st, si) {
      for (var i = 1; i < st.pts.length; i++) flat.push([si, i]);
    });
    if (!flat.length) return;
    this._replaying = true;
    var base = Math.max(1.6, H * 0.028), idx = 0;
    var perFrame = Math.max(1, Math.round(flat.length / 90));   // 約 1.5 秒播完
    ctx.clearRect(0, 0, W, H);
    this._grid();
    ctx.strokeStyle = getComputedStyle(this.host).getPropertyValue("--ink") || "#0f172a";
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    (function step() {
      for (var k = 0; k < perFrame && idx < flat.length; k++, idx++) {
        var si = flat[idx][0], i = flat[idx][1];
        var a = self.strokes[si].pts[i - 1], b = self.strokes[si].pts[i];
        ctx.lineWidth = base * (0.55 + b.p * 1.2);
        ctx.beginPath();
        ctx.moveTo(a.x * W, a.y * H);
        ctx.lineTo(b.x * W, b.y * H);
        ctx.stroke();
      }
      if (idx < flat.length) requestAnimationFrame(step);
      else self._replaying = false;
    })();
  };

  /* 揭曉後在工具列加「重播」鈕並鎖書寫 */
  HandwritingPad.prototype.freezeWithReplay = function () {
    if (this._frozen) return;
    this._frozen = true;
    this.o.penOnly = true;                       // 借 penOnly + frozen 擋新筆畫
    this.cv.style.pointerEvents = "none";
    var tools = this.host.querySelector(".pad__tools");
    tools.innerHTML = "";
    if (this.strokes.length) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "pad__btn";
      b.textContent = "▶ 重播筆跡";
      b.setAttribute("aria-label", "重播書寫筆跡");
      var self = this;
      b.addEventListener("click", function () { self.replay(); });
      tools.appendChild(b);
    }
  };

  HandwritingPad.prototype.setPenOnly = function (v) { this.o.penOnly = !!v; };

  HandwritingPad.prototype.setCells = function (n) {
    this.o.cells = n;
    this._draw();
  };

  HandwritingPad.prototype.destroy = function () {
    if (this._ro) this._ro.disconnect();
    if (this._onWinResize) window.removeEventListener("resize", this._onWinResize);
    this.host.innerHTML = "";
  };

  window.HandwritingPad = HandwritingPad;
})();
