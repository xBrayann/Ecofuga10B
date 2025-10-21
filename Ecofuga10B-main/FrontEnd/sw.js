/* sw.js — EcoFuga (versión estable sin errores) */
const VERSION = "v1.0.2";
const STATIC_CACHE = `ecofuga-static-${VERSION}`;
const RUNTIME_CACHE = `ecofuga-runtime-${VERSION}`;

// Lista de archivos que se cachean para funcionar offline
const APP_SHELL = [
  "./",
  "./index.html",
  "./auth.html",
  "./bienvenido.html",
  "./offline.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-128.png",
  "./icons/icon-144.png",
  "./icons/icon-192.png",
  "./icons/icon-384.png",
  "./icons/icon-512.png"
];

// Instalar y guardar recursos (sin romper si alguno falta)
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      for (const file of APP_SHELL) {
        try {
          const response = await fetch(file, { cache: "no-store" });
          if (response.ok) {
            await cache.put(file, response.clone());
            console.log("[SW] Cacheado:", file);
          } else {
            console.warn("[SW] Archivo no encontrado (omitido):", file);
          }
        } catch (err) {
          console.warn("[SW] No se pudo cachear:", file);
        }
      }
      await self.skipWaiting();
    })()
  );
});

// Activar: eliminar versiones antiguas del cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) {
            console.log("[SW] Borrando cache viejo:", key);
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
      console.log("[SW] Versión activa:", VERSION);
    })()
  );
});

// Permitir actualización inmediata
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Estrategias de cache
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // --- 1️⃣ HTML → Network First con fallback offline
  if (
    req.mode === "navigate" ||
    (req.method === "GET" && req.headers.get("accept")?.includes("text/html"))
  ) {
    event.respondWith(
      (async () => {
        try {
          const networkRes = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, networkRes.clone());
          return networkRes;
        } catch {
          const cachedRes = await caches.match(req);
          return cachedRes || (await caches.match("./offline.html"));
        }
      })()
    );
    return;
  }

  // --- 2️⃣ CSS, JS, imágenes → Cache First con fallback a red
  if (["style", "script", "image", "font"].includes(req.destination)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        try {
          const networkRes = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, networkRes.clone());
          return networkRes;
        } catch {
          return cached; // si no hay, deja fallar
        }
      })()
    );
  }
});
