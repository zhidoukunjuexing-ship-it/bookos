// BookOS Service Worker - Auto Update Support
// バージョンを変えるたびにSWが自動更新される
const CACHE_VERSION = 'bookos-v1';
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// インストール: 新バージョンのファイルをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CACHE_FILES))
  );
  // 待機中の旧SWを即座に置き換え
  self.skipWaiting();
});

// アクティベート: 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  // 全タブに即座に適用
  self.clients.claim();
});

// フェッチ: ネットワーク優先 → キャッシュフォールバック
// これにより、オンライン時は常に最新版を取得し、オフライン時はキャッシュを使用
self.addEventListener('fetch', (event) => {
  // API呼び出しはキャッシュしない
  if (event.request.url.includes('api.anthropic.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功したらキャッシュを更新
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // オフライン時はキャッシュから返す
        return caches.match(event.request);
      })
  );
});
