// ============================================================================
//  controllers/chat.controller.js
//
//  Lógica de negocio para el módulo de Chat entre personal (entrenador/nutriólogo)
//  y suscriptores.
//
//  Tabla usada: chat_mensajes
//    id_mensaje   → PK autoincrement
//    id_personal  → FK a personal.id_personal
//    id_suscriptor→ FK a suscriptores.id_suscriptor
//    enviado_por  → enum('personal','suscriptor')
//    contenido    → text
//    leido        → tinyint (0/1)
//    enviado_en   → timestamp
// ============================================================================

import db from '../config/database.js';

// ─── Helper: obtener id_personal/id_suscriptor desde el JWT ──────────────────
// El JWT puede ser de rol 'personal' (entrenador/nutriólogo/staff) o de rol
// 'suscriptor' (login de app de suscriptor — aún no implementado, preparado).
function getActorId(usuario) {
  if (usuario.rol === 'personal') return { tipo: 'personal', id: usuario.id };
  if (usuario.rol === 'suscriptor') return { tipo: 'suscriptor', id: usuario.id };
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/chat/conversaciones
//
// Para personal: lista todos los suscriptores con quienes ha chateado,
//   con el último mensaje y cantidad de no leídos.
//
// Query params opcionales:
//   q → buscar suscriptor por nombre
// ════════════════════════════════════════════════════════════════════════════
export async function listarConversaciones(req, res) {
  try {
    const actor = getActorId(req.usuario);
    if (!actor) return res.status(403).json({ message: 'Rol no autorizado.' });

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
              AND cm5.leido = 0) AS no_leidos
         FROM suscriptores s
         INNER JOIN chat_mensajes cm ON cm.id_personal = ? AND cm.id_suscriptor = s.id_suscriptor
         WHERE s.activo = 1
           AND (s.nombres LIKE ? OR s.apellido_paterno LIKE ? OR s.correo LIKE ?)
         GROUP BY s.id_suscriptor
         ORDER BY ultimo_mensaje_en DESC`,
        [actor.id, actor.id, actor.id, actor.id, actor.id, busqueda, busqueda, busqueda]
      );

      return res.json(conversaciones);
    }

    // ── Para suscriptor ──────────────────────────────────────────────────────
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
              AND cm5.leido = 0) AS no_leidos
         FROM personal p
         INNER JOIN chat_mensajes cm
           ON cm.id_personal = p.id_personal AND cm.id_suscriptor = ?
         WHERE p.activo = 1
         GROUP BY p.id_personal
         ORDER BY ultimo_mensaje_en DESC`,
        [actor.id, actor.id, actor.id, actor.id]
      );

      // Si no hay conversaciones aún, devolver lista de personal disponible
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
// Obtiene el historial de mensajes entre personal ↔ suscriptor.
//
// Query params:
//   limite  → mensajes por página (default 50)
//   offset  → paginación (default 0)
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

    // Marcar como leídos los mensajes de la otra parte ANTES de devolverlos
    const enviado_por_otro = actor.tipo === 'personal' ? 'suscriptor' : 'personal';
    await db.query(
      `UPDATE chat_mensajes
         SET leido = 1
       WHERE id_personal = ? AND id_suscriptor = ?
         AND enviado_por = ? AND leido = 0`,
      [id_personal, id_suscriptor, enviado_por_otro]
    );

    const [mensajes] = await db.query(
      `SELECT
         id_mensaje,
         enviado_por,
         contenido,
         leido,
         enviado_en
       FROM chat_mensajes
       WHERE id_personal = ? AND id_suscriptor = ?
       ORDER BY enviado_en ASC
       LIMIT ? OFFSET ?`,
      [id_personal, id_suscriptor, lim, off]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM chat_mensajes
       WHERE id_personal = ? AND id_suscriptor = ?`,
      [id_personal, id_suscriptor]
    );

    res.json({
      mensajes,
      paginacion: {
        total,
        limite: lim,
        offset: off,
        hay_mas: off + mensajes.length < total,
      },
    });

  } catch (error) {
    console.error('[GET /chat/mensajes]', error);
    res.status(500).json({ message: 'Error al obtener mensajes.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/chat/mensajes
//
// Enviar un mensaje. Usado como fallback REST cuando WebSocket no está
// disponible, o para integrar con notificaciones push en el futuro.
//
// Body:
//   { id_suscriptor, contenido }  → si enviado por personal
//   { id_personal,   contenido }  → si enviado por suscriptor
// ════════════════════════════════════════════════════════════════════════════
export async function enviarMensaje(req, res) {
  try {
    const actor = getActorId(req.usuario);
    if (!actor) return res.status(403).json({ message: 'Rol no autorizado.' });

    const { contenido } = req.body;
    if (!contenido?.trim()) {
      return res.status(400).json({ message: 'El contenido del mensaje no puede estar vacío.' });
    }

    let id_personal, id_suscriptor;

    if (actor.tipo === 'personal') {
      id_personal   = actor.id;
      id_suscriptor = parseInt(req.body.id_suscriptor);
      if (!id_suscriptor) return res.status(400).json({ message: 'id_suscriptor requerido.' });

      // Verificar que el suscriptor existe y está activo
      const [[sus]] = await db.query(
        `SELECT id_suscriptor FROM suscriptores WHERE id_suscriptor = ? AND activo = 1`,
        [id_suscriptor]
      );
      if (!sus) return res.status(404).json({ message: 'Suscriptor no encontrado.' });

    } else {
      id_suscriptor = actor.id;
      id_personal   = parseInt(req.body.id_personal);
      if (!id_personal) return res.status(400).json({ message: 'id_personal requerido.' });

      // Verificar que el personal existe y está activo
      const [[per]] = await db.query(
        `SELECT id_personal FROM personal WHERE id_personal = ? AND activo = 1`,
        [id_personal]
      );
      if (!per) return res.status(404).json({ message: 'Personal no encontrado.' });
    }

    const [result] = await db.query(
      `INSERT INTO chat_mensajes (id_personal, id_suscriptor, enviado_por, contenido)
       VALUES (?, ?, ?, ?)`,
      [id_personal, id_suscriptor, actor.tipo, contenido.trim()]
    );

    const [[mensaje]] = await db.query(
      `SELECT id_mensaje, enviado_por, contenido, leido, enviado_en
       FROM chat_mensajes WHERE id_mensaje = ?`,
      [result.insertId]
    );

    // Emitir por WebSocket si está disponible
    const { getIO } = await import('../config/socket.js');
    try {
      const io = getIO();
      // Notificar al destinatario en su sala personal
      if (actor.tipo === 'personal') {
        io.to(`suscriptor:${id_suscriptor}`).emit('chat:mensaje_nuevo', {
          id_personal,
          mensaje,
        });
      } else {
        io.to(`personal:${id_personal}`).emit('chat:mensaje_nuevo', {
          id_suscriptor,
          mensaje,
        });
      }
    } catch {
      // Socket.io no inicializado — solo REST, continuar sin error
    }

    res.status(201).json({ ok: true, mensaje });

  } catch (error) {
    console.error('[POST /chat/mensajes]', error);
    res.status(500).json({ message: 'Error al enviar el mensaje.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/chat/no-leidos
//
// Total de mensajes no leídos para el usuario actual.
// Útil para mostrar el badge rojo en el ícono de chat.
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
       WHERE ${campo_id} = ? AND enviado_por = ? AND leido = 0`,
      [actor.id, enviado_por_otro]
    );

    res.json({ no_leidos: total });

  } catch (error) {
    console.error('[GET /chat/no-leidos]', error);
    res.status(500).json({ message: 'Error al contar mensajes no leídos.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/chat/suscriptores-disponibles
//
// Solo para personal: lista los suscriptores de su sucursal con quienes
// puede iniciar una conversación (incluyendo los que aún no tienen chat).
// ════════════════════════════════════════════════════════════════════════════
export async function listarSuscriptoresDisponibles(req, res) {
  try {
    if (req.usuario.rol !== 'personal') {
      return res.status(403).json({ message: 'Solo disponible para personal.' });
    }

    const { q = '' } = req.query;
    const busqueda = `%${q.trim()}%`;

    // Obtener sucursal del personal
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
         -- Si ya existe conversación con este entrenador
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
