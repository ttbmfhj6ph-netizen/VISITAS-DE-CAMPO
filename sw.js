'use strict';
const APP = 'rotas-app-v1';
const TILES = 'tiles-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const TILE_HOSTS = ['tile.openstreetmap.org', 'server.arcgisonline.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('rotas-app-') && k !== APP).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (TILE_HOSTS.includes(url.hostname)) {
    e.respondWith((async () => {
      const cache = await caches.open(TILES);
      const hit = await cache.match(req.url, {ignoreVary: true});
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req.url, res.clone());
        return res;
      } catch (err) {
        return new Response('', {status: 504, statusText: 'offline'});
      }
    })());
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(APP);
      const key = req.mode === 'navigate' ? 'index.html' : req;
      const hit = await cache.match(key, {ignoreSearch: true});
      const net = fetch(req).then(res => { if (res && res.ok) cache.put(key, res.clone()); return res; }).catch(() => null);
      return hit || (await net) || new Response('Sem conexão e sem cópia local.', {status: 503});
    })());
  }
});
