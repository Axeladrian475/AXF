// ============================================================================
//  routes/hardware.routes.js  (v3 — robusto para producción)
//
//  Cambios respecto a v2:
//   • /acceso/sucursal usa transacción atómica (fix #2)
//   • SELECT ... FOR UPDATE en suscriptor → mutex contra doble lectura (fix #3)
//   • personas_dentro real en TODOS los responses, incluso denegados (fix #4)
//   • db.queryWithRetry() en la ruta crítica de acceso (fix #1)
//
//  El resto de los endpoints (token, siguiente/nfc, estado, etc.)
//  permanecen sin cambios funcionales — solo se les añade queryWithRetry
//  donde aplica.
// ============================================================================

import express from 'express';
import crypto  from 'crypto';
import db      from '../config/database.js';

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

// ─── Helper: leer aforo actual (sin lanzar excepción) ────────────────────────
//  Centraliza la lectura para no duplicar código y garantizar que siempre
//  se devuelve el valor real, nunca 0 hardcodeado.
async function leerAforo(conn, id_sucursal) {
  const [[aforo]] = await conn.query(
    `SELECT personas_dentro FROM sucursal_aforo WHERE id_sucursal = ?`,
    [id_sucursal]
  );
  return aforo ? aforo.personas_dentro : 0;
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/token
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
  await db.query(
    `DELETE FROM hardware_sesiones WHERE creado_en < DATE_SUB(NOW(), INTERVAL 3 MINUTE)`
  );

  console.log(`[HW] Token NFC generado: ${token}`);
  res.json({ token, tipo: 'nfc', expira_en: '60 segundos' });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/hardware/siguiente/nfc
// ════════════════════════════════════════════════════════════════════════════
router.get('/siguiente/nfc', verificarApiKey, async (req, res) => {
  const [[sesion]] = await db.query(
    `SELECT token FROM hardware_sesiones
     WHERE tipo = 'nfc' AND estado = 'pending' AND usado = 0
     ORDER BY creado_en DESC LIMIT 1`
  );

  if (!sesion) return res.json({ hay: false });

  await db.query(
    `UPDATE hardware_sesiones SET estado = 'reading', paso = 'listo_para_leer' WHERE token = ?`,
    [sesion.token]
  );

  console.log(`[HW] ESP32 recogió token NFC: ${sesion.token}`);
  res.json({ hay: true, token: sesion.token, tipo: 'nfc' });
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
    `SELECT token FROM hardware_sesiones WHERE token = ? AND usado = 0`,
    [token_sesion]
  );
  if (!sesion) return res.status(404).json({ message: 'Token inválido o ya usado' });

  await db.query(
    `UPDATE hardware_sesiones SET paso = ? WHERE token = ?`,
    [paso, token_sesion]
  );
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
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/evento
// ════════════════════════════════════════════════════════════════════════════
router.post('/evento', verificarApiKey, async (req, res) => {
  const { tipo, valor, token_sesion } = req.body;
  if (!valor || !token_sesion) return res.status(400).json({ message: 'valor y token_sesion son requeridos' });
  if (tipo !== 'nfc')          return res.status(400).json({ message: 'Solo se aceptan eventos de tipo "nfc"' });

  const [[sesion]] = await db.query(
    `SELECT * FROM hardware_sesiones WHERE token = ? AND tipo = 'nfc' AND usado = 0`,
    [token_sesion]
  );
  if (!sesion) return res.status(404).json({ message: 'Token inválido, expirado o ya usado' });

  await db.query(
    `UPDATE hardware_sesiones SET valor = ?, usado = 1, estado = 'done', paso = 'completado' WHERE token = ?`,
    [valor, token_sesion]
  );
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/hardware/poll/:token
// ════════════════════════════════════════════════════════════════════════════
router.get('/poll/:token', async (req, res) => {
  const [[sesion]] = await db.query(
    `SELECT tipo, valor, estado, paso FROM hardware_sesiones WHERE token = ?`,
    [req.params.token]
  );
  if (!sesion) return res.status(404).json({ message: 'Token no encontrado' });

  if (sesion.estado === 'done')  return res.json({ estado: 'done',  tipo: sesion.tipo, valor: sesion.valor });
  if (sesion.estado === 'error') return res.json({ estado: 'error', paso: sesion.paso });
  res.json({ estado: sesion.estado, paso: sesion.paso });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/acceso
// Verificación simple (sin aforo, torniquete genérico).
// ════════════════════════════════════════════════════════════════════════════
router.post('/acceso', verificarApiKey, async (req, res) => {
  const { tipo, valor } = req.body;
  if (tipo !== 'nfc' || !valor) {
    return res.status(400).json({ message: 'tipo "nfc" y valor son requeridos' });
  }

  try {
    const [rows] = await db.queryWithRetry(
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

    const [[sub]] = await db.queryWithRetry(
      `SELECT id_suscripcion FROM suscripciones
        WHERE id_suscriptor = ? AND estado = 'Activa' AND fecha_fin >= CURDATE()
        LIMIT 1`,
      [suscriptor.id_suscriptor]
    );

    const resultado = sub ? 'Permitido' : 'Denegado_Sin_Sub';

    await db.queryWithRetry(
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

// ════════════════════════════════════════════════════════════════════════════
// POST /api/hardware/acceso/sucursal  ← ENDPOINT CRÍTICO
//
//  FIX #2: Todo el bloque corre dentro de una transacción. Si el UPDATE de
//          aforo falla, el INSERT en accesos se revierte automáticamente.
//
//  FIX #3: SELECT ... FOR UPDATE en suscriptores impide que dos requests
//          simultáneos con el mismo NFC se procesen en paralelo. El segundo
//          espera al primero o falla de forma controlada.
//
//  FIX #4: personas_dentro siempre se lee de la BD real y se devuelve en
//          TODOS los casos (Permitido, Denegado_Sin_Sub, Denegado_No_Encontrado).
//
// Body:     { api_key, tipo:"nfc", valor:"UID", id_sucursal }
// Response: { resultado, nombre, movimiento, personas_dentro }
// ════════════════════════════════════════════════════════════════════════════
router.post('/acceso/sucursal', verificarApiKey, async (req, res) => {
  const { tipo, valor, id_sucursal } = req.body;

  if (tipo !== 'nfc' || !valor || !id_sucursal) {
    return res.status(400).json({ message: 'tipo "nfc", valor e id_sucursal son requeridos' });
  }

  // Obtener una conexión dedicada para poder usar transacciones y FOR UPDATE
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // ── 1. Buscar suscriptor con lock de fila (FIX #3: mutex por NFC UID) ───
    //    FOR UPDATE bloquea la fila hasta que la transacción termine.
    //    Si dos lectores detectan el mismo NFC al mismo tiempo, el segundo
    //    query espera a que el primero haga COMMIT/ROLLBACK antes de continuar.
    const [rows] = await conn.query(
      `SELECT id_suscriptor, nombres, apellido_paterno
         FROM suscriptores
         WHERE nfc_uid = ?
         LIMIT 1
         FOR UPDATE`,
      [valor]
    );
    const suscriptor = rows[0];

    // ── Leer aforo real incluso si el suscriptor no existe (FIX #4) ─────────
    const aforoActual = await leerAforo(conn, id_sucursal);

    if (!suscriptor) {
      await conn.rollback();
      console.log(`[HW/ACCESO/SUCURSAL] Denegado — NFC no registrado: ${valor}`);
      return res.json({
        resultado:       'Denegado_No_Encontrado',
        nombre:          null,
        movimiento:      null,
        personas_dentro: aforoActual,   // FIX #4: valor real, no 0 hardcodeado
      });
    }

    const nombre = `${suscriptor.nombres} ${suscriptor.apellido_paterno}`;

    // ── 2. Verificar suscripción activa ───────────────────────────────────────
    const [[sub]] = await conn.query(
      `SELECT id_suscripcion FROM suscripciones
        WHERE id_suscriptor = ? AND estado = 'Activa' AND fecha_fin >= CURDATE()
        LIMIT 1`,
      [suscriptor.id_suscriptor]
    );

    if (!sub) {
      // Registrar denegado dentro de la transacción (para consistencia de logs)
      await conn.query(
        `INSERT INTO accesos
           (id_suscriptor, id_sucursal, metodo, resultado, tipo_movimiento, fecha_hora)
         VALUES (?, ?, 'NFC', 'Denegado_Sin_Sub', NULL, NOW())`,
        [suscriptor.id_suscriptor, id_sucursal]
      );
      await conn.commit();

      return res.json({
        resultado:       'Denegado_Sin_Sub',
        nombre,
        movimiento:      null,
        personas_dentro: aforoActual,   // FIX #4: valor real
      });
    }

    // ── 3. Determinar movimiento (Entrada / Salida) ───────────────────────────
    const [[ultimoMovimiento]] = await conn.query(
      `SELECT tipo_movimiento FROM accesos
        WHERE id_suscriptor = ? AND id_sucursal = ?
          AND tipo_movimiento IS NOT NULL
          AND DATE(fecha_hora) = CURDATE()
        ORDER BY fecha_hora DESC LIMIT 1`,
      [suscriptor.id_suscriptor, id_sucursal]
    );

    const movimiento = (!ultimoMovimiento || ultimoMovimiento.tipo_movimiento === 'Salida')
      ? 'Entrada'
      : 'Salida';

    // ── 4. Registrar acceso (FIX #2: dentro de la transacción) ───────────────
    await conn.query(
      `INSERT INTO accesos
         (id_suscriptor, id_sucursal, metodo, resultado, tipo_movimiento, fecha_hora)
       VALUES (?, ?, 'NFC', 'Permitido', ?, NOW())`,
      [suscriptor.id_suscriptor, id_sucursal, movimiento]
    );

    // ── 5. Actualizar aforo (FIX #2: dentro de la misma transacción) ─────────
    //    Si este UPDATE falla, el INSERT de arriba también se revierte.
    if (movimiento === 'Entrada') {
      await conn.query(
        `INSERT INTO sucursal_aforo (id_sucursal, personas_dentro)
           VALUES (?, 1)
         ON DUPLICATE KEY UPDATE
           personas_dentro = personas_dentro + 1`,
        [id_sucursal]
      );
    } else {
      await conn.query(
        `INSERT INTO sucursal_aforo (id_sucursal, personas_dentro)
           VALUES (?, 0)
         ON DUPLICATE KEY UPDATE
           personas_dentro = GREATEST(0, personas_dentro - 1)`,
        [id_sucursal]
      );
    }

    // ── 6. Leer aforo ya actualizado para devolverlo (FIX #4) ─────────────────
    const personasDentro = await leerAforo(conn, id_sucursal);

    await conn.commit();

    console.log(`[HW/ACCESO] ${movimiento} — ${nombre} — Sucursal ${id_sucursal} — Aforo: ${personasDentro}`);
    res.json({ resultado: 'Permitido', nombre, movimiento, personas_dentro: personasDentro });

  } catch (err) {
    await conn.rollback();
    console.error('[HW/ACCESO/SUCURSAL] Error:', err.message);
    res.status(500).json({ message: 'Error interno' });
  } finally {
    // Siempre devolver la conexión al pool, sin importar qué pasó
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
      `SELECT personas_dentro, actualizado_en
         FROM sucursal_aforo WHERE id_sucursal = ?`,
      [id_sucursal]
    );
    res.json({
      id_sucursal:     parseInt(id_sucursal),
      personas_dentro: aforo ? aforo.personas_dentro : 0,
      actualizado_en:  aforo ? aforo.actualizado_en  : null,
    });
  } catch (err) {
    console.error('[HW/AFORO] Error:', err.message);
    res.status(500).json({ message: 'Error interno' });
  }
});

export default router;