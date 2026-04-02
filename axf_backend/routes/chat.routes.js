// ============================================================================
//  routes/chat.routes.js
//
//  GET  /api/chat/conversaciones              → lista de chats activos
//  GET  /api/chat/mensajes/:id_suscriptor     → historial (personal lo usa)
//  GET  /api/chat/mensajes/personal/:id_personal → historial (suscriptor lo usa)
//  POST /api/chat/mensajes                    → enviar mensaje (REST fallback)
//  GET  /api/chat/no-leidos                   → badge de no leídos
//  GET  /api/chat/suscriptores-disponibles    → para "Iniciar Nueva Conversación"
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

const router = express.Router();

// Todos los endpoints requieren token válido
router.use(verificarToken);

// ─── Conversaciones ───────────────────────────────────────────────────────────
router.get('/conversaciones',           personalOSucursal, listarConversaciones);

// ─── Mensajes ────────────────────────────────────────────────────────────────
// Personal consulta mensajes con un suscriptor específico
router.get('/mensajes/:id_suscriptor',  personalOSucursal, obtenerMensajes);

// Suscriptor consulta mensajes con un personal específico
// (preparado para cuando los suscriptores tengan login en app móvil)
router.get('/mensajes/personal/:id_personal', obtenerMensajes);

// Enviar mensaje (REST fallback — el WebSocket es la vía principal)
router.post('/mensajes',                personalOSucursal, enviarMensaje);

// ─── Utilidades ───────────────────────────────────────────────────────────────
router.get('/no-leidos',                personalOSucursal, contarNoLeidos);
router.get('/suscriptores-disponibles', personalOSucursal, listarSuscriptoresDisponibles);

export default router;
