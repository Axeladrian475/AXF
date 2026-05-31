// ============================================================================
//  routes/maestro.routes.js
//  Rutas exclusivas para el rol Maestro (Administrador Global del sistema).
//  Todas las rutas requieren JWT válido con rol = 'maestro'.
// ============================================================================

import express from 'express';
import { verificarToken, soloMaestro } from '../middlewares/auth.js';

// ─── Importar controladores del Maestro ──────────────────────────────────────
// crearSucursal      → lógica de creación con validaciones RQNF completas
// eliminarSucursal   → borrado FÍSICO transaccional con cascada completa
import { crearSucursal, eliminarSucursal } from '../controllers/maestro.controller.js';

const router = express.Router();

// ─── POST /api/maestro/sucursales ────────────────────────────────────────────
// Crea una nueva sucursal (o reactiva una desactivada con el mismo usuario).
// Requiere: { nombre, direccion, codigo_postal, usuario, password }
router.post('/sucursales', verificarToken, soloMaestro, crearSucursal);

// ─── DELETE /api/maestro/sucursales/:id_sucursal ─────────────────────────────
router.delete('/sucursales/:id_sucursal', verificarToken, soloMaestro, eliminarSucursal);

export default router;

