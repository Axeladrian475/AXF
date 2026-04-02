// src/routes/chat.routes.js
const router = require("express").Router();
const {
  getConversations,
  createOrGetConversation,
  getMessages,
  getSubscribers,
  getUnreadCount,
} = require("../controllers/chat.controller");
const { authMiddleware, requireTrainer } = require("../middleware/auth.middleware");

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Conversaciones
router.get("/conversations", getConversations);
router.post("/conversations", createOrGetConversation);
router.get("/conversations/:id/messages", getMessages);

// Suscriptores (solo entrenador)
router.get("/subscribers", requireTrainer, getSubscribers);

// Conteo de no leídos
router.get("/unread-count", getUnreadCount);

module.exports = router;
