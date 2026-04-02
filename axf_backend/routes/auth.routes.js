import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;

        // 1. Maestro
        let [maestros] = await db.query('SELECT id_admin, nombre, password_hash FROM administradores WHERE usuario = ?', [usuario]);
        if (maestros.length > 0) {
            const user = maestros[0];
            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) return res.status(401).json({ message: 'Contraseña incorrecta' });

            const token = jwt.sign({ id: user.id_admin, rol: 'maestro' }, process.env.JWT_SECRET, { expiresIn: '8h' });
            return res.json({ token, user: { nombre: user.nombre, rol: 'maestro' } });
        }

        // 2. Sucursal
        let [sucursales] = await db.query('SELECT id_sucursal, nombre, password_hash FROM sucursales WHERE usuario = ? AND activa = 1', [usuario]);
        if (sucursales.length > 0) {
            const user = sucursales[0];
            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) return res.status(401).json({ message: 'Contraseña incorrecta' });

            const token = jwt.sign({ id: user.id_sucursal, rol: 'sucursal' }, process.env.JWT_SECRET, { expiresIn: '8h' });
            return res.json({
                token,
                user: {
                    nombre: user.nombre,
                    rol: 'sucursal',
                    id_sucursal: user.id_sucursal,
                    nombre_sucursal: user.nombre,
                }
            });
        }

        // 3. Personal — ahora incluye foto_url
        let [personal] = await db.query(
            `SELECT p.id_personal, p.nombres, p.puesto, p.password_hash,
                    p.id_sucursal, p.foto_url,
                    s.nombre AS nombre_sucursal
             FROM personal p
             INNER JOIN sucursales s ON s.id_sucursal = p.id_sucursal
             WHERE p.usuario = ? AND p.activo = 1`,
            [usuario]
        );
        if (personal.length > 0) {
            const user = personal[0];
            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) return res.status(401).json({ message: 'Contraseña incorrecta' });

            const token = jwt.sign(
                { id: user.id_personal, rol: 'personal', puesto: user.puesto, id_sucursal: user.id_sucursal },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );
            return res.json({
                token,
                user: {
                    nombre:          user.nombres,
                    rol:             'personal',
                    puesto:          user.puesto,
                    id_sucursal:     user.id_sucursal,
                    nombre_sucursal: user.nombre_sucursal,
                    foto_url:        user.foto_url ?? null,   // ← NUEVO
                }
            });
        }

        return res.status(404).json({ message: 'Usuario no encontrado' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

export default router;