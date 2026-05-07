// ============================================================================
//  routes/hardware.routes.js  (v2 — Solo NFC)
//
//  Endpoints exclusivos para el ESP32.
//  NO requieren JWT — usan api_key como autenticación de dispositivo.
//
//  Montar en index.js:
//    import hardwareRoutes from './routes/hardware.routes.js';
//    app.use('/api/hardware', hardwareRoutes);
//
//  Endpoints:
//    POST /api/hardware/token         → frontend solicita token de sesión NFC
//    GET  /api/hardware/siguiente/nfc → ESP32 hace polling para recoger token
//    POST /api/hardware/estado        → ESP32 reporta paso intermedio
//    GET  /api/hardware/poll/:token   → frontend hace polling del estado
//    POST /api/hardware/cancelar      → ESP32 o frontend cancelan sesión
//    POST /api/hardware/acceso        → ESP32 verifica acceso NFC
// ============================================================================

import express from 'express';
import crypto  from 'crypto';
import db      from '../config/database.js';

const router = express.Router();

// ─── API Key válida ──────────────────────────────────────────────────────────
const API_KEY_VALIDA = process.env.ESP32_API_KEY || 'axf_esp32_2025';

// ─── Middleware: verificar api_key en body o query ───────────────────────────
function verificarApiKey(req, res, next) {
  const key = req.body?.api_key || req.query?.api_key;
  if (key !== API_KEY_VALIDA) {
    return res.status(401).json({ message: 'API key inválida' });
  }
  next();
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/token
// El frontend llama esto cuando el personal presiona "Leer NFC".
// Body: { tipo: "nfc" }    (solo "nfc" es aceptado ahora)
// Response: { token: "A3F2C1B9", tipo: "nfc", expira_en: "60 segundos" }
// ════════════════════════════════════════════════════════════════════════════
router.post('/token', async (req, res) => {
  const { tipo } = req.body;

  if (tipo !== 'nfc') {
    return res.status(400).json({ message: 'tipo debe ser "nfc"' });
  }

  const token = crypto.randomBytes(4).toString('hex').toUpperCase();

  await db.query(
    `INSERT INTO hardware_sesiones (token, tipo, valor, usado, estado, paso)
     VALUES (?, 'nfc', '', 0, 'pending', 'esperando_dispositivo')`,
    [token]
  );

  // Limpiar tokens expirados (más de 3 minutos)
  await db.query(
    `DELETE FROM hardware_sesiones WHERE creado_en < DATE_SUB(NOW(), INTERVAL 3 MINUTE)`
  );

  console.log(`[HW] Token NFC generado: ${token}`);
  res.json({ token, tipo: 'nfc', expira_en: '60 segundos' });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/hardware/siguiente/nfc
// El ESP32 hace polling para ver si hay un token NFC pendiente.
// Response: { hay: false } | { hay: true, token: "A3F2C1B9", tipo: "nfc" }
// ════════════════════════════════════════════════════════════════════════════
router.get('/siguiente/nfc', verificarApiKey, async (req, res) => {
  const [[sesion]] = await db.query(
    `SELECT token FROM hardware_sesiones
     WHERE tipo = 'nfc' AND estado = 'pending' AND usado = 0
     ORDER BY creado_en DESC LIMIT 1`
  );

  if (!sesion) {
    return res.json({ hay: false });
  }

  await db.query(
    `UPDATE hardware_sesiones SET estado = 'reading', paso = 'listo_para_leer' WHERE token = ?`,
    [sesion.token]
  );

  console.log(`[HW] ESP32 recogió token NFC: ${sesion.token}`);
  res.json({ hay: true, token: sesion.token, tipo: 'nfc' });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/estado
// El ESP32 reporta pasos intermedios del proceso NFC.
// Pasos: "acerca_tarjeta" | "tarjeta_detectada" | "enviando"
// Body: { api_key, token_sesion, paso }
// ════════════════════════════════════════════════════════════════════════════
router.post('/estado', verificarApiKey, async (req, res) => {
  const { token_sesion, paso } = req.body;

  if (!token_sesion || !paso) {
    return res.status(400).json({ message: 'token_sesion y paso son requeridos' });
  }

  const [[sesion]] = await db.query(
    `SELECT token FROM hardware_sesiones WHERE token = ? AND usado = 0`,
    [token_sesion]
  );

  if (!sesion) {
    return res.status(404).json({ message: 'Token inválido o ya usado' });
  }

  await db.query(
    `UPDATE hardware_sesiones SET paso = ? WHERE token = ?`,
    [paso, token_sesion]
  );

  console.log(`[HW] Estado: ${token_sesion} → ${paso}`);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/cancelar
// El ESP32 o frontend cancelan el proceso (error o cancelación manual).
// Body: { api_key, token_sesion, motivo }
// ════════════════════════════════════════════════════════════════════════════
router.post('/cancelar', verificarApiKey, async (req, res) => {
  const { token_sesion, motivo } = req.body;

  if (!token_sesion) {
    return res.status(400).json({ message: 'token_sesion es requerido' });
  }

  await db.query(
    `UPDATE hardware_sesiones
     SET estado = 'error', paso = ?, usado = 1
     WHERE token = ?`,
    [motivo || 'error_desconocido', token_sesion]
  );

  console.log(`[HW] Sesión cancelada: ${token_sesion} — motivo: ${motivo}`);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/evento
// El ESP32 reporta una lectura NFC exitosa.
// Body: { api_key, tipo: "nfc", valor: "A3:F2:C1:B9", token_sesion }
// Response: { ok: true }
// ════════════════════════════════════════════════════════════════════════════
router.post('/evento', verificarApiKey, async (req, res) => {
  const { tipo, valor, token_sesion } = req.body;

  if (!valor || !token_sesion) {
    return res.status(400).json({ message: 'valor y token_sesion son requeridos' });
  }

  if (tipo !== 'nfc') {
    return res.status(400).json({ message: 'Solo se aceptan eventos de tipo "nfc"' });
  }

  const [[sesion]] = await db.query(
    `SELECT * FROM hardware_sesiones WHERE token = ? AND tipo = 'nfc' AND usado = 0`,
    [token_sesion]
  );

  if (!sesion) {
    return res.status(404).json({ message: 'Token inválido, expirado o ya usado' });
  }

  await db.query(
    `UPDATE hardware_sesiones SET valor = ?, usado = 1, estado = 'done', paso = 'completado' WHERE token = ?`,
    [valor, token_sesion]
  );

  console.log(`[HW] Evento NFC: valor=${valor}, token=${token_sesion}`);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/hardware/poll/:token
// El frontend hace polling cada 1.5s para saber el estado del proceso.
// Response:
//   { estado: 'pending', paso: 'esperando_dispositivo' }
//   { estado: 'reading', paso: 'acerca_tarjeta' }
//   { estado: 'done',    tipo: 'nfc', valor: 'AA:BB:CC:DD' }
//   { estado: 'error',   paso: 'timeout_nfc' }
// ════════════════════════════════════════════════════════════════════════════
router.get('/poll/:token', async (req, res) => {
  const { token } = req.params;

  const [[sesion]] = await db.query(
    `SELECT tipo, valor, estado, paso FROM hardware_sesiones WHERE token = ?`,
    [token]
  );

  if (!sesion) {
    return res.status(404).json({ message: 'Token no encontrado' });
  }

  if (sesion.estado === 'done') {
    return res.json({ estado: 'done', tipo: sesion.tipo, valor: sesion.valor });
  }

  if (sesion.estado === 'error') {
    return res.json({ estado: 'error', paso: sesion.paso });
  }

  res.json({ estado: sesion.estado, paso: sesion.paso });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/acceso
// El ESP32 verifica si un suscriptor puede entrar (modo torniquete).
// Body: { api_key, tipo: "nfc", valor: "AA:BB:CC:DD" }
// Response: { resultado: "Permitido"|"Denegado_Sin_Sub"|"Denegado_No_Encontrado", nombre }
// ════════════════════════════════════════════════════════════════════════════
router.post('/acceso', verificarApiKey, async (req, res) => {
  const { tipo, valor } = req.body;

  if (tipo !== 'nfc' || !valor) {
    return res.status(400).json({ message: 'tipo "nfc" y valor son requeridos' });
  }

  try {
    const [rows] = await db.query(
      `SELECT id_suscriptor, id_sucursal_registro, nombres, apellido_paterno, activo
         FROM suscriptores WHERE nfc_uid = ? LIMIT 1`,
      [valor]
    );

    const suscriptor = rows[0];

    if (!suscriptor) {
      console.log(`[HW/ACCESO] Denegado — NFC no registrado: ${valor}`);
      return res.json({ resultado: 'Denegado_No_Encontrado', nombre: null });
    }

    const nombre = `${suscriptor.nombres} ${suscriptor.apellido_paterno}`;

    const [[sub]] = await db.query(
      `SELECT id_suscripcion FROM suscripciones
        WHERE id_suscriptor = ?
          AND estado = 'Activa'
          AND fecha_fin >= CURDATE()
        LIMIT 1`,
      [suscriptor.id_suscriptor]
    );

    const resultado = sub ? 'Permitido' : 'Denegado_Sin_Sub';

    await db.query(
      `INSERT INTO accesos (id_suscriptor, id_sucursal, metodo, resultado, fecha_hora)
       VALUES (?, ?, 'NFC', ?, NOW())`,
      [suscriptor.id_suscriptor, suscriptor.id_sucursal_registro, resultado]
    );

    console.log(`[HW/ACCESO] ${resultado} — ${nombre}`);
    res.json({ resultado, nombre });

  } catch (err) {
    console.error('[HW/ACCESO] Error:', err.message);
    res.status(500).json({ message: 'Error interno' });
  }
});

export default router;