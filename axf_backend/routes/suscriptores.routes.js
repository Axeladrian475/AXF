// ============================================================================
//  routes/suscriptores.routes.js
//
//  Expone los endpoints del Módulo de Usuarios (suscriptores).
//  Montado en index.js como:  app.use('/api/suscriptores', suscriptoresRoutes)
//
//  POST   /api/suscriptores          → Registrar nuevo suscriptor
//  GET    /api/suscriptores          → Listar suscriptores de la sucursal
//  GET    /api/suscriptores/:id      → Detalle de un suscriptor
//  PUT    /api/suscriptores/:id      → Modificar datos de un suscriptor
//  DELETE /api/suscriptores/:id      → Dar de baja (soft delete)
// ============================================================================

import express from 'express';
import {
  verificarToken,
  personalOSucursal,
} from '../middlewares/auth.js';
import {
  registrarSuscriptor,
  listarSuscriptores,
  obtenerSuscriptor,
  modificarSuscriptor,
  eliminarSuscriptor,
} from '../controllers/suscriptores.controller.js';

const router = express.Router();

// ─── Todos los endpoints requieren token válido ───────────────────────────────
// y que el usuario sea personal (staff/entrenador/nutriologo) o sucursal.
router.use(verificarToken, personalOSucursal);

// ─── CRUD suscriptores ────────────────────────────────────────────────────────
router.post  ('/',    registrarSuscriptor);  // Registrar nuevo
router.get   ('/',    listarSuscriptores);   // Directorio / búsqueda
router.get   ('/:id', obtenerSuscriptor);    // Detalle completo
router.put   ('/:id', modificarSuscriptor);  // Editar datos
router.delete('/:id', eliminarSuscriptor);   // Dar de baja

export default router;