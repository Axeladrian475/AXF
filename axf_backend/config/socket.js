// ============================================================================
//  config/socket.js
//
//  Motor WebSocket para chat en tiempo real.
//  Usa el mismo JWT y estructura de roles que el resto del backend AXF.
//
//  SALAS:
//    personal:{id_personal}     → sala del entrenador/nutriólogo
//    suscriptor:{id_suscriptor} → sala del suscriptor
//
//  EVENTOS cliente → servidor:
//    chat:enviar         → enviar mensaje
//    chat:leer           → marcar mensajes como leídos
//    chat:escribiendo    → indicador "está escribiendo..."
//    chat:parar_escribir → detener indicador
//
//  EVENTOS servidor → cliente:
//    chat:mensaje_nuevo  → nuevo mensaje recibido
//    chat:mensajes_leidos → confirmación de lectura
//    chat:escribiendo    → el otro está escribiendo
//    chat:parar_escribir → el otro dejó de escribir
//    chat:no_leidos      → badge actualizado
// ============================================================================

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import db from './database.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // ─── Middleware de autenticación ────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token requerido'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.usuario = decoded; // { id, rol, puesto?, id_sucursal? }
      next();
    } catch {
      next(new Error('Token inválido o expirado'));
    }
  });

  // ─── Conexión ───────────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { id, rol } = socket.usuario;
    const sala = rol === 'personal' ? `personal:${id}` : `suscriptor:${id}`;

    socket.join(sala);
    console.log(`[WS] Conectado → ${sala}`);

    // ─── ENVIAR MENSAJE ───────────────────────────────────────────────────────
    socket.on('chat:enviar', async (data, callback) => {
      try {
        const { contenido } = data;
        if (!contenido?.trim()) {
          return callback?.({ ok: false, error: 'Contenido vacío' });
        }

        let id_personal, id_suscriptor, enviado_por;

        if (rol === 'personal') {
          id_personal   = id;
          id_suscriptor = parseInt(data.id_suscriptor);
          enviado_por   = 'personal';
          if (!id_suscriptor) return callback?.({ ok: false, error: 'id_suscriptor requerido' });
        } else {
          id_suscriptor = id;
          id_personal   = parseInt(data.id_personal);
          enviado_por   = 'suscriptor';
          if (!id_personal) return callback?.({ ok: false, error: 'id_personal requerido' });
        }

        // Guardar en BD
        const [result] = await db.query(
          `INSERT INTO chat_mensajes (id_personal, id_suscriptor, enviado_por, contenido)
           VALUES (?, ?, ?, ?)`,
          [id_personal, id_suscriptor, enviado_por, contenido.trim()]
        );

        const [[mensaje]] = await db.query(
          `SELECT id_mensaje, enviado_por, contenido, leido, enviado_en
           FROM chat_mensajes WHERE id_mensaje = ?`,
          [result.insertId]
        );

        // Emitir al destinatario
        const sala_destino = rol === 'personal'
          ? `suscriptor:${id_suscriptor}`
          : `personal:${id_personal}`;

        io.to(sala_destino).emit('chat:mensaje_nuevo', {
          id_personal,
          id_suscriptor,
          mensaje,
        });

        // Confirmar al emisor
        callback?.({ ok: true, mensaje });

      } catch (err) {
        console.error('[WS chat:enviar]', err);
        callback?.({ ok: false, error: 'Error al enviar mensaje' });
      }
    });

    // ─── MARCAR COMO LEÍDOS ───────────────────────────────────────────────────
    socket.on('chat:leer', async (data) => {
      try {
        const enviado_por_otro = rol === 'personal' ? 'suscriptor' : 'personal';

        let id_personal, id_suscriptor;
        if (rol === 'personal') {
          id_personal   = id;
          id_suscriptor = parseInt(data.id_suscriptor);
        } else {
          id_suscriptor = id;
          id_personal   = parseInt(data.id_personal);
        }

        if (!id_personal || !id_suscriptor) return;

        await db.query(
          `UPDATE chat_mensajes
             SET leido = 1
           WHERE id_personal = ? AND id_suscriptor = ?
             AND enviado_por = ? AND leido = 0`,
          [id_personal, id_suscriptor, enviado_por_otro]
        );

        // Notificar al otro que sus mensajes fueron leídos
        const sala_destino = rol === 'personal'
          ? `suscriptor:${id_suscriptor}`
          : `personal:${id_personal}`;

        io.to(sala_destino).emit('chat:mensajes_leidos', {
          id_personal,
          id_suscriptor,
        });

        // Actualizar badge del lector
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

    // ─── INDICADOR "ESTÁ ESCRIBIENDO..." ─────────────────────────────────────
    socket.on('chat:escribiendo', (data) => {
      const sala_destino = rol === 'personal'
        ? `suscriptor:${data.id_suscriptor}`
        : `personal:${data.id_personal}`;

      io.to(sala_destino).emit('chat:escribiendo', { de: rol, id });
    });

    socket.on('chat:parar_escribir', (data) => {
      const sala_destino = rol === 'personal'
        ? `suscriptor:${data.id_suscriptor}`
        : `personal:${data.id_personal}`;

      io.to(sala_destino).emit('chat:parar_escribir', { de: rol, id });
    });

    // ─── DESCONEXIÓN ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[WS] Desconectado → ${sala}`);
    });
  });

  return io;
}

// Exportar instancia para usar en otros módulos (ej. chat.controller.js)
export function getIO() {
  if (!io) throw new Error('[Socket] No inicializado. Llama initSocket primero.');
  return io;
}
