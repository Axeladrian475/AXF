// src/controllers/user.controller.js
const { PrismaClient } = require("@prisma/client");
const { isUserOnline } = require("../config/socket");

const prisma = new PrismaClient();

// GET /api/users/online
// Lista de usuarios online (útil para el entrenador)
async function getOnlineUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      where: { isOnline: true, id: { not: req.user.id } },
      select: { id: true, name: true, role: true, avatar: true },
    });

    res.json({ ok: true, users });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Error al obtener usuarios online" });
  }
}

// GET /api/users/search?q=nombre
async function searchUsers(req, res) {
  try {
    const { q } = req.query;
    if (!q) return res.json({ ok: true, users: [] });

    const users = await prisma.user.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
        id: { not: req.user.id },
      },
      select: { id: true, name: true, role: true, avatar: true, isOnline: true },
      take: 10,
    });

    res.json({ ok: true, users });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Error en la búsqueda" });
  }
}

module.exports = { getOnlineUsers, searchUsers };
