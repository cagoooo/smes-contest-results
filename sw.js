/* 石門國小競賽榮譽榜 Service Worker
   - 版本字串由部署流程注入：「version.json 的版本號-commit 前 7 碼」，例：1.0.0-212d341
   - 網頁、程式、成績資料：先抓網路（確保看到最新公告），離線時才用快取
   - 圖片與字型：先用快取（省流量）
   - 新版裝好後停在等待狀態，由頁面詢問使用者要不要立刻更新（不自動重整） */
const VERSION = '__BUILD_VERSION__';
const PREFIX = 'smes-contest-';
const CACHE = PREFIX + VERSION;
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data/contests.json',
  './manifest.webmanifest',
  './assets/logo-192.png',
  './assets/icon-192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(PRECACHE.map((u) => cache.add(new Request(u, { cache: 'reload' }))))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type;
  if (type === 'GET_VERSION') {
    if (event.ports[0]) event.ports[0].postMessage({ version: VERSION });
  } else if (type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

function networkFirst(req) {
  return fetch(req).then((res) => {
    if (res && res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')));
}

function cacheFirst(req) {
  return caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  }));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  // Google 字型檔：快取優先
  if (url.hostname === 'fonts.gstatic.com') { event.respondWith(cacheFirst(req)); return; }
  if (url.hostname === 'fonts.googleapis.com') { event.respondWith(networkFirst(req)); return; }
  if (url.origin !== self.location.origin) return;

  // 版本檔與 SW 本身一律直接走網路
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('/sw.js')) return;

  if (/\.(png|jpe?g|gif|webp|ico|svg)$/i.test(url.pathname)) { event.respondWith(cacheFirst(req)); return; }
  event.respondWith(networkFirst(req));
});
