/**
 * KOVA Service Worker
 * Handles: app shell caching, push notifications, offline support
 */

const CACHE_NAME = 'kova-v1'
const SHELL_URLS = [
  '/Kova-Web/',
  '/Kova-Web/index.html',
]

// ── Install: cache the app shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  )
  self.skipWaiting()
})

// ── Activate: clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  )
  self.clients.claim()
})

// ── Fetch: network-first with cache fallback ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Skip non-GET and API requests
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.hostname.includes('firestore') || url.hostname.includes('googleapis')) return
  if (url.hostname.includes('anthropic')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// ── Push Notification handler ────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'KOVA', body: 'You have a notification', icon: '/Kova-Web/icon-192.svg' }

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch {
      data.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/Kova-Web/icon-192.svg',
      badge: '/Kova-Web/icon-192.svg',
      tag: data.tag || 'kova-default',
      data: data.url || '/Kova-Web/#/',
      actions: data.actions || [],
    })
  )
})

// ── Notification click → open the app ────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data || '/Kova-Web/#/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if any
      for (const client of clients) {
        if (client.url.includes('/Kova-Web/') && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url)
    })
  )
})
