// ============================================================================
//  routes/avisos.routes.js
//
//  NUEVO endpoint añadido:
//    GET /api/avisos/:id/destinatarios → lista quién leyó y quién no un aviso
// ============================================================================

import express from 'express';
import jwt     from 'jsonwebtoken';
import db      from '../config/database.js';

const router = express.Router();


// ─── Middleware: verificar token JWT ─────────────────────────────────────────
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }
}

// ─── Middleware: solo sucursal o maestro ─────────────────────────────────────
function soloSucursalOMaestro(req, res, next) {
  if (req.usuario.rol !== 'sucursal' && req.usuario.rol !== 'maestro') {
    return res.status(403).json({ message: 'Acceso no autorizado' });
  }
  next();
}

// ─── Helper: construir condición WHERE según destinatarios ───────────────────
function construirFiltroDestinatarios(destinatarios) {
  if (destinatarios.includes('todos')) return null;

  const condiciones = [];

  if (destinatarios.includes('staff')) {
    condiciones.push(`puesto = 'staff'`);
  }
  if (destinatarios.includes('entrenadores')) {
    condiciones.push(`puesto = 'entrenador'`);
    condiciones.push(`puesto = 'entrenador_nutriologo'`);
  }
  if (destinatarios.includes('nutriologos')) {
    condiciones.push(`puesto = 'nutriologo'`);
    if (!destinatarios.includes('entrenadores')) {
      condiciones.push(`puesto = 'entrenador_nutriologo'`);
    }
  }

  if (condiciones.length === 0) return null;
  return [...new Set(condiciones)].join(' OR ');
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/avisos
// ────────────────────────────────────────────────────────────────────────────
router.post('/', verificarToken, soloSucursalOMaestro, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const id_sucursal = req.usuario.id;
    const { mensaje, destinatarios } = req.body;

    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ message: 'El mensaje no puede estar vacío.' });
    }
    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      return res.status(400).json({ message: 'Selecciona al menos un grupo de destinatarios.' });
    }
    const opcionesValidas = ['todos', 'staff', 'entrenadores', 'nutriologos'];
    const invalidas = destinatarios.filter(d => !opcionesValidas.includes(d));
    if (invalidas.length > 0) {
      return res.status(400).json({ message: `Destinatarios inválidos: ${invalidas.join(', ')}` });
    }

    const filtroPuesto = construirFiltroDestinatarios(destinatarios);
    let personal;

    if (!filtroPuesto) {
      [personal] = await db.query(
        `SELECT id_personal, nombres, puesto FROM personal WHERE id_sucursal = ? AND activo = 1`,
        [id_sucursal]
      );
    } else {
      [personal] = await db.query(
        `SELECT id_personal, nombres, puesto FROM personal WHERE id_sucursal = ? AND activo = 1 AND (${filtroPuesto})`,
        [id_sucursal]
      );
    }

    if (personal.length === 0) {
      return res.status(404).json({
        message: 'No hay personal activo registrado para los destinatarios seleccionados.',
      });
    }

    await conn.beginTransaction();

    const [avisoResult] = await conn.query(
      `INSERT INTO avisos (id_sucursal, mensaje) VALUES (?, ?)`,
      [id_sucursal, mensaje.trim()]
    );
    const id_aviso = avisoResult.insertId;

    const placeholders = personal.map(() => '(?, ?)').join(', ');
    const valores      = personal.flatMap(p => [id_aviso, p.id_personal]);
    await conn.query(
      `INSERT INTO aviso_destinatarios (id_aviso, id_personal) VALUES ${placeholders}`,
      valores
    );

    await conn.commit();

    res.status(201).json({
      message: `Aviso enviado correctamente a ${personal.length} miembro(s) del personal.`,
      id_aviso,
      total_destinatarios: personal.length,
    });

  } catch (error) {
    await conn.rollback();
    console.error('[POST /avisos]', error);
    res.status(500).json({ message: 'Error al enviar el aviso.' });
  } finally {
    conn.release();
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/avisos
// Últimos 20 avisos de la sucursal con conteo de lecturas.
// ────────────────────────────────────────────────────────────────────────────
router.get('/', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const id_sucursal = req.usuario.id;

    const [avisos] = await db.query(
      `SELECT
         a.id_aviso,
         a.mensaje,
         DATE_FORMAT(CONVERT_TZ(a.creado_en, @@session.time_zone, '+00:00'),
                     '%Y-%m-%dT%H:%i:%sZ')   AS creado_en,
         COUNT(ad.id)                     AS total_destinatarios,
         SUM(ad.leido)                    AS total_leidos,
         COUNT(ad.id) - SUM(ad.leido)     AS total_pendientes
       FROM avisos a
       LEFT JOIN aviso_destinatarios ad ON ad.id_aviso = a.id_aviso
       WHERE a.id_sucursal = ?
       GROUP BY a.id_aviso
       ORDER BY a.creado_en DESC
       LIMIT 20`,
      [id_sucursal]
    );

    res.json(avisos);
  } catch (error) {
    console.error('[GET /avisos]', error);
    res.status(500).json({ message: 'Error al obtener los avisos.' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/avisos/:id/destinatarios   ← NUEVO
// Detalle de quién leyó y quién NO leyó un aviso específico.
// Solo sucursal/maestro puede verlo.
//
// Response:
// {
//   leidos:    [{ id_personal, nombre, puesto }],
//   pendientes:[{ id_personal, nombre, puesto }]
// }
// ────────────────────────────────────────────────────────────────────────────
router.get('/:id/destinatarios', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const id_sucursal = req.usuario.id;
    const { id }      = req.params;

    // Verificar que el aviso pertenece a esta sucursal
    const [[aviso]] = await db.query(
      `SELECT id_aviso FROM avisos WHERE id_aviso = ? AND id_sucursal = ?`,
      [id, id_sucursal]
    );
    if (!aviso) {
      return res.status(404).json({ message: 'Aviso no encontrado.' });
    }

    // Obtener destinatarios con su estado de lectura y datos del personal
    const [destinatarios] = await db.query(
      `SELECT
         p.id_personal,
         CONCAT(p.nombres, ' ', p.apellido_paterno) AS nombre,
         p.puesto,
         ad.leido
       FROM aviso_destinatarios ad
       INNER JOIN personal p ON p.id_personal = ad.id_personal
       WHERE ad.id_aviso = ?
       ORDER BY ad.leido ASC, p.nombres ASC`,
      [id]
    );

    const leidos    = destinatarios.filter(d => d.leido);
    const pendientes = destinatarios.filter(d => !d.leido);

    res.json({ leidos, pendientes });
  } catch (error) {
    console.error('[GET /avisos/:id/destinatarios]', error);
    res.status(500).json({ message: 'Error al obtener los destinatarios.' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/avisos/mis-avisos
// El personal logueado obtiene sus avisos.
// ────────────────────────────────────────────────────────────────────────────
router.get('/mis-avisos', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'personal') {
      return res.status(403).json({ message: 'Solo el personal puede ver sus avisos.' });
    }
    const id_personal = req.usuario.id;

    const [avisos] = await db.query(
      `SELECT
         a.id_aviso,
         a.mensaje,
         DATE_FORMAT(CONVERT_TZ(a.creado_en, @@session.time_zone, '+00:00'),
                     '%Y-%m-%dT%H:%i:%sZ')   AS creado_en,
         ad.leido
       FROM aviso_destinatarios ad
       INNER JOIN avisos a ON a.id_aviso = ad.id_aviso
       WHERE ad.id_personal = ?
       ORDER BY a.creado_en DESC
       LIMIT 30`,
      [id_personal]
    );

    const no_leidos = avisos.filter(a => !a.leido).length;
    res.json({ avisos, no_leidos });
  } catch (error) {
    console.error('[GET /avisos/mis-avisos]', error);
    res.status(500).json({ message: 'Error al obtener los avisos.' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/avisos/:id/leer
// El personal marca un aviso como leído.
// ────────────────────────────────────────────────────────────────────────────
router.put('/:id/leer', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'personal') {
      return res.status(403).json({ message: 'Solo el personal puede marcar avisos como leídos.' });
    }
    const id_personal = req.usuario.id;
    const { id }      = req.params;

    await db.query(
      `UPDATE aviso_destinatarios SET leido = 1 WHERE id_aviso = ? AND id_personal = ?`,
      [id, id_personal]
    );

    res.json({ message: 'Aviso marcado como leído.' });
  } catch (error) {
    console.error('[PUT /avisos/:id/leer]', error);
    res.status(500).json({ message: 'Error al marcar el aviso.' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/avisos/leer-todos
// El personal marca TODOS sus avisos como leídos.
// ────────────────────────────────────────────────────────────────────────────
router.put('/leer-todos', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'personal') {
      return res.status(403).json({ message: 'Acceso no autorizado.' });
    }
    await db.query(
      `UPDATE aviso_destinatarios SET leido = 1 WHERE id_personal = ?`,
      [req.usuario.id]
    );
    res.json({ message: 'Todos los avisos marcados como leídos.' });
  } catch (error) {
    console.error('[PUT /avisos/leer-todos]', error);
    res.status(500).json({ message: 'Error al marcar los avisos.' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/avisos/:id
// Elimina un aviso y sus destinatarios SOLO si tiene más de 1 mes de antigüedad.
// Solo el usuario Sucursal puede hacerlo (no maestro, no personal).
// ────────────────────────────────────────────────────────────────────────────
router.delete('/:id', verificarToken, soloSucursalOMaestro, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const id_sucursal = req.usuario.id;
    const { id }      = req.params;

    // 1. Verificar que el aviso pertenece a esta sucursal
    const [[aviso]] = await conn.query(
      `SELECT id_aviso, creado_en FROM avisos WHERE id_aviso = ? AND id_sucursal = ?`,
      [id, id_sucursal]
    );
    if (!aviso) {
      return res.status(404).json({ message: 'Aviso no encontrado.' });
    }

    // 2. Verificar que tiene más de 1 mes de antigüedad
    const [[{ dias }]] = await conn.query(
      `SELECT DATEDIFF(NOW(), ?) AS dias`,
      [aviso.creado_en]
    );
    if (dias < 30) {
      return res.status(403).json({
        message: `Este aviso solo tiene ${dias} día(s) de antigüedad. Solo se pueden eliminar avisos con más de 30 días.`,
        dias_restantes: 30 - dias,
      });
    }

    // 3. Eliminar en transacción (primero destinatarios por FK, luego el aviso)
    await conn.beginTransaction();
    await conn.query(`DELETE FROM aviso_destinatarios WHERE id_aviso = ?`, [id]);
    await conn.query(`DELETE FROM avisos WHERE id_aviso = ?`, [id]);
    await conn.commit();

    res.json({ message: 'Aviso eliminado correctamente.' });
  } catch (error) {
    await conn.rollback();
    console.error('[DELETE /avisos/:id]', error);
    res.status(500).json({ message: 'Error al eliminar el aviso.' });
  } finally {
    conn.release();
  }
});

export default router;