import bcrypt from 'bcryptjs'; // <-- Aquí está el cambio
import db from './config/database.js';

async function crearMaestro() {
    try {
        const nombre = 'Axel Aguirre';
        const usuario = 'admin_maestro';
        const passwordPlana = 'maestro123';

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(passwordPlana, salt);

        const query = `INSERT INTO administradores (nombre, usuario, password_hash) VALUES (?, ?, ?)`;
        await db.query(query, [nombre, usuario, passwordHash]);
        
        console.log('✅ Usuario Maestro creado exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

crearMaestro();