"use strict";

/*
  ORIGON58
  Service Worker V8
*/

const CACHE_NAME = "origon58-cache-v8";

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

self.addEventListener("install", (event) => {

  event.waitUntil(

    caches
      .open(CACHE_NAME)

      .then((cache) => {

        return cache.addAll(APP_SHELL);

      })

      .then(() => {

        return self.skipWaiting();

      })

  );

});


/* =========================================================
   ATIVAÇÃO
========================================================= */

self.addEventListener("activate", (event) => {

  event.waitUntil(

    caches
      .keys()

      .then((cacheNames) => {

        return Promise.all(

          cacheNames

            .filter((name) => {

              return name !== CACHE_NAME;

            })

            .map((name) => {

              return caches.delete(name);

            })

        );

      })

      .then(() => {

        return self.clients.claim();

      })

      .then(() => {

        return self.clients.matchAll();

      })

      .then((clients) => {

        clients.forEach((client) => {

          client.postMessage({

            type:
              "ORIGON58_SW_UPDATED",

            version:
              CACHE_NAME

          });

        });

      })

  );

});


/* =========================================================
   REQUISIÇÕES
========================================================= */

self.addEventListener("fetch", (event) => {

  if (
    event.request.method !== "GET"
  ) {

    return;

  }


  event.respondWith(

    fetch(event.request)

      .then((response) => {

        if (
          response &&
          response.status === 200
        ) {

          const copy =
            response.clone();


          caches
            .open(CACHE_NAME)

            .then((cache) => {

              cache.put(
                event.request,
                copy
              );

            });

        }


        return response;

      })

      .catch(async () => {

        const cached =
          await caches.match(
            event.request
          );


        if (cached) {

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


          if (fallback) {

            return fallback;

          }

        }


        return new Response(
          "Origon58 offline.",
          {
            status: 503,

            headers: {
              "Content-Type":
                "text/plain; charset=utf-8"
            }
          }
        );

      })

  );

});


/* =========================================================
   MENSAGENS
========================================================= */

self.addEventListener("message", (event) => {

  if (
    event.data &&
    event.data.type ===
      "SKIP_WAITING"
  ) {

    self.skipWaiting();

  }

});
