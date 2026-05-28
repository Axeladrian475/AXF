// ============================================================================
//  routes/maestro.routes.js
//  Rutas exclusivas para el rol Maestro (Administrador Global del sistema).
//  Todas las rutas requieren JWT válido con rol = 'maestro'.
// ============================================================================

import express from 'express';
import { verificarToken, soloMaestro } from '../middlewares/auth.js';
// Importar el controlador específico para operaciones sobre sucursales.
import { deleteSucursal } from '../controllers/sucursal.controller.js';

const router = express.Router();

// ─── DELETE /api/maestro/sucursales/:id_sucursal ─────────────────────────────
// Borrado lógico transaccional de sucursal + personal + suscriptores
// DELETE: Borrado lógico transaccional de sucursal + dependencias
router.delete('/sucursales/:id_sucursal', verificarToken, soloMaestro, deleteSucursal);

export default router;
