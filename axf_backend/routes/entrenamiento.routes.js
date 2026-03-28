// ============================================================================
//  routes/entrenamiento.routes.js
//  Módulo de Entrenamiento — Ejercicios, Rutinas
// ============================================================================

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../config/database.js';
import { verificarToken, soloPersonal, getSucursalId } from '../middlewares/auth.js';

const router = express.Router();

// ─── Uploads ─────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads', 'personal');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => cb(null, `ejercicio_${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  },
});

// ─── Middleware: solo entrenador o entrenador_nutriólogo ──────────────────────
function soloEntrenador(req, res, next) {
  const p = req.usuario.puesto;
  if (p !== 'entrenador' && p !== 'entrenador_nutriologo') {
    return res.status(403).json({ message: 'Acceso exclusivo para Entrenadores' });
  }
  next();
}

// getSucursalId importado desde middlewares/auth.js

// ─── Helper: borrar imagen del disco ─────────────────────────────────────────
function borrarImagen(url) {
  if (!url) return;
  const filePath = path.resolve(__dirname, '..', url.replace(/^\//, ''));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

// ════════════════════════════════════════════════════════════════════════════════
//  EJERCICIOS
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/entrenamiento/ejercicios
router.get('/ejercicios', verificarToken, soloPersonal, soloEntrenador, async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id_ejercicio, nombre, imagen_url, creado_en
       FROM ejercicios
       ORDER BY nombre ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /entrenamiento/ejercicios]', err);
    res.status(500).json({ message: 'Error al obtener ejercicios' });
  }
});

// POST /api/entrenamiento/ejercicios
router.post('/ejercicios', verificarToken, soloPersonal, soloEntrenador, upload.single('imagen'), async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre?.trim()) {
      if (req.file) borrarImagen(`/uploads/ejercicios/${req.file.filename}`);
      return res.status(400).json({ message: 'El nombre del ejercicio es obligatorio' });
    }

    const imagen_url = req.file ? `/uploads/personal/${req.file.filename}` : null;

    const [result] = await db.query(
      'INSERT INTO ejercicios (nombre, imagen_url, creado_por) VALUES (?, ?, ?)',
      [nombre.trim(), imagen_url, req.usuario.id]
    );

    res.status(201).json({
      message: 'Ejercicio creado',
      id_ejercicio: result.insertId,
      imagen_url,
    });
  } catch (err) {
    if (req.file) borrarImagen(`/uploads/ejercicios/${req.file.filename}`);
    console.error('[POST /entrenamiento/ejercicios]', err);
    res.status(500).json({ message: 'Error al crear ejercicio' });
  }
});

// PUT /api/entrenamiento/ejercicios/:id
router.put('/ejercicios/:id', verificarToken, soloPersonal, soloEntrenador, upload.single('imagen'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    if (!nombre?.trim()) {
      if (req.file) borrarImagen(`/uploads/ejercicios/${req.file.filename}`);
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const [[actual]] = await db.query('SELECT imagen_url FROM ejercicios WHERE id_ejercicio = ?', [id]);
    if (!actual) {
      if (req.file) borrarImagen(`/uploads/personal/${req.file.filename}`);
      return res.status(404).json({ message: 'Ejercicio no encontrado' });
    }

    let imagen_url = actual.imagen_url;
    if (req.file) {
      borrarImagen(actual.imagen_url);
      imagen_url = `/uploads/personal/${req.file.filename}`;
    }

    await db.query(
      'UPDATE ejercicios SET nombre = ?, imagen_url = ? WHERE id_ejercicio = ?',
      [nombre.trim(), imagen_url, id]
    );

    res.json({ message: 'Ejercicio actualizado' });
  } catch (err) {
    if (req.file) borrarImagen(`/uploads/personal/${req.file.filename}`);
    console.error('[PUT /entrenamiento/ejercicios/:id]', err);
    res.status(500).json({ message: 'Error al actualizar ejercicio' });
  }
});

