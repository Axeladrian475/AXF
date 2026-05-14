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
//  GET    /api/suscriptores/movil/reportes           → (Legacy) Reportes públicos de una sucursal
//  POST   /api/suscriptores/movil/reportes           → (Legacy) Crear reporte/incidencia
//  GET    /api/suscriptores/movil/sucursales         → Lista de sucursales activas
//  GET    /api/suscriptores/movil/personal/:id       → Personal de una sucursal
//  GET    /api/suscriptores/movil/atencion-previa/:id → ¿Recibió atención de ese personal?
//  POST   /api/suscriptores/movil/reportes/crear     → Crear reporte (tabla reportes)
//  GET    /api/suscriptores/movil/reportes/publicos  → Reportes públicos activos por sucursal
//  POST   /api/suscriptores/movil/reportes/sumar/:id → Sumarse a un reporte
//  GET    /api/suscriptores/movil/reportes/mis-reportes → Historial propio
// ============================================================================

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import express from 'express';
import db from '../config/database.js';
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
  aplicarPromocion,
  cancelarSuscripcion,
  obtenerHistorialAccesos,
} from '../controllers/suscriptores.controller.js';

const router = express.Router();

// ── Configuración multer para fotos de incidencias (app móvil) ───────────────
const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);
const UPLOADS_INC = path.resolve(__dirname2, '..', 'uploads', 'incidencias');
if (!fs.existsSync(UPLOADS_INC)) fs.mkdirSync(UPLOADS_INC, { recursive: true });

