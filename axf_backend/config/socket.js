import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import db from './database.js';
import { readFileSync } from 'fs';
import { createSign } from 'crypto';

// ── FCM v1 con Service Account (compatible con Hostinger) ─────────────────────
let io; // instancia compartida de Socket.io
let _fcmAccessToken = null;
let _fcmTokenExpiry = 0;

async function getFCMAccessToken() {
  if (_fcmAccessToken && Date.now() < _fcmTokenExpiry) return _fcmAccessToken;

  const sa = JSON.parse(readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(sa.private_key, 'base64url');
  const jwt_token = `${header}.${payload}.${signature}`;

  const resp = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt_token}`,
  });
  const json = await resp.json();
  _fcmAccessToken = json.access_token;
  _fcmTokenExpiry = Date.now() + 55 * 60 * 1000; // 55 min
  return _fcmAccessToken;
}

async function enviarPushFCM({ fcm_token, titulo, cuerpo, data = {} }) {
  if (!fcm_token) return;
  try {
    const accessToken = await getFCMAccessToken();
    const projectId   = 'axf-gymnet';

    const dataStr = Object.fromEntries(
      Object.entries({ ...data, titulo, cuerpo })
        .map(([k, v]) => [k, String(v)])
    );

    const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token: fcm_token,
          // Payload de notificación visible (Android background y web SW background)
          notification: { title: titulo, body: cuerpo },
          // Android config
          android: {
            priority: 'high',
            notification: { sound: 'default', click_action: 'OPEN_CHAT' },
          },
          // Web Push config — necesario para que el navegador lo reciba
          webpush: {
            headers: {
              Urgency: 'high',
              TTL:     '86400',
            },
            notification: {
              title: titulo,
              body:  cuerpo,
              icon:  '/axf-icon-192.png',
              badge: '/axf-badge.png',
              tag:   `chat-${data.id_suscriptor || 'msg'}`,
              renotify: 'true',
              requireInteraction: 'false',
            },
            fcm_options: { link: '/chat' },
          },
          // Data payload — llega tanto a Android como al Service Worker web
          data: dataStr,
        },
      }),
    });

    const respJson = await resp.json().catch(() => ({}));
    if (resp.ok) {
      console.log('[FCM] ✅ Push enviado correctamente. Name:', respJson.name);
    } else {
      console.error('[FCM] ❌ Error al enviar push:', JSON.stringify(respJson));
    }
  } catch (err) {
    console.error('[FCM] Error:', err.message);
  }
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', credentials: false },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── Auth middleware ──────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token requerido'));
    try {
      socket.usuario = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const { id, rol } = socket.usuario;
    let sala;
    if (rol === 'personal')   sala = `personal:${id}`;
    else if (rol === 'sucursal') sala = `sucursal:${id}`;
    else if (rol === 'maestro')  sala = `maestro:${id}`;
    else                         sala = `suscriptor:${id}`;
    socket.join(sala);
    console.log(`[WS] ✅ Conectado → ${sala}`);

    io.emit(`chat:online`, { rol, id, online: true });

    // ── ENVIAR MENSAJE ────────────────────────────────────────────────────
    socket.on('chat:enviar', async (data, callback) => {
      try {
        const { contenido, id_respuesta } = data;
        if (!contenido?.trim()) return callback?.({ ok: false, error: 'Vacío' });

        let id_personal, id_suscriptor;
        if (rol === 'personal') {
          id_personal   = id;
          id_suscriptor = parseInt(data.id_suscriptor);
        } else {
          id_suscriptor = id;
          id_personal   = parseInt(data.id_personal);
        }
        if (!id_personal || !id_suscriptor) return callback?.({ ok: false, error: 'IDs inválidos' });

        let respuesta_contenido = null, respuesta_enviado_por = null;
        if (id_respuesta) {
          const [[orig]] = await db.query(
            `SELECT contenido, enviado_por FROM chat_mensajes WHERE id_mensaje = ? AND borrado_para != 'todos'`,
            [id_respuesta]
          );
          if (orig) {
            respuesta_contenido   = orig.contenido.substring(0, 200);
            respuesta_enviado_por = orig.enviado_por;
          }
        }

        const [result] = await db.query(
          `INSERT INTO chat_mensajes
             (id_personal, id_suscriptor, enviado_por, contenido, entregado,
              id_respuesta, respuesta_contenido, respuesta_enviado_por)
           VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
          [id_personal, id_suscriptor, rol, contenido.trim(),
           id_respuesta || null, respuesta_contenido, respuesta_enviado_por]
        );

        const [[msg]] = await db.query(
          `SELECT id_mensaje, enviado_por, contenido, leido, entregado, editado_en,
                  borrado_para, id_respuesta, respuesta_contenido, respuesta_enviado_por, enviado_en
           FROM chat_mensajes WHERE id_mensaje = ?`,
          [result.insertId]
        );

        const sala_destino = rol === 'personal'
          ? `suscriptor:${id_suscriptor}`
          : `personal:${id_personal}`;

        io.to(sala_destino).emit('chat:mensaje_nuevo', { id_personal, id_suscriptor, mensaje: msg });

        // ── Crear aviso en la campanita si el que escribe es el suscriptor ──
        if (rol === 'suscriptor') {
          try {
            // Obtener nombre del suscriptor y sucursal del personal
            const [[suscriptor]] = await db.query(
              `SELECT CONCAT(nombres, ' ', apellido_paterno) AS nombre FROM suscriptores WHERE id_suscriptor = ?`,
              [id_suscriptor]
            );
            const [[personalInfo]] = await db.query(
              `SELECT id_sucursal FROM personal WHERE id_personal = ?`,
              [id_personal]
            );

            if (personalInfo) {
              const mensajeAviso = `💬 ${suscriptor?.nombre ?? 'Un suscriptor'}: ${contenido.trim().substring(0, 80)}${contenido.trim().length > 80 ? '…' : ''}`;

              // Insertar aviso y su destinatario en una transacción
              const conn = await db.getConnection();
              try {
                await conn.beginTransaction();
                const [avisoRes] = await conn.query(
                  `INSERT INTO avisos (id_sucursal, mensaje) VALUES (?, ?)`,
                  [personalInfo.id_sucursal, mensajeAviso]
                );
                await conn.query(
                  `INSERT INTO aviso_destinatarios (id_aviso, id_personal) VALUES (?, ?)`,
                  [avisoRes.insertId, id_personal]
                );
                await conn.commit();

                // Notificar en tiempo real a la campanita del personal
                io.to(`personal:${id_personal}`).emit('aviso:nuevo', {
                  id_aviso:  avisoRes.insertId,
                  mensaje:   mensajeAviso,
                  creado_en: new Date().toISOString(),
                  leido:     0,
                });
              } catch (eAviso) {
                await conn.rollback();
                console.error('[aviso:chat]', eAviso.message);
              } finally {
                conn.release();
              }
            }
          } catch (eAviso) {
            console.error('[aviso:chat outer]', eAviso.message);
          }
        }

        // ── ¿El destinatario está online? ─────────────────────────────────
        const socketsDestino = await io.in(sala_destino).fetchSockets();
        if (socketsDestino.length > 0) {
          // Online → marcar entregado
          await db.query(
            `UPDATE chat_mensajes SET entregado = 1 WHERE id_mensaje = ?`,
            [msg.id_mensaje]
          );
          msg.entregado = 1;
          socket.emit('chat:entregado', { id_mensaje: msg.id_mensaje });
        } else {
          // Offline → enviar push FCM
          try {
            const tabla  = rol === 'personal' ? 'suscriptores' : 'personal';
            const campo  = rol === 'personal' ? 'id_suscriptor' : 'id_personal';
            const destId = rol === 'personal' ? id_suscriptor : id_personal;

            const [[destUser]] = await db.query(
              `SELECT fcm_token FROM ${tabla} WHERE ${campo} = ?`,
              [destId]
            );

            // Obtener nombre del emisor (las tablas usan nombres + apellido_paterno)
            const tablaEmisor  = rol === 'personal' ? 'personal' : 'suscriptores';
            const campoEmisor  = rol === 'personal' ? 'id_personal' : 'id_suscriptor';
            const [[emisor]]   = await db.query(
              `SELECT CONCAT(nombres, ' ', apellido_paterno) AS nombre
               FROM ${tablaEmisor} WHERE ${campoEmisor} = ?`,
              [id]
            );

            if (destUser?.fcm_token) {
              await enviarPushFCM({
                fcm_token: destUser.fcm_token,
                titulo:    emisor?.nombre ?? 'Nuevo mensaje',
                cuerpo:    contenido.trim().substring(0, 100),
                data: {
                  tipo:          'chat',
                  id_personal:   String(id_personal),
                  id_suscriptor: String(id_suscriptor),
                  nombre_personal: emisor?.nombre ?? '',
                },
              });
            }
          } catch (errPush) {
            console.error('[FCM push]', errPush.message);
          }
        }

        callback?.({ ok: true, mensaje: msg });

      } catch (err) {
        console.error('[WS chat:enviar]', err);
        callback?.({ ok: false, error: 'Error interno' });
      }
    });


    // ── MARCAR ENTREGADO ──────────────────────────────────────────────────
    socket.on('chat:marcar_entregado', async (data) => {
      try {
        let campo_id, campo_otro, id_otro;
        if (rol === 'personal') {
          campo_id = 'id_personal'; id_otro = id;
          campo_otro = 'id_suscriptor';
        } else {
          campo_id = 'id_suscriptor'; id_otro = id;
          campo_otro = 'id_personal';
        }
        const enviado_por_otro = rol === 'personal' ? 'suscriptor' : 'personal';

        const [rows] = await db.query(
          `SELECT id_mensaje, ${campo_otro} AS id_otro
           FROM chat_mensajes
           WHERE ${campo_id} = ? AND enviado_por = ? AND entregado = 0`,
          [id_otro, enviado_por_otro]
        );
        if (rows.length === 0) return;

        await db.query(
          `UPDATE chat_mensajes SET entregado = 1
           WHERE ${campo_id} = ? AND enviado_por = ? AND entregado = 0`,
          [id_otro, enviado_por_otro]
        );

        const idOtros = [...new Set(rows.map(r => r.id_otro))];
        for (const otroId of idOtros) {
          const salaEmisor = enviado_por_otro === 'personal' ? `personal:${otroId}` : `suscriptor:${otroId}`;
          io.to(salaEmisor).emit('chat:entregado_bulk', {
            id_personal:   rol === 'suscriptor' ? otroId : id,
            id_suscriptor: rol === 'personal'   ? otroId : id,
          });
        }
      } catch (err) {
        console.error('[WS chat:marcar_entregado]', err);
      }
    });

    // ── MARCAR COMO LEÍDOS ────────────────────────────────────────────────
    socket.on('chat:leer', async (data) => {
      try {
        const enviado_por_otro = rol === 'personal' ? 'suscriptor' : 'personal';
        const id_personal   = rol === 'personal' ? id : parseInt(data.id_personal);
        const id_suscriptor = rol === 'suscriptor' ? id : parseInt(data.id_suscriptor);
        if (!id_personal || !id_suscriptor) return;

        await db.query(
          `UPDATE chat_mensajes
             SET leido = 1, entregado = 1
           WHERE id_personal = ? AND id_suscriptor = ?
             AND enviado_por = ? AND leido = 0`,
          [id_personal, id_suscriptor, enviado_por_otro]
        );

        const sala_destino = rol === 'personal' ? `suscriptor:${id_suscriptor}` : `personal:${id_personal}`;
        io.to(sala_destino).emit('chat:mensajes_leidos', { id_personal, id_suscriptor });

        const [[{ total }]] = await db.query(
          `SELECT COUNT(*) AS total FROM chat_mensajes
           WHERE ${rol === 'personal' ? 'id_personal' : 'id_suscriptor'} = ?
             AND enviado_por = ? AND leido = 0`,
          [id, enviado_por_otro]
        );
        socket.emit('chat:no_leidos', { total });
      } catch (err) {
        console.error('[WS chat:leer]', err);
      }
    });

    // ── EDITAR MENSAJE ────────────────────────────────────────────────────
    socket.on('chat:editar', async (data, callback) => {
      try {
        const { id_mensaje, nuevo_contenido } = data;
        if (!id_mensaje || !nuevo_contenido?.trim()) return callback?.({ ok: false });

        const [[msg]] = await db.query(
          `SELECT * FROM chat_mensajes WHERE id_mensaje = ? AND enviado_por = ? AND borrado_para != 'todos'`,
          [id_mensaje, rol]
        );
        if (!msg) return callback?.({ ok: false, error: 'No autorizado o no existe' });

        await db.query(
          `UPDATE chat_mensajes SET contenido = ?, editado_en = NOW() WHERE id_mensaje = ?`,
          [nuevo_contenido.trim(), id_mensaje]
        );

        const evento = { id_mensaje, nuevo_contenido: nuevo_contenido.trim(), editado_en: new Date() };
        const sala_destino = rol === 'personal'
          ? `suscriptor:${msg.id_suscriptor}`
          : `personal:${msg.id_personal}`;

        io.to(sala_destino).emit('chat:mensaje_editado', evento);
        socket.emit('chat:mensaje_editado', evento);
        callback?.({ ok: true });
      } catch (err) {
        console.error('[WS chat:editar]', err);
        callback?.({ ok: false });
      }
    });

    // ── ELIMINAR MENSAJE ──────────────────────────────────────────────────
    socket.on('chat:eliminar', async (data, callback) => {
      try {
        const { id_mensaje, para_todos } = data;
        if (!id_mensaje) return callback?.({ ok: false });

        const [[msg]] = await db.query(
          `SELECT * FROM chat_mensajes WHERE id_mensaje = ? AND enviado_por = ?`,
          [id_mensaje, rol]
        );
        if (!msg) return callback?.({ ok: false, error: 'No autorizado' });

        const borrado_para = para_todos ? 'todos' : 'emisor';
        await db.query(
          `UPDATE chat_mensajes SET borrado_para = ? WHERE id_mensaje = ?`,
          [borrado_para, id_mensaje]
        );

        if (para_todos) {
          const sala_destino = rol === 'personal'
            ? `suscriptor:${msg.id_suscriptor}`
            : `personal:${msg.id_personal}`;
          io.to(sala_destino).emit('chat:mensaje_eliminado', { id_mensaje });
          socket.emit('chat:mensaje_eliminado', { id_mensaje });
        }
        callback?.({ ok: true });
      } catch (err) {
        console.error('[WS chat:eliminar]', err);
        callback?.({ ok: false });
      }
    });

    // ── ESCRIBIENDO ───────────────────────────────────────────────────────
    socket.on('chat:escribiendo', (data) => {
      const id_personal   = rol === 'personal'   ? id : parseInt(data.id_personal);
      const id_suscriptor = rol === 'suscriptor' ? id : parseInt(data.id_suscriptor);
      if (!id_personal || !id_suscriptor) return;
      const sala_destino = rol === 'personal'
        ? `suscriptor:${id_suscriptor}`
        : `personal:${id_personal}`;
      io.to(sala_destino).emit('chat:escribiendo', { de: rol, id_personal, id_suscriptor });
    });

    socket.on('chat:parar_escribir', (data) => {
      const id_personal   = rol === 'personal'   ? id : parseInt(data.id_personal);
      const id_suscriptor = rol === 'suscriptor' ? id : parseInt(data.id_suscriptor);
      if (!id_personal || !id_suscriptor) return;
      const sala_destino = rol === 'personal'
        ? `suscriptor:${id_suscriptor}`
        : `personal:${id_personal}`;
      io.to(sala_destino).emit('chat:parar_escribir', { de: rol, id_personal, id_suscriptor });
    });

    // ── DESCONEXIÓN ───────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[WS] ❌ Desconectado → ${sala}`);
      io.emit('chat:online', { rol, id, online: false, ultimo_visto: new Date() });
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket no inicializado');
  return io;
}