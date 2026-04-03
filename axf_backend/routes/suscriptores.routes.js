// ============================================================================
//  routes/suscriptores.routes.js
//
//  POST   /api/suscriptores                          → Registrar nuevo suscriptor
//  GET    /api/suscriptores                          → Listar suscriptores locales
//  GET    /api/suscriptores/otras-sucursales         → Suscriptores de otras sucursales
//  GET    /api/suscriptores/:id                      → Detalle de un suscriptor
//  PUT    /api/suscriptores/:id                      → Modificar datos de un suscriptor
//  DELETE /api/suscriptores/:id                      → Dar de baja (soft delete)
//  POST   /api/suscriptores/:id/migrar               → Migrar suscriptor a sucursal actual
//  GET    /api/suscriptores/:id/suscripcion-activa   → Suscripción vigente del suscriptor
//  POST   /api/suscriptores/:id/suscribir            → Suscribir a un tipo de suscripción
//
//  App móvil (token de suscriptor — ANTES del router.use):
//  POST   /api/suscriptores/login                    → Login de suscriptor
//  GET    /api/suscriptores/movil/suscripcion        → Suscripción activa
//  GET    /api/suscriptores/movil/rutinas            → Rutinas asignadas
//  GET    /api/suscriptores/movil/dietas             → Dieta más reciente
//  GET    /api/suscriptores/movil/registros          → Historial físico
//  GET    /api/suscriptores/movil/reportes           → Reportes públicos de una sucursal
//  POST   /api/suscriptores/movil/reportes           → Crear reporte/incidencia
//  GET    /api/suscriptores/movil/sucursales         → Lista de sucursales activas
// ============================================================================

import multer          from 'multer';
import path            from 'path';
import fs              from 'fs';
import { fileURLToPath } from 'url';
import bcrypt          from 'bcryptjs';
import jwt             from 'jsonwebtoken';
import express         from 'express';
import db              from '../config/database.js';
import {
  verificarToken,
  personalOSucursal,
} from '../middlewares/auth.js';
import {
  registrarSuscriptor,
  listarSuscriptores,
  listarSuscriptoresOtrasSucursales,
  obtenerSuscriptor,
  modificarSuscriptor,
  eliminarSuscriptor,
  migrarSuscriptor,
  obtenerSuscripcionActiva,
  suscribirSuscriptor,
} from '../controllers/suscriptores.controller.js';

const router = express.Router();

// ── Configuración multer para fotos de incidencias (app móvil) ───────────────
const __filename2 = fileURLToPath(import.meta.url);
const __dirname2  = path.dirname(__filename2);
const UPLOADS_INC = path.resolve(__dirname2, '..', 'uploads', 'incidencias');
if (!fs.existsSync(UPLOADS_INC)) fs.mkdirSync(UPLOADS_INC, { recursive: true });

