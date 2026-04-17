// ============================================================================
//  public/firebase-messaging-sw.js
//  Service Worker para FCM — notificaciones en background / tab cerrado
// ============================================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            'AIzaSyBpMbCLK_kd767nXfWf9mB8byjyxIzoqlU',
  authDomain:        'axf-gymnet.firebaseapp.com',
  projectId:         'axf-gymnet',
  storageBucket:     'axf-gymnet.firebasestorage.app',
  messagingSenderId: '201767972302',
  appId:             '1:201767972302:web:7752116ddcad81ca1fcf9f',   // ← App ID web real
})

const messaging = firebase.messaging()

// ── Mensajes en BACKGROUND ────────────────────────────────────────────────────
// Se activa cuando llega un push FCM y el tab está cerrado o en segundo plano.
messaging.onBackgroundMessage((payload) => {
  console.log('[SW FCM] Mensaje background recibido:', JSON.stringify(payload))

  const data    = payload.data || {}
  const notif   = payload.notification || {}

  const titulo  = notif.title || data.titulo || 'AXF GymNet'
  const cuerpo  = notif.body  || data.cuerpo || 'Tienes un nuevo mensaje'

  self.registration.showNotification(titulo, {
    body:      cuerpo,
    icon:      '/axf-icon-192.png',
    badge:     '/axf-badge.png',
    tag:       `chat-${data.id_suscriptor || 'msg'}`,
    renotify:  true,
    data: {
      url:           '/chat',
      id_suscriptor: data.id_suscriptor,
    },
    vibrate: [200, 100, 200],
  })
})

// ── Clic en la notificación ────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  console.log('[SW FCM] Clic en notificación:', event.notification.tag)
  event.notification.close()

  const urlDestino = event.notification.data?.url || '/chat'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (win.url.includes(self.location.origin) && 'focus' in win) {
          win.focus()
          win.navigate(urlDestino)
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(urlDestino)
    })
  )
})
