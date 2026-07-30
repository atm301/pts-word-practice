/* 畫中有話 圖形渲染器 — 把題庫的 layout / spec 畫成 HTML */
(function () {
  "use strict";

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function g(ch, cls) { return '<span class="g' + (cls ? " " + cls : "") + '">' + esc(ch) + "</span>"; }
  function half(ch) { return '<span class="g g--half"><i>' + esc(ch) + "</i></span>"; }

  var R = {
    count: function (s) {
      var out = "";
      s.items.forEach(function (it) {
        var n = it.n || 1, inner = "";
        if (it.half) {
          inner = half(it.ch);
        } else {
          var show = Math.min(n, 12);
          for (var i = 0; i < show; i++) inner += g(it.ch, n > 6 ? "g--xs" : n > 3 ? "g--sm" : "");
        }
        out += '<span class="pz-grp">' + inner + "</span>";
      });
      return '<div class="pz pz--count">' + out + "</div>";
    },

    stack: function (s) {
      var mid = s.op ? '<span class="pz-op">' + esc(s.op) + "</span>" : "";
      return '<div class="pz pz--stack">' + g(s.chars[0]) + mid + g(s.chars[1]) + "</div>";
    },

    nest: function (s) {
      var mark = "";
      if (s.mark === "strike") mark = '<span class="pz-mark pz-mark--strike"></span>';
      if (s.mark === "neq") mark = '<span class="pz-mark pz-mark--neq">≠</span>';
      return '<div class="pz pz--nest' + (s.pos === "bottom" ? " is-bottom" : "") + '">' +
        '<span class="pz-nest__out">' + esc(s.outer) + "</span>" +
        '<span class="pz-nest__in">' + esc(s.inner) + mark + "</span>" +
        "</div>";
    },

    size: function (s) {
      var out = s.items.map(function (it) {
        return g(it.ch, it.scale === "l" ? "g--xl" : "g--xs");
      }).join("");
      return '<div class="pz pz--size' + (s.dir === "v" ? " is-v" : "") + '">' + out + "</div>";
    },

    arrow: function (s) {
      var a = s.dir === "down" ? "↓" : "→";
      return '<div class="pz pz--arrow' + (s.dir === "down" ? " is-v" : "") + '">' +
        g(s.from) + '<span class="pz-arrow">' + a + "</span>" + g(s.to) + "</div>";
    },

    grid: function (s) {
      var cells = "", total = s.rows * s.cols;
      for (var i = 0; i < total; i++) {
        cells += i === s.gap
          ? '<span class="pz-cell is-gap"></span>'
          : '<span class="pz-cell">' + esc(s.ch) + "</span>";
      }
      return '<div class="pz pz--grid" style="--cols:' + s.cols + '">' + cells + "</div>";
    },

    pile: function (s) {
      var out = "";
      for (var i = 0; i < s.n; i++) {
        out += '<span class="g g--sm" style="--i:' + i + '">' + esc(s.ch) + "</span>";
      }
      if (s.base) out += '<span class="pz-base">' + esc(s.base) + "</span>";
      return '<div class="pz pz--pile' + (s.rise ? " is-rise" : "") + '">' + out + "</div>";
    },

    flip: function (s) {
      var out = s.chars.map(function (ch, i) {
        return g(ch, s.flip.indexOf(i) >= 0 ? "g--flip" : "");
      }).join("");
      return '<div class="pz pz--flip">' + out + "</div>";
    },

    scatter: function (s) {
      var xs = [8, 62, 20, 70], ys = [10, 18, 58, 62];
      var out = s.chars.map(function (ch, i) {
        return '<span class="g g--sm" style="left:' + xs[i % 4] + "%;top:" + ys[i % 4] + '%">' + esc(ch) + "</span>";
      }).join("");
      return '<div class="pz pz--scatter">' + out + "</div>";
    },

    overlap: function (s) {
      return '<div class="pz pz--overlap">' + g(s.chars[0]) + g(s.chars[1]) + "</div>";
    },

    row: function (s) {
      var out = s.chars.map(function (ch, i) {
        return g(ch, i === s.focus ? "g--focus" : "g--sm");
      }).join("");
      return '<div class="pz pz--row">' + out + "</div>";
    },

    updown: function (s) {
      var out = s.items.map(function (it) {
        return '<span class="pz-ud' + (it.dir === "up" ? " is-up" : " is-down") + '">' +
          g(it.ch) + '<span class="pz-arrow">' + (it.dir === "up" ? "↑" : "↓") + "</span></span>";
      }).join("");
      return '<div class="pz pz--updown">' + out + "</div>";
    }
  };

  window.renderPic = function (item) {
    var fn = R[item.layout];
    return fn ? fn(item.spec) : '<div class="pz">?</div>';
  };
})();
