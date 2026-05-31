// ============================================================================
//  routes/reportes.routes.js
//
//  Módulo de Gestión de Alertas y Escalada de Reportes
//
//  ── APP MÓVIL (token suscriptor) ─────────────────────────────────────────
//  GET  /api/reportes/sucursales              → lista de sucursales activas
//  GET  /api/reportes/personal/:id_sucursal   → personal de una sucursal
//  GET  /api/reportes/atencion-previa/:id     → ¿suscriptor fue atendido por ese personal?
//  POST /api/reportes/crear                   → crear nuevo reporte
//  GET  /api/reportes/publicos/:id_sucursal   → reportes públicos activos
//  POST /api/reportes/sumar/:id_reporte       → sumarse a un reporte
//  GET  /api/reportes/mis-reportes            → historial del suscriptor
//
//  ── PANEL WEB (token personal/sucursal/maestro) ──────────────────────────
//  GET  /api/reportes                      → listar con filtros
//  GET  /api/reportes/resumen              → contadores para dashboard
//  GET  /api/reportes/strikes/config       → tiempos de escalada
//  PUT  /api/reportes/strikes/config       → actualizar tiempos (SOLO MAESTRO)
//  POST /api/reportes/strikes/procesar     → forzar procesamiento (maestro)
//  GET  /api/reportes/:id                  → detalle + historial strikes
//  PUT  /api/reportes/:id/estado           → actualizar estado
//  POST /api/reportes/:id/resolver         → marcar como resuelto
//  GET  /api/reportes/:id/strikes          → historial de strikes
// ============================================================================

import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../config/database.js';
import { verificarToken, personalOSucursal, soloMaestro } from '../middlewares/auth.js';
import {
  listarReportes,
  obtenerReporte,
  actualizarEstado,
  resolverReporte,
  historialStrikes,
  resumenReportes,
  analisisReportes,
  analisisPersonal,
  listarPrioritarios,
  marcarReenviado,
} from '../controllers/reportes.controller.js';
import {
  getConfigStrikes,
  setConfigStrikes,
  procesarManual,
} from '../services/strikes.service.js';
import { notificarReporteInmediatoGerencia } from '../services/mailer.service.js';

const router = express.Router();

// ── Multer: guardar fotos de reportes ──────────────────────────────────────
const __filename_r = fileURLToPath(import.meta.url);
const __dirname_r  = path.dirname(__filename_r);
const UPLOADS_REP  = path.resolve(__dirname_r, '..', 'uploads', 'reportes');
if (!fs.existsSync(UPLOADS_REP)) fs.mkdirSync(UPLOADS_REP, { recursive: true });

const uploadReporte = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_REP),
    filename:    (_req, file, cb) =>
      cb(null, `rep_${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits:     { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo imágenes permitidas'));
  },
});

// ── Middleware exclusivo para suscriptores (app móvil) ────────────────────────
function verificarSuscriptor(req, res, next) {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.rol !== 'suscriptor') {
      return res.status(403).json({ message: 'Acceso exclusivo para suscriptores' });
    }
    req.usuario = payload;
    next();
  } catch {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RUTAS MÓVILES — usan verificarSuscriptor, deben ir ANTES del router.use()
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/reportes/sucursales
router.get('/sucursales', verificarSuscriptor, async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id_sucursal, nombre
       FROM sucursales
       WHERE activa = 1
       ORDER BY nombre ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error('[GET /reportes/sucursales]', e);
    res.status(500).json({ message: 'Error al obtener sucursales' });
  }
});

// GET /api/reportes/personal/:id_sucursal
router.get('/personal/:id_sucursal', verificarSuscriptor, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id_personal, nombres, apellido_paterno, puesto, foto_url
       FROM personal
       WHERE id_sucursal = ? AND activo = 1
       ORDER BY nombres ASC`,
      [req.params.id_sucursal]
    );
    res.json(rows);
  } catch (e) {
    console.error('[GET /reportes/personal/:id_sucursal]', e);
    res.status(500).json({ message: 'Error al obtener personal' });
  }
});

