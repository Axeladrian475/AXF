// ============================================================================
//  hooks/useFCMNotifications.ts
// ============================================================================
import { useEffect, useCallback, useRef } from 'react'
import { messaging, getToken, onMessage, VAPID_KEY } from '../firebase'
import axiosClient from '../api/axiosClient'

interface OpcionesFCM {
  token: string | null
  rol?: string
  onMensajeEntrante?: (titulo: string, cuerpo: string, data: Record<string, string>) => void
}

export function useFCMNotifications({ token, rol, onMensajeEntrante }: OpcionesFCM) {
  const fcmTokenRegistrado  = useRef<string | null>(null)
  const onMensajeRef        = useRef(onMensajeEntrante)

  // Mantener la ref actualizada sin afectar el useEffect
  useEffect(() => { onMensajeRef.current = onMensajeEntrante })

  const registrarToken = useCallback(async (fcmToken: string) => {
    if (fcmTokenRegistrado.current === fcmToken) return
    try {
      await axiosClient.post('/chat/fcm-token', { fcm_token: fcmToken })
      fcmTokenRegistrado.current = fcmToken
      console.log('[FCM] ✅ Token web registrado en backend:', fcmToken.substring(0, 20) + '...')
    } catch (err) {
      console.error('[FCM] ❌ Error al registrar token:', err)
    }
  }, [])

  useEffect(() => {
    // Solo para personal logueado
    if (!token || !messaging) {
      console.log('[FCM] Saltando: token =', !!token, '| messaging =', !!messaging)
      return
    }
    if (rol && rol !== 'personal' && rol !== 'maestro' && rol !== 'admin') {
      console.log('[FCM] Saltando: rol no es personal, es:', rol)
      return
    }

    let unsubscribe: (() => void) | null = null
    let cancelado = false

    const inicializar = async () => {
      try {
        // 1. Verificar soporte
        if (!('Notification' in window)) {
          console.warn('[FCM] El navegador no soporta notificaciones')
          return
        }
        if (!('serviceWorker' in navigator)) {
          console.warn('[FCM] El navegador no soporta Service Workers')
          return
        }

        // 2. Solicitar permiso
        console.log('[FCM] Solicitando permiso, estado actual:', Notification.permission)
        const permiso = Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission

        if (permiso !== 'granted') {
          console.warn('[FCM] ⚠️ Permiso denegado:', permiso)
          return
        }
        console.log('[FCM] ✅ Permiso concedido')

        // 3. Registrar o reutilizar el Service Worker
        let swReg: ServiceWorkerRegistration
        const registros = await navigator.serviceWorker.getRegistrations()
        const existente = registros.find(r => r.active?.scriptURL.includes('firebase-messaging-sw.js'))
        if (existente) {
          swReg = existente
          console.log('[FCM] ✅ Service Worker ya registrado:', swReg.scope)
        } else {
          swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
          console.log('[FCM] ✅ Service Worker registrado:', swReg.scope)
        }

        if (cancelado) return

        // 4. Obtener el token FCM
        console.log('[FCM] Obteniendo token FCM... VAPID:', VAPID_KEY ? VAPID_KEY.substring(0, 20) + '...' : 'VACÍO ⚠️')
        const fcmToken = await getToken(messaging!, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        })

        if (!fcmToken) {
          console.warn('[FCM] ⚠️ No se obtuvo token FCM (¿VAPID key incorrecta?)')
          return
        }
        console.log('[FCM] ✅ Token FCM obtenido:', fcmToken.substring(0, 30) + '...')

        if (cancelado) return

        // 5. Registrar en el backend
        await registrarToken(fcmToken)

        if (cancelado) return

        // 6. Escuchar mensajes en FOREGROUND
        // NOTA: cuando el tab está activo, FCM NO muestra notificación del sistema
        // automáticamente — tenemos que hacerlo nosotros con el toast o manualmente
        unsubscribe = onMessage(messaging!, (payload) => {
          console.log('[FCM] 📨 Mensaje en FOREGROUND recibido:', payload)

          const data   = (payload.data || {}) as Record<string, string>
          const notif  = payload.notification || {}
          const titulo = notif.title || data.titulo || 'AXF GymNet'
          const cuerpo = notif.body  || data.cuerpo || 'Nuevo mensaje'

          // Toast visual (siempre que el tab está activo)
          onMensajeRef.current?.(titulo, cuerpo, data)

          // Notificación nativa adicional si el tab no está visible
          if (document.visibilityState !== 'visible') {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification(titulo, {
                body:  cuerpo,
                icon:  '/axf-icon-192.png',
                tag:   `chat-${data.id_suscriptor || 'msg'}`,
                data:  { url: '/chat' },
              })
            })
          }
        })

        console.log('[FCM] ✅ Listener de foreground registrado')

      } catch (err) {
        console.error('[FCM] ❌ Error al inicializar:', err)
      }
    }

    inicializar()

    return () => {
      cancelado = true
      unsubscribe?.()
    }
  // Solo re-corre cuando cambia el token de sesión o el rol — NO en cada render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, rol, registrarToken])
}
