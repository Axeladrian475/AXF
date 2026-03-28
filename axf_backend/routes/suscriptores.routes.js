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
// ============================================================================

import express from 'express';
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

// ─── Todos los endpoints requieren token válido ───────────────────────────────
router.use(verificarToken, personalOSucursal);

// ─── Rutas sin parámetro :id (deben ir antes para evitar conflicto con /:id) ──
router.get   ('/otras-sucursales', listarSuscriptoresOtrasSucursales);
router.post  ('/',                 registrarSuscriptor);
router.get   ('/',                 listarSuscriptores);

// ─── Rutas con parámetro :id ──────────────────────────────────────────────────
router.get   ('/:id',                    obtenerSuscriptor);
router.put   ('/:id',                    modificarSuscriptor);
router.delete('/:id',                    eliminarSuscriptor);
router.post  ('/:id/migrar',             migrarSuscriptor);
router.get   ('/:id/suscripcion-activa', obtenerSuscripcionActiva);
router.post  ('/:id/suscribir',          suscribirSuscriptor);

export default router;