/**
 * Servicio de recordatorios de asistencia al gym.
 *
 * Regla: cada 4 horas, a partir de las 6am, si el suscriptor
 * tiene suscripción activa y NO ha registrado una Entrada hoy,
 * se le manda una notificación push via FCM.
 *
 * Horarios de disparo: 6am, 10am, 2pm, 6pm, 10pm
 */

import cron      from 'node-cron';
import admin     from 'firebase-admin';
import { createRequire } from 'module';
import db        from '../config/database.js';

// ─── Inicializar Firebase Admin (una sola vez) ────────────────────────────────
let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return;
  const require = createRequire(import.meta.url);
  const serviceAccount = require('../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  firebaseInitialized = true;
  console.log('[FCM] Firebase Admin inicializado');
}

// ─── Mensajes rotativos de motivación ────────────────────────────────────────
const MENSAJES = [
  { titulo: '💪 ¡Tu cuerpo te está esperando!',     cuerpo: 'Recuerda: cada día que entrenas es un paso más hacia tu meta. ¡Vamos al gym!' },
  { titulo: '🔥 ¡No rompas tu racha!',              cuerpo: 'Llevas días de racha. ¡No te detengas ahora, el gym te necesita!' },
  { titulo: '⚡ Es hora de moverse',                 cuerpo: '¿Aún no has ido hoy? Tienes tiempo. ¡Sal a entrenar y gana tus 10 pts!' },
  { titulo: '🏋️ ¡Un entrenamiento más!',            cuerpo: 'Cada repetición cuenta. ¡Ven al gym y suma otro día a tu racha!' },
  { titulo: '🌟 ¡Tus puntos te esperan!',            cuerpo: 'Haz check-in hoy y gana +10 pts. ¡El gym está listo para ti!' },
];

// ─── Función principal ────────────────────────────────────────────────────────
async function enviarRecordatorios() {
  try {
    // Suscriptores con suscripción activa Y con fcm_token Y que NO han entrado hoy
    const [destinatarios] = await db.query(
      `SELECT DISTINCT sus.id_suscriptor, sus.nombres, sus.fcm_token
       FROM suscriptores sus
       INNER JOIN suscripciones sub
              ON  sub.id_suscriptor = sus.id_suscriptor
             AND  sub.estado        = 'Activa'
             AND  sub.fecha_inicio <= CURDATE()
             AND  sub.fecha_fin    >= CURDATE()
       WHERE sus.fcm_token IS NOT NULL
         AND sus.fcm_token != ''
         AND NOT EXISTS (
           SELECT 1 FROM accesos a
           WHERE a.id_suscriptor  = sus.id_suscriptor
             AND a.resultado      = 'Permitido'
             AND a.tipo_movimiento = 'Entrada'
             AND DATE(a.fecha_hora) = CURDATE()
         )`
    );

    if (destinatarios.length === 0) {
      console.log('[RECORDATORIO] Todos los suscriptores ya asistieron hoy 🎉');
      return;
    }

    console.log(`[RECORDATORIO] Enviando notificación a ${destinatarios.length} suscriptor(es)…`);

    // Mensaje aleatorio de motivación
    const msg = MENSAJES[Math.floor(Math.random() * MENSAJES.length)];

    // Enviar a cada uno (FCM v1 API)
    const resultados = await Promise.allSettled(
      destinatarios.map(sus =>
        admin.messaging().send({
          token: sus.fcm_token,
          notification: {
            title: msg.titulo,
            body:  msg.cuerpo,
          },
          data: {
            tipo:   'recordatorio',
            titulo: msg.titulo,
            cuerpo: msg.cuerpo,
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'general',
              sound:     'default',
            },
          },
        })
      )
    );

    // Limpiar tokens inválidos (FCM los reporta como errores)
    for (let i = 0; i < resultados.length; i++) {
      const r = resultados[i];
      if (r.status === 'rejected') {
        const code = r.reason?.errorInfo?.code ?? '';
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          // Token inválido → limpiar de la BD
          await db.query(
            `UPDATE suscriptores SET fcm_token = NULL WHERE id_suscriptor = ?`,
            [destinatarios[i].id_suscriptor]
          );
          console.log(`[FCM] Token inválido eliminado → suscriptor ${destinatarios[i].id_suscriptor}`);
        } else {
          console.warn(`[FCM] Error al enviar a ${destinatarios[i].nombres}:`, r.reason?.message);
        }
      } else {
        console.log(`[RECORDATORIO] ✅ Enviado a ${destinatarios[i].nombres}`);
      }
    }
  } catch (err) {
    console.error('[RECORDATORIO] Error en cron:', err.message);
  }
}

// ─── Arrancar el cron ─────────────────────────────────────────────────────────
export function iniciarRecordatorios() {
  initFirebase();

  // Cada 4 horas a los minutos :00 (6am, 10am, 2pm, 6pm, 10pm)
  // Expresión: minuto hora_cada4 * * *
  // '0 6,10,14,18,22 * * *' → 6:00, 10:00, 14:00, 18:00, 22:00
  cron.schedule('0 6,10,14,18,22 * * *', () => {
    console.log(`[RECORDATORIO] 🔔 Disparando recordatorios: ${new Date().toLocaleTimeString()}`);
    enviarRecordatorios();
  }, { timezone: 'America/Mexico_City' });

  console.log('[RECORDATORIO] Cron de recordatorios activo (6am, 10am, 2pm, 6pm, 10pm)');
}
