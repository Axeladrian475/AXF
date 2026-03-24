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
//    POST /api/hardware/token   → frontend solicita token de sesión para registro
//    POST /api/hardware/evento  → ESP32 reporta una lectura (nfc o huella)
//    POST /api/hardware/acceso  → ESP32 verifica si un suscriptor puede entrar
//    GET  /api/hardware/poll/:token → frontend hace polling para saber si ya llegó lectura
// ============================================================================

import express  from 'express';
import crypto   from 'crypto';
import db       from '../config/database.js';

const router = express.Router();

// ─── API Key válida ─────────────────────────────────────────────────────────
const API_KEY_VALIDA = process.env.ESP32_API_KEY || 'axf_esp32_2025';

// ─── Middleware: verificar api_key en body ────────────────────────────────────
function verificarApiKey(req, res, next) {
  const key = req.body?.api_key;
  if (key !== API_KEY_VALIDA) {
    return res.status(401).json({ message: 'API key inválida' });
  }
  next();
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/token
// El frontend llama esto cuando el personal presiona "Leer NFC" o "Escanear Huella".
// Devuelve un token de 8 caracteres que el personal escribe en el Serial Monitor.
//
// Body: { tipo: "nfc" | "huella" }
// Response: { token: "A3F2C1B9", expira_en: "60 segundos" }
// ════════════════════════════════════════════════════════════════════════════
router.post('/token', async (req, res) => {
  const { tipo } = req.body;

  if (!tipo || !['nfc', 'huella'].includes(tipo)) {
    return res.status(400).json({ message: 'tipo debe ser "nfc" o "huella"' });
  }

  // Generar token corto (8 chars hex, fácil de escribir)
  const token = crypto.randomBytes(4).toString('hex').toUpperCase();

  // Guardar en hardware_sesiones (expira en 60s — el frontend limpia si no llega)
  await db.query(
    `INSERT INTO hardware_sesiones (token, tipo, valor, usado) VALUES (?, ?, '', 0)`,
    [token, tipo]
  );

  // Limpiar tokens expirados (más de 2 minutos)
  await db.query(
    `DELETE FROM hardware_sesiones WHERE creado_en < DATE_SUB(NOW(), INTERVAL 2 MINUTE)`
  );

  console.log(`[HW] Token generado: ${token} (tipo: ${tipo})`);
  res.json({ token, tipo, expira_en: '60 segundos' });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/evento
// El ESP32 llama esto después de leer NFC o huella.
//
// Body: { api_key, tipo: "nfc"|"huella", valor: "A3:F2:C1:B9" | "3", token_sesion }
// Response: { ok: true } | error
// ════════════════════════════════════════════════════════════════════════════
router.post('/evento', verificarApiKey, async (req, res) => {
  const { tipo, valor, token_sesion } = req.body;

  if (!tipo || !valor || !token_sesion) {
    return res.status(400).json({ message: 'tipo, valor y token_sesion son requeridos' });
  }

  // Verificar que el token existe y no ha sido usado
  const [[sesion]] = await db.query(
    `SELECT * FROM hardware_sesiones WHERE token = ? AND tipo = ? AND usado = 0`,
    [token_sesion, tipo]
  );

  if (!sesion) {
    return res.status(404).json({ message: 'Token inválido, expirado o ya usado' });
  }

  // Guardar el valor leído y marcar como usado
  await db.query(
    `UPDATE hardware_sesiones SET valor = ?, usado = 1 WHERE token = ?`,
    [valor, token_sesion]
  );

  console.log(`[HW] Evento recibido — tipo: ${tipo}, valor: ${valor}, token: ${token_sesion}`);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/hardware/poll/:token
// El frontend hace polling cada 2s para saber si el ESP32 ya mandó la lectura.
//
// Response: { listo: false } | { listo: true, tipo, valor }
// ════════════════════════════════════════════════════════════════════════════
router.get('/poll/:token', async (req, res) => {
  const { token } = req.params;

  const [[sesion]] = await db.query(
    `SELECT tipo, valor, usado FROM hardware_sesiones WHERE token = ?`,
    [token]
  );

  if (!sesion) {
    return res.status(404).json({ message: 'Token no encontrado' });
  }

  if (!sesion.usado || sesion.valor === '') {
    return res.json({ listo: false });
  }

  res.json({ listo: true, tipo: sesion.tipo, valor: sesion.valor });
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
    // 1. Buscar suscriptor por credencial
    let rows;
    if (tipo === 'nfc') {
      [rows] = await db.query(
        `SELECT id_suscriptor, id_sucursal_registro, nombres, apellido_paterno, activo
           FROM suscriptores WHERE nfc_uid = ? LIMIT 1`,
        [valor]
      );
    } else {
      // huella: el valor es el PageID (número de posición en el sensor)
      [rows] = await db.query(
        `SELECT id_suscriptor, id_sucursal_registro, nombres, apellido_paterno, activo
           FROM suscriptores WHERE huella_template = ? LIMIT 1`,
        [valor]
      );
    }

    const suscriptor = rows[0];

    // No encontrado
    if (!suscriptor) {
      // Registrar acceso denegado — usamos id_suscriptor ficticio
      // La BD requiere FK, así que solo registramos si encontramos al usuario
      console.log(`[HW/ACCESO] Denegado — no encontrado (${tipo}: ${valor})`);
      return res.json({ resultado: 'Denegado_No_Encontrado', nombre: null });
    }

    const nombre = `${suscriptor.nombres} ${suscriptor.apellido_paterno}`;

    // 2. Verificar suscripción activa
    const [[sub]] = await db.query(
      `SELECT id_suscripcion FROM suscripciones
        WHERE id_suscriptor = ?
          AND estado = 'Activa'
          AND fecha_fin >= CURDATE()
        LIMIT 1`,
      [suscriptor.id_suscriptor]
    );

    const resultado = sub ? 'Permitido' : 'Denegado_Sin_Sub';

    // 3. Registrar en tabla accesos
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
