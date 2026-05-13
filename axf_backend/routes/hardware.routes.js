// ============================================================================
//  routes/hardware.routes.js  (v5 — NFC + Huella + Long-Polling)
//
//  Mejoras de velocidad:
//   • GET /poll/:token usa long-polling: la respuesta se retiene hasta 8s
//     esperando un cambio de estado antes de devolver "sin cambios".
//     El frontend recibe la respuesta en <100ms cuando el ESP32 reporta,
//     en lugar de esperar el siguiente ciclo de polling corto.
//   • POST /estado notifica inmediatamente a los listeners activos.
//   • POST /evento notifica inmediatamente a los listeners activos.
//   • POST /cancelar notifica inmediatamente a los listeners activos.
// ============================================================================

import express from 'express';
import crypto from 'crypto';
import db from '../config/database.js';

const router = express.Router();

// ─── API Key válida ──────────────────────────────────────────────────────────
const API_KEY_VALIDA = process.env.ESP32_API_KEY || 'axf_esp32_2025';

function verificarApiKey(req, res, next) {
  const key = req.body?.api_key || req.query?.api_key;
  if (key !== API_KEY_VALIDA) {
    return res.status(401).json({ message: 'API key inválida' });
  }
  next();
}

// ─── Helper: leer aforo actual ───────────────────────────────────────────────
async function leerAforo(conn, id_sucursal) {
  const [[aforo]] = await conn.query(
    `SELECT personas_dentro FROM sucursal_aforo WHERE id_sucursal = ?`,
    [id_sucursal]
  );
  return aforo ? aforo.personas_dentro : 0;
}

// ─── Long-Poll: mapa token → lista de {res, timeout} esperando ───────────────
// Cuando el ESP32 reporta un cambio (estado/evento/cancelar), notificamos
// inmediatamente a todos los res que estén esperando ese token.
const waiters = new Map(); // token → [ { res, timeoutId } ]

function notificarWaiters(token, payload) {
  const list = waiters.get(token);
  if (!list || list.length === 0) return;
  // Copiar y limpiar antes de iterar (evita doble-send)
  const pending = [...list];
  waiters.set(token, []);
  for (const { res, timeoutId } of pending) {
    clearTimeout(timeoutId);
    try { res.json(payload); } catch (_) { /* ya cerrada */ }
  }
}

