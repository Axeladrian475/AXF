// src/middleware/auth.middleware.js
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, message: "Token no proporcionado" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    });

    if (!user) {
      return res.status(401).json({ ok: false, message: "Usuario no encontrado" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: "Token inválido o expirado" });
  }
}

// Middleware para verificar que el usuario es entrenador
function requireTrainer(req, res, next) {
  if (req.user?.role !== "TRAINER") {
    return res.status(403).json({ ok: false, message: "Solo entrenadores pueden realizar esta acción" });
  }
  next();
}

module.exports = { authMiddleware, requireTrainer };
