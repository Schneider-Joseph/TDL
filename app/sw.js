const CACHE_NAME = "tdl-shell-v35";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./tdl-extras.css", "./tdl-theme.css", "./tdl-alarm.css", "./tdl-alarm.js", "./tdl-input-utils.js", "./tdl-inputs.css", "./tdl-categories.js", "./tdl-sidebar.css", "./tdl-sidebar.js", "./tdl-workspace.css", "./tdl-momentum.css", "./tdl-connections.css", "./tdl-extras-core.js", "./tdl-inbox.js", "./tdl-calendar.js", "./tdl-planner.js", "./tdl-momentum.js", "./tdl-connections.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("tdl-shell-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Prefer the latest app files while online; use the offline cache on failure.
  event.respondWith(
    fetch(request).then((response) => {
      if (response && response.ok && response.type === "basic") {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") {
        const shell = await caches.match("./index.html");
        if (shell) return shell;
      }
      return Response.error();
    })
  );
});


// Clicking a displayed reminder returns to the existing TDL window, or opens it.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({type: "window", includeUncontrolled: true}).then((windows) => {
      const existing = windows.find((client) => client.url.startsWith(self.registration.scope) && typeof client.focus === "function");
      if (existing) return existing.focus();
      return self.clients.openWindow(new URL("./index.html", self.registration.scope).href);
    })
  );
});
