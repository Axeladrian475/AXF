import db from './config/database.js';

async function check() {
  const [rows] = await db.query('SHOW CREATE TABLE sucursales');
  console.log(rows[0]['Create Table']);
  process.exit(0);
}
check();
