import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const router = express.Router();

// ─── Middleware: verificar token JWT ────────────────────────────────────────
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }
}

// ─── Middleware: solo el maestro puede gestionar sucursales ─────────────────
function soloMaestro(req, res, next) {
  if (req.usuario.rol !== 'maestro') {
    return res.status(403).json({ message: 'Acceso restringido al administrador maestro' });
  }
  next();
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/sucursales
// Lista todas las sucursales (borrado físico: no hay registros inactivos)
// ────────────────────────────────────────────────────────────────────────────
router.get('/', verificarToken, soloMaestro, async (req, res) => {
  try {
    const [sucursales] = await db.query(
      'SELECT id_sucursal, nombre, direccion, codigo_postal, usuario, activa, creado_en FROM sucursales WHERE activa = 1 ORDER BY id_sucursal ASC'
    );
    res.json(sucursales);
  } catch (error) {
    console.error('[GET /sucursales]', error);
    res.status(500).json({ message: 'Error al obtener sucursales' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/sucursales
// Crea una nueva sucursal
// ────────────────────────────────────────────────────────────────────────────
router.post('/', verificarToken, soloMaestro, async (req, res) => {
  try {
    const { nombre, direccion, codigo_postal, usuario, password } = req.body;

    // Validar campos requeridos
    if (!nombre || !direccion || !codigo_postal || !usuario || !password) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Verificar si el usuario ya existe en la base de datos
    const [existe] = await db.query(
      'SELECT id_sucursal, activa FROM sucursales WHERE usuario = ?',
      [usuario]
    );

    if (existe.length > 0) {
      const sucursalExistente = existe[0];
      if (sucursalExistente.activa === 1) {
        return res.status(409).json({ message: 'El nombre de usuario ya está en uso' });
      }

      // Si el usuario existe pero la sucursal está inactiva, reactivar esa fila.
      const password_hash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE sucursales SET nombre = ?, direccion = ?, codigo_postal = ?, password_hash = ?, activa = 1 WHERE id_sucursal = ?',
        [nombre, direccion, codigo_postal, password_hash, sucursalExistente.id_sucursal]
      );

      return res.status(200).json({
        message: 'Sucursal reactivada y actualizada correctamente',
        id_sucursal: sucursalExistente.id_sucursal,
      });
    }

    // Hashear la contraseña y crear la sucursal nueva
    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO sucursales (nombre, direccion, codigo_postal, usuario, password_hash, activa) VALUES (?, ?, ?, ?, ?, 1)',
      [nombre, direccion, codigo_postal, usuario, password_hash]
    );

    res.status(201).json({
      message: 'Sucursal creada correctamente',
      id_sucursal: result.insertId,
    });
  } catch (error) {
    console.error('[POST /sucursales]', error);
    res.status(500).json({ message: 'Error al crear la sucursal' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/sucursales/:id
// Modifica datos de una sucursal (la contraseña es opcional)
// ────────────────────────────────────────────────────────────────────────────
router.put('/:id', verificarToken, soloMaestro, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, codigo_postal, usuario, password } = req.body;

    if (!nombre || !direccion || !codigo_postal || !usuario) {
      return res.status(400).json({ message: 'Nombre, dirección, código postal y usuario son requeridos' });
    }

    // Verificar que el usuario no esté en uso por OTRA sucursal activa
    const [existe] = await db.query(
      'SELECT id_sucursal FROM sucursales WHERE usuario = ? AND id_sucursal != ? AND activa = 1',
      [usuario, id]
    );
    if (existe.length > 0) {
      return res.status(409).json({ message: 'El nombre de usuario ya está en uso por otra sucursal' });
    }

    if (password && password.trim() !== '') {
      // Si se proporcionó nueva contraseña, actualizar todo
      const password_hash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE sucursales SET nombre = ?, direccion = ?, codigo_postal = ?, usuario = ?, password_hash = ? WHERE id_sucursal = ?',
        [nombre, direccion, codigo_postal, usuario, password_hash, id]
      );
    } else {
      // Sin nueva contraseña
      await db.query(
        'UPDATE sucursales SET nombre = ?, direccion = ?, codigo_postal = ?, usuario = ? WHERE id_sucursal = ?',
        [nombre, direccion, codigo_postal, usuario, id]
      );
    }

    res.json({ message: 'Sucursal actualizada correctamente' });
  } catch (error) {
    console.error('[PUT /sucursales/:id]', error);
    res.status(500).json({ message: 'Error al actualizar la sucursal' });
  }
});

// ── ELIMINADO: DELETE /:id (causaba errores FK Constraint) ───────────────────
// El borrado lógico transaccional se encuentra en:
//   DELETE /api/maestro/sucursales/:id_sucursal
// Ver: controllers/maestro.controller.js → desactivarSucursal()

export default router;