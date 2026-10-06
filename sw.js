"use strict";


const CACHE_NAME =
  "origon58-cache-v1";


const APP_SHELL = [

  "./",

  "./index.html",

  "./style.css",

  "./script.js",

  "./manifest.json",

  "./sw.js"

];


self.addEventListener(
  "install",
  (event) => {

    event.waitUntil(

      caches
        .open(
          CACHE_NAME
        )
        .then(
          (cache) =>
            cache.addAll(
              APP_SHELL
            )
        )
        .then(
          () =>
            self.skipWaiting()
        )

    );

  }
);


self.addEventListener(
  "activate",
  (event) => {

    event.waitUntil(

      caches
        .keys()
        .then(
          (names) => {

            return Promise.all(

              names
                .filter(
                  (name) =>
                    name !==
                    CACHE_NAME
                )
                .map(
                  (name) =>
                    caches.delete(
                      name
                    )
                )

            );

          }
        )
        .then(
          () =>
            self.clients.claim()
        )

    );

  }
);


self.addEventListener(
  "fetch",
  (event) => {

    if (
      event.request.method !==
      "GET"
    ) {

      return;

    }


    event.respondWith(

      fetch(
        event.request
      )

        .then(
          (response) => {

            if (
              response &&
              response.status ===
              200
            ) {

              const copy =
                response.clone();


              caches
                .open(
                  CACHE_NAME
                )
                .then(
                  (cache) =>
                    cache.put(
                      event.request,
                      copy
                    )
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

          }
        )

    );

  }
);
