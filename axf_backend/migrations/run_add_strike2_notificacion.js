import '../env.js';
import db from '../config/database.js';

async function migrate() {
  try {
    // Verificar el tipo actual de la columna
    const [cols] = await db.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'notificaciones_sucursal'
         AND COLUMN_NAME = 'tipo'`
    );

    if (cols.length === 0) {
      console.log('[MIGRATION] Tabla notificaciones_sucursal no encontrada.');
      process.exit(1);
    }

    const tipoActual = cols[0].COLUMN_TYPE;
    if (tipoActual.includes('strike_2')) {
      console.log('[MIGRATION] El tipo strike_2 ya existe en notificaciones_sucursal.');
      process.exit(0);
    }

    await db.query(
      `ALTER TABLE notificaciones_sucursal
       MODIFY COLUMN tipo enum('reporte_personal','strike_2','strike_3') NOT NULL`
    );
    console.log('[MIGRATION] Tipo strike_2 agregado a notificaciones_sucursal.tipo');
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATION] Error:', err.message);
    process.exit(1);
  }
}

migrate();
