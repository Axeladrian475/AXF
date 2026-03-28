import express from 'express';
import jwt     from 'jsonwebtoken';
import db      from '../config/database.js';
import { getSucursalId } from '../middlewares/auth.js';

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

// ─── Middleware: personal, sucursal o maestro ────────────────────────────────
function personalOSucursalOMaestro(req, res, next) {
  if (!['personal', 'sucursal', 'maestro'].includes(req.usuario.rol)) {
    return res.status(403).json({ message: 'Acceso no autorizado' });
  }
  next();
}

// ─── Middleware: solo sucursal o maestro (admin) ─────────────────────────────
function soloSucursalOMaestro(req, res, next) {
  if (req.usuario.rol !== 'sucursal' && req.usuario.rol !== 'maestro') {
    return res.status(403).json({ message: 'Acceso no autorizado' });
  }
  next();
}

// ════════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE RECOMPENSAS  (tabla: recompensas)
// ════════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────────
// GET /api/recompensas
// Lista todas las recompensas activas de la sucursal
// ────────────────────────────────────────────────────────────────────────────
router.get('/', verificarToken, personalOSucursalOMaestro, async (req, res) => {
  try {
    // Resolución de id_sucursal según el rol del token
    const id_sucursal = getSucursalId(req.usuario);
    if (!id_sucursal) {
      return res.status(400).json({ message: 'No se pudo determinar la sucursal.' });
    }

    const [recompensas] = await db.query(
      `SELECT id_recompensa, nombre, costo_puntos, activa
       FROM recompensas
       WHERE id_sucursal = ? AND activa = 1
       ORDER BY costo_puntos ASC`,
      [id_sucursal]
    );

    res.json(recompensas);
  } catch (error) {
    console.error('[GET /recompensas]', error);
    res.status(500).json({ message: 'Error al obtener recompensas.' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/recompensas
// Crea una nueva recompensa en el catálogo
// Body: { nombre: string, costo_puntos: number }
// ────────────────────────────────────────────────────────────────────────────
router.post('/', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const id_sucursal = req.usuario.id;
    const { nombre, costo_puntos } = req.body;

    // ── Validaciones ─────────────────────────────────────────────────────────
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ message: 'El nombre de la recompensa es requerido.' });
    }
    const puntos = parseInt(costo_puntos, 10);
    if (!puntos || puntos <= 0) {
      return res.status(400).json({ message: 'El costo en puntos debe ser un número mayor a 0.' });
    }

    // Verificar nombre único dentro de la sucursal
    const [existe] = await db.query(
      `SELECT id_recompensa FROM recompensas
       WHERE id_sucursal = ? AND nombre = ? AND activa = 1`,
      [id_sucursal, nombre.trim()]
    );
    if (existe.length > 0) {
      return res.status(409).json({ message: 'Ya existe una recompensa con ese nombre.' });
    }

    const [result] = await db.query(
      `INSERT INTO recompensas (id_sucursal, nombre, costo_puntos) VALUES (?, ?, ?)`,
      [id_sucursal, nombre.trim(), puntos]
    );

    res.status(201).json({
      message: `Recompensa "${nombre.trim()}" guardada correctamente.`,
      id_recompensa: result.insertId,
    });
  } catch (error) {
    console.error('[POST /recompensas]', error);
    res.status(500).json({ message: 'Error al guardar la recompensa.' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/recompensas/:id
// Modifica nombre y/o costo_puntos de una recompensa
// Body: { nombre: string, costo_puntos: number }
// ────────────────────────────────────────────────────────────────────────────
router.put('/:id', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const id_sucursal    = req.usuario.id;
    const { id }         = req.params;
    const { nombre, costo_puntos } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ message: 'El nombre de la recompensa es requerido.' });
    }
    const puntos = parseInt(costo_puntos, 10);
    if (!puntos || puntos <= 0) {
      return res.status(400).json({ message: 'El costo en puntos debe ser un número mayor a 0.' });
    }

    // Verificar que no haya otra recompensa con el mismo nombre en la sucursal
    const [existe] = await db.query(
      `SELECT id_recompensa FROM recompensas
       WHERE id_sucursal = ? AND nombre = ? AND id_recompensa != ? AND activa = 1`,
      [id_sucursal, nombre.trim(), id]
    );
    if (existe.length > 0) {
      return res.status(409).json({ message: 'Ya existe otra recompensa con ese nombre.' });
    }

    const [result] = await db.query(
      `UPDATE recompensas
       SET nombre = ?, costo_puntos = ?
       WHERE id_recompensa = ? AND id_sucursal = ?`,
      [nombre.trim(), puntos, id, id_sucursal]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Recompensa no encontrada.' });
    }

    res.json({ message: `Recompensa actualizada correctamente.` });
  } catch (error) {
    console.error('[PUT /recompensas/:id]', error);
    res.status(500).json({ message: 'Error al modificar la recompensa.' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/recompensas/:id
// Soft delete: desactiva la recompensa (activa = 0)
// No se borra físicamente para preservar el historial de canjes
// ────────────────────────────────────────────────────────────────────────────
router.delete('/:id', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const id_sucursal = req.usuario.id;
    const { id }      = req.params;

    const [result] = await db.query(
      `UPDATE recompensas SET activa = 0
       WHERE id_recompensa = ? AND id_sucursal = ?`,
      [id, id_sucursal]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Recompensa no encontrada.' });
    }

    res.json({ message: 'Recompensa eliminada correctamente.' });
  } catch (error) {
    console.error('[DELETE /recompensas/:id]', error);
    res.status(500).json({ message: 'Error al eliminar la recompensa.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// REGISTRO DE CANJES  (tabla: canjes)
// Se usa cuando el personal canjea una recompensa para un suscriptor
// ════════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────────
// POST /api/recompensas/canjear
// Registra un canje en `canjes` y descuenta los puntos al suscriptor
//
// Body: { id_recompensa: number, id_suscriptor: number }
// El id_personal se toma del token JWT (quien está logueado haciendo el canje)
// ────────────────────────────────────────────────────────────────────────────
router.post('/canjear', verificarToken, personalOSucursalOMaestro, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id: id_personal, rol } = req.usuario;

    // Solo personal o sucursal pueden registrar canjes (maestro no opera en sucursal)
    if (!['personal', 'sucursal'].includes(rol)) {
      return res.status(403).json({ message: 'No tienes permiso para realizar canjes.' });
    }

    const { id_recompensa, id_suscriptor } = req.body;

    if (!id_recompensa || !id_suscriptor) {
      return res.status(400).json({ message: 'id_recompensa e id_suscriptor son requeridos.' });
    }

    // ── Obtener la recompensa y verificar que esté activa ─────────────────────
    const [[recompensa]] = await db.query(
      `SELECT id_recompensa, nombre, costo_puntos, id_sucursal
       FROM recompensas
       WHERE id_recompensa = ? AND activa = 1`,
      [id_recompensa]
    );
    if (!recompensa) {
      return res.status(404).json({ message: 'La recompensa no existe o está desactivada.' });
    }

    // ── Obtener el suscriptor y verificar que tenga suficientes puntos ─────────
    const [[suscriptor]] = await db.query(
      `SELECT id_suscriptor, nombres, puntos FROM suscriptores
       WHERE id_suscriptor = ? AND activo = 1`,
      [id_suscriptor]
    );
    if (!suscriptor) {
      return res.status(404).json({ message: 'Suscriptor no encontrado o inactivo.' });
    }
    if (suscriptor.puntos < recompensa.costo_puntos) {
      return res.status(400).json({
        message: `Puntos insuficientes. El suscriptor tiene ${suscriptor.puntos} pts y la recompensa cuesta ${recompensa.costo_puntos} pts.`,
      });
    }

    // ── Transacción: registrar canje + descontar puntos ───────────────────────
    await conn.beginTransaction();

    // 1. Insertar en `canjes`
    const [canjeResult] = await conn.query(
      `INSERT INTO canjes (id_suscriptor, id_recompensa, id_personal, puntos_gastados)
       VALUES (?, ?, ?, ?)`,
      [id_suscriptor, id_recompensa, id_personal, recompensa.costo_puntos]
    );

    // 2. Descontar puntos al suscriptor
    await conn.query(
      `UPDATE suscriptores SET puntos = puntos - ? WHERE id_suscriptor = ?`,
      [recompensa.costo_puntos, id_suscriptor]
    );

    await conn.commit();

    res.status(201).json({
      message: `Canje exitoso. Se descontaron ${recompensa.costo_puntos} puntos a ${suscriptor.nombres}.`,
      id_canje:         canjeResult.insertId,
      puntos_gastados:  recompensa.costo_puntos,
      puntos_restantes: suscriptor.puntos - recompensa.costo_puntos,
    });

  } catch (error) {
    await conn.rollback();
    console.error('[POST /recompensas/canjear]', error);
    res.status(500).json({ message: 'Error al registrar el canje.' });
  } finally {
    conn.release();
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/recompensas/canjes
// Historial de canjes de la sucursal (últimos 50)
// ────────────────────────────────────────────────────────────────────────────
router.get('/canjes', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const id_sucursal = req.usuario.id;

    const [canjes] = await db.query(
      `SELECT
         c.id_canje,
         c.canjeado_en,
         c.puntos_gastados,
         r.nombre                                          AS recompensa,
         CONCAT(s.nombres, ' ', s.apellido_paterno)        AS suscriptor,
         CONCAT(p.nombres, ' ', p.apellido_paterno)        AS atendido_por
       FROM canjes c
       INNER JOIN recompensas  r ON r.id_recompensa = c.id_recompensa
       INNER JOIN suscriptores s ON s.id_suscriptor  = c.id_suscriptor
       INNER JOIN personal     p ON p.id_personal    = c.id_personal
       WHERE r.id_sucursal = ?
       ORDER BY c.canjeado_en DESC
       LIMIT 50`,
      [id_sucursal]
    );

    res.json(canjes);
  } catch (error) {
    console.error('[GET /recompensas/canjes]', error);
    res.status(500).json({ message: 'Error al obtener el historial de canjes.' });
  }
});

export default router;