/* 8-1 Service Worker — 離線可練（進棚沒網路也能開）
 * 策略：安裝時預快取核心；同源請求 cache-first + 背景回填；換版本改 VERSION 即失效重抓。
 */
var VERSION = "pwp-v2";
var CORE = [
  "./",
  "index.html",
  "privacy.html",
  "assets/css/app.css",
  "assets/js/app.js",
  "assets/js/units.js",
  "assets/js/handwriting.js",
  "assets/js/render-pic.js",
  "assets/js/recog.js",
  "data/idioms.js",
  "data/idioms-moe.js",
  "data/pic.js",
  "data/cross.js",
  "data/gem.js",
  "data/chain.js",
  "assets/img/og.png",
  "assets/img/icon-180.png",
  "assets/img/icon-192.png",
  "assets/img/icon-512.png",
  "manifest.webmanifest"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;   // GA/Pixel 直接放行不快取
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var fetching = fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || fetching;   // 有快取用快取（含 830KB 辨識資料），背景更新
    })
  );
});
