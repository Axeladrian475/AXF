import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import db from './database.js';

let io = null;

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
    const sala = rol === 'personal' ? `personal:${id}` : `suscriptor:${id}`;
    socket.join(sala);
    console.log(`[WS] ✅ Conectado → ${sala}`);

    // ── Presencia online ──────────────────────────────────────────────────
    // Notificar a todos los que tengan chat con este usuario que está online
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

        // Obtener contenido citado si hay reply
        let respuesta_contenido = null, respuesta_enviado_por = null;
        if (id_respuesta) {
          const [[orig]] = await db.query(
            `SELECT contenido, enviado_por FROM chat_mensajes WHERE id_mensaje = ? AND borrado_para != 'todos'`,
            [id_respuesta]
          );
          if (orig) {
            respuesta_contenido = orig.contenido.substring(0, 200);
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

        // Si el destinatario está online, marcar entregado inmediatamente
        const socketsDestino = await io.in(sala_destino).fetchSockets();
        if (socketsDestino.length > 0) {
          await db.query(
            `UPDATE chat_mensajes SET entregado = 1 WHERE id_mensaje = ?`,
            [msg.id_mensaje]
          );
          msg.entregado = 1;
          socket.emit('chat:entregado', { id_mensaje: msg.id_mensaje });
        }

        callback?.({ ok: true, mensaje: msg });

      } catch (err) {
        console.error('[WS chat:enviar]', err);
        callback?.({ ok: false, error: 'Error interno' });
      }
    });

    // ── MARCAR ENTREGADO (cuando el cliente se conecta y recibe mensajes pendientes) ──
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

        // Obtener IDs de mensajes no entregados
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

        // Notificar al emisor original por cada conversación
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

        // Solo puede editar el que lo envió
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
        } else {
          callback?.({ ok: true });
        }
        callback?.({ ok: true });
      } catch (err) {
        console.error('[WS chat:eliminar]', err);
        callback?.({ ok: false });
      }
    });

    // ── ESCRIBIENDO ───────────────────────────────────────────────────────
    // CORRECCIÓN: se incluyen id_personal e id_suscriptor en el evento para
    // que el receptor pueda ignorarlo si no es la conversación activa.
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