// Service worker di Socialbooth: riceve le notifiche push e apre la pagina giusta al tocco.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (evento) => {
  let dati = { titolo: 'Socialbooth', testo: '', link: '/' }
  try { dati = { ...dati, ...evento.data.json() } } catch { /* testo semplice */ }
  evento.waitUntil(self.registration.showNotification(dati.titolo, {
    body: dati.testo,
    icon: '/icona-192.png',
    badge: '/icona-badge.png',
    tag: dati.id,
    data: { link: dati.link },
  }))
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const link = new URL(evento.notification.data?.link || '/', self.location.origin).href
  evento.waitUntil((async () => {
    const finestre = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const aperta = finestre.find((f) => f.url.startsWith(self.location.origin))
    if (aperta) { await aperta.navigate(link); return aperta.focus() }
    return self.clients.openWindow(link)
  })())
})
