// src/config/socket.js
// Motor de tiempo real - maneja conexiones WebSocket entre entrenador y suscriptores

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Mapa en memoria: userId → socketId (para saber si está conectado)
const onlineUsers = new Map();

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  // ─── Autenticación del socket ─────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Token requerido"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, role: true },
      });

      if (!user) return next(new Error("Usuario no encontrado"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Token inválido"));
    }
  });

  // ─── Eventos de conexión ──────────────────────────────────────────────────
  io.on("connection", async (socket) => {
    const userId = socket.user.id;
    console.log(`✅ Usuario conectado: ${socket.user.name} (${socket.user.role})`);

    // Registrar usuario como online
    onlineUsers.set(userId, socket.id);
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true },
    });

    // Unirse a sala personal (para recibir mensajes directos)
    socket.join(`user:${userId}`);

    // Notificar a todos que este usuario está online
    socket.broadcast.emit("user:online", { userId });

    // ─── ENVIAR MENSAJE ───────────────────────────────────────────────────────
    socket.on("message:send", async (data, callback) => {
      try {
        const { conversationId, content, type = "TEXT" } = data;

        // Verificar que el usuario pertenece a la conversación
        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            participants: { some: { id: userId } },
          },
          include: {
            participants: { select: { id: true } },
          },
        });

        if (!conversation) {
          return callback?.({ ok: false, error: "Conversación no encontrada" });
        }

        // Guardar mensaje en la BD
        const message = await prisma.message.create({
          data: {
            content,
            type,
            senderId: userId,
            conversationId,
          },
          include: {
            sender: { select: { id: true, name: true, role: true, avatar: true } },
          },
        });

        // Actualizar cache de último mensaje en la conversación
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessage: content,
            lastMessageAt: new Date(),
          },
        });

        // Emitir el mensaje a todos los participantes de la conversación
        conversation.participants.forEach((participant) => {
          io.to(`user:${participant.id}`).emit("message:new", {
            conversationId,
            message,
          });
        });

        callback?.({ ok: true, message });
      } catch (err) {
        console.error("Error enviando mensaje:", err);
        callback?.({ ok: false, error: "Error al enviar el mensaje" });
      }
    });

    // ─── MARCAR MENSAJES COMO LEÍDOS ─────────────────────────────────────────
    socket.on("messages:read", async (data) => {
      try {
        const { conversationId } = data;

        await prisma.message.updateMany({
          where: {
            conversationId,
            readAt: null,
            senderId: { not: userId }, // Solo marcar los que no envié yo
          },
          data: { readAt: new Date() },
        });

        // Notificar al remitente que sus mensajes fueron leídos
        const conversation = await prisma.conversation.findFirst({
          where: { id: conversationId },
          include: { participants: { select: { id: true } } },
        });

        conversation?.participants.forEach((p) => {
          if (p.id !== userId) {
            io.to(`user:${p.id}`).emit("messages:read", { conversationId, readBy: userId });
          }
        });
      } catch (err) {
        console.error("Error marcando mensajes:", err);
      }
    });

    // ─── INDICADOR DE "ESCRIBIENDO..." ───────────────────────────────────────
    socket.on("typing:start", (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit("typing:start", {
        userId,
        userName: socket.user.name,
        conversationId,
      });
    });

    socket.on("typing:stop", (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit("typing:stop", {
        userId,
        conversationId,
      });
    });

    // ─── UNIRSE A SALA DE CONVERSACIÓN ────────────────────────────────────────
    socket.on("conversation:join", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    // ─── DESCONEXIÓN ─────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`❌ Usuario desconectado: ${socket.user.name}`);
      onlineUsers.delete(userId);

      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() },
      });

      socket.broadcast.emit("user:offline", { userId, lastSeen: new Date() });
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.io no inicializado");
  return io;
}

function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

module.exports = { initSocket, getIO, isUserOnline };
