// src/controllers/auth.controller.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password, role = "SUBSCRIBER", trainerId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, message: "Nombre, email y contraseña son requeridos" });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ ok: false, message: "El email ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        trainerId: role === "SUBSCRIBER" ? trainerId : null,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const token = generateToken(user.id);

    res.status(201).json({ ok: true, token, user });
  } catch (err) {
    console.error("Error en register:", err);
    res.status(500).json({ ok: false, message: "Error al registrar usuario" });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Email y contraseña requeridos" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ ok: false, message: "Credenciales inválidas" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ ok: false, message: "Credenciales inválidas" });
    }

    const token = generateToken(user.id);

    const { password: _, ...userWithoutPassword } = user;
    res.json({ ok: true, token, user: userWithoutPassword });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ ok: false, message: "Error al iniciar sesión" });
  }
}

// GET /api/auth/me
async function me(req, res) {
  res.json({ ok: true, user: req.user });
}

module.exports = { register, login, me };
