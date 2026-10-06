"use strict";


/* =========================================================
   ORIGON58 — SERVICE WORKER
   Cache atualizado para forçar a nova versão dos arquivos
   ========================================================= */


const CACHE_NAME =
  "origon58-cache-v4";


const APP_SHELL = [

  "./",

  "./index.html",

  "./style.css",

  "./script.js",

  "./manifest.json",

  "./sw.js"

];


/* =========================================================
   INSTALAÇÃO
   ========================================================= */

self.addEventListener(
  "install",
  (event) => {

    event.waitUntil(

      caches
        .open(
          CACHE_NAME
        )
        .then(
          (cache) => {

            return cache.addAll(
              APP_SHELL
            );

          }
        )
        .then(
          () => {

            return self.skipWaiting();

          }
        )

    );

  }
);


/* =========================================================
   ATIVAÇÃO
   ========================================================= */

self.addEventListener(
  "activate",
  (event) => {

    event.waitUntil(

      caches
        .keys()
        .then(
          (cacheNames) => {

            return Promise.all(

              cacheNames
                .filter(
                  (cacheName) =>
                    cacheName !==
                    CACHE_NAME
                )
                .map(
                  (cacheName) =>
                    caches.delete(
                      cacheName
                    )
                )

            );

          }
        )
        .then(
          () => {

            return self.clients.claim();

          }
        )

    );

  }
);


/* =========================================================
   BUSCA DE ARQUIVOS
   ========================================================= */

self.addEventListener(
  "fetch",
  (event) => {

    if (
      event.request.method !==
      "GET"
    ) {

      return;

    }


    /*
     * Para os arquivos principais do site,
     * sempre tenta buscar a versão atual
     * primeiro.
     */

    const requestURL =
      new URL(
        event.request.url
      );


    const isAppFile =
      requestURL.pathname.endsWith(
        "/index.html"
      ) ||
      requestURL.pathname.endsWith(
        "/script.js"
      ) ||
      requestURL.pathname.endsWith(
        "/style.css"
      ) ||
      requestURL.pathname.endsWith(
        "/sw.js"
      ) ||
      requestURL.pathname.endsWith(
        "/manifest.json"
      );


    if (
      isAppFile
    ) {

      event.respondWith(

        fetch(
          event.request,
          {
            cache:
              "no-store"
          }
        )

          .then(
            (response) => {

              if (
                response &&
                response.ok
              ) {

                const copy =
                  response.clone();


                caches
                  .open(
                    CACHE_NAME
                  )
                  .then(
                    (cache) => {

                      cache.put(
                        event.request,
                        copy
                      );

                    }
                  );

              }


              return response;

            }
          )

          .catch(
            async () => {

              const cached =
                await caches.match(
                  event.request
                );


              if (
                cached
              ) {

                return cached;

              }


              const fallback =
                await caches.match(
                  "./index.html"
                );


              if (
                fallback
              ) {

                return fallback;

              }


              return new Response(
                "Origon58 offline.",
                {
                  status:
                    503,

                  headers: {

                    "Content-Type":
                      "text/plain; charset=utf-8"

                  }

                }
              );

            }
          )

      );


      return;

    }


    /*
     * Outros arquivos:
     * tenta internet primeiro e usa
     * cache quando estiver offline.
     */

    event.respondWith(

      fetch(
        event.request
      )

        .then(
          (response) => {

            if (
              response &&
              response.ok
            ) {

              const copy =
                response.clone();


              caches
                .open(
                  CACHE_NAME
                )
                .then(
                  (cache) => {

                    cache.put(
                      event.request,
                      copy
                    );

                  }
                );

            }


            return response;

          }
        )

        .catch(
          async () => {

            const cached =
              await caches.match(
                event.request
              );


            if (
              cached
            ) {

              return cached;

            }


            if (
              event.request.mode ===
              "navigate"
            ) {

              const fallback =
                await caches.match(
                  "./index.html"
                );


              if (
                fallback
              ) {

                return fallback;

              }

            }


            return new Response(
              "Origon58 offline.",
              {
                status:
                  503,

                headers: {

                  "Content-Type":
                    "text/plain; charset=utf-8"

                }

              }
            );

          }
        )

    );

  }
);
