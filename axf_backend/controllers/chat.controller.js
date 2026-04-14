// ============================================================================
//  controllers/chat.controller.js  — v3
//  CORRECCIÓN: obtenerMensajes ahora devuelve los mensajes más RECIENTES
//  usando ORDER BY DESC + inversión, para que la paginación "cargar más
//  antiguos" funcione correctamente desde la app móvil.
// ============================================================================

import db from '../config/database.js';

function getActorId(usuario) {
  if (usuario.rol === 'personal')    return { tipo: 'personal',    id: usuario.id };
  if (usuario.rol === 'suscriptor')  return { tipo: 'suscriptor',  id: usuario.id };
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/chat/conversaciones
// ════════════════════════════════════════════════════════════════════════════
export async function listarConversaciones(req, res) {
  try {
    const actor = getActorId(req.usuario);
    if (!actor) return res.status(403).json({ message: 'Rol no autorizado.' });

    // ── PERSONAL ──────────────────────────────────────────────────────────
    if (actor.tipo === 'personal') {
      const { q = '' } = req.query;
      const busqueda = `%${q.trim()}%`;

      const [conversaciones] = await db.query(
        `SELECT
           s.id_suscriptor,
           CONCAT(s.nombres, ' ', s.apellido_paterno) AS nombre_suscriptor,
           s.correo,
           (SELECT cm2.contenido
            FROM chat_mensajes cm2
            WHERE cm2.id_personal = ? AND cm2.id_suscriptor = s.id_suscriptor
              AND cm2.borrado_para != 'todos'
            ORDER BY cm2.enviado_en DESC LIMIT 1) AS ultimo_mensaje,
           (SELECT cm3.enviado_en
            FROM chat_mensajes cm3
            WHERE cm3.id_personal = ? AND cm3.id_suscriptor = s.id_suscriptor
            ORDER BY cm3.enviado_en DESC LIMIT 1) AS ultimo_mensaje_en,
           (SELECT cm4.enviado_por
            FROM chat_mensajes cm4
            WHERE cm4.id_personal = ? AND cm4.id_suscriptor = s.id_suscriptor
            ORDER BY cm4.enviado_en DESC LIMIT 1) AS ultimo_enviado_por,
           (SELECT COUNT(*)
            FROM chat_mensajes cm5
            WHERE cm5.id_personal = ?
              AND cm5.id_suscriptor = s.id_suscriptor
              AND cm5.enviado_por = 'suscriptor'
              AND cm5.leido = 0
              AND cm5.borrado_para != 'todos') AS no_leidos
         FROM suscriptores s
         INNER JOIN chat_mensajes cm
           ON cm.id_personal = ? AND cm.id_suscriptor = s.id_suscriptor
         WHERE s.activo = 1
           AND (s.nombres LIKE ? OR s.apellido_paterno LIKE ? OR s.correo LIKE ?)
         GROUP BY s.id_suscriptor
         ORDER BY ultimo_mensaje_en DESC`,
        [actor.id, actor.id, actor.id, actor.id, actor.id, busqueda, busqueda, busqueda]
      );

      return res.json(conversaciones);
    }

    // ── SUSCRIPTOR ────────────────────────────────────────────────────────
    if (actor.tipo === 'suscriptor') {
      const [conversaciones] = await db.query(
        `SELECT
           p.id_personal,
           CONCAT(p.nombres, ' ', p.apellido_paterno) AS nombre_personal,
           p.puesto,
           p.foto_url,
           (SELECT cm2.contenido
            FROM chat_mensajes cm2
            WHERE cm2.id_personal = p.id_personal AND cm2.id_suscriptor = ?
              AND cm2.borrado_para != 'todos'
            ORDER BY cm2.enviado_en DESC LIMIT 1) AS ultimo_mensaje,
           (SELECT cm3.enviado_en
            FROM chat_mensajes cm3
            WHERE cm3.id_personal = p.id_personal AND cm3.id_suscriptor = ?
            ORDER BY cm3.enviado_en DESC LIMIT 1) AS ultimo_mensaje_en,
           (SELECT COUNT(*)
            FROM chat_mensajes cm5
            WHERE cm5.id_personal = p.id_personal
              AND cm5.id_suscriptor = ?
              AND cm5.enviado_por = 'personal'
              AND cm5.leido = 0
              AND cm5.borrado_para != 'todos') AS no_leidos
         FROM personal p
         INNER JOIN chat_mensajes cm
           ON cm.id_personal = p.id_personal AND cm.id_suscriptor = ?
         WHERE p.activo = 1
         GROUP BY p.id_personal
         ORDER BY ultimo_mensaje_en DESC`,
        [actor.id, actor.id, actor.id, actor.id]
      );

      if (conversaciones.length === 0) {
        const [personalDisponible] = await db.query(
          `SELECT
             p.id_personal,
             CONCAT(p.nombres, ' ', p.apellido_paterno) AS nombre_personal,
             p.puesto,
             p.foto_url,
             NULL AS ultimo_mensaje,
             NULL AS ultimo_mensaje_en,
             0    AS no_leidos
           FROM personal p
           INNER JOIN suscriptores s ON s.id_suscriptor = ?
           WHERE p.id_sucursal = s.id_sucursal_registro AND p.activo = 1
           ORDER BY p.nombres ASC`,
          [actor.id]
        );
        return res.json(personalDisponible);
      }

      return res.json(conversaciones);
    }

    return res.status(403).json({ message: 'Rol no autorizado.' });

  } catch (error) {
    console.error('[GET /chat/conversaciones]', error);
    res.status(500).json({ message: 'Error al obtener conversaciones.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/chat/mensajes/:id_suscriptor          (para personal)
// GET /api/chat/mensajes/personal/:id_personal   (para suscriptor)
//
// CORRECCIÓN v3:
//   Antes: ORDER BY enviado_en ASC LIMIT 50 OFFSET 0
//          → devolvía los 50 mensajes MÁS ANTIGUOS. Los mensajes nuevos
//            nunca aparecían al reabrir el chat.
//
//   Ahora: Se obtiene el total, se calcula el offset correcto para la
//          "última página", se traen los mensajes con DESC y se invierten
//          antes de responder. Así offset=0 siempre devuelve los más
//          RECIENTES y "cargar más" retrocede hacia los antiguos.
// ════════════════════════════════════════════════════════════════════════════
export async function obtenerMensajes(req, res) {
  try {
    const actor = getActorId(req.usuario);
    if (!actor) return res.status(403).json({ message: 'Rol no autorizado.' });

    const { limite = 50, offset = 0 } = req.query;
    const lim = Math.min(parseInt(limite) || 50, 200);
    const off = parseInt(offset) || 0;

    let id_personal, id_suscriptor;

    if (actor.tipo === 'personal') {
      id_personal   = actor.id;
      id_suscriptor = parseInt(req.params.id_suscriptor);
      if (!id_suscriptor) return res.status(400).json({ message: 'id_suscriptor requerido.' });
    } else {
      id_suscriptor = actor.id;
      id_personal   = parseInt(req.params.id_personal);
      if (!id_personal) return res.status(400).json({ message: 'id_personal requerido.' });
    }

    // Marcar como leídos y entregados antes de devolver
    const enviado_por_otro = actor.tipo === 'personal' ? 'suscriptor' : 'personal';
    await db.query(
      `UPDATE chat_mensajes
         SET leido = 1, entregado = 1
       WHERE id_personal = ? AND id_suscriptor = ?
         AND enviado_por = ? AND leido = 0`,
      [id_personal, id_suscriptor, enviado_por_otro]
    );

    const miRol = actor.tipo;

    // ── CORRECCIÓN: contar total primero ─────────────────────────────────
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM chat_mensajes
       WHERE id_personal = ? AND id_suscriptor = ?
         AND NOT (borrado_para = 'todos')
         AND NOT (borrado_para = 'emisor' AND enviado_por = ?)`,
      [id_personal, id_suscriptor, miRol]
    );

    // ── CORRECCIÓN: offset real desde el final ────────────────────────────
    // off=0 → últimos N mensajes (los más recientes)
    // off=50 → los 50 anteriores a esos, etc.
    // Se traduce a un offset SQL desde el inicio:
    //   offsetSQL = total - off - lim  (mínimo 0)
    const offsetSQL = Math.max(0, total - off - lim);
    // Cuántos mensajes realmente traer (puede ser < lim si estamos al inicio)
    const limReal   = Math.min(lim, total - off);

    let mensajes = [];
    if (limReal > 0) {
      const [rows] = await db.query(
        `SELECT
           id_mensaje,
           enviado_por,
           contenido,
           leido,
           entregado,
           editado_en,
           borrado_para,
           id_respuesta,
           respuesta_contenido,
           respuesta_enviado_por,
           enviado_en
         FROM chat_mensajes
         WHERE id_personal = ? AND id_suscriptor = ?
           AND NOT (borrado_para = 'todos')
           AND NOT (borrado_para = 'emisor' AND enviado_por = ?)
         ORDER BY enviado_en ASC
         LIMIT ? OFFSET ?`,
        [id_personal, id_suscriptor, miRol, limReal, offsetSQL]
      );
      mensajes = rows;
    }

    // hay_mas = true si aún quedan mensajes más antiguos (offset mayor disponible)
    const hay_mas = off + limReal < total;

    res.json({
      mensajes,
      paginacion: {
        total,
        limite: lim,
        offset: off,
        hay_mas,
      },
    });

  } catch (error) {
    console.error('[GET /chat/mensajes]', error);
    res.status(500).json({ message: 'Error al obtener mensajes.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/chat/mensajes  (fallback REST)
// ════════════════════════════════════════════════════════════════════════════
export async function enviarMensaje(req, res) {
  try {
    const actor = getActorId(req.usuario);
    if (!actor) return res.status(403).json({ message: 'Rol no autorizado.' });

    const {
      contenido,
      id_respuesta          = null,
      respuesta_contenido   = null,
      respuesta_enviado_por = null,
    } = req.body;

    if (!contenido?.trim()) {
      return res.status(400).json({ message: 'El contenido no puede estar vacío.' });
    }

    let id_personal, id_suscriptor;

    if (actor.tipo === 'personal') {
      id_personal   = actor.id;
      id_suscriptor = parseInt(req.body.id_suscriptor);
      if (!id_suscriptor) return res.status(400).json({ message: 'id_suscriptor requerido.' });

      const [[sus]] = await db.query(
        `SELECT id_suscriptor FROM suscriptores WHERE id_suscriptor = ? AND activo = 1`,
        [id_suscriptor]
      );
      if (!sus) return res.status(404).json({ message: 'Suscriptor no encontrado.' });

    } else {
      id_suscriptor = actor.id;
      id_personal   = parseInt(req.body.id_personal);
      if (!id_personal) return res.status(400).json({ message: 'id_personal requerido.' });

      const [[per]] = await db.query(
        `SELECT id_personal FROM personal WHERE id_personal = ? AND activo = 1`,
        [id_personal]
      );
      if (!per) return res.status(404).json({ message: 'Personal no encontrado.' });
    }

    // Obtener contenido citado desde la BD si hay id_respuesta pero no viene el texto
    let respCont   = respuesta_contenido;
    let respEnvPor = respuesta_enviado_por;
    if (id_respuesta && !respCont) {
      const [[orig]] = await db.query(
        `SELECT contenido, enviado_por FROM chat_mensajes
         WHERE id_mensaje = ? AND borrado_para != 'todos'`,
        [id_respuesta]
      );
      if (orig) {
        respCont   = orig.contenido.substring(0, 200);
        respEnvPor = orig.enviado_por;
      }
    }

    const [result] = await db.query(
      `INSERT INTO chat_mensajes
         (id_personal, id_suscriptor, enviado_por, contenido,
          id_respuesta, respuesta_contenido, respuesta_enviado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_personal, id_suscriptor, actor.tipo, contenido.trim(),
       id_respuesta || null, respCont || null, respEnvPor || null]
    );

    const [[mensaje]] = await db.query(
      `SELECT
         id_mensaje, enviado_por, contenido, leido, entregado,
         editado_en, borrado_para,
         id_respuesta, respuesta_contenido, respuesta_enviado_por,
         enviado_en
       FROM chat_mensajes WHERE id_mensaje = ?`,
      [result.insertId]
    );

    // Emitir por WebSocket si está disponible
    try {
      const { getIO } = await import('../config/socket.js');
      const io = getIO();

      const sala_destino = actor.tipo === 'personal'
        ? `suscriptor:${id_suscriptor}`
        : `personal:${id_personal}`;

      io.to(sala_destino).emit('chat:mensaje_nuevo', {
        id_personal,
        id_suscriptor,
        mensaje,
      });

      // Marcar entregado si el destinatario está online
      const socketsDestino = await io.in(sala_destino).fetchSockets();
      if (socketsDestino.length > 0) {
        await db.query(
          `UPDATE chat_mensajes SET entregado = 1 WHERE id_mensaje = ?`,
          [mensaje.id_mensaje]
        );
        mensaje.entregado = 1;

        const salaEmisor = actor.tipo === 'personal'
          ? `personal:${id_personal}`
          : `suscriptor:${id_suscriptor}`;
        io.to(salaEmisor).emit('chat:entregado', { id_mensaje: mensaje.id_mensaje });
      }
    } catch {
      // Socket.io no disponible — continuar solo con REST
    }

    res.status(201).json({ ok: true, mensaje });

  } catch (error) {
    console.error('[POST /chat/mensajes]', error);
    res.status(500).json({ message: 'Error al enviar el mensaje.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/chat/mensajes/:id_mensaje  (editar, fallback REST)
// ════════════════════════════════════════════════════════════════════════════
export async function editarMensaje(req, res) {
  try {
    const actor = getActorId(req.usuario);
    if (!actor) return res.status(403).json({ message: 'Rol no autorizado.' });

    const id_mensaje      = parseInt(req.params.id_mensaje);
    const { nuevo_contenido } = req.body;

    if (!nuevo_contenido?.trim()) {
      return res.status(400).json({ message: 'El contenido no puede estar vacío.' });
    }

    const [[msg]] = await db.query(
      `SELECT * FROM chat_mensajes
       WHERE id_mensaje = ? AND enviado_por = ? AND borrado_para != 'todos'`,
      [id_mensaje, actor.tipo]
    );
    if (!msg) return res.status(404).json({ message: 'Mensaje no encontrado o no autorizado.' });

    await db.query(
      `UPDATE chat_mensajes SET contenido = ?, editado_en = NOW() WHERE id_mensaje = ?`,
      [nuevo_contenido.trim(), id_mensaje]
    );

    const [[actualizado]] = await db.query(
      `SELECT id_mensaje, contenido, editado_en FROM chat_mensajes WHERE id_mensaje = ?`,
      [id_mensaje]
    );

    // Notificar por WebSocket si disponible
    try {
      const { getIO } = await import('../config/socket.js');
      const io = getIO();
      const sala_destino = actor.tipo === 'personal'
        ? `suscriptor:${msg.id_suscriptor}`
        : `personal:${msg.id_personal}`;
      const evento = {
        id_mensaje,
        nuevo_contenido: actualizado.contenido,
        editado_en:      actualizado.editado_en,
      };
      io.to(sala_destino).emit('chat:mensaje_editado', evento);
    } catch { /* sin socket */ }

    res.json({ ok: true, mensaje: actualizado });

  } catch (error) {
    console.error('[PUT /chat/mensajes/:id]', error);
    res.status(500).json({ message: 'Error al editar el mensaje.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/chat/mensajes/:id_mensaje  (eliminar, fallback REST)
// Body: { para_todos: boolean }
// ════════════════════════════════════════════════════════════════════════════
export async function eliminarMensaje(req, res) {
  try {
    const actor = getActorId(req.usuario);
    if (!actor) return res.status(403).json({ message: 'Rol no autorizado.' });

    const id_mensaje  = parseInt(req.params.id_mensaje);
    const { para_todos = false } = req.body;

    const [[msg]] = await db.query(
      `SELECT * FROM chat_mensajes WHERE id_mensaje = ? AND enviado_por = ?`,
      [id_mensaje, actor.tipo]
    );
    if (!msg) return res.status(404).json({ message: 'Mensaje no encontrado o no autorizado.' });

    const borrado_para = para_todos ? 'todos' : 'emisor';
    await db.query(
      `UPDATE chat_mensajes SET borrado_para = ? WHERE id_mensaje = ?`,
      [borrado_para, id_mensaje]
    );

    // Notificar si es para todos
    if (para_todos) {
      try {
        const { getIO } = await import('../config/socket.js');
        const io = getIO();
        const sala_destino = actor.tipo === 'personal'
          ? `suscriptor:${msg.id_suscriptor}`
          : `personal:${msg.id_personal}`;
        io.to(sala_destino).emit('chat:mensaje_eliminado', { id_mensaje });
      } catch { /* sin socket */ }
    }

    res.json({ ok: true });

  } catch (error) {
    console.error('[DELETE /chat/mensajes/:id]', error);
    res.status(500).json({ message: 'Error al eliminar el mensaje.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/chat/no-leidos
// ════════════════════════════════════════════════════════════════════════════
export async function contarNoLeidos(req, res) {
  try {
    const actor = getActorId(req.usuario);
    if (!actor) return res.status(403).json({ message: 'Rol no autorizado.' });

    const enviado_por_otro = actor.tipo === 'personal' ? 'suscriptor' : 'personal';
    const campo_id         = actor.tipo === 'personal' ? 'id_personal' : 'id_suscriptor';

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM chat_mensajes
       WHERE ${campo_id} = ?
         AND enviado_por = ?
         AND leido = 0
         AND borrado_para != 'todos'`,
      [actor.id, enviado_por_otro]
    );

    res.json({ no_leidos: total });

  } catch (error) {
    console.error('[GET /chat/no-leidos]', error);
    res.status(500).json({ message: 'Error al contar no leídos.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/chat/suscriptores-disponibles  (solo personal)
// ════════════════════════════════════════════════════════════════════════════
export async function listarSuscriptoresDisponibles(req, res) {
  try {
    if (req.usuario.rol !== 'personal') {
      return res.status(403).json({ message: 'Solo disponible para personal.' });
    }

    const { q = '' } = req.query;
    const busqueda = `%${q.trim()}%`;

    const [[emp]] = await db.query(
      `SELECT id_sucursal FROM personal WHERE id_personal = ? AND activo = 1`,
      [req.usuario.id]
    );
    if (!emp) return res.status(404).json({ message: 'Personal no encontrado.' });

    const [suscriptores] = await db.query(
      `SELECT
         s.id_suscriptor,
         CONCAT(s.nombres, ' ', s.apellido_paterno) AS nombre,
         s.correo,
         s.telefono,
         EXISTS(
           SELECT 1 FROM chat_mensajes cm
           WHERE cm.id_personal = ? AND cm.id_suscriptor = s.id_suscriptor
         ) AS tiene_chat
       FROM suscriptores s
       WHERE s.id_sucursal_registro = ? AND s.activo = 1
         AND (s.nombres LIKE ? OR s.apellido_paterno LIKE ? OR s.correo LIKE ?)
       ORDER BY tiene_chat DESC, s.nombres ASC
       LIMIT 100`,
      [req.usuario.id, emp.id_sucursal, busqueda, busqueda, busqueda]
    );

    res.json(suscriptores);

  } catch (error) {
    console.error('[GET /chat/suscriptores-disponibles]', error);
    res.status(500).json({ message: 'Error al obtener suscriptores.' });
  }
}
// ════════════════════════════════════════════════════════════════════════════
// POST /api/chat/leer/personal/:id_personal  (usado por la app móvil)
// ════════════════════════════════════════════════════════════════════════════
export async function marcarLeidos(req, res) {
  try {
    const actor = getActorId(req.usuario);
    if (!actor) return res.status(403).json({ message: 'Rol no autorizado.' });

    const id_personal   = parseInt(req.params.id_personal);
    const id_suscriptor = actor.id; // quien llama es el suscriptor

    await db.query(
      `UPDATE chat_mensajes
         SET leido = 1, entregado = 1
       WHERE id_personal = ? AND id_suscriptor = ?
         AND enviado_por = 'personal' AND leido = 0`,
      [id_personal, id_suscriptor]
    );

    // Notificar al personal por Socket si está online
    try {
      const { getIO } = await import('../config/socket.js');
      const io = getIO();
      io.to(`personal:${id_personal}`).emit('chat:mensajes_leidos', {
        id_personal,
        id_suscriptor,
      });
    } catch { /* sin socket */ }

    res.json({ ok: true });
  } catch (error) {
    console.error('[POST /chat/leer/personal/:id]', error);
    res.status(500).json({ message: 'Error al marcar como leídos.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/chat/fcm-token
// Body: { fcm_token: string }
// ════════════════════════════════════════════════════════════════════════════
export async function registrarFcmToken(req, res) {
  try {
    const actor = getActorId(req.usuario);
    if (!actor) return res.status(403).json({ message: 'Rol no autorizado.' });

    const { fcm_token } = req.body;
    if (!fcm_token?.trim()) {
      return res.status(400).json({ message: 'fcm_token requerido.' });
    }

    const tabla = actor.tipo === 'personal' ? 'personal' : 'suscriptores';
    const campo = actor.tipo === 'personal' ? 'id_personal' : 'id_suscriptor';

    await db.query(
      `UPDATE ${tabla} SET fcm_token = ? WHERE ${campo} = ?`,
      [fcm_token.trim(), actor.id]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('[POST /chat/fcm-token]', error);
    res.status(500).json({ message: 'Error al guardar el token.' });
  }
}