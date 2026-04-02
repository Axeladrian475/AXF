// ============================================================================
//  routes/suscriptores.routes.js
//
//  POST   /api/suscriptores                          → Registrar nuevo suscriptor
//  GET    /api/suscriptores                          → Listar suscriptores locales
//  GET    /api/suscriptores/otras-sucursales         → Suscriptores de otras sucursales
//  GET    /api/suscriptores/:id                      → Detalle de un suscriptor
//  PUT    /api/suscriptores/:id                      → Modificar datos de un suscriptor
//  DELETE /api/suscriptores/:id                      → Dar de baja (soft delete)
//  POST   /api/suscriptores/:id/migrar               → Migrar suscriptor a sucursal actual
//  GET    /api/suscriptores/:id/suscripcion-activa   → Suscripción vigente del suscriptor
//  POST   /api/suscriptores/:id/suscribir            → Suscribir a un tipo de suscripción
// ============================================================================
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import express from 'express';
import db from '../config/database.js';
import {
  verificarToken,
  personalOSucursal,
} from '../middlewares/auth.js';
import {
  registrarSuscriptor,
  listarSuscriptores,
  listarSuscriptoresOtrasSucursales,
  obtenerSuscriptor,
  modificarSuscriptor,
  eliminarSuscriptor,
  migrarSuscriptor,
  obtenerSuscripcionActiva,
  suscribirSuscriptor,
} from '../controllers/suscriptores.controller.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Correo y contraseña son requeridos.' });
    }

    // Buscar suscriptor por correo
    const [[suscriptor]] = await db.query(
      `SELECT id_suscriptor, nombres, apellido_paterno, correo,
              id_sucursal_registro, password_hash, activo
       FROM suscriptores
       WHERE correo = ? AND activo = 1`,
      [email.trim().toLowerCase()]
    );

    if (!suscriptor) {
      return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos.' });
    }

    // Verificar contraseña
    const valida = await bcrypt.compare(password, suscriptor.password_hash);
    if (!valida) {
      return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos.' });
    }

    // Verificar si tiene suscripción activa
    const [[sub]] = await db.query(
      `SELECT fecha_fin FROM suscripciones
       WHERE id_suscriptor = ? AND estado = 'Activa' AND fecha_fin >= CURDATE()
       ORDER BY fecha_fin DESC LIMIT 1`,
      [suscriptor.id_suscriptor]
    );

    const token = jwt.sign(
      { id: suscriptor.id_suscriptor, rol: 'suscriptor' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: 'Login exitoso.',
      token,
      suscriptor: {
        id: suscriptor.id_suscriptor,
        nombres: suscriptor.nombres,
        apellidoPaterno: suscriptor.apellido_paterno,
        correo: suscriptor.correo,
        sucursalId: suscriptor.id_sucursal_registro,
        suscripcionActiva: !!sub,
        fechaVencimiento: sub ? sub.fecha_fin : null,
      }
    });

  } catch (error) {
    console.error('[POST /suscriptores/login]', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

// ─── Todos los endpoints requieren token válido ───────────────────────────────
router.use(verificarToken, personalOSucursal);

// ─── Rutas sin parámetro :id (deben ir antes para evitar conflicto con /:id) ──
router.get   ('/otras-sucursales', listarSuscriptoresOtrasSucursales);
router.post  ('/',                 registrarSuscriptor);
router.get   ('/',                 listarSuscriptores);

// ── POST /api/suscriptores/identificar ──────────────────────────────────────
// Identifica a un suscriptor por su uid NFC o template de huella (valor leído
// por el ESP32). Usado por el flujo de canje de recompensas para saber quién
// es el suscriptor sin que tenga que ingresar su ID manualmente.
//
// Body: { tipo: "nfc" | "huella", valor: string }
// Response: { id_suscriptor, nombre, puntos, activo }
router.post('/identificar', async (req, res) => {
  const { tipo, valor } = req.body;
  if (!tipo || !valor) {
    return res.status(400).json({ message: 'tipo y valor son requeridos.' });
  }
  if (!['nfc', 'huella'].includes(tipo)) {
    return res.status(400).json({ message: 'tipo debe ser "nfc" o "huella".' });
  }
  try {
    const campo = tipo === 'nfc' ? 'nfc_uid' : 'huella_template';
    const [[suscriptor]] = await db.query(
      `SELECT id_suscriptor,
              CONCAT(nombres, ' ', apellido_paterno) AS nombre,
              puntos,
              activo
       FROM suscriptores
       WHERE ${campo} = ? LIMIT 1`,
      [valor]
    );
    if (!suscriptor) {
      return res.status(404).json({ message: 'Suscriptor no encontrado.' });
    }
    res.json(suscriptor);
  } catch (err) {
    console.error('[POST /suscriptores/identificar]', err);
    res.status(500).json({ message: 'Error interno al identificar suscriptor.' });
  }
});

// ─── Rutas con parámetro :id ──────────────────────────────────────────────────
router.get   ('/:id',                    obtenerSuscriptor);
router.put   ('/:id',                    modificarSuscriptor);
router.delete('/:id',                    eliminarSuscriptor);
router.post  ('/:id/migrar',             migrarSuscriptor);
router.get   ('/:id/suscripcion-activa', obtenerSuscripcionActiva);
router.post  ('/:id/suscribir',          suscribirSuscriptor);

export default router;