// DELETE /api/entrenamiento/ejercicios/:id
router.delete('/ejercicios/:id', verificarToken, soloPersonal, soloEntrenador, async (req, res) => {
  try {
    const [[ej]] = await db.query('SELECT imagen_url FROM ejercicios WHERE id_ejercicio = ?', [req.params.id]);
    if (!ej) return res.status(404).json({ message: 'Ejercicio no encontrado' });

    borrarImagen(ej.imagen_url);
    await db.query('DELETE FROM ejercicios WHERE id_ejercicio = ?', [req.params.id]);
    res.json({ message: 'Ejercicio eliminado' });
  } catch (err) {
    console.error('[DELETE /entrenamiento/ejercicios/:id]', err);
    res.status(500).json({ message: 'Error al eliminar ejercicio' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
//  SUSCRIPTORES (con sesiones de entrenador)
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/entrenamiento/suscriptores
router.get('/suscriptores', verificarToken, soloPersonal, soloEntrenador, async (req, res) => {
  try {
    const id_sucursal = getSucursalId(req.usuario);
    if (!id_sucursal) return res.status(400).json({ message: 'Sucursal no encontrada' });

    const [rows] = await db.query(
      `SELECT s.id_suscriptor, s.nombres, s.apellido_paterno, s.apellido_materno,
              s.fecha_nacimiento, s.sexo,
              COALESCE(SUM(sub.sesiones_entrenador_restantes), 0) AS sesiones_entrenador
       FROM suscriptores s
       LEFT JOIN suscripciones sub ON sub.id_suscriptor = s.id_suscriptor
         AND sub.estado = 'Activa'
         AND CURDATE() BETWEEN sub.fecha_inicio AND sub.fecha_fin
       WHERE s.id_sucursal_registro = ? AND s.activo = 1
       GROUP BY s.id_suscriptor
       ORDER BY s.nombres ASC`,
      [id_sucursal]
    );

    res.json(rows);
  } catch (err) {
    console.error('[GET /entrenamiento/suscriptores]', err);
    res.status(500).json({ message: 'Error al obtener suscriptores' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
//  RUTINAS
// ════════════════════════════════════════════════════════════════════════════════

// POST /api/entrenamiento/rutinas
// Body: { id_suscriptor, notas_pdf?, ejercicios: [{ id_ejercicio, orden, series, repeticiones, descanso_seg?, peso_kg?, descripcion_tecnica? }] }
router.post('/rutinas', verificarToken, soloPersonal, soloEntrenador, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id_suscriptor, notas_pdf, ejercicios } = req.body;

    if (!id_suscriptor || !Array.isArray(ejercicios) || ejercicios.length === 0) {
      return res.status(400).json({ message: 'Suscriptor y al menos un ejercicio son obligatorios' });
    }

    // Verificar sesiones
    const [[sesion]] = await conn.query(
      `SELECT id_suscripcion, sesiones_entrenador_restantes
       FROM suscripciones
       WHERE id_suscriptor = ? AND estado = 'Activa'
         AND CURDATE() BETWEEN fecha_inicio AND fecha_fin
         AND sesiones_entrenador_restantes > 0
       ORDER BY fecha_fin ASC LIMIT 1`,
      [id_suscriptor]
    );

    if (!sesion) {
      return res.status(400).json({ message: 'El suscriptor no tiene sesiones de entrenador disponibles' });
    }

    await conn.beginTransaction();

    // Descontar sesión
    await conn.query(
      'UPDATE suscripciones SET sesiones_entrenador_restantes = sesiones_entrenador_restantes - 1 WHERE id_suscripcion = ?',
      [sesion.id_suscripcion]
    );

    // Crear rutina
    const [result] = await conn.query(
      'INSERT INTO rutinas (id_suscriptor, id_entrenador, notas_pdf) VALUES (?, ?, ?)',
      [id_suscriptor, req.usuario.id, notas_pdf || null]
    );
    const id_rutina = result.insertId;

    // Insertar ejercicios
    for (const ej of ejercicios) {
      await conn.query(
        `INSERT INTO rutina_ejercicios
          (id_rutina, id_ejercicio, orden, series, repeticiones, descanso_seg, peso_kg, descripcion_tecnica)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_rutina, ej.id_ejercicio, ej.orden,
          ej.series, ej.repeticiones,
          ej.descanso_seg || null, ej.peso_kg || null,
          ej.descripcion_tecnica || null,
        ]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Rutina creada y sesión descontada', id_rutina });
  } catch (err) {
    await conn.rollback();
    console.error('[POST /entrenamiento/rutinas]', err);
    res.status(500).json({ message: 'Error al crear rutina' });
  } finally {
    conn.release();
  }
});

export default router;