function addWaiter(token, res) {
  // Timeout de 8 s: si no hay cambio, devolvemos estado actual
  const timeoutId = setTimeout(async () => {
    const list = waiters.get(token) ?? [];
    const idx = list.findIndex(w => w.res === res);
    if (idx !== -1) list.splice(idx, 1);

    // Leer estado actual y responder
    try {
      const [[sesion]] = await db.query(
        `SELECT tipo, valor, estado, paso FROM hardware_sesiones WHERE token = ?`,
        [token]
      );
      if (!sesion) return res.status(404).json({ message: 'Token no encontrado' });
      res.json({ estado: sesion.estado, paso: sesion.paso, tipo: sesion.tipo, valor: sesion.valor });
    } catch (_) {
      try { res.status(500).json({ message: 'Error interno' }); } catch (_2) { }
    }
  }, 8000);

  const list = waiters.get(token) ?? [];
  list.push({ res, timeoutId });
  waiters.set(token, list);
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/token
// ════════════════════════════════════════════════════════════════════════════
router.post('/token', async (req, res) => {
  const { tipo } = req.body;
  if (!['nfc', 'huella', 'huella_enroll', 'huella_leer'].includes(tipo)) {
    return res.status(400).json({ message: 'tipo inválido' });
  }

  const token = crypto.randomBytes(4).toString('hex').toUpperCase();
  await db.query(
    `INSERT INTO hardware_sesiones (token, tipo, valor, usado, estado, paso)
     VALUES (?, ?, '', 0, 'pending', 'esperando_dispositivo')`,
    [token, tipo]
  );
  // Limpiar sesiones antiguas (> 3 min) en segundo plano
  db.query(
    `DELETE FROM hardware_sesiones WHERE creado_en < DATE_SUB(NOW(), INTERVAL 3 MINUTE)`
  ).catch(() => { });

  console.log(`[HW] Token ${tipo.toUpperCase()} generado: ${token}`);
  res.json({ token, tipo, expira_en: '60 segundos' });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/hardware/siguiente/:tipo   (nfc | huella | huella_enroll | huella_leer | cualquiera)
// ════════════════════════════════════════════════════════════════════════════
router.get('/siguiente/:tipo', verificarApiKey, async (req, res) => {
  const { tipo } = req.params;
  
  let sesion;
  
  if (tipo === 'cualquiera') {
    const [rows] = await db.query(
      `SELECT token, tipo FROM hardware_sesiones
       WHERE estado = 'pending' AND usado = 0
       ORDER BY creado_en ASC LIMIT 1`
    );
    sesion = rows[0];
  } else {
    if (!['nfc', 'huella', 'huella_enroll', 'huella_leer'].includes(tipo)) {
      return res.status(400).json({ message: 'tipo inválido' });
    }
    const [rows] = await db.query(
      `SELECT token, tipo FROM hardware_sesiones
       WHERE tipo = ? AND estado = 'pending' AND usado = 0
       ORDER BY creado_en ASC LIMIT 1`,
      [tipo]
    );
    sesion = rows[0];
  }

  if (!sesion) return res.json({ hay: false });

  await db.query(
    `UPDATE hardware_sesiones SET estado = 'reading', paso = 'listo_para_leer' WHERE token = ?`,
    [sesion.token]
  );

  // Notificar inmediatamente al frontend que está esperando este token
  notificarWaiters(sesion.token, { estado: 'reading', paso: 'listo_para_leer', tipo: sesion.tipo });

  console.log(`[HW] ESP32 recogió token ${sesion.tipo.toUpperCase()}: ${sesion.token}`);
  res.json({ hay: true, token: sesion.token, tipo: sesion.tipo });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/estado
// ════════════════════════════════════════════════════════════════════════════
router.post('/estado', verificarApiKey, async (req, res) => {
  const { token_sesion, paso } = req.body;
  if (!token_sesion || !paso) {
    return res.status(400).json({ message: 'token_sesion y paso son requeridos' });
  }

  const [[sesion]] = await db.query(
    `SELECT token, tipo FROM hardware_sesiones WHERE token = ? AND usado = 0`,
    [token_sesion]
  );
  if (!sesion) return res.status(404).json({ message: 'Token inválido o ya usado' });

  await db.query(
    `UPDATE hardware_sesiones SET paso = ? WHERE token = ?`,
    [paso, token_sesion]
  );

  // Notificar al frontend inmediatamente
  notificarWaiters(token_sesion, { estado: 'reading', paso, tipo: sesion.tipo });

  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/cancelar
// ════════════════════════════════════════════════════════════════════════════
router.post('/cancelar', verificarApiKey, async (req, res) => {
  const { token_sesion, motivo } = req.body;
  if (!token_sesion) return res.status(400).json({ message: 'token_sesion es requerido' });

  await db.query(
    `UPDATE hardware_sesiones SET estado = 'error', paso = ?, usado = 1 WHERE token = ?`,
    [motivo || 'error_desconocido', token_sesion]
  );

  notificarWaiters(token_sesion, { estado: 'error', paso: motivo || 'error_desconocido' });

  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/evento
// ════════════════════════════════════════════════════════════════════════════
router.post('/evento', verificarApiKey, async (req, res) => {
  const { tipo, valor, token_sesion } = req.body;
  if (!valor || !token_sesion) return res.status(400).json({ message: 'valor y token_sesion son requeridos' });
  if (!['nfc', 'huella', 'huella_enroll', 'huella_leer'].includes(tipo)) {
    return res.status(400).json({ message: 'Tipo de evento inválido' });
  }

  const [[sesion]] = await db.query(
    `SELECT * FROM hardware_sesiones WHERE token = ? AND tipo = ? AND usado = 0`,
    [token_sesion, tipo]
  );
  if (!sesion) return res.status(404).json({ message: 'Token inválido, expirado o ya usado' });

  await db.query(
    `UPDATE hardware_sesiones SET valor = ?, usado = 1, estado = 'done', paso = 'completado' WHERE token = ?`,
    [valor, token_sesion]
  );

  // Notificar al frontend inmediatamente con el valor final
  notificarWaiters(token_sesion, { estado: 'done', tipo, valor });

  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/hardware/poll/:token  — Long-Poll
// El frontend llama esto en un loop. La respuesta se retiene hasta 8 s.
// Si el ESP32 reporta algo antes, responde de inmediato.
// ════════════════════════════════════════════════════════════════════════════
router.get('/poll/:token', async (req, res) => {
  const { token } = req.params;

  const [[sesion]] = await db.query(
    `SELECT tipo, valor, estado, paso FROM hardware_sesiones WHERE token = ?`,
    [token]
  );
  if (!sesion) return res.status(404).json({ message: 'Token no encontrado' });

  // Si ya hay resultado terminal, responder de inmediato
  if (sesion.estado === 'done') return res.json({ estado: 'done', tipo: sesion.tipo, valor: sesion.valor });
  if (sesion.estado === 'error') return res.json({ estado: 'error', paso: sesion.paso });

  // Estado intermedio → long-poll hasta que el ESP32 notifique o 8 s pasen
  // Configurar headers para mantener la conexión abierta
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

  // Limpiar si el cliente se desconecta
  req.on('close', () => {
    const list = waiters.get(token) ?? [];
    const idx = list.findIndex(w => w.res === res);
    if (idx !== -1) list.splice(idx, 1);
  });

  addWaiter(token, res);
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/acceso
// ════════════════════════════════════════════════════════════════════════════
router.post('/acceso', verificarApiKey, async (req, res) => {
  const { tipo, valor } = req.body;
  if (!['nfc', 'huella'].includes(tipo) || !valor) {
    return res.status(400).json({ message: 'tipo ("nfc" o "huella") y valor son requeridos' });
  }

  try {
    const campo = tipo === 'nfc' ? 'nfc_uid' : 'huella_template';
    const [rows] = await db.queryWithRetry(
      `SELECT id_suscriptor, id_sucursal_registro, nombres, apellido_paterno, activo
         FROM suscriptores WHERE ${campo} = ? LIMIT 1`,
      [valor]
    );
    const suscriptor = rows[0];

    if (!suscriptor) {
      console.log(`[HW/ACCESO] Denegado — ${tipo.toUpperCase()} no registrado: ${valor}`);
      return res.json({ resultado: 'Denegado_No_Encontrado', nombre: null });
    }

    const nombre = `${suscriptor.nombres} ${suscriptor.apellido_paterno}`;

    const [[sub]] = await db.queryWithRetry(
      `SELECT id_suscripcion FROM suscripciones
        WHERE id_suscriptor = ? AND estado = 'Activa' AND fecha_fin >= CURDATE()
        LIMIT 1`,
      [suscriptor.id_suscriptor]
    );

    const resultado = sub ? 'Permitido' : 'Denegado_Sin_Sub';

    let tipo_movimiento = null;
    if (resultado === 'Permitido') {
      const [[ultimo]] = await db.queryWithRetry(
        `SELECT tipo_movimiento FROM accesos
          WHERE id_suscriptor = ? AND id_sucursal = ?
            AND tipo_movimiento IS NOT NULL
            AND DATE(fecha_hora) = CURDATE()
          ORDER BY fecha_hora DESC LIMIT 1`,
        [suscriptor.id_suscriptor, suscriptor.id_sucursal_registro]
      );
      tipo_movimiento = (!ultimo || ultimo.tipo_movimiento === 'Salida') ? 'Entrada' : 'Salida';
    }

    await db.queryWithRetry(
      `INSERT INTO accesos (id_suscriptor, id_sucursal, metodo, resultado, tipo_movimiento, fecha_hora)
       VALUES (?, ?, 'NFC', ?, ?, NOW())`,
      [suscriptor.id_suscriptor, suscriptor.id_sucursal_registro, resultado, tipo_movimiento]
    );

    console.log(`[HW/ACCESO] ${resultado} — ${tipo_movimiento ?? 'N/A'} — ${nombre}`);
    res.json({ resultado, nombre, movimiento: tipo_movimiento });

  } catch (err) {
    console.error('[HW/ACCESO] Error:', err.message);
    res.status(500).json({ message: 'Error interno' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/acceso/sucursal
// ════════════════════════════════════════════════════════════════════════════
router.post('/acceso/sucursal', verificarApiKey, async (req, res) => {
  const { tipo, valor, id_sucursal } = req.body;

  if (tipo !== 'nfc' || !valor || !id_sucursal) {
    return res.status(400).json({ message: 'tipo "nfc", valor e id_sucursal son requeridos' });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id_suscriptor, nombres, apellido_paterno
         FROM suscriptores WHERE nfc_uid = ? LIMIT 1 FOR UPDATE`,
      [valor]
    );
    const suscriptor = rows[0];

    const aforoActual = await leerAforo(conn, id_sucursal);

    if (!suscriptor) {
      await conn.rollback();
      return res.json({ resultado: 'Denegado_No_Encontrado', nombre: null, movimiento: null, personas_dentro: aforoActual });
    }

    const nombre = `${suscriptor.nombres} ${suscriptor.apellido_paterno}`;

    const [[sub]] = await conn.query(
      `SELECT id_suscripcion FROM suscripciones
        WHERE id_suscriptor = ? AND estado = 'Activa' AND fecha_fin >= CURDATE() LIMIT 1`,
      [suscriptor.id_suscriptor]
    );

    if (!sub) {
      await conn.query(
        `INSERT INTO accesos (id_suscriptor, id_sucursal, metodo, resultado, tipo_movimiento, fecha_hora)
         VALUES (?, ?, 'NFC', 'Denegado_Sin_Sub', NULL, NOW())`,
        [suscriptor.id_suscriptor, id_sucursal]
      );
      await conn.commit();
      return res.json({ resultado: 'Denegado_Sin_Sub', nombre, movimiento: null, personas_dentro: aforoActual });
    }

    const [[ultimoMovimiento]] = await conn.query(
      `SELECT tipo_movimiento FROM accesos
        WHERE id_suscriptor = ? AND id_sucursal = ?
          AND tipo_movimiento IS NOT NULL AND DATE(fecha_hora) = CURDATE()
        ORDER BY fecha_hora DESC LIMIT 1`,
      [suscriptor.id_suscriptor, id_sucursal]
    );

    const movimiento = (!ultimoMovimiento || ultimoMovimiento.tipo_movimiento === 'Salida') ? 'Entrada' : 'Salida';

    await conn.query(
      `INSERT INTO accesos (id_suscriptor, id_sucursal, metodo, resultado, tipo_movimiento, fecha_hora)
       VALUES (?, ?, 'NFC', 'Permitido', ?, NOW())`,
      [suscriptor.id_suscriptor, id_sucursal, movimiento]
    );

    if (movimiento === 'Entrada') {
      await conn.query(
        `INSERT INTO sucursal_aforo (id_sucursal, personas_dentro) VALUES (?, 1)
         ON DUPLICATE KEY UPDATE personas_dentro = personas_dentro + 1`,
        [id_sucursal]
      );
    } else {
      await conn.query(
        `INSERT INTO sucursal_aforo (id_sucursal, personas_dentro) VALUES (?, 0)
         ON DUPLICATE KEY UPDATE personas_dentro = GREATEST(0, personas_dentro - 1)`,
        [id_sucursal]
      );
    }

    const personasDentro = await leerAforo(conn, id_sucursal);
    await conn.commit();

    console.log(`[HW/ACCESO] ${movimiento} — ${nombre} — Aforo: ${personasDentro}`);
    res.json({ resultado: 'Permitido', nombre, movimiento, personas_dentro: personasDentro });

  } catch (err) {
    await conn.rollback();
    console.error('[HW/ACCESO/SUCURSAL] Error:', err.message);
    res.status(500).json({ message: 'Error interno' });
  } finally {
    conn.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/hardware/aforo/:id_sucursal
// ════════════════════════════════════════════════════════════════════════════
router.get('/aforo/:id_sucursal', async (req, res) => {
  const { id_sucursal } = req.params;
  try {
    const [[aforo]] = await db.query(
      `SELECT personas_dentro, actualizado_en FROM sucursal_aforo WHERE id_sucursal = ?`,
      [id_sucursal]
    );
    res.json({
      id_sucursal: parseInt(id_sucursal),
      personas_dentro: aforo ? aforo.personas_dentro : 0,
      actualizado_en: aforo ? aforo.actualizado_en : null,
    });
  } catch (err) {
    console.error('[HW/AFORO] Error:', err.message);
    res.status(500).json({ message: 'Error interno' });
  }
});

export default router;