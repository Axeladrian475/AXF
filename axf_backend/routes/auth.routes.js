import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM sucursales WHERE usuario = ? AND activa = 1', [usuario]);
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const sucursal = rows[0];
    const passwordValida = await bcrypt.compare(password, sucursal.password_hash);
    
    if (!passwordValida) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: sucursal.id_sucursal, rol: 'sucursal', nombre: sucursal.nombre },
      process.env.JWT_SECRET || 'axf_super_secreto_dev_2026',
      { expiresIn: '8h' }
    );

    console.log(`[AUTH] Login exitoso: ${sucursal.usuario}`);
    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: {
        id: sucursal.id_sucursal,
        nombre: sucursal.nombre,
        rol: 'sucursal'
      }
    });

  } catch (error) {
    console.error('[AUTH] Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;