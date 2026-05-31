import { Router } from 'express';
import { verificarToken, soloSucursal } from '../middlewares/auth.js';
import {
  obtenerNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
} from '../controllers/notificaciones_sucursal.controller.js';

const router = Router();

// Todas las rutas requieren token y rol 'sucursal'
router.use(verificarToken);
router.use(soloSucursal);

router.get('/', obtenerNotificaciones);
router.put('/leer-todas', marcarTodasLeidas);
router.put('/:id/leer', marcarLeida);

export default router;
