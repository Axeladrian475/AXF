// ============================================================================
//  firebase.ts — Configuración de Firebase para notificaciones push web
//
//  Los valores de configuración del proyecto vienen del google-services.json
//  del proyecto Android (mismo proyecto Firebase compartido).
//  La VAPID key debe copiarse desde:
//    Firebase Console → Project Settings → Cloud Messaging
//    → Web Push Certificates → Key pair
// ============================================================================
import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBpMbCLK_kd767nXfWf9mB8byjyxIzoqlU',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'axf-gymnet.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'axf-gymnet',
  storageBucket: import.meta.env.VITE_FIREBASE_BUCKET || 'axf-gymnet.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID || '201767972302',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:201767972302:web:7752116ddcad81ca1fcf9f',
}

// Evitar inicializar múltiples veces en HMR de Vite
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

let messaging: Messaging | null = null
try {
  messaging = getMessaging(app)
} catch {
  // En SSR o entornos sin Service Worker, getMessaging puede fallar
  console.warn('[FCM] Messaging no disponible en este entorno')
}

export { messaging, getToken, onMessage }
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''
