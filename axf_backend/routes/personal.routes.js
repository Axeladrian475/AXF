import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const router = express.Router();

// ─── Ruta absoluta compatible con Windows ────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads', 'personal');

// Crear carpeta si no existe
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Multer: guardar en disco con nombre único ────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `personal_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB máx
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  },
});

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

// ─── Helper: borrar foto del disco si existe ─────────────────────────────────
function borrarFoto(foto_url) {
  if (!foto_url) return;
  // foto_url viene como "/uploads/personal/archivo.jpg"
  const filePath = path.resolve(__dirname, '..', foto_url.replace(/^\//, ''));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/personal
// Lista el personal activo de la sucursal logueada
// ────────────────────────────────────────────────────────────────────────────
router.get('/', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const id_sucursal = req.usuario.id;
    const [personal] = await db.query(
      `SELECT id_personal, nombres, apellido_paterno, apellido_materno,
              edad, sexo, puesto, usuario, foto_url, activo, creado_en
       FROM personal
       WHERE id_sucursal = ? AND activo = 1
       ORDER BY nombres ASC`,
      [id_sucursal]
    );
    res.json(personal);
  } catch (error) {
    console.error('[GET /personal]', error);
    res.status(500).json({ message: 'Error al obtener personal' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/personal
// Crea un nuevo empleado
// ────────────────────────────────────────────────────────────────────────────
router.post('/', verificarToken, soloSucursalOMaestro, upload.single('foto'), async (req, res) => {
  try {
    const { nombres, apellido_paterno, apellido_materno, edad, sexo, puesto, usuario, password } = req.body;
    const id_sucursal = req.usuario.id;

    // Validar campos requeridos
    if (!nombres || !apellido_paterno || !edad || !sexo || !puesto || !usuario || !password) {
      if (req.file) borrarFoto(`/uploads/personal/${req.file.filename}`);
      return res.status(400).json({ message: 'Todos los campos obligatorios son requeridos' });
    }

    // Verificar usuario único
    const [existe] = await db.query('SELECT id_personal FROM personal WHERE usuario = ?', [usuario]);
    if (existe.length > 0) {
      if (req.file) borrarFoto(`/uploads/personal/${req.file.filename}`);
      return res.status(409).json({ message: 'El nombre de usuario ya está en uso' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    // Guardar la URL relativa en BD: "/uploads/personal/personal_123.jpg"
    const foto_url = req.file ? `/uploads/personal/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO personal
        (id_sucursal, nombres, apellido_paterno, apellido_materno, edad, sexo, puesto, usuario, password_hash, foto_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_sucursal, nombres, apellido_paterno, apellido_materno || null, edad, sexo, puesto, usuario, password_hash, foto_url]
    );

    res.status(201).json({ message: 'Empleado agregado correctamente', id_personal: result.insertId });
  } catch (error) {
    if (req.file) borrarFoto(`/uploads/personal/${req.file.filename}`);
    console.error('[POST /personal]', error);
    res.status(500).json({ message: 'Error al agregar empleado' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/personal/:id
// Modifica datos de un empleado (contraseña y foto son opcionales)
// ────────────────────────────────────────────────────────────────────────────
router.put('/:id', verificarToken, soloSucursalOMaestro, upload.single('foto'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, apellido_paterno, apellido_materno, edad, sexo, puesto, usuario, password } = req.body;
    const id_sucursal = req.usuario.id;

    if (!nombres || !apellido_paterno || !edad || !sexo || !puesto || !usuario) {
      if (req.file) borrarFoto(`/uploads/personal/${req.file.filename}`);
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    // Verificar usuario único en otro empleado
    const [existe] = await db.query(
      'SELECT id_personal FROM personal WHERE usuario = ? AND id_personal != ?',
      [usuario, id]
    );
    if (existe.length > 0) {
      if (req.file) borrarFoto(`/uploads/personal/${req.file.filename}`);
      return res.status(409).json({ message: 'El nombre de usuario ya está en uso' });
    }

    // Obtener datos actuales del empleado
    const [[empleadoActual]] = await db.query(
      'SELECT foto_url FROM personal WHERE id_personal = ? AND id_sucursal = ?',
      [id, id_sucursal]
    );
    if (!empleadoActual) {
      if (req.file) borrarFoto(`/uploads/personal/${req.file.filename}`);
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    // Si se subió nueva foto, borrar la anterior y usar la nueva
    let foto_url = empleadoActual.foto_url;
    if (req.file) {
      borrarFoto(empleadoActual.foto_url);
      foto_url = `/uploads/personal/${req.file.filename}`;
    }

    if (password && password.trim() !== '') {
      const password_hash = await bcrypt.hash(password, 10);
      await db.query(
        `UPDATE personal SET nombres=?, apellido_paterno=?, apellido_materno=?, edad=?, sexo=?,
         puesto=?, usuario=?, password_hash=?, foto_url=? WHERE id_personal=? AND id_sucursal=?`,
        [nombres, apellido_paterno, apellido_materno || null, edad, sexo, puesto, usuario, password_hash, foto_url, id, id_sucursal]
      );
    } else {
      await db.query(
        `UPDATE personal SET nombres=?, apellido_paterno=?, apellido_materno=?, edad=?, sexo=?,
         puesto=?, usuario=?, foto_url=? WHERE id_personal=? AND id_sucursal=?`,
        [nombres, apellido_paterno, apellido_materno || null, edad, sexo, puesto, usuario, foto_url, id, id_sucursal]
      );
    }

    res.json({ message: 'Empleado actualizado correctamente' });
  } catch (error) {
    if (req.file) borrarFoto(`/uploads/personal/${req.file.filename}`);
    console.error('[PUT /personal/:id]', error);
    res.status(500).json({ message: 'Error al actualizar empleado' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/personal/:id
// Elimina un empleado y su foto del disco
// ────────────────────────────────────────────────────────────────────────────
router.delete('/:id', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const { id } = req.params;
    const id_sucursal = req.usuario.id;

    const [[empleado]] = await db.query(
      'SELECT foto_url FROM personal WHERE id_personal = ? AND id_sucursal = ?',
      [id, id_sucursal]
    );
    if (!empleado) return res.status(404).json({ message: 'Empleado no encontrado' });

    borrarFoto(empleado.foto_url);
    await db.query('DELETE FROM personal WHERE id_personal = ? AND id_sucursal = ?', [id, id_sucursal]);
    res.json({ message: 'Empleado eliminado correctamente' });
  } catch (error) {
    console.error('[DELETE /personal/:id]', error);
    res.status(500).json({ message: 'Error al eliminar empleado' });
  }
});

export default router;