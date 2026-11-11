/* Service worker Fonsai : l'app s'ouvre même hors ligne.
   - Fichiers du site (HTML, /js, CSS) : réseau d'abord (toujours la dernière version), cache en secours.
   - CDN (Three.js, Supabase, polices) : cache d'abord, mis à jour en arrière-plan.
   - Supabase (synchro) n'est jamais mis en cache. */
const CACHE = "fonsai-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/fonsai.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co")) return;

  // Fichiers du site (non versionnés) : réseau d'abord, cache en secours.
  if (url.origin === self.location.origin) {
    const key = req.mode === "navigate" ? "/" : req;
    e.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); } return res; })
        .catch(() => caches.match(key))
    );
    return;
  }

  // CDN (URL versionnées : Three.js, Supabase, polices) : cache d'abord.
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