// GET /api/reportes/atencion-previa/:id_personal
router.get('/atencion-previa/:id_personal', verificarSuscriptor, async (req, res) => {
  try {
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS cnt
       FROM chat_mensajes
       WHERE id_personal = ? AND id_suscriptor = ?
       LIMIT 1`,
      [req.params.id_personal, req.usuario.id]
    );
    res.json({ success: true, tuvo_atencion: row.cnt > 0 });
  } catch (e) {
    console.error('[GET /reportes/atencion-previa]', e);
    res.status(500).json({ message: 'Error al verificar atención previa' });
  }
});

// POST /api/reportes/crear — acepta multipart/form-data (con foto opcional)
router.post('/crear', verificarSuscriptor, uploadReporte.single('foto'), async (req, res) => {
  try {
    const {
      id_sucursal,
      categoria,
      descripcion,
      es_privado,
      id_personal_reportado,
      sobre_atencion_previa,
    } = req.body;

    if (!id_sucursal || !categoria || !descripcion) {
      // Si hubo multer error (formato incorrecto), limpiar el archivo
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Sucursal, categoría y descripción son requeridos',
      });
    }

    const esPersonal = categoria === 'Reporte_Personal';

    // foto_url: ruta pública servida por express.static('/uploads')
    const foto_url = req.file ? `/uploads/reportes/${req.file.filename}` : null;

    // Normalizar booleanos que llegan como strings desde multipart
    // Reportes de personal se fuerzan a privado=1 para que el personal no los vea
    const esPrivadoVal         = esPersonal ? 1 : ((es_privado === 'true' || es_privado === true) ? 1 : 0);
    const idPersonalVal        = id_personal_reportado || null;
    const sobreAtencionVal     = sobre_atencion_previa != null
      ? (sobre_atencion_previa === 'true' || sobre_atencion_previa === true ? 1 : 0)
      : null;

    const [result] = await db.query(
      `INSERT INTO reportes
         (id_suscriptor, id_sucursal, categoria, descripcion, foto_url,
          es_privado, id_personal_reportado, sobre_atencion_previa, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Abierto')`,
      [
        req.usuario.id,
        id_sucursal,
        categoria,
        descripcion,
        foto_url,
        esPrivadoVal,
        idPersonalVal,
        sobreAtencionVal,
      ]
    );

    const id_reporte = result.insertId;

    // ── Notificar INMEDIATAMENTE al encargado de la Sucursal si es Reporte_Personal ─
    // El personal reportado NO debe recibir esta notificación.
    if (esPersonal) {
      try {
        const { getIO } = await import('../config/socket.js');
        const io = getIO();

        // Nombre del personal reportado (si se especificó)
        let nombrePersonalReportado = null;
        if (idPersonalVal) {
          const [[personal]] = await db.query(
            `SELECT CONCAT(nombres, ' ', apellido_paterno) AS nombre, puesto
             FROM personal WHERE id_personal = ?`,
            [idPersonalVal]
          );
          nombrePersonalReportado = personal ? `${personal.nombre} (${personal.puesto})` : null;
        }

        // Nombre del suscriptor que reportó
        const [[suscriptor]] = await db.query(
          `SELECT CONCAT(nombres, ' ', apellido_paterno) AS nombre
           FROM suscriptores WHERE id_suscriptor = ?`,
          [req.usuario.id]
        );

        const mensajeAlerta = `🚨 Nuevo reporte de personal recibido. Requiere tu atención inmediata.`;

        // 1. Guardar notificación persistente en BD
        await db.query(
          `INSERT INTO notificaciones_sucursal (id_sucursal, tipo, id_reporte, mensaje)
           VALUES (?, 'reporte_personal', ?, ?)`,
          [id_sucursal, id_reporte, mensajeAlerta]
        );

        // 2. Emitir SOLO al encargado de la sucursal (sala sucursal:{id_sucursal})
        io.to(`sucursal:${id_sucursal}`).emit('reporte:personal_nuevo', {
          id_reporte,
          categoria,
          descripcion,
          urgente:                   true,
          nombre_suscriptor:         suscriptor?.nombre ?? 'Suscriptor',
          nombre_personal_reportado: nombrePersonalReportado,
          foto_url,
          generado_en:               new Date().toISOString(),
          mensaje:                   mensajeAlerta,
        });

        console.log(`[REPORTE_PERSONAL] Notificado a sucursal:${id_sucursal} → Reporte #${id_reporte}`);

        // 3. Notificar a Gerencia por correo
        const [[sucursalData]] = await db.query(
          `SELECT nombre, correo FROM sucursales WHERE id_sucursal = ?`,
          [id_sucursal]
        );
        const nombreSucursal = sucursalData?.nombre || `Sucursal ${id_sucursal}`;
        notificarReporteInmediatoGerencia(
          sucursalData?.correo,
          id_reporte,
          nombreSucursal,
          descripcion,
          nombrePersonalReportado
        ).catch(err =>
          console.error('[MAILER] Error al enviar reporte inmediato a sucursal:', err.message)
        );

      } catch (err) {
        console.warn('[REPORTE_PERSONAL] Error al notificar/guardar:', err.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Reporte enviado correctamente',
      id_reporte,
      foto_url,
    });
  } catch (e) {
    console.error('[POST /reportes/crear]', e);
    // Limpiar archivo si el INSERT falló
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ success: false, message: 'Error al crear reporte' });
  }
});

