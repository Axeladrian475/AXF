// ============================================================================
//  routes/chat.routes.js
// ============================================================================

import express from 'express';
import { verificarToken, personalOSucursal } from '../middlewares/auth.js';
import {
  listarConversaciones,
  obtenerMensajes,
  enviarMensaje,
  contarNoLeidos,
  listarSuscriptoresDisponibles,
} from '../controllers/chat.controller.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ─── Middleware que acepta AMBOS: personal/sucursal/maestro Y suscriptor ──────
function verificarTokenAny(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }
}

// ─── Endpoints para AMBOS roles (personal y suscriptor) ──────────────────────
router.get('/conversaciones',                 verificarTokenAny, listarConversaciones);
router.get('/mensajes/personal/:id_personal', verificarTokenAny, obtenerMensajes);
router.post('/mensajes',                      verificarTokenAny, enviarMensaje);
router.get('/no-leidos',                      verificarTokenAny, contarNoLeidos);

// ─── Endpoints SOLO para personal ────────────────────────────────────────────
router.use(verificarToken);
router.get('/mensajes/:id_suscriptor',        personalOSucursal, obtenerMensajes);
router.get('/suscriptores-disponibles',       personalOSucursal, listarSuscriptoresDisponibles);

export default router;