const uploadInc = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_INC),
    filename: (_req, file, cb) =>
      cb(null, `inc_${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo imágenes'));
  },
});

// ── Configuración multer para fotos de suscriptores ───────────────────────────
const UPLOADS_SUS = path.resolve(__dirname2, '..', 'uploads', 'suscriptores');
if (!fs.existsSync(UPLOADS_SUS)) fs.mkdirSync(UPLOADS_SUS, { recursive: true });

const uploadSuscriptor = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_SUS),
    filename: (_req, file, cb) =>
      cb(null, `sus_${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes (jpg, png, webp, etc.)'));
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
              id_sucursal_registro, password_hash, activo, foto_url
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
        id: suscriptor.id_suscriptor,
        nombres: suscriptor.nombres,
        apellidoPaterno: suscriptor.apellido_paterno,
        correo: suscriptor.correo,
        sucursalId: suscriptor.id_sucursal_registro,
        suscripcionActiva: !!sub,
        fechaVencimiento: sub ? sub.fecha_fin : null,
        foto_url: suscriptor.foto_url ?? null,
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

    // 1) Plan actualmente EN CURSO: fecha_inicio <= hoy <= fecha_fin
    const [[subActiva]] = await db.query(
      `SELECT ts.nombre AS nombre_plan
       FROM suscripciones s
       LEFT JOIN tipos_suscripcion ts ON ts.id_tipo = s.id_tipo
       WHERE s.id_suscriptor = ?
         AND s.estado = 'Activa'
         AND s.fecha_inicio <= CURDATE()
         AND s.fecha_fin    >= CURDATE()
       ORDER BY s.fecha_fin ASC LIMIT 1`,
      [id]
    );

    // 2) Vencimiento FINAL = MAX(fecha_fin) de todas las suscripciones activas
    const [[totales]] = await db.query(
      `SELECT
         DATE_FORMAT(MAX(s.fecha_fin), '%Y-%m-%d')          AS vencimiento_final,
         GREATEST(DATEDIFF(MAX(s.fecha_fin), CURDATE()), 0) AS dias_restantes,
         CURDATE() AS hoy
       FROM suscripciones s
       WHERE s.id_suscriptor = ?
         AND s.estado = 'Activa'
         AND s.fecha_fin >= CURDATE()`,
      [id]
    );

    // 3) Racha, puntos y días de descanso
    const [[sus]] = await db.query(
      `SELECT racha_dias, dias_descanso_semana, puntos FROM suscriptores WHERE id_suscriptor = ?`,
      [id]
    );

    // LOG DE DIAGNÓSTICO — ver en consola del servidor
    console.log(`[SUB /movil/suscripcion]`,
      `id=${id}`,
      `subActiva=${JSON.stringify(subActiva)}`,
      `totales=${JSON.stringify(totales)}`);

    res.json({
      activa:               !!subActiva,
      vencimiento_final:    totales?.vencimiento_final    ?? null,
      dias_restantes:       totales?.dias_restantes       ?? 0,
      nombre_plan:          subActiva?.nombre_plan        ?? null,
      racha_dias:           sus?.racha_dias               ?? 0,
      dias_descanso_semana: sus?.dias_descanso_semana     ?? 0,
      puntos:               sus?.puntos                  ?? 0,
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
      `SELECT r.id_rutina, r.notas_pdf,
              DATE_FORMAT(r.creado_en, '%Y-%m-%dT%H:%i:%s.000Z') AS creado_en,
              COALESCE(CONCAT(p.nombres, ' ', p.apellido_paterno), 'Entrenador') AS entrenador
       FROM rutinas r
       LEFT JOIN personal p ON p.id_personal = r.id_entrenador
       WHERE r.id_suscriptor = ?
       ORDER BY r.creado_en DESC`,
      [id]
    );

    for (const rutina of rutinas) {
      const [ejercicios] = await db.query(
        `SELECT re.id AS id_rutina_ejercicio,
                re.orden, re.series, re.repeticiones,
                re.descanso_seg, re.peso_kg, re.descripcion_tecnica,
                re.nombre_bloque,
                e.nombre, e.imagen_url, e.grupo_muscular
         FROM rutina_ejercicios re
         JOIN ejercicios e ON e.id_ejercicio = re.id_ejercicio
         WHERE re.id_rutina = ?
         ORDER BY re.orden ASC`,
        [rutina.id_rutina]
      );
      rutina.ejercicios = ejercicios;

      // Construir array de bloques con nombre real
      const bloquesMap = new Map();
      for (const ej of ejercicios) {
        const idx = Math.floor(ej.orden / 100);
        if (!bloquesMap.has(idx)) {
          // Prioridad: nombre_bloque guardado > grupo_muscular del ejercicio
          const nombre = ej.nombre_bloque || ej.grupo_muscular || null;
          bloquesMap.set(idx, { bloque_idx: idx, nombre });
        }
      }
      rutina.bloques = Array.from(bloquesMap.values()).sort((a, b) => a.bloque_idx - b.bloque_idx);
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

    const foto_url = req.file ? `/uploads/incidencias/${req.file.filename}` : null;
    const es_privado = privado === 'true' || privado === true ? 1 : 0;

    const [result] = await db.query(
      `INSERT INTO incidencias
         (id_suscriptor, id_sucursal, categoria, descripcion, foto_url, privado, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'Pendiente')`,
      [id_suscriptor, id_sucursal, categoria, descripcion, foto_url, es_privado]
    );

    res.status(201).json({
      message: 'Reporte enviado correctamente',
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
// MÓDULO DE REPORTES — app móvil (token de suscriptor)
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/suscriptores/movil/personal/:id_sucursal ────────────────────────
// Personal activo de una sucursal para el selector de "Reporte de Personal"
router.get('/movil/personal/:id_sucursal', verificarSuscriptor, async (req, res) => {
  try {
    const { id_sucursal } = req.params;
    const [personal] = await db.query(
      `SELECT id_personal, nombres, apellido_paterno, puesto, foto_url
       FROM personal
       WHERE id_sucursal = ? AND activo = 1
       ORDER BY nombres ASC`,
      [id_sucursal]
    );
    res.json(personal);
  } catch (err) {
    console.error('[GET /suscriptores/movil/personal/:id]', err);
    res.status(500).json({ message: 'Error al obtener personal' });
  }
});

// ── GET /api/suscriptores/movil/atencion-previa/:id_personal ─────────────────
// Verifica si el suscriptor autenticado recibió atención del personal indicado
router.get('/movil/atencion-previa/:id_personal', verificarSuscriptor, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const { id_personal } = req.params;

    const [[{ cnt }]] = await db.query(
      `SELECT COUNT(*) AS cnt FROM (
         SELECT r.id_rutina
         FROM rutinas r
         WHERE r.id_suscriptor = ? AND r.id_entrenador = ?
         UNION ALL
         SELECT d.id_dieta
         FROM dietas d
         WHERE d.id_suscriptor = ? AND d.id_nutriologo = ?
       ) t`,
      [id_suscriptor, id_personal, id_suscriptor, id_personal]
    );

    res.json({ success: true, tuvo_atencion: cnt > 0 });
  } catch (err) {
    console.error('[GET /suscriptores/movil/atencion-previa/:id]', err);
    res.status(500).json({ message: 'Error al verificar atención previa' });
  }
});

// ── POST /api/suscriptores/movil/reportes/crear ──────────────────────────────
// Crear un nuevo reporte (incidencia o de personal)
router.post('/movil/reportes/crear', verificarSuscriptor, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const {
      id_sucursal,
      categoria,
      descripcion,
      es_privado,
      id_personal_reportado,
      sobre_atencion_previa,
    } = req.body;

    const categoriasValidas = ['Maquina_Dañada', 'Baño_Tapado', 'Problema_Limpieza', 'Reporte_Personal', 'Otro'];
    if (!id_sucursal || !categoria || !descripcion) {
      return res.status(400).json({ success: false, message: 'Sucursal, categoría y descripción son requeridos' });
    }
    if (!categoriasValidas.includes(categoria)) {
      return res.status(400).json({ success: false, message: 'Categoría inválida' });
    }

    const esPersonal = categoria === 'Reporte_Personal';
    // Reportes de personal → alta prioridad, privado forzado, sin esperar strikes
    const num_strikes = esPersonal ? 3 : 0;
    const esPrivadoFinal = esPersonal ? 1 : (es_privado ? 1 : 0);

    const [result] = await db.query(
      `INSERT INTO reportes
         (id_suscriptor, id_sucursal, categoria, descripcion, es_privado,
          id_personal_reportado, sobre_atencion_previa, estado, num_strikes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Abierto', ?)`,
      [
        id_suscriptor,
        id_sucursal,
        categoria,
        descripcion,
        esPrivadoFinal,
        id_personal_reportado ?? null,
        sobre_atencion_previa != null ? (sobre_atencion_previa ? 1 : 0) : null,
        num_strikes,
      ]
    );

    const id_reporte = result.insertId;

    // ── Notificar INMEDIATAMENTE al usuario Sucursal si es Reporte_Personal ────
    // El encargado de la sucursal es el responsable de dar seguimiento,
    // NO el personal reportado.
    if (esPersonal) {
      try {
        const { getIO } = await import('../config/socket.js');
        const io = getIO();

        // Obtener nombre del personal reportado (si se especificó)
        let nombrePersonalReportado = null;
        if (id_personal_reportado) {
          const [[personal]] = await db.query(
            `SELECT CONCAT(nombres, ' ', apellido_paterno) AS nombre, puesto
             FROM personal WHERE id_personal = ?`,
            [id_personal_reportado]
          );
          nombrePersonalReportado = personal
            ? `${personal.nombre} (${personal.puesto})`
            : null;
        }

        // Obtener nombre del suscriptor que reporta
        const [[suscriptor]] = await db.query(
          `SELECT CONCAT(nombres, ' ', apellido_paterno) AS nombre
           FROM suscriptores WHERE id_suscriptor = ?`,
          [id_suscriptor]
        );

        // Emitir SOLO a la sala de la sucursal correspondiente
        io.to(`sucursal:${id_sucursal}`).emit('reporte:personal_nuevo', {
          id_reporte,
          categoria,
          descripcion,
          urgente: true,
          nombre_suscriptor: suscriptor?.nombre ?? 'Suscriptor',
          nombre_personal_reportado: nombrePersonalReportado,
          generado_en: new Date().toISOString(),
          mensaje: `🚨 Nuevo reporte de personal recibido. Requiere tu atención inmediata.`,
        });

        console.log(`[REPORTE_PERSONAL] Notificado a sucursal:${id_sucursal} → Reporte #${id_reporte}`);
      } catch (socketErr) {
        // Socket.io no disponible en dev sin WS, no bloquear la respuesta
        console.warn('[REPORTE_PERSONAL] Socket.io no disponible:', socketErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Reporte enviado correctamente',
      id_reporte,
    });
  } catch (err) {
    console.error('[POST /suscriptores/movil/reportes/crear]', err);
    res.status(500).json({ success: false, message: 'Error al crear reporte' });
  }
});

// ── GET /api/suscriptores/movil/reportes/publicos?id_sucursal=X ──────────────
// Reportes públicos activos de una sucursal (para que otros se sumen)
router.get('/movil/reportes/publicos', verificarSuscriptor, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const { id_sucursal } = req.query;
    if (!id_sucursal) return res.status(400).json({ message: 'id_sucursal requerido' });

    const [reportes] = await db.query(
      `SELECT
         r.id_reporte,
         r.categoria,
         r.descripcion,
         r.foto_url,
         r.estado,
         r.num_strikes,
         r.creado_en,
         (SELECT COUNT(*) FROM reporte_sumados rs WHERE rs.id_reporte = r.id_reporte) AS sumados,
         EXISTS(
           SELECT 1 FROM reporte_sumados rs2
           WHERE rs2.id_reporte = r.id_reporte AND rs2.id_suscriptor = ?
         ) AS ya_sumado
       FROM reportes r
       WHERE r.id_sucursal = ?
         AND r.es_privado   = 0
         AND r.categoria   != 'Reporte_Personal'
         AND r.estado      != 'Resuelto'
       ORDER BY r.num_strikes DESC, r.creado_en DESC
       LIMIT 30`,
      [id_suscriptor, id_sucursal]
    );

    res.json({
      success: true,
      reportes: reportes.map(r => ({ ...r, ya_sumado: !!r.ya_sumado })),
    });
  } catch (err) {
    console.error('[GET /suscriptores/movil/reportes/publicos]', err);
    res.status(500).json({ message: 'Error al obtener reportes' });
  }
});

// ── POST /api/suscriptores/movil/reportes/sumar/:id_reporte ─────────────────
// Sumarse a un reporte existente
router.post('/movil/reportes/sumar/:id_reporte', verificarSuscriptor, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const { id_reporte } = req.params;

    // Verificar que no sea el autor del reporte
    const [[reporte]] = await db.query(
      `SELECT id_suscriptor FROM reportes WHERE id_reporte = ?`, [id_reporte]
    );
    if (!reporte) return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
    if (reporte.id_suscriptor === id_suscriptor) {
      return res.status(409).json({ success: false, message: 'No puedes sumarte a tu propio reporte' });
    }

    // Insertar ignorando duplicados
    const [result] = await db.query(
      `INSERT IGNORE INTO reporte_sumados (id_reporte, id_suscriptor) VALUES (?, ?)`,
      [id_reporte, id_suscriptor]
    );

    const msg = result.affectedRows > 0
      ? 'Te has sumado al reporte correctamente'
      : 'Ya estabas sumado a este reporte';

    res.json({ success: true, message: msg });
  } catch (err) {
    console.error('[POST /suscriptores/movil/reportes/sumar/:id]', err);
    res.status(500).json({ success: false, message: 'Error al sumarse al reporte' });
  }
});

