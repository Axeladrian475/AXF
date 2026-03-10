import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

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

// ────────────────────────────────────────────────────────────────────────────
// GET /api/suscripciones
// Lista los tipos de suscripción activos de la sucursal logueada
// ────────────────────────────────────────────────────────────────────────────
router.get('/', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const id_sucursal = req.usuario.id;
    const [tipos] = await db.query(
      `SELECT id_tipo, nombre, duracion_dias, precio,
              limite_sesiones_nutriologo, limite_sesiones_entrenador
       FROM tipos_suscripcion
       WHERE id_sucursal = ? AND activo = 1
       ORDER BY precio ASC`,
      [id_sucursal]
    );
    res.json(tipos);
  } catch (error) {
    console.error('[GET /suscripciones]', error);
    res.status(500).json({ message: 'Error al obtener tipos de suscripción' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/suscripciones
// Crea un nuevo tipo de suscripción
// ────────────────────────────────────────────────────────────────────────────
router.post('/', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const { nombre, duracion_dias, precio, limite_sesiones_nutriologo, limite_sesiones_entrenador } = req.body;
    const id_sucursal = req.usuario.id;

    if (!nombre || !duracion_dias || !precio) {
      return res.status(400).json({ message: 'Nombre, duración y precio son requeridos' });
    }

    // Verificar que no exista ya ese nombre en la misma sucursal
    const [existe] = await db.query(
      'SELECT id_tipo FROM tipos_suscripcion WHERE nombre = ? AND id_sucursal = ? AND activo = 1',
      [nombre, id_sucursal]
    );
    if (existe.length > 0) {
      return res.status(409).json({ message: 'Ya existe un tipo de suscripción con ese nombre' });
    }

    const [result] = await db.query(
      `INSERT INTO tipos_suscripcion
        (id_sucursal, nombre, duracion_dias, precio, limite_sesiones_nutriologo, limite_sesiones_entrenador)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id_sucursal,
        nombre,
        duracion_dias,
        precio,
        limite_sesiones_nutriologo || 0,
        limite_sesiones_entrenador || 0,
      ]
    );

    res.status(201).json({ message: 'Tipo de suscripción creado correctamente', id_tipo: result.insertId });
  } catch (error) {
    console.error('[POST /suscripciones]', error);
    res.status(500).json({ message: 'Error al crear tipo de suscripción' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/suscripciones/:id
// Modifica un tipo de suscripción
// ────────────────────────────────────────────────────────────────────────────
router.put('/:id', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, duracion_dias, precio, limite_sesiones_nutriologo, limite_sesiones_entrenador } = req.body;
    const id_sucursal = req.usuario.id;

    if (!nombre || !duracion_dias || !precio) {
      return res.status(400).json({ message: 'Nombre, duración y precio son requeridos' });
    }

    // Verificar nombre único en otra suscripción de la misma sucursal
    const [existe] = await db.query(
      'SELECT id_tipo FROM tipos_suscripcion WHERE nombre = ? AND id_sucursal = ? AND id_tipo != ? AND activo = 1',
      [nombre, id_sucursal, id]
    );
    if (existe.length > 0) {
      return res.status(409).json({ message: 'Ya existe otro tipo de suscripción con ese nombre' });
    }

    const [result] = await db.query(
      `UPDATE tipos_suscripcion
       SET nombre=?, duracion_dias=?, precio=?, limite_sesiones_nutriologo=?, limite_sesiones_entrenador=?
       WHERE id_tipo=? AND id_sucursal=?`,
      [
        nombre,
        duracion_dias,
        precio,
        limite_sesiones_nutriologo || 0,
        limite_sesiones_entrenador || 0,
        id,
        id_sucursal,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Tipo de suscripción no encontrado' });
    }

    res.json({ message: 'Tipo de suscripción actualizado correctamente' });
  } catch (error) {
    console.error('[PUT /suscripciones/:id]', error);
    res.status(500).json({ message: 'Error al actualizar tipo de suscripción' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/suscripciones/:id
// Elimina un tipo de suscripción (hard delete)
// ────────────────────────────────────────────────────────────────────────────
router.delete('/:id', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const { id } = req.params;
    const id_sucursal = req.usuario.id;

    const [result] = await db.query(
      'DELETE FROM tipos_suscripcion WHERE id_tipo = ? AND id_sucursal = ?',
      [id, id_sucursal]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Tipo de suscripción no encontrado' });
    }

    res.json({ message: 'Tipo de suscripción eliminado correctamente' });
  } catch (error) {
    console.error('[DELETE /suscripciones/:id]', error);
    res.status(500).json({ message: 'Error al eliminar tipo de suscripción' });
  }
});

export default router;