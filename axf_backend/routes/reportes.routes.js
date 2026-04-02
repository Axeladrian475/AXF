// ============================================================================
//  routes/reportes.routes.js
//
//  Módulo de Gestión de Alertas y Escalada de Reportes
//
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
import { verificarToken, personalOSucursal, soloMaestro } from '../middlewares/auth.js';
import {
  listarReportes,
  obtenerReporte,
  actualizarEstado,
  resolverReporte,
  historialStrikes,
  resumenReportes,
} from '../controllers/reportes.controller.js';
import {
  getConfigStrikes,
  setConfigStrikes,
  procesarManual,
} from '../services/strikes.service.js';

const router = express.Router();

// Todos los endpoints requieren token válido
router.use(verificarToken);

// ─── Rutas de configuración y herramientas (sin param :id) ───────────────────
// IMPORTANTE: deben ir ANTES de /:id para evitar conflictos de routing

router.get('/resumen',           personalOSucursal, resumenReportes);
router.get('/strikes/config',    personalOSucursal, getConfigStrikes);
router.put('/strikes/config',    soloMaestro,       setConfigStrikes);  // ← Solo maestro
router.post('/strikes/procesar', soloMaestro,       procesarManual);    // ← Solo maestro

// ─── CRUD de reportes ─────────────────────────────────────────────────────────
router.get('/',              personalOSucursal, listarReportes);
router.get('/:id',           personalOSucursal, obtenerReporte);
router.put('/:id/estado',    personalOSucursal, actualizarEstado);
router.post('/:id/resolver', personalOSucursal, resolverReporte);
router.get('/:id/strikes',   personalOSucursal, historialStrikes);

export default router;