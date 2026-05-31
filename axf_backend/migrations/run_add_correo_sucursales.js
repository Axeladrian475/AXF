import '../env.js';
import db from '../config/database.js';

async function migrate() {
  try {
    const [cols] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sucursales' AND COLUMN_NAME = 'correo'`
    );
    if (cols.length > 0) {
      console.log('[MIGRATION] Columna correo ya existe en sucursales.');
      process.exit(0);
    }
    await db.query(
      'ALTER TABLE sucursales ADD COLUMN correo varchar(150) DEFAULT NULL AFTER usuario'
    );
    console.log('[MIGRATION] Columna correo agregada a sucursales.');
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATION] Error:', err.message);
    process.exit(1);
  }
}

migrate();
