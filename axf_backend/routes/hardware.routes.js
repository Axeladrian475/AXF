// ============================================================================
//  routes/hardware.routes.js  (v6 — SSE + Polling Unificado)
//
//  MEJORAS v6 respecto a v5:
//  ─────────────────────────────────────────────────────────────────────────
//  1. GET /siguiente/cualquiera: devuelve el primer token pendiente de
//     CUALQUIER tipo en un solo request. El ESP32 ya no necesita hacer 3
//     requests separados (nfc / huella_enroll / huella_leer).
//
//  2. GET /sse/:token — Server-Sent Events:
//     El frontend escucha actualizaciones en tiempo real vía SSE (EventSource).
//     • Latencia ~0ms: el evento llega en cuanto el ESP32 reporta.
//     • Sin setInterval en el frontend.
//     • El servidor envía un keep-alive cada 20s para mantener la conexión.
//     • Reemplaza el long-poll de /poll/:token (este sigue disponible como
//       fallback para navegadores con límite de conexiones).
//
//  3. notificarSSE(): al recibir estado/evento/cancelar del ESP32, emite
//     inmediatamente a todos los clientes SSE registrados para ese token.
//
//  4. Limpieza de sesiones antiguas también en /token para no acumular
//     registros huérfanos.
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

// ─── Helper: actualizar racha de asistencia ────────────────────────────────────
// queryFn: función (sql, params) => Promise — puede ser db.query o conn.query
// Llamar ANTES de insertar el acceso del día para que el check "¿ya entró hoy?"
// no encuentre la entrada que estamos a punto de registrar.
async function actualizarRacha(queryFn, id_suscriptor) {
  try {
    const [[sus]] = await queryFn(
      `SELECT racha_dias, dias_descanso_semana FROM suscriptores WHERE id_suscriptor = ?`,
      [id_suscriptor]
    );
    if (!sus) return;

    // ¿Ya tuvo Entrada hoy? → no duplicar
    const [[entradaHoy]] = await queryFn(
      `SELECT id_acceso FROM accesos
       WHERE id_suscriptor = ? AND tipo_movimiento = 'Entrada'
         AND DATE(fecha_hora) = CURDATE()
       LIMIT 1`,
      [id_suscriptor]
    );
    if (entradaHoy) return;

    // Última Entrada anterior a hoy
    const [[ultima]] = await queryFn(
      `SELECT DATE(fecha_hora) AS fecha FROM accesos
       WHERE id_suscriptor = ? AND tipo_movimiento = 'Entrada'
         AND DATE(fecha_hora) < CURDATE()
       ORDER BY fecha_hora DESC LIMIT 1`,
      [id_suscriptor]
    );

    let nuevaRacha;
    if (!ultima) {
      nuevaRacha = 1; // Primera asistencia
    } else {
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const ult  = new Date(ultima.fecha); ult.setHours(0,0,0,0);
      const diasFaltados = Math.round((hoy - ult) / 86400000) - 1;
      nuevaRacha = diasFaltados <= sus.dias_descanso_semana
        ? sus.racha_dias + 1
        : 1; // Racha rota
    }

    await queryFn(
      `UPDATE suscriptores SET racha_dias = ? WHERE id_suscriptor = ?`,
      [nuevaRacha, id_suscriptor]
    );

    // 🏆 Bonus de 30 puntos al completar cada mes de racha (30, 60, 90…)
    if (nuevaRacha % 30 === 0) {
      await queryFn(
        `UPDATE suscriptores SET puntos = puntos + 30 WHERE id_suscriptor = ?`,
        [id_suscriptor]
      );
      console.log(`[RACHA] 🏆 Bonus +30 pts → suscriptor ${id_suscriptor} (racha ${nuevaRacha} días)`);
    }

    console.log(`[RACHA] Suscriptor ${id_suscriptor}: ${sus.racha_dias} → ${nuevaRacha} días`);
  } catch (err) {
    console.error('[RACHA] Error:', err.message);
    // No bloquear el acceso si la racha falla
  }
}

// ─── SSE: mapa token → lista de res (clientes web escuchando) ────────────────
// Cada cliente llama GET /sse/:token y recibe eventos en tiempo real.
const sseClients = new Map(); // token → Set<res>

function addSSEClient(token, res) {
  if (!sseClients.has(token)) sseClients.set(token, new Set());
  sseClients.get(token).add(res);
}

function removeSSEClient(token, res) {
  const set = sseClients.get(token);
  if (set) {
    set.delete(res);
    if (set.size === 0) sseClients.delete(token);
  }
}

function notificarSSE(token, payload) {
  const set = sseClients.get(token);
  if (!set || set.size === 0) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    try { res.write(data); } catch (_) { /* cliente ya desconectado */ }
  }
}

// ─── Long-Poll: mapa token → lista de {res, timeout} (fallback) ──────────────
const waiters = new Map();

