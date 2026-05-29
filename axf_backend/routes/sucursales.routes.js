import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { encryptPassword, decryptPassword } from '../utils/passwordVault.js';

const REVEAL_SECONDS = 8;

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
      `SELECT id_sucursal, nombre, direccion, codigo_postal, usuario, activa, creado_en,
              (password_enc IS NOT NULL AND password_enc != '') AS password_recuperable
       FROM sucursales WHERE activa = 1 ORDER BY id_sucursal ASC`
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
      const password_enc = encryptPassword(password);
      await db.query(
        'UPDATE sucursales SET nombre = ?, direccion = ?, codigo_postal = ?, password_hash = ?, password_enc = ?, activa = 1 WHERE id_sucursal = ?',
        [nombre, direccion, codigo_postal, password_hash, password_enc, sucursalExistente.id_sucursal]
      );

      return res.status(200).json({
        message: 'Sucursal reactivada y actualizada correctamente',
        id_sucursal: sucursalExistente.id_sucursal,
      });
    }

    // Hashear la contraseña y crear la sucursal nueva
    const password_hash = await bcrypt.hash(password, 10);
    const password_enc = encryptPassword(password);

    const [result] = await db.query(
      'INSERT INTO sucursales (nombre, direccion, codigo_postal, usuario, password_hash, password_enc, activa) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [nombre, direccion, codigo_postal, usuario, password_hash, password_enc]
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
      const password_hash = await bcrypt.hash(password, 10);
      const password_enc = encryptPassword(password);
      await db.query(
        'UPDATE sucursales SET nombre = ?, direccion = ?, codigo_postal = ?, usuario = ?, password_hash = ?, password_enc = ? WHERE id_sucursal = ?',
        [nombre, direccion, codigo_postal, usuario, password_hash, password_enc, id]
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

// GET /api/sucursales/:id/revelar-password
// Solo maestro: devuelve la contraseña descifrada (la UI la oculta tras unos segundos)
router.get('/:id/revelar-password', verificarToken, soloMaestro, async (req, res) => {
  try {
    const { id } = req.params;
    const [[sucursal]] = await db.query(
      'SELECT id_sucursal, nombre, password_enc FROM sucursales WHERE id_sucursal = ? AND activa = 1',
      [id]
    );

    if (!sucursal) {
      return res.status(404).json({ message: 'Sucursal no encontrada.' });
    }

    if (!sucursal.password_enc) {
      return res.status(404).json({
        message: 'No hay contraseña recuperable. Asigne una nueva en Modificar para habilitar esta función.',
      });
    }

    let password;
    try {
      password = decryptPassword(sucursal.password_enc);
    } catch {
      console.error('[GET /sucursales/:id/revelar-password] Error al descifrar');
      return res.status(500).json({ message: 'No se pudo descifrar la contraseña. Verifique PASSWORD_VAULT_SECRET.' });
    }

    res.json({
      password,
      segundos: REVEAL_SECONDS,
      sucursal: sucursal.nombre,
    });
  } catch (error) {
    console.error('[GET /sucursales/:id/revelar-password]', error);
    res.status(500).json({ message: 'Error al revelar la contraseña.' });
  }
});

// ── ELIMINADO: DELETE /:id (causaba errores FK Constraint) ───────────────────
// El borrado lógico transaccional se encuentra en:
//   DELETE /api/maestro/sucursales/:id_sucursal
// Ver: controllers/maestro.controller.js → desactivarSucursal()

export default router;