// GET /api/reportes/publicos/:id_sucursal
router.get('/publicos/:id_sucursal', verificarSuscriptor, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const id_sucursal   = req.params.id_sucursal;

    const [reportes] = await db.query(
      `SELECT
         r.id_reporte,
         r.categoria,
         r.descripcion,
         r.foto_url,
         r.estado,
         r.num_strikes,
         r.creado_en,
         COUNT(rs.id)                                        AS sumados,
         COALESCE(MAX(CASE WHEN rs.id_suscriptor = ? THEN 1 ELSE 0 END), 0) AS ya_sumado
       FROM reportes r
       LEFT JOIN reporte_sumados rs ON rs.id_reporte = r.id_reporte
       WHERE r.id_sucursal = ?
         AND r.es_privado  = 0
         AND r.estado     != 'Resuelto'
       GROUP BY r.id_reporte
       ORDER BY r.num_strikes DESC, r.creado_en ASC
       LIMIT 50`,
      [id_suscriptor, id_sucursal]
    );

    res.json({ success: true, reportes });
  } catch (e) {
    console.error('[GET /reportes/publicos]', e);
    res.status(500).json({ success: false, message: 'Error al obtener reportes públicos' });
  }
});

// POST /api/reportes/sumar/:id_reporte
router.post('/sumar/:id_reporte', verificarSuscriptor, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const id_reporte    = req.params.id_reporte;

    const [[existe]] = await db.query(
      `SELECT id FROM reporte_sumados WHERE id_reporte = ? AND id_suscriptor = ?`,
      [id_reporte, id_suscriptor]
    );
    if (existe) {
      return res.json({ success: false, message: 'Ya te sumaste a este reporte' });
    }

    await db.query(
      `INSERT INTO reporte_sumados (id_reporte, id_suscriptor) VALUES (?, ?)`,
      [id_reporte, id_suscriptor]
    );

    res.json({ success: true, message: 'Te has sumado al reporte' });
  } catch (e) {
    console.error('[POST /reportes/sumar]', e);
    res.status(500).json({ success: false, message: 'Error al sumarse al reporte' });
  }
});

// GET /api/reportes/mis-reportes
router.get('/mis-reportes', verificarSuscriptor, async (req, res) => {
  try {
    const [reportes] = await db.query(
      `SELECT
         r.id_reporte,
         r.id_sucursal,
         suc.nombre                                            AS nombre_sucursal,
         r.categoria,
         r.descripcion,
         r.foto_url,
         CAST(r.es_privado AS UNSIGNED)                       AS es_privado,
         r.estado,
         r.num_strikes,
         DATE_FORMAT(r.creado_en, '%Y-%m-%dT%H:%i:%s')        AS creado_en,
         CASE
           WHEN p.id_personal IS NOT NULL
           THEN CONCAT(p.nombres, ' ', p.apellido_paterno)
         END                                                   AS nombre_personal_reportado
       FROM reportes r
       JOIN  sucursales suc ON suc.id_sucursal = r.id_sucursal
       LEFT JOIN personal p ON p.id_personal   = r.id_personal_reportado
       WHERE r.id_suscriptor = ?
       ORDER BY r.creado_en DESC
       LIMIT 50`,
      [req.usuario.id]
    );

    res.json({ success: true, reportes });
  } catch (e) {
    console.error('[GET /reportes/mis-reportes]', e);
    res.status(500).json({ success: false, message: 'Error al obtener mis reportes' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PANEL WEB — a partir de aquí todos los endpoints requieren token de staff
// ══════════════════════════════════════════════════════════════════════════════

// Todos los endpoints de panel requieren token válido de personal/sucursal/maestro
router.use(verificarToken);

// ─── Rutas de configuración y herramientas (sin param :id) ───────────────────
// IMPORTANTE: deben ir ANTES de /:id para evitar conflictos de routing

router.get('/resumen',           personalOSucursal, resumenReportes);
router.get('/analisis',          personalOSucursal, analisisReportes);
router.get('/analisis/personal', personalOSucursal, analisisPersonal);
router.get('/prioritarios',      personalOSucursal, listarPrioritarios);
router.get('/strikes/config',    personalOSucursal, getConfigStrikes);
router.put('/strikes/config',    soloMaestro,       setConfigStrikes);  // ← Solo maestro
router.post('/strikes/procesar', soloMaestro,       procesarManual);    // ← Solo maestro

// ─── CRUD de reportes ─────────────────────────────────────────────────────────
router.get('/',              personalOSucursal, listarReportes);
router.get('/:id',           personalOSucursal, obtenerReporte);
router.put('/:id/estado',    personalOSucursal, actualizarEstado);
router.put('/:id/reenviar',  personalOSucursal, marcarReenviado);
router.post('/:id/resolver', personalOSucursal, resolverReporte);
router.get('/:id/strikes',   personalOSucursal, historialStrikes);

export default router;