function notificarWaiters(token, payload) {
  const list = waiters.get(token);
  if (!list || list.length === 0) return;
  const pending = [...list];
  waiters.set(token, []);
  for (const { res, timeoutId } of pending) {
    clearTimeout(timeoutId);
    try { res.json(payload); } catch (_) { }
  }
}

function addWaiter(token, res) {
  const timeoutId = setTimeout(async () => {
    const list = waiters.get(token) ?? [];
    const idx = list.findIndex(w => w.res === res);
    if (idx !== -1) list.splice(idx, 1);
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

// ─── Notificar a SSE + waiters ───────────────────────────────────────────────
function notificarClientes(token, payload) {
  notificarSSE(token, payload);
  notificarWaiters(token, payload);
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/token
// ════════════════════════════════════════════════════════════════════════════
router.post('/token', async (req, res) => {
  const { tipo } = req.body;
  if (!['nfc'].includes(tipo)) {
    return res.status(400).json({ message: 'tipo inválido — solo se acepta "nfc"' });
  }

  const token = crypto.randomBytes(4).toString('hex').toUpperCase();
  await db.query(
    `INSERT INTO hardware_sesiones (token, tipo, valor, usado, estado, paso)
     VALUES (?, ?, '', 0, 'pending', 'esperando_dispositivo')`,
    [token, tipo]
  );

  // Limpiar sesiones antiguas en segundo plano
  db.query(
    `DELETE FROM hardware_sesiones WHERE creado_en < DATE_SUB(NOW(), INTERVAL 3 MINUTE)`
  ).catch(() => { });

  console.log(`[HW] Token ${tipo.toUpperCase()} generado: ${token}`);
  res.json({ token, tipo, expira_en: '60 segundos' });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/hardware/siguiente/:tipo
// tipo puede ser: nfc | huella | huella_enroll | huella_leer | cualquiera
//
// El ESP32 usa "cualquiera" → un solo request para detectar cualquier tarea.
// El frontend puede usar tipos específicos si necesita crear tokens por tipo.
// ════════════════════════════════════════════════════════════════════════════
router.get('/siguiente/:tipo', verificarApiKey, async (req, res) => {
  const { tipo } = req.params;

  let sesion;

  if (tipo === 'cualquiera') {
    // Polling unificado: primer token pendiente sin importar tipo
    const [rows] = await db.query(
      `SELECT token, tipo FROM hardware_sesiones
       WHERE estado = 'pending' AND usado = 0
       ORDER BY creado_en ASC LIMIT 1`
    );
    sesion = rows[0];
  } else {
    if (!['nfc'].includes(tipo)) {
      return res.status(400).json({ message: 'tipo inválido — solo se acepta "nfc"' });
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

  // Notificar inmediatamente al frontend que ya fue recogido por el ESP32
  notificarClientes(sesion.token, {
    estado: 'reading',
    paso: 'listo_para_leer',
    tipo: sesion.tipo,
  });

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

  notificarClientes(token_sesion, { estado: 'reading', paso, tipo: sesion.tipo });

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

  notificarClientes(token_sesion, { estado: 'error', paso: motivo || 'error_desconocido' });

  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/evento
// ════════════════════════════════════════════════════════════════════════════
router.post('/evento', verificarApiKey, async (req, res) => {
  const { tipo, valor, token_sesion } = req.body;
  if (!valor || !token_sesion) return res.status(400).json({ message: 'valor y token_sesion son requeridos' });
  if (!['nfc'].includes(tipo)) {
    return res.status(400).json({ message: 'Tipo de evento inválido — solo se acepta "nfc"' });
  }

  const [[sesion]] = await db.query(
    `SELECT * FROM hardware_sesiones WHERE token = ? AND tipo = ? AND usado = 0 AND estado IN ('pending','reading')`,
    [token_sesion, tipo]
  );
  if (!sesion) {
    // Log de diagnóstico
    const [[debug]] = await db.query(
      `SELECT token, tipo, estado, usado FROM hardware_sesiones WHERE token = ? LIMIT 1`,
      [token_sesion]
    ).catch(() => [[null]]);
    console.warn(`[HW/EVENTO] Fallo: token=${token_sesion} tipo_esp32=${tipo}`, debug ?? 'NO EXISTE EN BD');
    return res.status(404).json({ message: 'Token inválido, expirado o ya usado' });
  }

  await db.query(
    `UPDATE hardware_sesiones SET valor = ?, usado = 1, estado = 'done', paso = 'completado' WHERE token = ?`,
    [valor, token_sesion]
  );

  // Notificar con el valor final → SSE + waiters
  notificarClientes(token_sesion, { estado: 'done', tipo, valor });

  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/hardware/sse/:token  — Server-Sent Events (RECOMENDADO)
//
// El frontend crea un EventSource a esta URL y recibe actualizaciones
// en tiempo real sin polling. Latencia ~0ms.
//
// Eventos emitidos:
//   data: {"estado":"reading","paso":"acerca_tarjeta","tipo":"nfc"}
//   data: {"estado":"done","tipo":"nfc","valor":"04:AB:CD:EF"}
//   data: {"estado":"error","paso":"timeout_nfc"}
//
// Keep-alive cada 20s: ": ping\n\n" (comentario SSE, no dispara onmessage)
// ════════════════════════════════════════════════════════════════════════════
router.get('/sse/:token', async (req, res) => {
  const { token } = req.params;

  const [[sesion]] = await db.query(
    `SELECT tipo, valor, estado, paso FROM hardware_sesiones WHERE token = ?`,
    [token]
  );
  if (!sesion) return res.status(404).json({ message: 'Token no encontrado' });

  // Si ya hay resultado terminal, responder de inmediato como JSON normal
  if (sesion.estado === 'done') {
    return res.json({ estado: 'done', tipo: sesion.tipo, valor: sesion.valor });
  }
  if (sesion.estado === 'error') {
    return res.json({ estado: 'error', paso: sesion.paso });
  }

  // Configurar SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Enviar estado inicial inmediatamente
  res.write(`data: ${JSON.stringify({ estado: sesion.estado, paso: sesion.paso, tipo: sesion.tipo })}\n\n`);

  // Registrar cliente SSE
  addSSEClient(token, res);

  // Keep-alive cada 20s (previene timeout de proxies/nginx)
  const keepAlive = setInterval(() => {
    try { res.write(': ping\n\n'); } catch (_) { }
  }, 20000);

  // Limpiar al desconectar
  req.on('close', () => {
    clearInterval(keepAlive);
    removeSSEClient(token, res);
    console.log(`[SSE] Cliente desconectado: ${token}`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/hardware/poll/:token  — Long-Poll (fallback)
// Mantenido por compatibilidad con versiones anteriores del frontend.
// Para nuevas implementaciones, usar /sse/:token en su lugar.
// ════════════════════════════════════════════════════════════════════════════
router.get('/poll/:token', async (req, res) => {
  const { token } = req.params;

  const [[sesion]] = await db.query(
    `SELECT tipo, valor, estado, paso FROM hardware_sesiones WHERE token = ?`,
    [token]
  );
  if (!sesion) return res.status(404).json({ message: 'Token no encontrado' });

  if (sesion.estado === 'done') return res.json({ estado: 'done', tipo: sesion.tipo, valor: sesion.valor });
  if (sesion.estado === 'error') return res.json({ estado: 'error', paso: sesion.paso });

  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

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
  if (tipo !== 'nfc' || !valor) {
    return res.status(400).json({ message: 'tipo "nfc" y valor son requeridos' });
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

      // ── Actualizar racha + dar 10 puntos por primera Entrada del día ─────────
      if (tipo_movimiento === 'Entrada') {
        // 1) Racha
        await actualizarRacha((sql, p) => db.query(sql, p), suscriptor.id_suscriptor);
        // 2) Puntos: solo en la primera entrada del día
        const [[yaEntro]] = await db.queryWithRetry(
          `SELECT COUNT(*) AS total FROM accesos
           WHERE id_suscriptor = ? AND resultado = 'Permitido'
             AND tipo_movimiento = 'Entrada' AND DATE(fecha_hora) = CURDATE()`,
          [suscriptor.id_suscriptor]
        );
        if ((yaEntro?.total ?? 0) === 0) {
          await db.queryWithRetry(
            `UPDATE suscriptores SET puntos = puntos + 10 WHERE id_suscriptor = ?`,
            [suscriptor.id_suscriptor]
          );
          console.log(`[HW/ACCESO] +10 pts → ${nombre}`);
        }
      }
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

    // Actualizar racha y puntos ANTES de insertar el acceso del día
    if (movimiento === 'Entrada') {
      await actualizarRacha(conn.query.bind(conn), suscriptor.id_suscriptor);

      // Otorgar 10 puntos de recompensa por asistencia
      await conn.query(
        `UPDATE suscriptores SET puntos = puntos + 10 WHERE id_suscriptor = ?`,
        [suscriptor.id_suscriptor]
      );
    }

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
         ON DUPLICATE KEY UPDATE personas_dentro = IF(personas_dentro > 0, personas_dentro - 1, 0)`,
        [id_sucursal]
      );
    }

    const personasDentro = await leerAforo(conn, id_sucursal);

    // ── Dar 10 puntos por primera Entrada válida del día ──────────────────────
    if (movimiento === 'Entrada') {
      const [[yaEntro]] = await conn.query(
        `SELECT COUNT(*) AS total FROM accesos
         WHERE id_suscriptor = ? AND resultado = 'Permitido'
           AND tipo_movimiento = 'Entrada' AND DATE(fecha_hora) = CURDATE()`,
        [suscriptor.id_suscriptor]
      );
      if ((yaEntro?.total ?? 0) === 0) {
        await conn.query(
          `UPDATE suscriptores SET puntos = puntos + 10 WHERE id_suscriptor = ?`,
          [suscriptor.id_suscriptor]
        );
        console.log(`[HW/ACCESO/SUC] +10 pts → ${nombre}`);
      }
    }

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