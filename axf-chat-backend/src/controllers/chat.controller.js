// src/controllers/chat.controller.js
const { PrismaClient } = require("@prisma/client");
const { isUserOnline } = require("../config/socket");

const prisma = new PrismaClient();

// ─── GET /api/chat/conversations ─────────────────────────────────────────────
// Lista todas las conversaciones del usuario actual (entrenador o suscriptor)
async function getConversations(req, res) {
  try {
    const userId = req.user.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { id: userId } },
      },
      include: {
        participants: {
          where: { id: { not: userId } }, // El otro participante (no yo)
          select: { id: true, name: true, avatar: true, role: true, isOnline: true, lastSeen: true },
        },
        messages: {
          where: { readAt: null, senderId: { not: userId } }, // Mensajes no leídos
          select: { id: true },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    // Enriquecer con estado online en tiempo real
    const enriched = conversations.map((conv) => ({
      id: conv.id,
      lastMessage: conv.lastMessage,
      lastMessageAt: conv.lastMessageAt,
      unreadCount: conv.messages.length,
      contact: conv.participants[0]
        ? {
            ...conv.participants[0],
            isOnline: isUserOnline(conv.participants[0].id),
          }
        : null,
    }));

    res.json({ ok: true, conversations: enriched });
  } catch (err) {
    console.error("Error en getConversations:", err);
    res.status(500).json({ ok: false, message: "Error al obtener conversaciones" });
  }
}

// ─── POST /api/chat/conversations ────────────────────────────────────────────
// Crear o retornar una conversación existente entre dos usuarios
async function createOrGetConversation(req, res) {
  try {
    const userId = req.user.id;
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ ok: false, message: "participantId es requerido" });
    }

    if (participantId === userId) {
      return res.status(400).json({ ok: false, message: "No puedes iniciar conversación contigo mismo" });
    }

    // Verificar que el participante existe
    const participant = await prisma.user.findUnique({
      where: { id: participantId },
      select: { id: true, name: true, role: true },
    });

    if (!participant) {
      return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
    }

    // Buscar conversación existente entre los dos usuarios
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { id: userId } } },
          { participants: { some: { id: participantId } } },
        ],
      },
      include: {
        participants: {
          select: { id: true, name: true, avatar: true, role: true, isOnline: true },
        },
      },
    });

    if (existing) {
      return res.json({ ok: true, conversation: existing, created: false });
    }

    // Crear nueva conversación
    const conversation = await prisma.conversation.create({
      data: {
        participants: { connect: [{ id: userId }, { id: participantId }] },
      },
      include: {
        participants: {
          select: { id: true, name: true, avatar: true, role: true, isOnline: true },
        },
      },
    });

    res.status(201).json({ ok: true, conversation, created: true });
  } catch (err) {
    console.error("Error en createOrGetConversation:", err);
    res.status(500).json({ ok: false, message: "Error al crear conversación" });
  }
}

// ─── GET /api/chat/conversations/:id/messages ────────────────────────────────
// Obtener historial de mensajes de una conversación (con paginación)
async function getMessages(req, res) {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;
    const { page = 1, limit = 30 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Verificar acceso a la conversación
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { id: userId } },
      },
    });

    if (!conversation) {
      return res.status(404).json({ ok: false, message: "Conversación no encontrada" });
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: { select: { id: true, name: true, avatar: true, role: true } },
        },
        orderBy: { createdAt: "desc" }, // Más recientes primero
        skip,
        take: Number(limit),
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    // Marcar como leídos los mensajes recibidos
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    res.json({
      ok: true,
      messages: messages.reverse(), // Orden cronológico para el front
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
        hasMore: skip + messages.length < total,
      },
    });
  } catch (err) {
    console.error("Error en getMessages:", err);
    res.status(500).json({ ok: false, message: "Error al obtener mensajes" });
  }
}

// ─── GET /api/chat/subscribers ───────────────────────────────────────────────
// Para el entrenador: lista sus suscriptores con estado online
async function getSubscribers(req, res) {
  try {
    const trainerId = req.user.id;

    const subscribers = await prisma.user.findMany({
      where: { trainerId, role: "SUBSCRIBER" },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    // Enriquecer con estado online real
    const enriched = subscribers.map((s) => ({
      ...s,
      isOnline: isUserOnline(s.id),
    }));

    res.json({ ok: true, subscribers: enriched });
  } catch (err) {
    console.error("Error en getSubscribers:", err);
    res.status(500).json({ ok: false, message: "Error al obtener suscriptores" });
  }
}

// ─── GET /api/chat/unread-count ──────────────────────────────────────────────
// Cantidad total de mensajes no leídos del usuario
async function getUnreadCount(req, res) {
  try {
    const userId = req.user.id;

    const count = await prisma.message.count({
      where: {
        conversation: { participants: { some: { id: userId } } },
        senderId: { not: userId },
        readAt: null,
      },
    });

    res.json({ ok: true, unreadCount: count });
  } catch (err) {
    console.error("Error en getUnreadCount:", err);
    res.status(500).json({ ok: false, message: "Error al obtener conteo" });
  }
}

module.exports = {
  getConversations,
  createOrGetConversation,
  getMessages,
  getSubscribers,
  getUnreadCount,
};