const uploadInc = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_INC),
    filename:    (_req, file, cb) =>
      cb(null, `inc_${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits:     { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo imágenes'));
  },
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/suscriptores/login
// ════════════════════════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Correo y contraseña son requeridos.' });
    }

    const [[suscriptor]] = await db.query(
      `SELECT id_suscriptor, nombres, apellido_paterno, correo,
              id_sucursal_registro, password_hash, activo
       FROM suscriptores
       WHERE correo = ? AND activo = 1`,
      [email.trim().toLowerCase()]
    );

    if (!suscriptor) {
      return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos.' });
    }

    const valida = await bcrypt.compare(password, suscriptor.password_hash);
    if (!valida) {
      return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos.' });
    }

    const [[sub]] = await db.query(
      `SELECT fecha_fin FROM suscripciones
       WHERE id_suscriptor = ? AND estado = 'Activa' AND fecha_fin >= CURDATE()
       ORDER BY fecha_fin DESC LIMIT 1`,
      [suscriptor.id_suscriptor]
    );

    const token = jwt.sign(
      { id: suscriptor.id_suscriptor, rol: 'suscriptor' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: 'Login exitoso.',
      token,
      suscriptor: {
        id:               suscriptor.id_suscriptor,
        nombres:          suscriptor.nombres,
        apellidoPaterno:  suscriptor.apellido_paterno,
        correo:           suscriptor.correo,
        sucursalId:       suscriptor.id_sucursal_registro,
        suscripcionActiva: !!sub,
        fechaVencimiento: sub ? sub.fecha_fin : null,
      },
    });

  } catch (error) {
    console.error('[POST /suscriptores/login]', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ENDPOINTS PARA LA APP MÓVIL
// Deben estar ANTES de router.use(verificarToken, personalOSucursal) porque
// usan tokens con rol='suscriptor', que personalOSucursal rechaza con 403.
// ════════════════════════════════════════════════════════════════════════════

// Middleware exclusivo para tokens de suscriptor
function verificarSuscriptor(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    if (req.usuario.rol !== 'suscriptor') {
      return res.status(403).json({ message: 'Acceso exclusivo para suscriptores' });
    }
    next();
  } catch {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }
}

// ── GET /api/suscriptores/movil/suscripcion ──────────────────────────────────
router.get('/movil/suscripcion', verificarSuscriptor, async (req, res) => {
  try {
    const id = req.usuario.id;
    const [[sub]] = await db.query(
      `SELECT fecha_fin FROM suscripciones
       WHERE id_suscriptor = ? AND estado = 'Activa' AND fecha_fin >= CURDATE()
       ORDER BY fecha_fin DESC LIMIT 1`,
      [id]
    );
    res.json({
      activa:            !!sub,
      vencimiento_final: sub ? sub.fecha_fin : null,
    });
  } catch (err) {
    console.error('[GET /suscriptores/movil/suscripcion]', err);
    res.status(500).json({ message: 'Error al obtener suscripción' });
  }
});

// ── GET /api/suscriptores/movil/rutinas ──────────────────────────────────────
router.get('/movil/rutinas', verificarSuscriptor, async (req, res) => {
  try {
    const id = req.usuario.id;

    const [rutinas] = await db.query(
      `SELECT r.id_rutina, r.notas_pdf, r.creado_en,
              CONCAT(p.nombres, ' ', p.apellido_paterno) AS entrenador
       FROM rutinas r
       JOIN personal p ON p.id_personal = r.id_entrenador
       WHERE r.id_suscriptor = ?
       ORDER BY r.creado_en DESC`,
      [id]
    );

    for (const rutina of rutinas) {
      const [ejercicios] = await db.query(
        `SELECT re.orden, re.series, re.repeticiones,
                re.descanso_seg, re.peso_kg, re.descripcion_tecnica,
                e.nombre, e.imagen_url
         FROM rutina_ejercicios re
         JOIN ejercicios e ON e.id_ejercicio = re.id_ejercicio
         WHERE re.id_rutina = ?
         ORDER BY re.orden ASC`,
        [rutina.id_rutina]
      );
      rutina.ejercicios = ejercicios;
    }

    res.json(rutinas);
  } catch (err) {
    console.error('[GET /suscriptores/movil/rutinas]', err);
    res.status(500).json({ message: 'Error al obtener rutinas' });
  }
});

// ── GET /api/suscriptores/movil/dietas ───────────────────────────────────────
router.get('/movil/dietas', verificarSuscriptor, async (req, res) => {
  try {
    const id = req.usuario.id;

    const [[dieta]] = await db.query(
      `SELECT d.id_dieta, d.creado_en,
              CONCAT(p.nombres, ' ', p.apellido_paterno) AS nutriologo
       FROM dietas d
       JOIN personal p ON p.id_personal = d.id_nutriologo
       WHERE d.id_suscriptor = ?
       ORDER BY d.creado_en DESC LIMIT 1`,
      [id]
    );

    if (!dieta) return res.json(null);

    const [comidas] = await db.query(
      `SELECT dc.dia, dc.orden_comida, dc.descripcion,
              dc.calorias, dc.notas,
              r.nombre AS receta_nombre,
              r.imagen_url AS receta_imagen,
              r.proteinas_g, r.grasas_g
       FROM dieta_comidas dc
       LEFT JOIN recetas r ON r.id_receta = dc.id_receta
       WHERE dc.id_dieta = ?
       ORDER BY dc.dia ASC, dc.orden_comida ASC`,
      [dieta.id_dieta]
    );

    dieta.comidas = comidas;
    res.json(dieta);
  } catch (err) {
    console.error('[GET /suscriptores/movil/dietas]', err);
    res.status(500).json({ message: 'Error al obtener dieta' });
  }
});

// ── GET /api/suscriptores/movil/registros ────────────────────────────────────
router.get('/movil/registros', verificarSuscriptor, async (req, res) => {
  try {
    const id = req.usuario.id;

    const [registros] = await db.query(
      `SELECT rf.id_registro, rf.peso_kg, rf.altura_cm, rf.edad,
              rf.pct_grasa, rf.pct_musculo, rf.actividad, rf.objetivo,
              rf.notas, rf.tmb, rf.tdee,
              rf.proteinas_min, rf.proteinas_max,
              rf.grasas_min, rf.grasas_max,
              rf.carbs_min, rf.carbs_max,
              rf.creado_en,
              CONCAT(p.nombres, ' ', p.apellido_paterno) AS nutriologo
       FROM registros_fisicos rf
       JOIN personal p ON p.id_personal = rf.id_nutriologo
       WHERE rf.id_suscriptor = ?
       ORDER BY rf.creado_en DESC`,
      [id]
    );

    res.json(registros);
  } catch (err) {
    console.error('[GET /suscriptores/movil/registros]', err);
    res.status(500).json({ message: 'Error al obtener registros' });
  }
});

// ── GET /api/suscriptores/movil/reportes ─────────────────────────────────────
router.get('/movil/reportes', verificarSuscriptor, async (req, res) => {
  try {
    const { id_sucursal } = req.query;
    if (!id_sucursal) return res.status(400).json({ message: 'id_sucursal requerido' });

    const [reportes] = await db.query(
      `SELECT i.id_incidencia, i.categoria, i.descripcion,
              i.foto_url, i.estado, i.creado_en,
              s.nombre AS sucursal
       FROM incidencias i
       JOIN sucursales s ON s.id_sucursal = i.id_sucursal
       WHERE i.id_sucursal = ? AND i.privado = 0
         AND i.estado != 'Resuelto'
       ORDER BY i.creado_en DESC
       LIMIT 20`,
      [id_sucursal]
    );

    res.json(reportes);
  } catch (err) {
    console.error('[GET /suscriptores/movil/reportes]', err);
    res.status(500).json({ message: 'Error al obtener reportes' });
  }
});

// ── POST /api/suscriptores/movil/reportes ────────────────────────────────────
router.post('/movil/reportes', verificarSuscriptor, uploadInc.single('foto'), async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const { id_sucursal, categoria, descripcion, privado } = req.body;

    if (!id_sucursal || !categoria || !descripcion) {
      return res.status(400).json({ message: 'Sucursal, categoría y descripción son requeridos' });
    }

    const foto_url   = req.file ? `/uploads/incidencias/${req.file.filename}` : null;
    const es_privado = privado === 'true' || privado === true ? 1 : 0;

    const [result] = await db.query(
      `INSERT INTO incidencias
         (id_suscriptor, id_sucursal, categoria, descripcion, foto_url, privado, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'Pendiente')`,
      [id_suscriptor, id_sucursal, categoria, descripcion, foto_url, es_privado]
    );

    res.status(201).json({
      message:       'Reporte enviado correctamente',
      id_incidencia: result.insertId,
    });
  } catch (err) {
    console.error('[POST /suscriptores/movil/reportes]', err);
    res.status(500).json({ message: 'Error al crear reporte' });
  }
});

// ── GET /api/suscriptores/movil/sucursales ───────────────────────────────────
router.get('/movil/sucursales', verificarSuscriptor, async (_req, res) => {
  try {
    const [sucursales] = await db.query(
      `SELECT id_sucursal, nombre, direccion
       FROM sucursales WHERE activa = 1
       ORDER BY nombre ASC`
    );
    res.json(sucursales);
  } catch (err) {
    console.error('[GET /suscriptores/movil/sucursales]', err);
    res.status(500).json({ message: 'Error al obtener sucursales' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ENDPOINTS DEL PANEL WEB — requieren token de personal / sucursal / maestro
// A partir de aquí todos los endpoints usan verificarToken + personalOSucursal
// ════════════════════════════════════════════════════════════════════════════
router.use(verificarToken, personalOSucursal);

// ─── Rutas sin parámetro :id ──────────────────────────────────────────────────
router.get   ('/otras-sucursales', listarSuscriptoresOtrasSucursales);
router.post  ('/',                 registrarSuscriptor);
router.get   ('/',                 listarSuscriptores);

// ── POST /api/suscriptores/identificar ──────────────────────────────────────
router.post('/identificar', async (req, res) => {
  const { tipo, valor } = req.body;
  if (!tipo || !valor) {
    return res.status(400).json({ message: 'tipo y valor son requeridos.' });
  }
  if (!['nfc', 'huella'].includes(tipo)) {
    return res.status(400).json({ message: 'tipo debe ser "nfc" o "huella".' });
  }
  try {
    const campo = tipo === 'nfc' ? 'nfc_uid' : 'huella_template';
    const [[suscriptor]] = await db.query(
      `SELECT id_suscriptor,
              CONCAT(nombres, ' ', apellido_paterno) AS nombre,
              puntos,
              activo
       FROM suscriptores
       WHERE ${campo} = ? LIMIT 1`,
      [valor]
    );
    if (!suscriptor) {
      return res.status(404).json({ message: 'Suscriptor no encontrado.' });
    }
    res.json(suscriptor);
  } catch (err) {
    console.error('[POST /suscriptores/identificar]', err);
    res.status(500).json({ message: 'Error interno al identificar suscriptor.' });
  }
});

// ─── Rutas con parámetro :id ──────────────────────────────────────────────────
router.get   ('/:id',                    obtenerSuscriptor);
router.put   ('/:id',                    modificarSuscriptor);
router.delete('/:id',                    eliminarSuscriptor);
router.post  ('/:id/migrar',             migrarSuscriptor);
router.get   ('/:id/suscripcion-activa', obtenerSuscripcionActiva);
router.post  ('/:id/suscribir',          suscribirSuscriptor);

export default router;
