const CACHE_NAME = "origon58-cache-v9";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json"
];


/* =========================================================
   INSTALAÇÃO
   ========================================================= */

self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache => {

        return cache.addAll(APP_FILES);

      })

  );

  self.skipWaiting();
});


/* =========================================================
   ATIVAÇÃO
   ========================================================= */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys()
      .then(cacheNames => {

        return Promise.all(

          cacheNames
            .filter(
              cacheName =>
                cacheName.startsWith("origon58-cache-") &&
                cacheName !== CACHE_NAME
            )
            .map(
              cacheName =>
                caches.delete(cacheName)
            )

        );

      })
      .then(() => self.clients.claim())

  );
});


/* =========================================================
   BUSCA DE ARQUIVOS
   ========================================================= */

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }


  event.respondWith(

    fetch(event.request)
      .then(response => {

        if (
          response &&
          response.status === 200 &&
          response.type === "basic"
        ) {

          const responseClone =
            response.clone();


          caches.open(CACHE_NAME)
            .then(cache => {

              cache.put(
                event.request,
                responseClone
              );

            });

        }


        return response;

      })
      .catch(() => {

        return caches.match(
          event.request
        );

      })

  );

});


/* =========================================================
   MENSAGENS
   ========================================================= */

self.addEventListener("message", event => {

  if (!event.data) {
    return;
  }


  if (
    event.data.type ===
    "SKIP_WAITING"
  ) {

    self.skipWaiting();

  }

});