// ── GET /api/suscriptores/movil/reportes/mis-reportes ────────────────────────
// Historial de reportes del suscriptor autenticado
router.get('/movil/reportes/mis-reportes', verificarSuscriptor, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;

    const [reportes] = await db.query(
      `SELECT
         r.id_reporte,
         r.id_sucursal,
         s.nombre  AS nombre_sucursal,
         r.categoria,
         r.descripcion,
         r.foto_url,
         r.es_privado,
         r.estado,
         r.num_strikes,
         r.creado_en,
         CONCAT(p.nombres, ' ', p.apellido_paterno) AS nombre_personal_reportado
       FROM reportes r
       JOIN sucursales s ON s.id_sucursal = r.id_sucursal
       LEFT JOIN personal p ON p.id_personal = r.id_personal_reportado
       WHERE r.id_suscriptor = ?
       ORDER BY r.creado_en DESC`,
      [id_suscriptor]
    );

    res.json({ success: true, reportes });
  } catch (err) {
    console.error('[GET /suscriptores/movil/reportes/mis-reportes]', err);
    res.status(500).json({ message: 'Error al obtener tus reportes' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ENDPOINTS DEL PANEL WEB — requieren token de personal / sucursal / maestro
// A partir de aquí todos los endpoints usan verificarToken + personalOSucursal
// ════════════════════════════════════════════════════════════════════════════

router.post('/movil/entrenamiento/serie', verificarSuscriptor, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const { id_rutina_ejercicio, num_serie, peso_levantado, reps_realizadas } = req.body;

    if (!id_rutina_ejercicio || !num_serie) {
      return res.status(400).json({ message: 'id_rutina_ejercicio y num_serie son requeridos.' });
    }

    // Verificar que el ejercicio pertenece a una rutina asignada a este suscriptor
    const [[ejercicio]] = await db.query(
      `SELECT re.id, r.id_suscriptor
       FROM rutina_ejercicios re
       JOIN rutinas r ON r.id_rutina = re.id_rutina
       WHERE re.id = ? AND r.id_suscriptor = ?`,
      [id_rutina_ejercicio, id_suscriptor]
    );

    if (!ejercicio) {
      return res.status(403).json({ message: 'Ejercicio no encontrado o no pertenece a tu rutina.' });
    }

    // Insertar o actualizar si ya existe esa serie (por si se re-completa)
    await db.query(
      `INSERT INTO registro_entrenamiento
         (id_rutina_ejercicio, id_suscriptor, num_serie, peso_levantado, reps_realizadas)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         peso_levantado  = VALUES(peso_levantado),
         reps_realizadas = VALUES(reps_realizadas),
         registrado_en   = CURRENT_TIMESTAMP`,
      [id_rutina_ejercicio, id_suscriptor, num_serie, peso_levantado ?? null, reps_realizadas ?? null]
    );

    res.status(201).json({ message: 'Serie registrada correctamente.' });

  } catch (err) {
    console.error('[POST /suscriptores/movil/entrenamiento/serie]', err);
    res.status(500).json({ message: 'Error al registrar la serie.' });
  }
});

// ── GET /api/suscriptores/movil/aforo ─────────────────────────────────────────
// Devuelve el aforo actual de la sucursal del suscriptor logueado.
// Incluye capacidad máxima para mostrar porcentaje en la app móvil.
router.get('/movil/aforo', verificarSuscriptor, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;

    // Obtener la sucursal del suscriptor (el JWT solo guarda id y rol)
    const [[sus]] = await db.query(
      `SELECT id_sucursal_registro FROM suscriptores WHERE id_suscriptor = ?`,
      [id_suscriptor]
    );
    if (!sus) return res.status(404).json({ message: 'Suscriptor no encontrado.' });

    const id_sucursal = sus.id_sucursal_registro;

    const [[aforo]] = await db.query(
      `SELECT
         sa.personas_dentro,
         sa.actualizado_en,
         COALESCE(s.capacidad_maxima, 50) AS capacidad_maxima,
         s.nombre                          AS nombre_sucursal
       FROM sucursal_aforo sa
       INNER JOIN sucursales s ON s.id_sucursal = sa.id_sucursal
       WHERE sa.id_sucursal = ?`,
      [id_sucursal]
    );

    if (!aforo) {
      // Si no hay registro aún, retornar 0
      const [[suc]] = await db.query(
        `SELECT nombre, COALESCE(capacidad_maxima, 50) AS capacidad_maxima
         FROM sucursales WHERE id_sucursal = ?`,
        [id_sucursal]
      );
      return res.json({
        personas_dentro:  0,
        capacidad_maxima: suc?.capacidad_maxima ?? 50,
        nombre_sucursal:  suc?.nombre ?? '',
        actualizado_en:   null,
        porcentaje:       0,
      });
    }

    const porcentaje = Math.round((aforo.personas_dentro / aforo.capacidad_maxima) * 100);

    // Consulta de afluencia por horarios del día de hoy
    const [[graficaData]] = await db.query(
      `SELECT 
        SUM(CASE WHEN HOUR(fecha_hora) >= 6 AND HOUR(fecha_hora) < 9 THEN 1 ELSE 0 END) AS h_6am,
        SUM(CASE WHEN HOUR(fecha_hora) >= 9 AND HOUR(fecha_hora) < 12 THEN 1 ELSE 0 END) AS h_9am,
        SUM(CASE WHEN HOUR(fecha_hora) >= 12 AND HOUR(fecha_hora) < 18 THEN 1 ELSE 0 END) AS h_12pm,
        SUM(CASE WHEN HOUR(fecha_hora) >= 18 AND HOUR(fecha_hora) < 20 THEN 1 ELSE 0 END) AS h_6pm,
        SUM(CASE WHEN HOUR(fecha_hora) >= 20 AND HOUR(fecha_hora) < 22 THEN 1 ELSE 0 END) AS h_8pm,
        SUM(CASE WHEN HOUR(fecha_hora) >= 22 AND HOUR(fecha_hora) < 24 THEN 1 ELSE 0 END) AS h_10pm
      FROM accesos
      WHERE id_sucursal = ? 
        AND DATE(fecha_hora) = CURDATE() 
        AND resultado = 'Permitido'
        AND tipo_movimiento = 'Entrada'`,
      [id_sucursal]
    );

    const grafica = [
      Number(graficaData?.h_6am || 0),
      Number(graficaData?.h_9am || 0),
      Number(graficaData?.h_12pm || 0),
      Number(graficaData?.h_6pm || 0),
      Number(graficaData?.h_8pm || 0),
      Number(graficaData?.h_10pm || 0),
    ];

    res.json({
      personas_dentro:  aforo.personas_dentro,
      capacidad_maxima: aforo.capacidad_maxima,
      nombre_sucursal:  aforo.nombre_sucursal,
      actualizado_en:   aforo.actualizado_en,
      porcentaje:       Math.min(porcentaje, 100),
      grafica:          grafica
    });
  } catch (err) {
    console.error('[GET /suscriptores/movil/aforo]', err);
    res.status(500).json({ message: 'Error al obtener el aforo.' });
  }
});

