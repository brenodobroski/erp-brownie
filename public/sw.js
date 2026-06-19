// Service worker mínimo — só o suficiente para o app ser instalável.
// Não faz cache offline agressivo (os dados vêm do Sheets em tempo real).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});