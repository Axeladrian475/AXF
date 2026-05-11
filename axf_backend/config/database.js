// ============================================================================
//  config/database.js
//  Pool de conexiones MySQL con timezone correcto y diagnóstico en consola.
//
//  Fixes aplicados sobre v1:
//   #1  enableKeepAlive + keepAliveInitialDelay → evita ECONNRESET en Hostinger
//   #5  connectionLimit 10 → 20, queueLimit 0 → 50 (rechaza en lugar de encolar infinito)
//   +   queryWithRetry()  → reintento automático en errores de red transitivos
// ============================================================================

import mysql  from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Validar que las variables de entorno críticas existen
const required = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'];
const missing  = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`[DB] ❌ Variables de entorno faltantes: ${missing.join(', ')}`);
  console.error('[DB] ❌ Revisa tu archivo .env en la raíz de axf_backend/');
  process.exit(1);
}

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASS,
  database:           process.env.DB_NAME,
  port:               parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit:    20,       // FIX #5: era 10; aguanta más picos de acceso simultáneo
  queueLimit:         50,       // FIX #5: era 0 (cola infinita); ahora rechaza si hay > 50 esperando
  timezone:           '-06:00', // UTC-6 CST — Los DATETIME en MySQL están en hora local
  connectTimeout:     10_000,   // 10 s antes de fallar

  // FIX #1 — Hostinger cierra conexiones idle silenciosamente (ECONNRESET).
  // keepAlive envía pings TCP periódicos para mantener el socket vivo.
  enableKeepAlive:       true,
  keepAliveInitialDelay: 60_000,  // primer ping a los 60 s de inactividad
});

// ── Forzar zona horaria México en cada conexión ─────────────────────────────
// El servidor MySQL remoto corre en UTC. Sin esto, NOW() y CURRENT_TIMESTAMP
// guardan la hora UTC (6 h adelantadas respecto a México UTC-6).
// NOTA: el guard `if (conn)` evita el crash "Cannot read properties of undefined
//       (reading 'once')" que ocurre en mysql2 cuando el pool recibe una
//       conexión undefined durante reconexiones o errores de red.
pool.pool.on('connection', (conn) => {
  if (!conn) return;
  conn.query("SET time_zone = '-06:00'");
});

// ── Helper: query con reintento automático (FIX #1) ──────────────────────────
//
//  Úsalo exactamente igual que db.query() en rutas críticas (accesos, aforo).
//  Reintenta hasta maxRetries veces solo si el error es de red transitivo.
//
//  Ejemplo:
//    const [rows] = await db.queryWithRetry(
//      `SELECT ... FROM suscriptores WHERE nfc_uid = ?`, [uid]
//    );
//
const RETRIABLE = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
  'PROTOCOL_CONNECTION_LOST', 'ER_CON_COUNT_ERROR',
]);

async function queryWithRetry(sql, params = [], maxRetries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      lastErr = err;
      if (!RETRIABLE.has(err.code) || attempt === maxRetries) throw err;
      const wait = attempt * 200; // 200 ms → 400 ms → 600 ms
      console.warn(`[DB] Reintento ${attempt}/${maxRetries} tras "${err.code}" — esperando ${wait} ms`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

pool.queryWithRetry = queryWithRetry;

// ── Verificar conexión al iniciar ────────────────────────────────────────────
pool.getConnection()
  .then(conn => {
    console.log(`[DB] ✅ Conectado a ${process.env.DB_NAME} en ${process.env.DB_HOST}`);
    conn.release();
  })
  .catch(err => {
    console.error('[DB] ❌ No se pudo conectar a MySQL:');
    console.error(`     → Código:   ${err.code}`);
    console.error(`     → Mensaje:  ${err.message}`);
    console.error(`     → Host:     ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
    console.error(`     → Usuario:  ${process.env.DB_USER}`);
    console.error(`     → Base:     ${process.env.DB_NAME}`);
    console.error('     Verifica credenciales, firewall y que MySQL esté corriendo.');
  });

export default pool;