
const VERSION = "v1.0.4";
const STATIC_CACHE = `ecofuga-static-${VERSION}`;
const RUNTIME_CACHE = `ecofuga-runtime-${VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./auth.html",
  "./bienvenido.html",
  "./offline.html",
  "./styles.css",
  "./shell.css",   
  "./shell.js",    
  "./manifest.webmanifest",
  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-128.png",
  "./icons/icon-144.png",
  "./icons/icon-192.png",
  "./icons/icon-384.png",
  "./icons/icon-512.png"
];


// Instalar y guardar recursos 
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      for (const file of APP_SHELL) {
        try {
          const response = await fetch(file, { cache: "no-store" });
          if (response.ok) {
            await cache.put(file, response.clone());
            // console.log("[SW] Cacheado:", file);
          } else {
            console.warn("[SW] Archivo no encontrado (omitido):", file);
          }
        } catch (err) {
          console.warn("[SW] No se pudo cachear (omitido):", file);
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
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
      // console.log("[SW] Versión activa:", VERSION);
    })()
  );
});

// Permitir actualización inmediata
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Estrategias de cache (robusto)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 0) Ignorar protocolos que no sean http/https (extensiones, data:, file:, etc.)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return; // no interceptar; el navegador lo maneja
  }

  // 1) HTML / navegaciones → Network First con fallback a cache y offline.html
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
        } catch (err) {
          const cachedRes = await caches.match(req);
          if (cachedRes) return cachedRes;
          const offline = await caches.match("./offline.html");
          return (
            offline ||
            new Response("<h1>Offline</h1>", {
              status: 200,
              headers: { "Content-Type": "text/html; charset=utf-8" }
            })
          );
        }
      })()
    );
    return;
  }

  // 2) Estáticos (css/js/img/font) → Cache First con relleno de runtime
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
        } catch (err) {
          // Si no hay cache y falla red, devolver un Response válido
          return new Response("", { status: 408, statusText: "Request Timeout (offline)" });
        }
      })()
    );
    return;
  }
});
