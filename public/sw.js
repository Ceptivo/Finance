// Service worker for a finance app: static assets are cached
// (stale-while-revalidate), but page HTML and API responses are NEVER
// cached — financial data must not be written to disk caches. Offline
// navigations get a minimal inline fallback page instead.
const CACHE = "fh-v2";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline — Finance Hub</title>
<style>body{background:#0f0f14;color:#e7e7ea;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0}
main{text-align:center;padding:2rem}h1{font-size:1.25rem}p{color:#9a9aa3;font-size:.9rem}
button{margin-top:1rem;background:#6d28d9;color:#fff;border:0;border-radius:.5rem;padding:.6rem 1.2rem;font-size:.9rem;cursor:pointer}</style>
</head><body><main><h1>You're offline</h1><p>Finance Hub needs a connection to load your data securely.</p>
<button onclick="location.reload()">Try again</button></main></body></html>`;

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  // Navigations: network only, with an inline offline fallback. No HTML caching.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(
        () =>
          new Response(OFFLINE_HTML, { headers: { "content-type": "text/html; charset=utf-8" } }),
      ),
    );
    return;
  }

  // Hashed static assets: stale-while-revalidate.
  if (/\.(js|css|svg|png|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then((hit) => {
        const refresh = fetch(e.request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(e.request, copy));
            }
            return res;
          })
          .catch(() => hit);
        return hit || refresh;
      }),
    );
  }
});
