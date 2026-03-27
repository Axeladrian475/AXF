// ============================================================================
//  routes/hardware.routes.js
//
//  Endpoints exclusivos para el ESP32.
//  NO requieren JWT — usan api_key como autenticación de dispositivo.
//
//  Montar en index.js:
//    import hardwareRoutes from './routes/hardware.routes.js';
//    app.use('/api/hardware', hardwareRoutes);
//
//  Endpoints:
//    POST /api/hardware/token         → frontend solicita token de sesión para registro
//    POST /api/hardware/evento        → ESP32 reporta una lectura (nfc o huella)
//    POST /api/hardware/estado        → ESP32 reporta paso intermedio del proceso
//    GET  /api/hardware/poll/:token   → frontend hace polling para saber el estado actual
//    POST /api/hardware/cancelar      → ESP32 o frontend cancelan una sesión con error
//    POST /api/hardware/acceso        → ESP32 verifica si un suscriptor puede entrar
// ============================================================================

import express  from 'express';
import crypto   from 'crypto';
import db       from '../config/database.js';

const router = express.Router();

// ─── API Key válida ─────────────────────────────────────────────────────────
const API_KEY_VALIDA = process.env.ESP32_API_KEY || 'axf_esp32_2025';

// ─── Middleware: verificar api_key en body o query ───────────────────────────
// Soporta GET (query param) y POST (body) para compatibilidad con ESP32
function verificarApiKey(req, res, next) {
  const key = req.body?.api_key || req.query?.api_key;
  if (key !== API_KEY_VALIDA) {
    return res.status(401).json({ message: 'API key inválida' });
  }
  next();
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/token
// El frontend llama esto cuando el personal presiona "Leer NFC" o "Escanear Huella".
// El ESP32 hace polling a este endpoint para recibir el token automáticamente
// (ya no requiere ingreso manual en Serial Monitor).
//
// Body: { tipo: "nfc" | "huella" }
// Response: { token: "A3F2C1B9", tipo, expira_en: "60 segundos" }
// ════════════════════════════════════════════════════════════════════════════
router.post('/token', async (req, res) => {
  const { tipo } = req.body;

  if (!tipo || !['nfc', 'huella'].includes(tipo)) {
    return res.status(400).json({ message: 'tipo debe ser "nfc" o "huella"' });
  }

  const token = crypto.randomBytes(4).toString('hex').toUpperCase();

  // estado: pending → el ESP32 aún no recogió el token
  //         reading → el ESP32 ya lo tiene y está esperando al usuario
  //         done    → lectura completada con éxito
  //         error   → falló algo durante la lectura
  await db.query(
    `INSERT INTO hardware_sesiones (token, tipo, valor, usado, estado, paso)
     VALUES (?, ?, '', 0, 'pending', 'esperando_dispositivo')`,
    [token, tipo]
  );

  // Limpiar tokens expirados (más de 3 minutos)
  await db.query(
    `DELETE FROM hardware_sesiones WHERE creado_en < DATE_SUB(NOW(), INTERVAL 3 MINUTE)`
  );

  console.log(`[HW] Token generado: ${token} (tipo: ${tipo})`);
  res.json({ token, tipo, expira_en: '60 segundos' });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/hardware/siguiente/:tipo
// El ESP32 hace polling para ver si hay un token pendiente de tipo nfc o huella.
// Cuando lo recoge cambia el estado a "reading" para que el frontend sepa
// que el ESP32 ya está listo y esperando al usuario.
//
// Params: tipo = "nfc" | "huella"
// Response: { hay: false } | { hay: true, token: "A3F2C1B9", tipo }
// ════════════════════════════════════════════════════════════════════════════
router.get('/siguiente/:tipo', verificarApiKey, async (req, res) => {
  const { tipo } = req.params;

  const [[sesion]] = await db.query(
    `SELECT token FROM hardware_sesiones
     WHERE tipo = ? AND estado = 'pending' AND usado = 0
     ORDER BY creado_en DESC LIMIT 1`,
    [tipo]
  );

  if (!sesion) {
    return res.json({ hay: false });
  }

  // Marcar que el ESP32 ya recogió la tarea
  await db.query(
    `UPDATE hardware_sesiones SET estado = 'reading', paso = 'listo_para_leer' WHERE token = ?`,
    [sesion.token]
  );

  console.log(`[HW] ESP32 recogió token ${sesion.token} (tipo: ${tipo})`);
  res.json({ hay: true, token: sesion.token, tipo });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/estado
// El ESP32 llama esto para reportar pasos intermedios del proceso
// (ej: "acercando dedo", "primera toma ok", "retira dedo", etc.)
// El frontend lo muestra en el modal como guía paso a paso.
//
// Body: { api_key, token_sesion, paso: "string_del_paso" }
// Pasos NFC:    "acerca_tarjeta" | "tarjeta_detectada" | "enviando"
// Pasos Huella: "acerca_dedo_1" | "dedo_1_ok" | "retira_dedo" |
//               "acerca_dedo_2" | "dedo_2_ok" | "creando_modelo" | "guardando"
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

  console.log(`[HW] Estado actualizado: ${token_sesion} → paso: ${paso}`);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/cancelar
// El ESP32 llama esto cuando ocurre un error durante la lectura.
// Registra el error sin consumir el slot de memoria del sensor
// (si falló antes de guardar, no hay nada que limpiar).
//
// Body: { api_key, token_sesion, motivo: "string del error" }
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
// El ESP32 llama esto después de leer NFC o huella EXITOSAMENTE.
//
// Body: { api_key, tipo: "nfc"|"huella", valor: "A3:F2:C1:B9" | "3", token_sesion }
// Response: { ok: true } | error
// ════════════════════════════════════════════════════════════════════════════
router.post('/evento', verificarApiKey, async (req, res) => {
  const { tipo, valor, token_sesion } = req.body;

  if (!tipo || !valor || !token_sesion) {
    return res.status(400).json({ message: 'tipo, valor y token_sesion son requeridos' });
  }

  const [[sesion]] = await db.query(
    `SELECT * FROM hardware_sesiones WHERE token = ? AND tipo = ? AND usado = 0`,
    [token_sesion, tipo]
  );

  if (!sesion) {
    return res.status(404).json({ message: 'Token inválido, expirado o ya usado' });
  }

  await db.query(
    `UPDATE hardware_sesiones SET valor = ?, usado = 1, estado = 'done', paso = 'completado' WHERE token = ?`,
    [valor, token_sesion]
  );

  console.log(`[HW] Evento recibido — tipo: ${tipo}, valor: ${valor}, token: ${token_sesion}`);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/hardware/poll/:token
// El frontend hace polling cada 1.5s para saber el estado actual del proceso.
//
// Response:
//   { estado: 'pending', paso: 'esperando_dispositivo' }
//   { estado: 'reading', paso: 'acerca_dedo_1' }         ← paso intermedio
//   { estado: 'done', tipo, valor }                       ← lectura exitosa
//   { estado: 'error', paso: 'motivo_del_error' }         ← falló, reiniciar
// ════════════════════════════════════════════════════════════════════════════
router.get('/poll/:token', async (req, res) => {
  const { token } = req.params;

  const [[sesion]] = await db.query(
    `SELECT tipo, valor, usado, estado, paso FROM hardware_sesiones WHERE token = ?`,
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
// El ESP32 llama esto en modo ACCESO para verificar si un suscriptor puede entrar.
//
// Body: { api_key, tipo: "nfc"|"huella", valor }
// Response: { resultado: "Permitido"|"Denegado_Sin_Sub"|"Denegado_No_Encontrado", nombre }
// ════════════════════════════════════════════════════════════════════════════
router.post('/acceso', verificarApiKey, async (req, res) => {
  const { tipo, valor } = req.body;

  if (!tipo || !valor) {
    return res.status(400).json({ message: 'tipo y valor son requeridos' });
  }

  try {
    let rows;
    if (tipo === 'nfc') {
      [rows] = await db.query(
        `SELECT id_suscriptor, id_sucursal_registro, nombres, apellido_paterno, activo
           FROM suscriptores WHERE nfc_uid = ? LIMIT 1`,
        [valor]
      );
    } else {
      [rows] = await db.query(
        `SELECT id_suscriptor, id_sucursal_registro, nombres, apellido_paterno, activo
           FROM suscriptores WHERE huella_template = ? LIMIT 1`,
        [valor]
      );
    }

    const suscriptor = rows[0];

    if (!suscriptor) {
      console.log(`[HW/ACCESO] Denegado — no encontrado (${tipo}: ${valor})`);
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

    const metodoEnum = tipo === 'nfc' ? 'NFC' : 'Huella';
    await db.query(
      `INSERT INTO accesos (id_suscriptor, id_sucursal, metodo, resultado, fecha_hora)
       VALUES (?, ?, ?, ?, NOW())`,
      [suscriptor.id_suscriptor, suscriptor.id_sucursal_registro, metodoEnum, resultado]
    );

    console.log(`[HW/ACCESO] ${resultado} — ${nombre}`);
    res.json({ resultado, nombre });

  } catch (err) {
    console.error('[HW/ACCESO] Error:', err.message);
    res.status(500).json({ message: 'Error interno' });
  }
});

export default router;