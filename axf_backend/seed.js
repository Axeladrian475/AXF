import bcrypt from 'bcryptjs';
import pool from './config/database.js';

async function fixAdminPassword() {
  try {
    // Generamos un nuevo hash nativo de tu proyecto
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    // Actualizamos al usuario admin que ya existe
    const [result] = await pool.query(
      `UPDATE sucursales SET password_hash = ? WHERE usuario = 'admin'`,
      [passwordHash]
    );
    
    if (result.affectedRows > 0) {
      console.log('[SEED] Contraseña del usuario admin actualizada a: admin123');
    } else {
      console.log('[SEED] No se encontró al usuario admin para actualizar.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('[SEED] Error:', error.message);
    process.exit(1);
  }
}

fixAdminPassword();