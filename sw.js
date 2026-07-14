const VERSION = 'sinomed-v1';                    // 发大版本时改这个号即可让所有人下次打开拿到新版
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== VERSION && k !== VERSION + '-cdn').map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;                          // 不缓存 POST（登录/结算）
  if (url.hostname.endsWith('supabase.co')) return;          // ★不缓存 Supabase 认证/购买——必须实时★
  if (url.origin === location.origin) {                      // 同域（模块 HTML）：stale-while-revalidate
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  e.respondWith(caches.open(VERSION + '-cdn').then(async c => {   // 跨域（字体、supabase-js库）：缓存优先
    const hit = await c.match(req); if (hit) return hit;
    const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r;
  }).catch(() => fetch(req)));
});