// ── PUT /api/suscriptores/movil/descanso ───────────────────────────────────────
// Actualiza los días de descanso por semana del suscriptor (0–6).
router.put('/movil/descanso', verificarSuscriptor, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const dias = parseInt(req.body.dias_descanso, 10);
    if (isNaN(dias) || dias < 0 || dias > 6) {
      return res.status(400).json({ message: 'dias_descanso debe ser entre 0 y 6' });
    }
    await db.query(
      `UPDATE suscriptores SET dias_descanso_semana = ? WHERE id_suscriptor = ?`,
      [dias, id_suscriptor]
    );
    res.json({ success: true, dias_descanso_semana: dias });
  } catch (err) {
    console.error('[PUT /suscriptores/movil/descanso]', err);
    res.status(500).json({ message: 'Error al actualizar días de descanso' });
  }
});

router.use(verificarToken, personalOSucursal);

// ─── Rutas sin parámetro :id ──────────────────────────────────────────────────
router.get('/otras-sucursales', listarSuscriptoresOtrasSucursales);
// La foto del suscriptor es OBLIGATORIA — el middleware valida que exista
router.post(
  '/',
  uploadSuscriptor.single('foto'),
  (req, res, next) => {
    // Rechazar si no se subió ningún archivo
    if (!req.file) {
      return res.status(400).json({ message: 'La foto del suscriptor es obligatoria.' });
    }
    // Adjuntar la ruta pública al body para que el controller la use
    req.body.foto_url = `/uploads/suscriptores/${req.file.filename}`;
    next();
  },
  registrarSuscriptor,
);
router.get('/', listarSuscriptores);

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
router.get('/:id', obtenerSuscriptor);
router.put('/:id', (req, res, next) => {
  uploadSuscriptor.single('foto')(req, res, (err) => {
    if (err) {
      console.error('[Multer PUT] Error:', err);
      return res.status(400).json({ message: err.message || 'Error al subir imagen.' });
    }
    if (req.file) {
      req.body.foto_url = `/uploads/suscriptores/${req.file.filename}`;
    }
    next();
  });
}, modificarSuscriptor);
router.delete('/:id', eliminarSuscriptor);
router.post('/:id/migrar', migrarSuscriptor);
router.get('/:id/suscripcion-activa', obtenerSuscripcionActiva);
router.post('/:id/suscribir', suscribirSuscriptor);
router.post('/:id/aplicar-promo', aplicarPromocion);
router.delete('/:id/suscripcion/:id_sub', cancelarSuscripcion);
router.get('/:id/accesos', obtenerHistorialAccesos);


export default router;