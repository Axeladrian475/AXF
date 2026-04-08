// ============================================================================
//  config/database.js
//  Pool de conexiones MySQL con timezone correcto y diagnóstico en consola.
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
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '-06:00',    // UTC-6 CST — Los DATETIME en MySQL están en hora local
  connectTimeout:     10_000,      // 10 s antes de fallar
});

// ── Forzar zona horaria México en cada conexión ─────────────────────────────
// El servidor MySQL remoto corre en UTC. Sin esto, NOW() y CURRENT_TIMESTAMP
// guardan la hora UTC (6 h adelantadas respecto a México UTC-6).
// pool.pool es el pool subyacente (no-promise) que emite 'connection'.
pool.pool.on('connection', (conn) => {
  conn.query("SET time_zone = '-06:00'");
});


// Verificar conexión al iniciar
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