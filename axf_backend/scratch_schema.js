import db from './config/database.js';

async function check() {
  await db.query(`ALTER TABLE reportes ADD COLUMN en_proceso_por_nombre VARCHAR(100) DEFAULT NULL, ADD COLUMN resuelto_por_nombre VARCHAR(100) DEFAULT NULL;`);
  console.log('Altered table reportes');
  process.exit(0);
}
check();
