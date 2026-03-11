// ============================================================================
//  middlewares/auth.js
//  Middlewares de autenticación y autorización compartidos entre todas las rutas.
//  Importar así:  import { verificarToken, soloPersonal, soloSucursal, soloSucursalOMaestro } from '../middlewares/auth.js'
// ============================================================================

import jwt from 'jsonwebtoken';

// ─── Verificar JWT ────────────────────────────────────────────────────────────
export function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }
}

// ─── Solo personal (staff / entrenador / nutriologo / entrenador_nutriologo) ──
export function soloPersonal(req, res, next) {
  if (req.usuario.rol !== 'personal') {
    return res.status(403).json({ message: 'Acceso exclusivo para Personal' });
  }
  next();
}

// ─── Solo sucursal ────────────────────────────────────────────────────────────
export function soloSucursal(req, res, next) {
  if (req.usuario.rol !== 'sucursal') {
    return res.status(403).json({ message: 'Acceso exclusivo para Sucursal' });
  }
  next();
}

// ─── Sucursal o Maestro ───────────────────────────────────────────────────────
export function soloSucursalOMaestro(req, res, next) {
  if (req.usuario.rol !== 'sucursal' && req.usuario.rol !== 'maestro') {
    return res.status(403).json({ message: 'Acceso no autorizado' });
  }
  next();
}

// ─── Personal o Sucursal (para endpoints accesibles por ambos) ────────────────
export function personalOSucursal(req, res, next) {
  if (!['personal', 'sucursal', 'maestro'].includes(req.usuario.rol)) {
    return res.status(403).json({ message: 'Acceso no autorizado' });
  }
  next();
}

// ─── Helper: obtener id_sucursal del token independientemente del rol ─────────
// Para personal el JWT guarda id_sucursal directamente.
// Para sucursal el JWT guarda el id_sucursal como id.
// Uso: const id_sucursal = getSucursalId(req.usuario)
export function getSucursalId(usuario) {
  if (usuario.rol === 'personal') return usuario.id_sucursal;
  if (usuario.rol === 'sucursal') return usuario.id;
  return null; // maestro no tiene sucursal propia
}