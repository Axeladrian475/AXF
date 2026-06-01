import db from './config/database.js';

async function check() {
  await db.query(`ALTER TABLE reportes ADD COLUMN actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;`);
  console.log('Altered table reportes: added actualizado_en');
  process.exit(0);
}
check();
