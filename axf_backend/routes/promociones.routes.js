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
// GET /api/promociones
// Lista las promociones activas de la sucursal logueada
// ────────────────────────────────────────────────────────────────────────────
router.get('/', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const id_sucursal = req.usuario.id;
    const [promociones] = await db.query(
      `SELECT id_promocion, nombre, descripcion, duracion_dias, precio,
              sesiones_nutriologo, sesiones_entrenador
       FROM promociones
       WHERE id_sucursal = ? AND activo = 1
       ORDER BY nombre ASC`,
      [id_sucursal]
    );
    res.json(promociones);
  } catch (error) {
    console.error('[GET /promociones]', error);
    res.status(500).json({ message: 'Error al obtener promociones' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/promociones
// Crea una nueva promoción
// ────────────────────────────────────────────────────────────────────────────
router.post('/', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const { nombre, descripcion, duracion_dias, precio, sesiones_nutriologo, sesiones_entrenador } = req.body;
    const id_sucursal = req.usuario.id;

    if (!nombre || precio === undefined || precio === '') {
      return res.status(400).json({ message: 'Nombre y precio son requeridos' });
    }

    // Verificar nombre único en la misma sucursal
    const [existe] = await db.query(
      'SELECT id_promocion FROM promociones WHERE nombre = ? AND id_sucursal = ? AND activo = 1',
      [nombre, id_sucursal]
    );
    if (existe.length > 0) {
      return res.status(409).json({ message: 'Ya existe una promoción con ese nombre' });
    }

    const [result] = await db.query(
      `INSERT INTO promociones
        (id_sucursal, nombre, descripcion, duracion_dias, precio, sesiones_nutriologo, sesiones_entrenador)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id_sucursal,
        nombre,
        descripcion || null,
        duracion_dias || 0,
        precio,
        sesiones_nutriologo || 0,
        sesiones_entrenador || 0,
      ]
    );

    res.status(201).json({ message: 'Promoción creada correctamente', id_promocion: result.insertId });
  } catch (error) {
    console.error('[POST /promociones]', error);
    res.status(500).json({ message: 'Error al crear promoción' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/promociones/:id
// Modifica una promoción existente
// ────────────────────────────────────────────────────────────────────────────
router.put('/:id', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, duracion_dias, precio, sesiones_nutriologo, sesiones_entrenador } = req.body;
    const id_sucursal = req.usuario.id;

    if (!nombre || precio === undefined || precio === '') {
      return res.status(400).json({ message: 'Nombre y precio son requeridos' });
    }

    // Verificar nombre único en otra promoción de la misma sucursal
    const [existe] = await db.query(
      'SELECT id_promocion FROM promociones WHERE nombre = ? AND id_sucursal = ? AND id_promocion != ? AND activo = 1',
      [nombre, id_sucursal, id]
    );
    if (existe.length > 0) {
      return res.status(409).json({ message: 'Ya existe otra promoción con ese nombre' });
    }

    const [result] = await db.query(
      `UPDATE promociones
       SET nombre=?, descripcion=?, duracion_dias=?, precio=?, sesiones_nutriologo=?, sesiones_entrenador=?
       WHERE id_promocion=? AND id_sucursal=?`,
      [
        nombre,
        descripcion || null,
        duracion_dias || 0,
        precio,
        sesiones_nutriologo || 0,
        sesiones_entrenador || 0,
        id,
        id_sucursal,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }

    res.json({ message: 'Promoción actualizada correctamente' });
  } catch (error) {
    console.error('[PUT /promociones/:id]', error);
    res.status(500).json({ message: 'Error al actualizar promoción' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/promociones/:id
// Elimina una promoción (hard delete)
// ────────────────────────────────────────────────────────────────────────────
router.delete('/:id', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const { id } = req.params;
    const id_sucursal = req.usuario.id;

    const [result] = await db.query(
      'DELETE FROM promociones WHERE id_promocion = ? AND id_sucursal = ?',
      [id, id_sucursal]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }

    res.json({ message: 'Promoción eliminada correctamente' });
  } catch (error) {
    console.error('[DELETE /promociones/:id]', error);
    res.status(500).json({ message: 'Error al eliminar promoción' });
  }
});

export default router;